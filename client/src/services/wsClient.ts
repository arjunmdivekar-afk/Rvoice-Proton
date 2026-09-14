// WebSocket Gateway Client for RVoice Proton

import { ClientMessage, LMStudioStatus, MeetingSession, MeetingSummary, ServerMessage, VocabEvaluation } from '@shared/types';

export type WSEventMap = {
  connected: (clientId: string) => void;
  disconnected: () => void;
  lmStudioStatus: (status: LMStudioStatus) => void;
  token: (token: string, messageId: string) => void;
  ttsChunk: (text: string, messageId: string, isFinal: boolean) => void;
  generationComplete: (messageId: string, fullContent: string, metrics: any) => void;
  generationAborted: (messageId: string) => void;
  meetingUpdated: (session: MeetingSession) => void;
  meetingSummaryGenerated: (meetingId: string, summary: MeetingSummary) => void;
  vocabEvaluated: (evaluation: VocabEvaluation) => void;
  error: (message: string) => void;
};

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: { [K in keyof WSEventMap]?: WSEventMap[K][] } = {};
  private reconnectTimer: number | null = null;
  private isExplicitClose = false;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development Vite proxies /ws to 3001, allowing mobile & WiFi devices on port 3344 to connect seamlessly
      this.url = `${protocol}//${window.location.host}/ws`;
    }
  }

  public connect() {
    this.isExplicitClose = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ Connected to RVoice Proton Gateway');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse WS server message:', e);
        }
      };

      this.ws.onclose = () => {
        this.emit('disconnected');
        if (!this.isExplicitClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WS error:', err);
      };
    } catch (err) {
      console.error('Failed to initiate WS connection:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket not open. Unable to send:', msg.type);
    }
  }

  public on<K extends keyof WSEventMap>(event: K, handler: WSEventMap[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(handler);
  }

  public off<K extends keyof WSEventMap>(event: K, handler: WSEventMap[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event] = (this.listeners[event] as any[]).filter(h => h !== handler);
  }

  private emit<K extends keyof WSEventMap>(event: K, ...args: Parameters<WSEventMap[K]>) {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((h: any) => h(...args));
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'CONNECTED':
        this.emit('connected', msg.clientId);
        break;
      case 'LM_STUDIO_STATUS':
      case 'LLM_STATUS':
        this.emit('lmStudioStatus', msg.status);
        break;
      case 'TOKEN_STREAM':
        this.emit('token', msg.token, msg.messageId);
        break;
      case 'TTS_CHUNK':
        this.emit('ttsChunk', msg.text, msg.messageId, msg.isFinal);
        break;
      case 'GENERATION_COMPLETE':
        this.emit('generationComplete', msg.messageId, msg.fullContent, msg.metrics);
        break;
      case 'GENERATION_ABORTED':
        this.emit('generationAborted', msg.messageId);
        break;
      case 'MEETING_UPDATED':
        this.emit('meetingUpdated', msg.session);
        break;
      case 'MEETING_SUMMARY_GENERATED':
        this.emit('meetingSummaryGenerated', msg.meetingId, msg.summary);
        break;
      case 'VOCAB_EVALUATED':
        this.emit('vocabEvaluated', msg.evaluation);
        break;
      case 'ERROR':
        this.emit('error', msg.message);
        break;
    }
  }

  public close() {
    this.isExplicitClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
