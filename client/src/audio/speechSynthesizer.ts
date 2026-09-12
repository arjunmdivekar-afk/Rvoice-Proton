// Browser Speech Synthesizer Queue with Instant Barge-In Cancellation

export class SpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private queue: string[] = [];
  private isSpeaking: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private onStateChange?: (speaking: boolean) => void;

  constructor(onStateChange?: (speaking: boolean) => void) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
    }
    this.onStateChange = onStateChange;
  }

  private initVoice() {
    if (!this.synth) return;

    const setBestVoice = () => {
      const voices = this.synth?.getVoices() || [];
      // Look for high-quality natural voices first
      const naturalVoice = voices.find(v =>
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')) &&
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;

      this.selectedVoice = naturalVoice;
    };

    setBestVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setBestVoice;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || [];
  }

  public setVoice(voiceName: string) {
    const voices = this.getVoices();
    const found = voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  /**
   * Enqueues a clean sentence for speech synthesis.
   */
  public speak(sentence: string) {
    const clean = sentence.trim();
    if (!clean || !this.synth) return;

    this.queue.push(clean);
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (!this.synth || this.queue.length === 0) {
      this.isSpeaking = false;
      this.onStateChange?.(false);
      return;
    }

    const text = this.queue.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // Natural conversational tempo
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStateChange?.(true);
    };

    utterance.onend = () => {
      this.processQueue();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.processQueue();
    };

    this.synth.speak(utterance);
  }

  /**
   * Instant Barge-In Cancellation: Clears audio queue and halts speech synthesis immediately.
   */
  public cancel() {
    this.queue = [];
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.onStateChange?.(false);
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
