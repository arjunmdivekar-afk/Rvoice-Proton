import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MeetingActionItem, MeetingParticipant, MeetingSession, MeetingSummary, MeetingTranscriptEntry } from '../../../shared/types.js';
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
    this.recomputeParticipants(session);
    this.saveToDisk();
    return session;
  }

  public updateTranscript(meetingId: string, entries: MeetingTranscriptEntry[]): MeetingSession | null {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    session.transcript = entries;
    this.recomputeParticipants(session);
    this.saveToDisk();
    return session;
  }

  public updateParticipants(meetingId: string, participants: MeetingParticipant[]): MeetingSession | null {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    session.participants = participants;
    this.saveToDisk();
    return session;
  }

  private recomputeParticipants(session: MeetingSession) {
    const speakerWords: Record<string, number> = {};
    const palette = ['#00f2fe', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#38bdf8', '#fb923c', '#a3e635'];

    for (const t of session.transcript) {
      const words = t.text.trim().split(/\s+/).filter(Boolean).length;
      speakerWords[t.speaker] = (speakerWords[t.speaker] || 0) + words;
    }

    const totalWords = Object.values(speakerWords).reduce((a, b) => a + b, 0) || 1;
    const existing = new Map((session.participants || []).map(p => [p.name, p]));

    const computed: MeetingParticipant[] = Object.entries(speakerWords).map(([name, words], idx) => {
      const prev = existing.get(name);
      const estSeconds = Math.round(words / 2.5); // ~150 wpm = 2.5 words per sec
      return {
        id: prev?.id || uuidv4(),
        name,
        color: prev?.color || palette[idx % palette.length],
        talkTimeSeconds: estSeconds,
        talkPercentage: Math.round((words / totalWords) * 100)
      };
    });

    session.participants = computed.length > 0 ? computed : session.participants;
  }

  public stopMeeting(meetingId: string, hasVideo?: boolean): MeetingSession | null {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    session.status = 'completed';
    session.endedAt = Date.now();
    session.durationSeconds = Math.floor((session.endedAt - session.startedAt) / 1000);
    if (hasVideo !== undefined) {
      session.hasVideo = hasVideo;
    }
    this.recomputeParticipants(session);
    this.saveToDisk();
    return session;
  }

  /**
   * Generates a comprehensive structured executive meeting summary using Local LLM.
   */
  public async generateSummary(
    meetingId: string,
    modelOverride?: string,
    style: 'executive' | 'detailed' | 'action_items' | 'email' = 'executive'
  ): Promise<MeetingSummary | null> {
    const session = this.sessions.get(meetingId);
    if (!session) return null;

    const transcriptText = session.transcript.length > 0
      ? session.transcript
          .map(t => `[${this.formatTimestamp(t.timestamp)}] ${t.speaker}: ${t.text}${t.bookmarked ? ' [HIGHLIGHT]' : ''}`)
          .join('\n')
      : `Meeting Title: ${session.title}\nDate: ${new Date(session.startedAt).toLocaleDateString()}\nDuration: ${session.durationSeconds} seconds\nNote: General technical/strategic discussion session.`;

    const participantNames = session.participants && session.participants.length > 0
      ? session.participants.map(p => `${p.name} (${p.talkPercentage}% talk time)`).join(', ')
      : 'General Participants';

    let promptFocus = '';
    if (style === 'detailed') {
      promptFocus = 'Provide an in-depth, thorough breakdown of all topics, technical architecture decisions, and contextual discussions.';
    } else if (style === 'action_items') {
      promptFocus = 'Focus intensely on extracting every single action item, assigned task owner, technical deliverable, and target completion dates.';
    } else if (style === 'email') {
      promptFocus = 'Write a polished, professional follow-up recap email ready to send to team members and executives.';
    } else {
      promptFocus = 'Provide a high-impact executive brief with key strategic decisions and actionable deliverables.';
    }

    const prompt = `You are an expert Chief of Staff and technical meeting scribe. Analyze the following meeting transcript and participants.
${promptFocus}

Participants:
${participantNames}

Meeting Transcript:
${transcriptText}

You must return your response in valid JSON ONLY (no commentary or text before or after the JSON block):
{
  "executiveBrief": "A high-impact executive summary covering context, goals, major discussion points, and outcomes.",
  "sentiment": "e.g., Highly Productive & Strategic, or Collaborative Technical Sync",
  "keyDecisions": [
    "Decision 1 with rationale",
    "Decision 2"
  ],
  "actionItems": [
    {
      "task": "Specific actionable deliverable",
      "owner": "Assigned participant name or Unassigned",
      "deadline": "Stated deadline or Next Sprint / TBD"
    }
  ],
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "speakerContributions": [
    {
      "speaker": "Participant name",
      "contribution": "Concise summary of their main contributions and input during the meeting"
    }
  ],
  "followUpEmail": "Subject: Recap & Action Items: ${session.title}\\n\\nHi Team,\\n\\nThank you for today's sync. Here is a quick summary of what was discussed:\\n\\n[Key Takeaways]\\n\\n[Action Items]\\n\\nBest regards,"
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
              let parsed: any = null;
              // Robust JSON block extraction
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
              } else {
                parsed = JSON.parse(fullText.trim());
              }

              const actionItems: MeetingActionItem[] = (parsed.actionItems || []).map((item: any) => ({
                id: uuidv4(),
                task: item.task || 'Untitled Deliverable',
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
                sentiment: parsed.sentiment || 'Productive & Focused',
                keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
                actionItems,
                keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : ['General Sync'],
                followUpEmail: parsed.followUpEmail || undefined,
                speakerContributions: Array.isArray(parsed.speakerContributions) ? parsed.speakerContributions : undefined
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
                executiveBrief: fullText.replace(/```json/g, '').replace(/```/g, '').trim(),
                sentiment: 'Collaborative Sync',
                keyDecisions: ['Refer to executive brief for detailed discussion points.'],
                actionItems: [],
                keyTopics: ['General Sync', 'Architecture'],
                followUpEmail: `Subject: Meeting Recap: ${session.title}\n\nHi Team,\n\nHere is a recap of today's meeting:\n\n${fullText.slice(0, 300)}...\n\nBest regards,`
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
