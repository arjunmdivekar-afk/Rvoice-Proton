// Master Audio Manager: Capture (Mic & Display Media), Recording & Playback, VAD, Analyser, and Barge-In Control

export interface AudioCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  onFrequencies?: (frequencies: Uint8Array) => void;
}

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private tabStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private animFrameId: number | null = null;
  private callbacks: AudioCallbacks = {};

  // Meeting Audio Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // VAD Parameters
  private isSpeaking = false;
  private silenceTimer: number | null = null;
  private speechThreshold = 0.035; // Energy RMS threshold
  private silenceHoldMs = 750;     // Hold silence before firing speechEnd

  constructor(callbacks: AudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: AudioCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setThreshold(threshold: number) {
    this.speechThreshold = Math.max(0.01, Math.min(0.2, threshold));
  }

  public async initAudioContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Starts microphone recording with acoustic echo cancellation and noise suppression.
   */
  public async startMicrophone(recordToFile = false): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        `Microphone access over WiFi requires HTTPS or localhost in modern browsers. Please access via https://${window.location.host} or http://localhost:3344.`
      );
    }

    const ctx = await this.initAudioContext();

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.connectSource(this.micStream, ctx);
    this.startAnalysisLoop();

    if (recordToFile) {
      this.startMediaRecorder(this.micStream);
    }

    return this.micStream;
  }

  /**
   * Captures Tab / System Audio (e.g. Google Meet, Zoom Web, Teams) via getDisplayMedia.
   */
  public async startTabAudio(recordToFile = false): Promise<MediaStream> {
    const ctx = await this.initAudioContext();

    this.tabStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    const audioTracks = this.tabStream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('No system/tab audio selected. Please check "Share tab audio" in the browser prompt.');
    }

    this.connectSource(this.tabStream, ctx);
    this.startAnalysisLoop();

    if (recordToFile) {
      this.startMediaRecorder(this.tabStream);
    }

    return this.tabStream;
  }

  private startMediaRecorder(stream: MediaStream) {
    try {
      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks for resilience
    } catch (err) {
      console.warn('Failed to start MediaRecorder for meeting audio playback:', err);
    }
  }

  /**
   * Stops meeting recording and generates a playable Audio URL.
   */
  public async stopMeetingRecording(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          this.recordedChunks = [];
          this.mediaRecorder = null;
          resolve(audioUrl);
        } else {
          this.mediaRecorder = null;
          resolve(null);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.mediaRecorder = null;
        resolve(null);
      }
    });
  }

  private connectSource(stream: MediaStream, ctx: AudioContext) {
    const sourceNode = ctx.createMediaStreamSource(stream);

    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
    }

    if (!this.compressor) {
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-40, ctx.currentTime);
      this.compressor.knee.setValueAtTime(40, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, ctx.currentTime);
    }

    sourceNode.connect(this.compressor);
    this.compressor.connect(this.analyser);
  }

  private startAnalysisLoop() {
    if (this.animFrameId) return;

    const dataArray = new Uint8Array(this.analyser?.frequencyBinCount || 128);
    const timeArray = new Float32Array(this.analyser?.fftSize || 256);

    const checkAudio = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      this.analyser.getFloatTimeDomainData(timeArray);

      let sum = 0;
      for (let i = 0; i < timeArray.length; i++) {
        sum += timeArray[i] * timeArray[i];
      }
      const rms = Math.sqrt(sum / timeArray.length);

      this.callbacks.onVolumeChange?.(rms);
      this.callbacks.onFrequencies?.(dataArray);

      if (rms > this.speechThreshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.callbacks.onSpeechStart?.();
        }
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.isSpeaking && !this.silenceTimer) {
        this.silenceTimer = window.setTimeout(() => {
          this.isSpeaking = false;
          this.silenceTimer = null;
          this.callbacks.onSpeechEnd?.();
        }, this.silenceHoldMs);
      }

      this.animFrameId = requestAnimationFrame(checkAudio);
    };

    this.animFrameId = requestAnimationFrame(checkAudio);
  }

  public stopAll() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isSpeaking = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.tabStream) {
      this.tabStream.getTracks().forEach(t => t.stop());
      this.tabStream = null;
    }
  }

  public isCapturing(): boolean {
    return !!(this.micStream || this.tabStream);
  }
}
