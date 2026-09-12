import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MeetingActionItem, MeetingSession, MeetingSummary, MeetingTranscriptEntry } from '../../../shared/types.js';
import { LMStudioService } from './lmStudioService.js';

export class MeetingService {
  private storageDir: string;
  private storageFile: string;
  private sessions: Map<string, MeetingSession> = new Map();
  private lmStudioService: LMStudioService;

  constructor(lmStudioService: LMStudioService, storageDir?: string) {
    this.lmStudioService = lmStudioService;
    this.storageDir = storageDir || path.join(process.cwd(), 'storage');
    this.storageFile = path.join(this.storageDir, 'meetings.json');

    this.ensureStorage();
    this.loadFromDisk();
  }

  private ensureStorage() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const data = JSON.parse(raw) as MeetingSession[];
        data.forEach(s => this.sessions.set(s.id, s));
      }
    } catch (err) {
      console.error('Failed to load meeting sessions from disk:', err);
    }
  }

  private saveToDisk() {
    try {
      this.ensureStorage();
      const array = Array.from(this.sessions.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(array, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save meeting sessions to disk:', err);
    }
  }

  public startMeeting(title: string, audioSource: 'microphone' | 'tab' | 'both'): MeetingSession {
    const id = uuidv4();
    const session: MeetingSession = {
      id,
      title: title || `Meeting - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      startedAt: Date.now(),
      durationSeconds: 0,
      status: 'recording',
      audioSource,
      transcript: []
    };

    this.sessions.set(id, session);
    this.saveToDisk();
    return session;
  }

  public getSession(id: string): MeetingSession | undefined {
    return this.sessions.get(id);
  }

  public getAllSessions(): MeetingSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  public addTranscriptEntry(meetingId: string, entry: Omit<MeetingTranscriptEntry, 'id'>): MeetingSession | null {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    const newEntry: MeetingTranscriptEntry = {
      ...entry,
      id: uuidv4()
    };

    session.transcript.push(newEntry);
    session.durationSeconds = Math.floor((Date.now() - session.startedAt) / 1000);
    this.saveToDisk();
    return session;
  }

  public stopMeeting(meetingId: string): MeetingSession | null {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    session.status = 'completed';
    session.endedAt = Date.now();
    session.durationSeconds = Math.floor((session.endedAt - session.startedAt) / 1000);
    this.saveToDisk();
    return session;
  }

  /**
   * Generates a structured executive meeting summary using LM Studio.
   */
  public async generateSummary(meetingId: string, modelOverride?: string): Promise<MeetingSummary | null> {
    const session = this.sessions.get(meetingId);
    if (!session || session.transcript.length === 0) return null;

    const transcriptText = session.transcript
      .map(t => `[${this.formatTimestamp(t.timestamp)}] ${t.speaker}: ${t.text}${t.bookmarked ? ' [BOOKMARKED]' : ''}`)
      .join('\n');

    const prompt = `Analyze the following meeting transcript and produce a high-level executive meeting brief.

Transcript:
${transcriptText}

You must return your response in the following structured JSON format only (valid JSON, no markdown outside the JSON block):
{
  "executiveBrief": "A concise, high-impact 2-3 paragraph overview of what was discussed, context, and outcomes.",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {
      "task": "Description of action item",
      "owner": "Name of assigned person or Unassigned",
      "deadline": "Stated deadline or TBD"
    }
  ],
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;

    const messageId = uuidv4();
    let jsonBuffer = '';

    return new Promise((resolve, reject) => {
      this.lmStudioService.streamCompletion(
        messageId,
        prompt,
        'meeting',
        'executive',
        {
          onToken: (token) => { jsonBuffer += token; },
          onSentence: () => {},
          onComplete: (fullText) => {
            try {
              // Extract JSON even if enclosed in markdown fences
              const cleaned = fullText
                .replace(/^```json/m, '')
                .replace(/^```/m, '')
                .replace(/```$/m, '')
                .trim();

              const parsed = JSON.parse(cleaned);
              const actionItems: MeetingActionItem[] = (parsed.actionItems || []).map((item: any) => ({
                id: uuidv4(),
                task: item.task || 'Untitled Task',
                owner: item.owner || 'Unassigned',
                deadline: item.deadline || 'TBD',
                completed: false
              }));

              const summary: MeetingSummary = {
                id: uuidv4(),
                meetingId,
                title: session.title,
                date: new Date(session.startedAt).toLocaleDateString(),
                durationSeconds: session.durationSeconds,
                executiveBrief: parsed.executiveBrief || 'No summary generated.',
                keyDecisions: parsed.keyDecisions || [],
                actionItems,
                keyTopics: parsed.keyTopics || []
              };

              session.summary = summary;
              this.saveToDisk();
              resolve(summary);
            } catch (parseErr) {
              // Fallback to text summary if JSON parsing fails
              const fallbackSummary: MeetingSummary = {
                id: uuidv4(),
                meetingId,
                title: session.title,
                date: new Date(session.startedAt).toLocaleDateString(),
                durationSeconds: session.durationSeconds,
                executiveBrief: fullText,
                keyDecisions: ['Refer to executive brief for details.'],
                actionItems: [],
                keyTopics: ['General Discussion']
              };
              session.summary = fallbackSummary;
              this.saveToDisk();
              resolve(fallbackSummary);
            }
          },
          onError: (err) => reject(err)
        },
        modelOverride
      );
    });
  }

  public exportMarkdown(meetingId: string): string {
    const session = this.sessions.get(meetingId);
    if (!session) return '';

    let md = `# 📝 Meeting Minutes: ${session.title}\n\n`;
    md += `**Date:** ${new Date(session.startedAt).toLocaleDateString()} ${new Date(session.startedAt).toLocaleTimeString()}\n`;
    md += `**Duration:** ${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s\n`;
    md += `**Audio Source:** ${session.audioSource}\n\n`;

    if (session.summary) {
      md += `## 🎯 Executive Brief\n${session.summary.executiveBrief}\n\n`;

      if (session.summary.keyDecisions.length > 0) {
        md += `## ⚖️ Key Decisions\n`;
        session.summary.keyDecisions.forEach(d => { md += `- ${d}\n`; });
        md += `\n`;
      }

      if (session.summary.actionItems.length > 0) {
        md += `## ✅ Action Items\n`;
        session.summary.actionItems.forEach(a => {
          md += `- [ ] **${a.task}** (Owner: ${a.owner || 'Unassigned'} | Deadline: ${a.deadline || 'TBD'})\n`;
        });
        md += `\n`;
      }
    }

    md += `## 📜 Full Transcript\n\n`;
    session.transcript.forEach(t => {
      md += `**[${this.formatTimestamp(t.timestamp)}] ${t.speaker}:** ${t.text}${t.bookmarked ? ' ⭐ *(Bookmarked)*' : ''}\n\n`;
    });

    return md;
  }

  private formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
