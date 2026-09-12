// Browser Speech-To-Text (STT) Speech Recognition Engine

export interface STTCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private callbacks: STTCallbacks = {};
  private language = 'en-US';

  constructor(callbacks: STTCallbacks = {}) {
    this.callbacks = callbacks;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        this.callbacks.onInterimResult?.(interimTranscript);
      }
      if (finalTranscript) {
        this.callbacks.onFinalResult?.(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', event.error);
        this.callbacks.onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we are supposed to be actively listening
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isListening = false;
          this.callbacks.onEnd?.();
        }
      } else {
        this.callbacks.onEnd?.();
      }
    };
  }

  public setCallbacks(callbacks: STTCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public start() {
    if (!this.recognition || this.isListening) return;
    try {
      this.isListening = true;
      this.recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
    }
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore
      }
    }
  }

  public isActive(): boolean {
    return this.isListening;
  }
}
