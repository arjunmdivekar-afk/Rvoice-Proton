import { AppMode, AssistantPersona, LatencyMetrics, LMStudioStatus, ModelInfo } from '../../../shared/types.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onSentence: (sentence: string) => void;
  onComplete: (fullText: string, metrics: LatencyMetrics) => void;
  onError: (error: Error) => void;
}

export class LMStudioService {
  private baseUrl: string;
  private activeModel: string | null = null;
  private activeControllers: Map<string, AbortController> = new Map();

  constructor(baseUrl: string = 'http://localhost:1234/v1') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setActiveModel(modelId: string) {
    this.activeModel = modelId;
  }

  /**
   * Probes LM Studio to check connection and retrieve currently loaded models.
   */
  public async getStatus(): Promise<LMStudioStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          connected: false,
          endpoint: this.baseUrl,
          models: [],
          activeModel: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = (await response.json()) as { data?: ModelInfo[] };
      const models = data.data || [];

      if (!this.activeModel && models.length > 0) {
        this.activeModel = models[0].id;
      }

      return {
        connected: true,
        endpoint: this.baseUrl,
        models,
        activeModel: this.activeModel
      };
    } catch (err: any) {
      return {
        connected: false,
        endpoint: this.baseUrl,
        models: [],
        activeModel: null,
        error: err.name === 'AbortError' ? 'Connection timed out' : err.message || 'Cannot reach LM Studio'
      };
    }
  }

  /**
   * Generates the appropriate system prompt based on mode and assistant persona.
   */
  public getSystemPrompt(mode: AppMode, persona: AssistantPersona = 'executive'): string {
    if (mode === 'voice') {
      return `You are RVoice Proton, an ultra-fast, intelligent, and articulate voice assistant.
CRITICAL VOICE RULES:
1. STRICT ZERO-CODE RULE: You are interacting via natural spoken voice. NEVER output programming code snippets, brackets, parentheses, curly braces, or markdown code blocks under any circumstance.
2. If the user asks for code, programming solutions, or scripts, explain the conceptual logic briefly and verbally guide them: "I've explained the logic conceptually. To see and copy the complete implementation, please switch to the Code Studio tab."
3. Speak in clear, natural, spoken conversational English. Use brief, punchy sentences. Avoid bullet lists, markdown headers, or tables.
4. Tone: ${persona === 'executive' ? 'crisp, professional, and strategic' : persona === 'tutor' ? 'patient, illuminating, and friendly' : persona === 'creative' ? 'engaging, witty, and imaginative' : 'warm, approachable, and helpful'}.`;
    }

    if (mode === 'codestudio') {
      return `You are RVoice Proton Code Studio, a world-class principal software architect and software engineer.
You are running in a dedicated text-only Code Studio environment (voice output is disabled).
RULES:
1. Write clean, production-grade, idiomatic, and robust code.
2. Use markdown code fences with the language identifier (e.g. \`\`\`typescript, \`\`\`python).
3. Include brief inline comments explaining critical architecture or non-obvious logic.
4. If modifying existing code, provide the full updated file or clearly marked diff blocks.`;
    }

    // Meeting Mode
    return `You are RVoice Proton Meeting Intelligence Officer.
You analyze meeting transcripts to extract high-leverage insights, decisions, and actionable tasks with clarity and precision.`;
  }

  /**
   * Streams a response from LM Studio with SSE, sentence chunking, and latency profiling.
   */
  public async streamCompletion(
    messageId: string,
    prompt: string,
    mode: AppMode,
    persona: AssistantPersona = 'executive',
    callbacks: StreamCallbacks,
    customModel?: string
  ): Promise<void> {
    const controller = new AbortController();
    this.activeControllers.set(messageId, controller);

    const modelToUse = customModel || this.activeModel || 'local-model';
    const systemPrompt = this.getSystemPrompt(mode, persona);

    const startTime = Date.now();
    let ttftTime: number | undefined;
    let tokenCount = 0;
    let fullText = '';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true,
          temperature: mode === 'codestudio' ? 0.2 : 0.7,
          max_tokens: mode === 'voice' ? 450 : 2048
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`LM Studio HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                if (tokenCount === 0) {
                  ttftTime = Date.now() - startTime;
                }
                tokenCount++;
                fullText += delta;
                callbacks.onToken(delta);
              }
            } catch (err) {
              // Ignore partial JSON parse chunks
            }
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const tokensPerSec = totalDuration > 0 ? Number(((tokenCount / totalDuration) * 1000).toFixed(1)) : 0;

      const metrics: LatencyMetrics = {
        ttftMs: ttftTime || totalDuration,
        tokensPerSec,
        totalRoundtripMs: totalDuration
      };

      callbacks.onComplete(fullText, metrics);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Barge-in or manual cancel
        return;
      }
      callbacks.onError(err);
    } finally {
      this.activeControllers.delete(messageId);
    }
  }

  /**
   * Instantly aborts an in-flight generation (used for barge-in interruption).
   */
  public abort(messageId?: string) {
    if (messageId) {
      const controller = this.activeControllers.get(messageId);
      if (controller) {
        controller.abort();
        this.activeControllers.delete(messageId);
      }
    } else {
      // Abort all in-flight generations
      for (const [id, controller] of this.activeControllers.entries()) {
        controller.abort();
      }
      this.activeControllers.clear();
    }
  }
}
