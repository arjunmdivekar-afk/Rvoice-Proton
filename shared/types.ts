// Shared Protocol Types for RVoice Proton

export type AppMode = 'voice' | 'english' | 'meeting' | 'codestudio';

export type AssistantPersona = 'executive' | 'companion' | 'tutor' | 'creative';

export type LLMProvider = 'lmstudio' | 'ollama' | 'custom';

export interface ModelInfo {
  id: string;
  name?: string;
  object?: string;
  owned_by?: string;
  size?: number;
}

export interface LLMProviderStatus {
  provider: LLMProvider;
  connected: boolean;
  endpoint: string;
  models: ModelInfo[];
  activeModel: string | null;
  error?: string;
}

// Backward compatibility alias
export type LMStudioStatus = LLMProviderStatus;

export interface LatencyMetrics {
  vadMs?: number;
  sttMs?: number;
  ttftMs?: number;
  tokensPerSec?: number;
  ttsMs?: number;
  totalRoundtripMs?: number;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  hasErrors: boolean;
  explanation?: string;
  rule?: string;
}

export interface VocabCard {
  id: string;
  word: string;
  partOfSpeech: string;
  phonetic?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  correctDefinition: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms?: string[];
}

export interface VocabEvaluation {
  cardId: string;
  word: string;
  userMeaning: string;
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number; // 0 - 100
  feedback: string;
  betterPhrasing?: string;
  correctDefinition: string;
  exampleSentence: string;
  synonyms: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AppMode;
  grammarCorrection?: GrammarCorrection;
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
  };
  metrics?: LatencyMetrics;
}

export interface MeetingParticipant {
  id: string;
  name: string;
  color: string;
  talkTimeSeconds: number;
  talkPercentage: number;
}

export interface MeetingTranscriptEntry {
  id: string;
  speaker: string;
  speakerId?: string;
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
  followUpEmail?: string;
  speakerContributions?: { speaker: string; contribution: string }[];
}

export interface MeetingSession {
  id: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  status: 'recording' | 'paused' | 'completed';
  audioSource: 'microphone' | 'tab' | 'both';
  audioUrl?: string;
  videoUrl?: string;
  hasVideo?: boolean;
  transcript: MeetingTranscriptEntry[];
  participants?: MeetingParticipant[];
  summary?: MeetingSummary;
}

export interface VoiceConversation {
  id: string;
  title: string;
  startedAt: number;
  persona: AssistantPersona;
  messages: ChatMessage[];
}

// WebSocket client-to-server messages
export type ClientMessage =
  | { type: 'AUDIO_CHUNK'; data: string } // base64 pcm
  | { type: 'TEXT_PROMPT'; prompt: string; mode: AppMode; persona?: AssistantPersona; model?: string }
  | { type: 'INTERRUPT' } // Barge-in signal
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_PROVIDER'; provider: LLMProvider; endpoint?: string }
  | { type: 'SET_MODEL'; model: string }
  | { type: 'START_MEETING'; title: string; audioSource: 'microphone' | 'tab' | 'both' }
  | { type: 'STOP_MEETING'; meetingId: string; hasVideo?: boolean }
  | { type: 'ADD_MEETING_TRANSCRIPT'; meetingId: string; entry: Omit<MeetingTranscriptEntry, 'id'> }
  | { type: 'UPDATE_MEETING_TRANSCRIPT'; meetingId: string; entries: MeetingTranscriptEntry[] }
  | { type: 'UPDATE_PARTICIPANTS'; meetingId: string; participants: MeetingParticipant[] }
  | { type: 'SUMMARIZE_MEETING'; meetingId: string; model?: string; style?: 'executive' | 'detailed' | 'action_items' | 'email' }
  | { type: 'EVALUATE_VOCAB'; card: VocabCard; userMeaning: string; model?: string }
  | { type: 'CHECK_LM_STUDIO' }
  | { type: 'CHECK_LLM_STATUS' };

// WebSocket server-to-client messages
export type ServerMessage =
  | { type: 'CONNECTED'; clientId: string }
  | { type: 'LM_STUDIO_STATUS'; status: LLMProviderStatus }
  | { type: 'LLM_STATUS'; status: LLMProviderStatus }
  | { type: 'TOKEN_STREAM'; token: string; messageId: string }
  | { type: 'TTS_CHUNK'; text: string; messageId: string; isFinal: boolean }
  | { type: 'GENERATION_COMPLETE'; messageId: string; fullContent: string; metrics: LatencyMetrics }
  | { type: 'GENERATION_ABORTED'; messageId: string }
  | { type: 'MEETING_UPDATED'; session: MeetingSession }
  | { type: 'MEETING_SUMMARY_GENERATED'; meetingId: string; summary: MeetingSummary }
  | { type: 'VOCAB_EVALUATED'; evaluation: VocabEvaluation }
  | { type: 'ERROR'; message: string };
