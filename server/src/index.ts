import { exec } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import os from 'os';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket, WebSocketServer } from 'ws';
import { ClientMessage, LatencyMetrics, ServerMessage } from '../../shared/types.js';
import { LMStudioService } from './services/lmStudioService.js';
import { MeetingService } from './services/meetingService.js';
import { SentenceChunker } from './services/sentenceChunker.js';

const execPromise = util.promisify(exec);

dotenv.config();

const PORT = process.env.PORT || 3001;
const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER as any) || 'lmstudio';
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Core Services with multi-provider (LM Studio & Ollama)
const lmStudioService = new LMStudioService(DEFAULT_PROVIDER, DEFAULT_PROVIDER === 'ollama' ? OLLAMA_URL : LM_STUDIO_URL);
const meetingService = new MeetingService(lmStudioService);

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), service: 'RVoice Proton Gateway' });
});

app.get('/api/network/info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  const primaryIp = addresses[0] || 'localhost';
  res.json({
    primaryIp,
    allIps: addresses,
    port: 3344,
    networkUrl: `https://${primaryIp}:3344`,
    isHosted: true
  });
});

app.get('/api/llm/status', async (req, res) => {
  const status = await lmStudioService.getStatus();
  res.json(status);
});

// Backward compatibility endpoint
app.get('/api/lmstudio/status', async (req, res) => {
  const status = await lmStudioService.getStatus();
  res.json(status);
});

app.post('/api/llm/config', (req, res) => {
  const { provider, endpoint, activeModel } = req.body;
  if (provider) {
    lmStudioService.setProvider(provider, endpoint);
  } else if (endpoint) {
    lmStudioService.setEndpoint(endpoint);
  }
  if (activeModel) {
    lmStudioService.setActiveModel(activeModel);
  }
  res.json({
    success: true,
    provider: lmStudioService.getProvider(),
    endpoint: lmStudioService.getActiveEndpoint(),
    activeModel: lmStudioService.getActiveModel()
  });
});

app.post('/api/lmstudio/config', (req, res) => {
  const { endpoint, activeModel } = req.body;
  if (endpoint) {
    lmStudioService.setEndpoint(endpoint);
  }
  if (activeModel) {
    lmStudioService.setActiveModel(activeModel);
  }
  res.json({ success: true, endpoint: lmStudioService.getActiveEndpoint() });
});

app.get('/api/meetings', (req, res) => {
  res.json(meetingService.getAllSessions());
});

app.get('/api/meetings/:id', (req, res) => {
  const session = meetingService.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  res.json(session);
});

app.get('/api/meetings/:id/export', (req, res) => {
  const md = meetingService.exportMarkdown(req.params.id);
  if (!md) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="meeting-${req.params.id}.md"`);
  res.send(md);
});

// System Update & Version Sync Endpoints
app.get('/api/system/version', async (req, res) => {
  try {
    const { stdout: commit } = await execPromise('git rev-parse HEAD');
    const { stdout: branch } = await execPromise('git branch --show-current');
    res.json({
      version: '2.0.0',
      commit: commit.trim(),
      shortCommit: commit.trim().substring(0, 7),
      branch: branch.trim(),
      repo: 'arjunmdivekar-afk/Rvoice-Proton'
    });
  } catch (err: any) {
    res.json({
      version: '2.0.0',
      commit: 'unknown',
      shortCommit: 'unknown',
      branch: 'main',
      repo: 'arjunmdivekar-afk/Rvoice-Proton'
    });
  }
});

app.get('/api/system/check-updates', async (req, res) => {
  try {
    let localSha = '';
    try {
      const { stdout } = await execPromise('git rev-parse HEAD');
      localSha = stdout.trim();
    } catch (e) {
      localSha = 'unknown';
    }

    const response = await fetch('https://api.github.com/repos/arjunmdivekar-afk/Rvoice-Proton/commits?per_page=10', {
      headers: {
        'User-Agent': 'RVoice-Proton-Updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        isUpToDate: true,
        error: `GitHub API returned ${response.status}: ${response.statusText}`,
        currentSha: localSha.substring(0, 7)
      });
    }

    const commits: any[] = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return res.json({
        isUpToDate: true,
        message: 'Your RVoice Proton is up to date',
        currentSha: localSha.substring(0, 7)
      });
    }

    const latestRemoteSha = commits[0].sha;
    if (localSha === latestRemoteSha || localSha.startsWith(latestRemoteSha) || latestRemoteSha.startsWith(localSha)) {
      return res.json({
        isUpToDate: true,
        message: 'Your RVoice Proton is up to date',
        currentSha: localSha.substring(0, 7),
        latestSha: latestRemoteSha.substring(0, 7),
        checkedAt: new Date().toISOString()
      });
    }

    // Calculate newer commits
    const newCommits: any[] = [];
    for (const c of commits) {
      if (c.sha === localSha || localSha.startsWith(c.sha)) break;
      newCommits.push({
        sha: c.sha.substring(0, 7),
        message: c.commit?.message?.split('\n')[0] || 'Update commit',
        author: c.commit?.author?.name || 'Contributor',
        date: c.commit?.author?.date || new Date().toISOString()
      });
    }

    res.json({
      isUpToDate: false,
      currentSha: localSha.substring(0, 7),
      latestSha: latestRemoteSha.substring(0, 7),
      newCommits: newCommits.length > 0 ? newCommits : [{
        sha: latestRemoteSha.substring(0, 7),
        message: commits[0].commit?.message?.split('\n')[0] || 'Latest GitHub Release',
        author: commits[0].commit?.author?.name || 'Contributor',
        date: commits[0].commit?.author?.date || new Date().toISOString()
      }],
      checkedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Update] Error checking GitHub updates:', err);
    res.status(500).json({
      isUpToDate: true,
      error: err.message,
      fallbackMessage: 'Unable to reach GitHub. You may be offline or rate-limited.'
    });
  }
});

app.post('/api/system/update', async (req, res) => {
  try {
    console.log('[Update] Pulling latest updates from origin main...');
    const { stdout, stderr } = await execPromise('git pull origin main');
    console.log('[Update] git pull output:', stdout, stderr);
    res.json({
      success: true,
      output: stdout.trim(),
      message: 'Successfully updated to latest version! Please restart the server or refresh your browser.'
    });
  } catch (err: any) {
    console.error('[Update] git pull error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// WebSocket Protocol Handlers
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  console.log(`[WebSocket] Client connected: ${clientId}`);

  const send = (msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  // Welcome message
  send({ type: 'CONNECTED', clientId });

  // Push immediate LLM provider status
  lmStudioService.getStatus().then(status => {
    send({ type: 'LM_STUDIO_STATUS', status });
    send({ type: 'LLM_STATUS', status });
  });

  // Track active client message ID for barge-in aborts
  let activeMessageId: string | null = null;
  const sentenceChunker = new SentenceChunker(true);

  ws.on('message', async (raw: string) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;

      switch (msg.type) {
        case 'CHECK_LLM_STATUS':
        case 'CHECK_LM_STUDIO': {
          const status = await lmStudioService.getStatus();
          send({ type: 'LM_STUDIO_STATUS', status });
          send({ type: 'LLM_STATUS', status });
          break;
        }

        case 'SET_PROVIDER': {
          lmStudioService.setProvider(msg.provider, msg.endpoint);
          const status = await lmStudioService.getStatus();
          send({ type: 'LM_STUDIO_STATUS', status });
          send({ type: 'LLM_STATUS', status });
          break;
        }

        case 'SET_MODEL': {
          lmStudioService.setActiveModel(msg.model);
          const status = await lmStudioService.getStatus();
          send({ type: 'LM_STUDIO_STATUS', status });
          send({ type: 'LLM_STATUS', status });
          break;
        }

        case 'INTERRUPT': {
          // Zero-Latency Barge-In: Abort ongoing model generation instantly
          console.log(`[Barge-In] Interrupt received from client ${clientId}`);
          if (activeMessageId) {
            lmStudioService.abort(activeMessageId);
            send({ type: 'GENERATION_ABORTED', messageId: activeMessageId });
            activeMessageId = null;
          }
          sentenceChunker.reset();
          break;
        }

        case 'TEXT_PROMPT': {
          const messageId = uuidv4();
          activeMessageId = messageId;
          const isVoice = msg.mode === 'voice';
          sentenceChunker.setVoiceMode(isVoice);
          sentenceChunker.reset();

          console.log(`[Prompt] Provider: ${lmStudioService.getProvider()} | Mode: ${msg.mode} | Persona: ${msg.persona || 'executive'} | Prompt: "${msg.prompt.slice(0, 60)}..."`);

          await lmStudioService.streamCompletion(
            messageId,
            msg.prompt,
            msg.mode,
            msg.persona,
            {
              onToken: (token) => {
                send({ type: 'TOKEN_STREAM', token, messageId });

                if (isVoice) {
                  const sentences = sentenceChunker.push(token);
                  for (const s of sentences) {
                    send({ type: 'TTS_CHUNK', text: s, messageId, isFinal: false });
                  }
                }
              },
              onSentence: () => {},
              onComplete: (fullText, metrics: LatencyMetrics) => {
                if (isVoice) {
                  const finalSentence = sentenceChunker.flush();
                  if (finalSentence) {
                    send({ type: 'TTS_CHUNK', text: finalSentence, messageId, isFinal: true });
                  }
                }
                send({ type: 'GENERATION_COMPLETE', messageId, fullContent: fullText, metrics });
                activeMessageId = null;
              },
              onError: (err) => {
                console.error(`[LLM Error]`, err.message);
                send({ type: 'ERROR', message: `LLM generation error (${lmStudioService.getProvider()}): ${err.message}` });
                activeMessageId = null;
              }
            },
            msg.model
          );
          break;
        }

        case 'START_MEETING': {
          const session = meetingService.startMeeting(msg.title, msg.audioSource);
          send({ type: 'MEETING_UPDATED', session });
          break;
        }

        case 'ADD_MEETING_TRANSCRIPT': {
          const session = meetingService.addTranscriptEntry(msg.meetingId, msg.entry);
          if (session) {
            send({ type: 'MEETING_UPDATED', session });
          }
          break;
        }

        case 'UPDATE_MEETING_TRANSCRIPT': {
          const session = meetingService.updateTranscript(msg.meetingId, msg.entries);
          if (session) {
            send({ type: 'MEETING_UPDATED', session });
          }
          break;
        }

        case 'UPDATE_PARTICIPANTS': {
          const session = meetingService.updateParticipants(msg.meetingId, msg.participants);
          if (session) {
            send({ type: 'MEETING_UPDATED', session });
          }
          break;
        }

        case 'STOP_MEETING': {
          const session = meetingService.stopMeeting(msg.meetingId, msg.hasVideo);
          if (session) {
            send({ type: 'MEETING_UPDATED', session });
          }
          break;
        }

        case 'SUMMARIZE_MEETING': {
          try {
            const summary = await meetingService.generateSummary(msg.meetingId, msg.model, msg.style);
            if (summary) {
              send({ type: 'MEETING_SUMMARY_GENERATED', meetingId: msg.meetingId, summary });
            }
          } catch (err: any) {
            send({ type: 'ERROR', message: `Failed to summarize meeting: ${err.message}` });
          }
          break;
        }

        case 'EVALUATE_VOCAB': {
          try {
            const evaluation = await lmStudioService.evaluateVocabularyMeaning(msg.card, msg.userMeaning, msg.model);
            send({ type: 'VOCAB_EVALUATED', evaluation });
          } catch (err: any) {
            send({ type: 'ERROR', message: `Vocabulary evaluation failed: ${err.message}` });
          }
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      console.error('[WebSocket] Message parsing error:', err);
      send({ type: 'ERROR', message: 'Invalid WebSocket message format' });
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
    if (activeMessageId) {
      lmStudioService.abort(activeMessageId);
    }
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`⚡ [RVoice Proton Gateway] Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 [WebSocket] Listening on ws://0.0.0.0:${PORT}/ws`);
  console.log(`🧠 [LLM Gateway] Active Provider: ${lmStudioService.getProvider()} @ ${lmStudioService.getActiveEndpoint()}`);
});
