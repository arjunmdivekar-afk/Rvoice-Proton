import {
  AppMode,
  AssistantPersona,
  ChatMessage,
  LatencyMetrics,
  LMStudioStatus,
  MeetingSession,
  MeetingSummary,
  MeetingTranscriptEntry
} from '@shared/types';
import { Bot, Code2, FileText, Mic, Settings, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AudioManager } from './audio/audioManager';
import { SpeechRecognizer } from './audio/speechRecognizer';
import { SpeechSynthesizer } from './audio/speechSynthesizer';
import { OrbState } from './canvas/ParticleOrb';
import { CodeStudio } from './components/codestudio/CodeStudio';
import { MeetingView } from './components/meeting/MeetingView';
import { SettingsModal } from './components/settings/SettingsModal';
import { TelemetryHUD } from './components/telemetry/TelemetryHUD';
import { VoiceAssistantHUD } from './components/voice/VoiceAssistantHUD';
import { WSClient } from './services/wsClient';

export const App: React.FC = () => {
  // Application Mode State
  const [currentMode, setCurrentMode] = useState<AppMode>('voice');
  const [assistantPersona, setAssistantPersona] = useState<AssistantPersona>('executive');

  // LM Studio & Telemetry
  const [lmStatus, setLmStatus] = useState<LMStudioStatus | null>(null);
  const [metrics, setMetrics] = useState<LatencyMetrics | null>(null);
  const [tokensPerSec, setTokensPerSec] = useState<number>(0);

  // Voice & Audio States
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencies, setFrequencies] = useState<Uint8Array>(new Uint8Array(64));
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [vadSensitivity, setVadSensitivity] = useState<number>(0.035);

  // Chat & Stream Messages
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [codeMessages, setCodeMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [streamingAssistantText, setStreamingAssistantText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Meeting State
  const [currentMeeting, setCurrentMeeting] = useState<MeetingSession | null>(null);
  const [isSummarizingMeeting, setIsSummarizingMeeting] = useState<boolean>(false);

  // Settings Modal & Voices
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  // Core Service Instances Refs
  const wsClientRef = useRef<WSClient | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const synthesizerRef = useRef<SpeechSynthesizer | null>(null);

  // Token speed calculation tracker
  const tokenCountRef = useRef<number>(0);
  const streamStartTimeRef = useRef<number>(0);

  // Initialize Services
  useEffect(() => {
    // 1. Initialize Speech Synthesizer
    const synth = new SpeechSynthesizer((speaking) => {
      if (currentMode === 'voice') {
        setOrbState(speaking ? 'speaking' : 'idle');
      }
    });
    synthesizerRef.current = synth;
    setAvailableVoices(synth.getVoices());

    // 2. Initialize Audio Manager
    const audioMgr = new AudioManager({
      onVolumeChange: (vol) => setAudioLevel(vol),
      onFrequencies: (freqs) => setFrequencies(freqs),
      onSpeechStart: () => {
        // Zero-Latency Barge-In: If user speaks while assistant is speaking, halt audio and abort stream!
        if (synth.isCurrentlySpeaking() || isStreaming) {
          console.log('⚡ [Barge-In] Speech detected! Halting assistant speech & stream.');
          synth.cancel();
          wsClientRef.current?.send({ type: 'INTERRUPT' });
          setOrbState('listening');
        } else if (currentMode === 'voice') {
          setOrbState('listening');
        }
      },
      onSpeechEnd: () => {
        if (!synth.isCurrentlySpeaking() && !isStreaming && currentMode === 'voice') {
          setOrbState('idle');
        }
      }
    });
    audioManagerRef.current = audioMgr;

    // 3. Initialize Speech Recognizer
    const recognizer = new SpeechRecognizer({
      onInterimResult: (text) => {
        setInterimTranscript(text);
      },
      onFinalResult: (text) => {
        setInterimTranscript('');
        handleUserSpeechFinal(text);
      },
      onError: (err) => console.warn('STT Error:', err)
    });
    recognizerRef.current = recognizer;

    // 4. Initialize WebSocket Gateway Client
    const ws = new WSClient();
    wsClientRef.current = ws;

    ws.on('lmStudioStatus', (status) => {
      setLmStatus(status);
    });

    ws.on('token', (token) => {
      tokenCountRef.current++;
      const elapsed = (Date.now() - streamStartTimeRef.current) / 1000;
      if (elapsed > 0) {
        setTokensPerSec(Number((tokenCountRef.current / elapsed).toFixed(1)));
      }
      setStreamingAssistantText((prev) => prev + token);
    });

    ws.on('ttsChunk', (text, _, isFinal) => {
      // In Voice Mode only: speak the sentence chunk!
      if (currentMode === 'voice') {
        synth.speak(text);
      }
    });

    ws.on('generationComplete', (msgId, fullText, metricsData) => {
      setIsStreaming(false);
      setMetrics(metricsData);
      setTokensPerSec(metricsData.tokensPerSec || 0);

      if (currentMode === 'voice') {
        setVoiceMessages((prev) => [
          ...prev,
          {
            id: msgId,
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
            mode: 'voice',
            metrics: metricsData
          }
        ]);
        setStreamingAssistantText('');
      } else if (currentMode === 'codestudio') {
        setCodeMessages((prev) => [
          ...prev,
          {
            id: msgId,
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
            mode: 'codestudio',
            metrics: metricsData
          }
        ]);
        setStreamingAssistantText('');
      }
    });

    ws.on('generationAborted', () => {
      setIsStreaming(false);
      synth.cancel();
      setOrbState('idle');
      setStreamingAssistantText('');
    });

    ws.on('meetingUpdated', (session) => {
      setCurrentMeeting(session);
    });

    ws.on('meetingSummaryGenerated', (_, summary) => {
      setIsSummarizingMeeting(false);
      setCurrentMeeting((prev) => prev ? { ...prev, summary } : null);
    });

    ws.connect();

    return () => {
      synth.cancel();
      audioMgr.stopAll();
      recognizer.stop();
      ws.close();
    };
  }, [currentMode]);

  // Handle final speech output from STT
  const handleUserSpeechFinal = (text: string) => {
    if (!text.trim()) return;

    if (currentMode === 'voice') {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        mode: 'voice'
      };
      setVoiceMessages((prev) => [...prev, userMsg]);
      setOrbState('thinking');
      setIsStreaming(true);
      tokenCountRef.current = 0;
      streamStartTimeRef.current = Date.now();
      setStreamingAssistantText('');

      wsClientRef.current?.send({
        type: 'TEXT_PROMPT',
        prompt: text,
        mode: 'voice',
        persona: assistantPersona,
        model: lmStatus?.activeModel || undefined
      });
    } else if (currentMode === 'meeting' && currentMeeting && currentMeeting.status === 'recording') {
      // In Meeting Mode: Add to meeting transcript
      const elapsedSeconds = Math.floor((Date.now() - currentMeeting.startedAt) / 1000);
      wsClientRef.current?.send({
        type: 'ADD_MEETING_TRANSCRIPT',
        meetingId: currentMeeting.id,
        entry: {
          speaker: 'Speaker',
          text,
          timestamp: elapsedSeconds
        }
      });
    }
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      audioManagerRef.current?.stopAll();
      recognizerRef.current?.stop();
      setIsMicActive(false);
      setOrbState('idle');
    } else {
      try {
        await audioManagerRef.current?.startMicrophone();
        recognizerRef.current?.start();
        setIsMicActive(true);
        setOrbState('idle');
      } catch (err) {
        alert('Could not access microphone: ' + (err as Error).message);
      }
    }
  };

  // Barge-In Interrupt Handler
  const handleInterrupt = () => {
    synthesizerRef.current?.cancel();
    wsClientRef.current?.send({ type: 'INTERRUPT' });
    setIsStreaming(false);
    setStreamingAssistantText('');
    setOrbState('idle');
  };

  // Code Studio Text Prompt Send
  const handleSendCodePrompt = (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mode: 'codestudio'
    };
    setCodeMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    tokenCountRef.current = 0;
    streamStartTimeRef.current = Date.now();
    setStreamingAssistantText('');

    wsClientRef.current?.send({
      type: 'TEXT_PROMPT',
      prompt: text,
      mode: 'codestudio',
      model: lmStatus?.activeModel || undefined
    });
  };

  // Meeting Handlers
  const handleStartMeeting = async (title: string, source: 'microphone' | 'tab' | 'both') => {
    try {
      if (source === 'tab') {
        await audioManagerRef.current?.startTabAudio();
      } else {
        await audioManagerRef.current?.startMicrophone();
      }
      recognizerRef.current?.start();
      setIsMicActive(true);
      setOrbState('meeting');

      wsClientRef.current?.send({
        type: 'START_MEETING',
        title,
        audioSource: source
      });
    } catch (err: any) {
      alert('Failed to start meeting capture: ' + err.message);
    }
  };

  const handleStopMeeting = (meetingId: string) => {
    audioManagerRef.current?.stopAll();
    recognizerRef.current?.stop();
    setIsMicActive(false);
    setOrbState('idle');
    wsClientRef.current?.send({ type: 'STOP_MEETING', meetingId });
  };

  const handleSummarizeMeeting = (meetingId: string) => {
    setIsSummarizingMeeting(true);
    wsClientRef.current?.send({
      type: 'SUMMARIZE_MEETING',
      meetingId,
      model: lmStatus?.activeModel || undefined
    });
  };

  const handleExportMarkdown = (meetingId: string) => {
    window.open(`/api/meetings/${meetingId}/export`, '_blank');
  };

  return (
    <div className={`app-container state-${orbState}`}>
      {/* Ambient Lighting Orb Glows */}
      <div className="ambient-glow-container">
        <div className="ambient-glow-orb top-center" />
        <div className="ambient-glow-orb bottom-right" />
      </div>

      {/* Top Application Header */}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo-badge">
            <Sparkles size={20} color="#050608" />
          </div>
          <div>
            <div className="app-title">RVoice Proton</div>
          </div>
        </div>

        {/* Mode Switcher */}
        <nav className="mode-switcher">
          <button
            onClick={() => { setCurrentMode('voice'); setOrbState('idle'); }}
            className={`mode-tab ${currentMode === 'voice' ? 'active voice' : ''}`}
          >
            <Mic size={15} />
            <span>Voice Assistant</span>
          </button>

          <button
            onClick={() => { setCurrentMode('codestudio'); }}
            className={`mode-tab ${currentMode === 'codestudio' ? 'active codestudio' : ''}`}
          >
            <Code2 size={15} />
            <span>Code Studio (Text)</span>
          </button>

          <button
            onClick={() => { setCurrentMode('meeting'); setOrbState(currentMeeting?.status === 'recording' ? 'meeting' : 'idle'); }}
            className={`mode-tab ${currentMode === 'meeting' ? 'active meeting' : ''}`}
          >
            <FileText size={15} />
            <span>Meeting Notetaker</span>
          </button>
        </nav>

        {/* Telemetry & Settings */}
        <div className="header-actions">
          <TelemetryHUD
            status={lmStatus}
            metrics={metrics}
            currentTokensPerSec={tokensPerSec}
            onModelChange={(m) => wsClientRef.current?.send({ type: 'SET_MODEL', model: m })}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="glass-button"
            style={{ padding: '8px 12px' }}
            title="Engine Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Viewport Content based on Mode */}
      <main className="main-viewport">
        {currentMode === 'voice' && (
          <VoiceAssistantHUD
            orbState={orbState}
            audioLevel={audioLevel}
            frequencies={frequencies}
            isMicActive={isMicActive}
            onToggleMic={handleToggleMic}
            onInterrupt={handleInterrupt}
            persona={assistantPersona}
            onSelectPersona={(p) => setAssistantPersona(p)}
            messages={voiceMessages}
            interimTranscript={interimTranscript}
            streamingAssistantText={streamingAssistantText}
            onRepeatAudio={(txt) => synthesizerRef.current?.speak(txt)}
          />
        )}

        {currentMode === 'codestudio' && (
          <CodeStudio
            messages={codeMessages}
            streamingText={streamingAssistantText}
            isStreaming={isStreaming}
            onSendPrompt={handleSendCodePrompt}
          />
        )}

        {currentMode === 'meeting' && (
          <MeetingView
            currentMeeting={currentMeeting}
            onStartMeeting={handleStartMeeting}
            onStopMeeting={handleStopMeeting}
            onAddTranscript={(id, entry) => wsClientRef.current?.send({ type: 'ADD_MEETING_TRANSCRIPT', meetingId: id, entry })}
            onSummarizeMeeting={handleSummarizeMeeting}
            isSummarizing={isSummarizingMeeting}
            onExportMarkdown={handleExportMarkdown}
            audioLevel={audioLevel}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={lmStatus}
        onUpdateEndpoint={(url) => {
          fetch('/api/lmstudio/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: url })
          }).then(() => wsClientRef.current?.send({ type: 'CHECK_LM_STUDIO' }));
        }}
        voices={availableVoices}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => {
          setSelectedVoice(v);
          synthesizerRef.current?.setVoice(v);
        }}
        vadSensitivity={vadSensitivity}
        onUpdateVadSensitivity={(val) => {
          setVadSensitivity(val);
          audioManagerRef.current?.setThreshold(val);
        }}
        onRefreshLMStudio={() => wsClientRef.current?.send({ type: 'CHECK_LM_STUDIO' })}
      />
    </div>
  );
};
