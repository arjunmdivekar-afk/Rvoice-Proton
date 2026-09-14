import {
  AppMode,
  AssistantPersona,
  LatencyMetrics,
  LLMProvider,
  LLMProviderStatus,
  ModelInfo,
  VocabCard,
  VocabEvaluation
} from '../../../shared/types.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onSentence: (sentence: string) => void;
  onComplete: (fullText: string, metrics: LatencyMetrics) => void;
  onError: (error: Error) => void;
}

export class LMStudioService {
  private provider: LLMProvider = 'lmstudio';
  private lmStudioUrl: string = 'http://localhost:1234/v1';
  private ollamaUrl: string = 'http://localhost:11434';
  private customUrl: string = 'http://localhost:1234/v1';
  private activeModel: string | null = null;
  private activeControllers: Map<string, AbortController> = new Map();

  constructor(defaultProvider: LLMProvider = 'lmstudio', defaultUrl?: string) {
    this.provider = defaultProvider;
    if (defaultUrl) {
      if (defaultProvider === 'ollama') this.ollamaUrl = defaultUrl.replace(/\/+$/, '');
      else if (defaultProvider === 'lmstudio') this.lmStudioUrl = defaultUrl.replace(/\/+$/, '');
      else this.customUrl = defaultUrl.replace(/\/+$/, '');
    }
  }

  public setProvider(provider: LLMProvider, endpoint?: string) {
    this.provider = provider;
    this.activeModel = null;
    if (endpoint) {
      const clean = endpoint.replace(/\/+$/, '');
      if (provider === 'ollama') this.ollamaUrl = clean;
      else if (provider === 'lmstudio') this.lmStudioUrl = clean;
      else this.customUrl = clean;
    }
  }

  public getProvider(): LLMProvider {
    return this.provider;
  }

  public getActiveEndpoint(): string {
    if (this.provider === 'ollama') return this.ollamaUrl;
    if (this.provider === 'custom') return this.customUrl;
    return this.lmStudioUrl;
  }

  public setEndpoint(url: string) {
    const clean = url.replace(/\/+$/, '');
    if (this.provider === 'ollama') this.ollamaUrl = clean;
    else if (this.provider === 'custom') this.customUrl = clean;
    else this.lmStudioUrl = clean;
  }

  public setActiveModel(modelId: string) {
    this.activeModel = modelId;
  }

  public getActiveModel(): string | null {
    return this.activeModel;
  }

  /**
   * Returns the OpenAI-compatible v1 base endpoint for the active provider.
   */
  private getV1Endpoint(): string {
    const raw = this.getActiveEndpoint();
    if (this.provider === 'ollama') {
      // If user provided http://localhost:11434 without /v1, append /v1 for OpenAI endpoints
      return raw.endsWith('/v1') ? raw : `${raw}/v1`;
    }
    return raw.endsWith('/v1') ? raw : `${raw}/v1`;
  }

  /**
   * Probes active provider (LM Studio or Ollama) to check connection and retrieve models.
   */
  public async getStatus(): Promise<LLMProviderStatus> {
    const endpoint = this.getActiveEndpoint();

    if (this.provider === 'ollama') {
      return this.getOllamaStatus();
    }

    // LM Studio / OpenAI-compatible provider
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const v1 = this.getV1Endpoint();
      const response = await fetch(`${v1}/models`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          provider: this.provider,
          connected: false,
          endpoint,
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
        provider: this.provider,
        connected: true,
        endpoint,
        models,
        activeModel: this.activeModel
      };
    } catch (err: any) {
      return {
        provider: this.provider,
        connected: false,
        endpoint,
        models: [],
        activeModel: null,
        error: err.name === 'AbortError' ? 'Connection timed out' : err.message || 'Cannot reach LM Studio'
      };
    }
  }

  /**
   * Probes Ollama via /api/tags or /v1/models
   */
  private async getOllamaStatus(): Promise<LLMProviderStatus> {
    const endpoint = this.ollamaUrl;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Try Ollama native /api/tags first
      const baseOllama = endpoint.replace(/\/v1$/, '');
      const response = await fetch(`${baseOllama}/api/tags`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string; model?: string; size?: number }> };
        const rawModels = data.models || [];
        const models: ModelInfo[] = rawModels.map(m => ({
          id: m.name,
          name: m.name,
          object: 'model',
          size: m.size
        }));

        if (!this.activeModel && models.length > 0) {
          this.activeModel = models[0].id;
        }

        return {
          provider: 'ollama',
          connected: true,
          endpoint,
          models,
          activeModel: this.activeModel
        };
      }

      // Fallback to /v1/models
      const v1Res = await fetch(`${this.getV1Endpoint()}/models`);
      if (v1Res.ok) {
        const data = (await v1Res.json()) as { data?: ModelInfo[] };
        const models = data.data || [];
        if (!this.activeModel && models.length > 0) {
          this.activeModel = models[0].id;
        }
        return {
          provider: 'ollama',
          connected: true,
          endpoint,
          models,
          activeModel: this.activeModel
        };
      }

      return {
        provider: 'ollama',
        connected: false,
        endpoint,
        models: [],
        activeModel: null,
        error: `Ollama returned HTTP ${response.status}`
      };
    } catch (err: any) {
      return {
        provider: 'ollama',
        connected: false,
        endpoint,
        models: [],
        activeModel: null,
        error: err.name === 'AbortError' ? 'Ollama connection timed out' : err.message || 'Cannot reach Ollama on port 11434'
      };
    }
  }

  public getSystemPrompt(mode: AppMode, persona: AssistantPersona = 'executive'): string {
    if (mode === 'voice') {
      return `You are RVoice Proton, an ultra-fast, intelligent, and articulate voice assistant.
CRITICAL VOICE RULES:
1. STRICT ZERO-CODE RULE: You are interacting via natural spoken voice. NEVER output programming code snippets, brackets, parentheses, curly braces, or markdown code blocks under any circumstance.
2. If the user asks for code, programming solutions, or scripts, explain the conceptual logic briefly and verbally guide them: "I've explained the logic conceptually. To see and copy the complete implementation, please switch to the Code Studio tab."
3. Speak in clear, natural, spoken conversational English. Use brief, punchy sentences. Avoid bullet lists, markdown headers, or tables.
4. Tone: ${persona === 'executive' ? 'crisp, professional, and strategic' : persona === 'tutor' ? 'patient, illuminating, and friendly' : persona === 'creative' ? 'engaging, witty, and imaginative' : 'warm, approachable, and helpful'}.`;
    }

    if (mode === 'english') {
      return `You are RVoice Proton English Master, a friendly, elite AI English Language & Grammar Tutor.
You are running in the dedicated English Learning & Grammar Studio.

MANDATORY CONSTRAINTS:
1. STRICT ENGLISH & GRAMMAR FOCUS ONLY: You must ONLY discuss English language learning, grammar rules, spelling, vocabulary, sentence structures, punctuation, idioms, pronunciation, and writing improvement.
2. ABSOLUTELY NO CODING OR PROGRAMMING: If the user asks for code, programming solutions, math, or anything outside of English language learning and grammar, POLITELY AND FIRMLY DECLINE and redirect them: "I am your dedicated English & Grammar Tutor. I can only assist you with mastering English vocabulary, grammar, and sentence structure. Let's practice English instead!"
3. INTERACTIVE GRAMMAR CORRECTION: If the user makes any grammatical errors, awkward phrasing, or spelling mistakes in their message, gently point it out, explain the grammar rule simply, and provide the polished natural sentence.
4. TONE: Encouraging, articulate, engaging, and patient.`;
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
   * Streams a response from active provider (LM Studio or Ollama) with SSE and latency profiling.
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

    const modelToUse = customModel || this.activeModel || (this.provider === 'ollama' ? 'llama3:latest' : 'local-model');
    const systemPrompt = this.getSystemPrompt(mode, persona);
    const v1 = this.getV1Endpoint();

    const startTime = Date.now();
    let ttftTime: number | undefined;
    let tokenCount = 0;
    let fullText = '';

    try {
      const response = await fetch(`${v1}/chat/completions`, {
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
        throw new Error(`${this.provider.toUpperCase()} HTTP ${response.status}: ${response.statusText}`);
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
        return; // Barge-in interruption
      }
      callbacks.onError(err);
    } finally {
      this.activeControllers.delete(messageId);
    }
  }

  public abort(messageId?: string) {
    if (messageId) {
      const controller = this.activeControllers.get(messageId);
      if (controller) {
        controller.abort();
        this.activeControllers.delete(messageId);
      }
    } else {
      for (const [, controller] of this.activeControllers.entries()) {
        controller.abort();
      }
      this.activeControllers.clear();
    }
  }

  /**
   * Evaluates user's submitted definition for a vocabulary flashcard using local LLM
   */
  public async evaluateVocabularyMeaning(
    card: VocabCard,
    userMeaning: string,
    customModel?: string
  ): Promise<VocabEvaluation> {
    const modelToUse = customModel || this.activeModel || (this.provider === 'ollama' ? 'llama3:latest' : 'local-model');
    const v1 = this.getV1Endpoint();

    const prompt = `Target Word: "${card.word}" (${card.partOfSpeech})
Correct Dictionary Definition: "${card.correctDefinition}"
User's Submitted Meaning: "${userMeaning}"

You are an expert English language teacher and lexicographer. Evaluate whether the user's explanation of the word is correct.
Assess accuracy, conceptual understanding, and precision.

Return ONLY a valid JSON object matching this schema (do NOT wrap with backticks or markdown, just raw JSON):
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "score": <number from 0 to 100>,
  "feedback": "<Clear 1-2 sentence feedback explaining what the user got right or why it was inaccurate>",
  "betterPhrasing": "<A polished, natural phrasing of the definition>",
  "exampleSentence": "<An engaging example sentence using the word>",
  "synonyms": ["<synonym1>", "<synonym2>", "<synonym3>"]
}`;

    try {
      const response = await fetch(`${v1}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: 'You are an English vocabulary evaluation engine. You only output raw valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 600
        })
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const text = data.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            cardId: card.id,
            word: card.word,
            userMeaning,
            verdict: parsed.verdict || (parsed.score >= 75 ? 'correct' : parsed.score >= 45 ? 'partially_correct' : 'incorrect'),
            score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 75,
            feedback: parsed.feedback || `Good effort with "${card.word}".`,
            betterPhrasing: parsed.betterPhrasing || card.correctDefinition,
            correctDefinition: card.correctDefinition,
            exampleSentence: parsed.exampleSentence || card.exampleSentence,
            synonyms: Array.isArray(parsed.synonyms) && parsed.synonyms.length > 0 ? parsed.synonyms : card.synonyms
          };
        }
      }
    } catch (err) {
      console.warn('LLM vocabulary evaluation failed, using fallback heuristic:', err);
    }

    // Fallback heuristic scoring if model is unreachable or response is non-JSON
    const cleanUser = userMeaning.toLowerCase().trim();
    const cleanDef = card.correctDefinition.toLowerCase();
    const userWords = cleanUser.split(/\s+/).filter((w) => w.length > 3);
    const defWords = cleanDef.split(/\s+/).filter((w) => w.length > 3);
    const matches = userWords.filter((w) => defWords.some((d) => d.includes(w) || w.includes(d)));
    const matchRatio = userWords.length > 0 ? matches.length / userWords.length : 0;

    let verdict: 'correct' | 'partially_correct' | 'incorrect' = 'incorrect';
    let score = 30;
    if (matchRatio >= 0.35 || cleanDef.includes(cleanUser) || card.synonyms.some((s) => cleanUser.includes(s.toLowerCase()))) {
      verdict = 'correct';
      score = 92;
    } else if (matchRatio > 0.1 || userWords.length >= 2) {
      verdict = 'partially_correct';
      score = 65;
    }

    return {
      cardId: card.id,
      word: card.word,
      userMeaning,
      verdict,
      score,
      feedback:
        verdict === 'correct'
          ? `Excellent! Your meaning aligns closely with "${card.word}".`
          : verdict === 'partially_correct'
          ? `You have the general idea of "${card.word}", but the precise definition has more nuance.`
          : `Not quite. "${card.word}" means: ${card.correctDefinition}.`,
      betterPhrasing: card.correctDefinition,
      correctDefinition: card.correctDefinition,
      exampleSentence: card.exampleSentence,
      synonyms: card.synonyms
    };
  }
}
