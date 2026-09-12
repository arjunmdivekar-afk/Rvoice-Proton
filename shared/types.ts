// Shared Protocol Types for RVoice Proton

export type AppMode = 'voice' | 'codestudio' | 'meeting';

export type AssistantPersona = 'executive' | 'companion' | 'tutor' | 'creative';

export interface ModelInfo {
  id: string;
  object: string;
  owned_by?: string;
}

export interface LMStudioStatus {
  connected: boolean;
  endpoint: string;
  models: ModelInfo[];
  activeModel: string | null;
  error?: string;
}

export interface LatencyMetrics {
  vadMs?: number;
  sttMs?: number;
  ttftMs?: number;
  tokensPerSec?: number;
  ttsMs?: number;
  totalRoundtripMs?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AppMode;
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
  };
  metrics?: LatencyMetrics;
}

export interface MeetingTranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number; // Seconds from start of meeting
  bookmarked?: boolean;
}

export interface MeetingActionItem {
  id: string;
  task: string;
  owner?: string;
  deadline?: string;
  completed: boolean;
}

export interface MeetingSummary {
  id: string;
  meetingId: string;
  title: string;
  date: string;
  durationSeconds: number;
  executiveBrief: string;
  keyDecisions: string[];
  actionItems: MeetingActionItem[];
  keyTopics: string[];
  sentiment?: string;
}

export interface MeetingSession {
  id: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  status: 'recording' | 'paused' | 'completed';
  audioSource: 'microphone' | 'tab' | 'both';
  transcript: MeetingTranscriptEntry[];
  summary?: MeetingSummary;
}

// WebSocket client-to-server messages
export type ClientMessage =
  | { type: 'AUDIO_CHUNK'; data: string } // base64 pcm
  | { type: 'TEXT_PROMPT'; prompt: string; mode: AppMode; persona?: AssistantPersona; model?: string }
  | { type: 'INTERRUPT' } // Barge-in signal
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_MODEL'; model: string }
  | { type: 'START_MEETING'; title: string; audioSource: 'microphone' | 'tab' | 'both' }
  | { type: 'STOP_MEETING'; meetingId: string }
  | { type: 'ADD_MEETING_TRANSCRIPT'; meetingId: string; entry: Omit<MeetingTranscriptEntry, 'id'> }
  | { type: 'SUMMARIZE_MEETING'; meetingId: string; model?: string }
  | { type: 'CHECK_LM_STUDIO' };

// WebSocket server-to-client messages
export type ServerMessage =
  | { type: 'CONNECTED'; clientId: string }
  | { type: 'LM_STUDIO_STATUS'; status: LMStudioStatus }
  | { type: 'TOKEN_STREAM'; token: string; messageId: string }
  | { type: 'TTS_CHUNK'; text: string; messageId: string; isFinal: boolean }
  | { type: 'GENERATION_COMPLETE'; messageId: string; fullContent: string; metrics: LatencyMetrics }
  | { type: 'GENERATION_ABORTED'; messageId: string }
  | { type: 'MEETING_UPDATED'; session: MeetingSession }
  | { type: 'MEETING_SUMMARY_GENERATED'; meetingId: string; summary: MeetingSummary }
  | { type: 'ERROR'; message: string };
