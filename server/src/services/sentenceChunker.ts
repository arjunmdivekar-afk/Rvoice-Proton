// Sentence Boundary Detector & Voice Speech Filter for Low-Latency TTS

export class SentenceChunker {
  private buffer = '';
  private isVoiceMode = false;
  private insideCodeBlock = false;

  constructor(isVoiceMode: boolean = false) {
    this.isVoiceMode = isVoiceMode;
  }

  public setVoiceMode(voiceMode: boolean) {
    this.isVoiceMode = voiceMode;
  }

  /**
   * Appends incoming streaming token and returns any complete sentence ready for speech synthesis.
   * If in Voice Mode, strips code fences and programming syntax.
   */
  public push(token: string): string[] {
    // Detect code fences to filter out in voice mode
    if (this.isVoiceMode) {
      if (token.includes('```')) {
        this.insideCodeBlock = !this.insideCodeBlock;
        return [];
      }
      if (this.insideCodeBlock) {
        // Skip tokens that are part of raw code in voice mode
        return [];
      }
    }

    this.buffer += token;
    const sentences: string[] = [];

    // Split on sentence boundaries: ., !, ?, or double newline
    // Ensure we don't break on numbers like 3.14 or abbreviations like e.g. or Dr.
    const sentenceRegex = /([.!?]+[\s\r\n]+)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(this.buffer)) !== null) {
      const boundaryEnd = match.index + match[0].length;
      const sentence = this.buffer.slice(lastIndex, boundaryEnd).trim();

      if (sentence.length > 0) {
        // Filter out any stray code symbols if in voice mode
        const cleanedSentence = this.isVoiceMode ? this.cleanVoiceSpeech(sentence) : sentence;
        if (cleanedSentence.length > 0) {
          sentences.push(cleanedSentence);
        }
      }
      lastIndex = boundaryEnd;
    }

    if (lastIndex > 0) {
      this.buffer = this.buffer.slice(lastIndex);
    }

    return sentences;
  }

  /**
   * Flushes any remaining text in the buffer (e.g. at the end of LLM generation).
   */
  public flush(): string | null {
    const remaining = this.buffer.trim();
    this.buffer = '';
    this.insideCodeBlock = false;

    if (!remaining) return null;
    return this.isVoiceMode ? this.cleanVoiceSpeech(remaining) : remaining;
  }

  public reset() {
    this.buffer = '';
    this.insideCodeBlock = false;
  }

  private cleanVoiceSpeech(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')     // Remove inline backticks
      .replace(/[*_#~]/g, '')          // Remove markdown formatting
      .replace(/[{}[\]<>\\/|=+]/g, '') // Remove code brackets & math symbols
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
