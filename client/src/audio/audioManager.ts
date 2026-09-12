// Master Audio Manager: Capture (Mic & Display Media), Recording & Playback, VAD, Analyser, and Barge-In Control

export interface AudioCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  onFrequencies?: (frequencies: Uint8Array) => void;
}

export interface MeetingMediaResult {
  mediaUrl: string;
  hasVideo: boolean;
  mimeType: string;
  blob: Blob;
}

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private tabStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private animFrameId: number | null = null;
  private callbacks: AudioCallbacks = {};

  // Meeting Video & Audio Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordedMimeType = '';
  private hasRecordedVideo = false;

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

  public getActiveStream(): MediaStream | null {
    return this.combinedStream || this.tabStream || this.micStream;
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

    this.hasRecordedVideo = false;
    this.connectSource(this.micStream, ctx);
    this.startAnalysisLoop();

    if (recordToFile) {
      this.startMediaRecorder(this.micStream, false);
    }

    return this.micStream;
  }

  /**
   * Captures Tab / System Audio & Video (e.g. Google Meet, Zoom Web, Teams) via getDisplayMedia.
   */
  public async startTabAudio(recordToFile = false, onStopSharing?: () => void): Promise<MediaStream> {
    const ctx = await this.initAudioContext();

    this.tabStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    // If user clicked Chrome's native "Stop sharing" button
    const videoTrack = this.tabStream.getVideoTracks()[0];
    if (videoTrack && onStopSharing) {
      videoTrack.onended = () => {
        onStopSharing();
      };
    }

    const audioTracks = this.tabStream.getAudioTracks();
    if (audioTracks.length === 0) {
      // Fallback: attach microphone audio if tab audio was unselected so sound is still captured
      try {
        const fallbackMic = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micStream = fallbackMic;
        const micTrack = fallbackMic.getAudioTracks()[0];
        if (micTrack) {
          this.tabStream.addTrack(micTrack);
        }
      } catch (err) {
        console.warn('Tab audio not shared and mic fallback unavailable:', err);
      }
    }

    this.hasRecordedVideo = this.tabStream.getVideoTracks().length > 0;
    if (this.tabStream.getAudioTracks().length > 0) {
      this.connectSource(this.tabStream, ctx);
      this.startAnalysisLoop();
    }

    if (recordToFile) {
      this.startMediaRecorder(this.tabStream, this.hasRecordedVideo);
    }

    return this.tabStream;
  }

  /**
   * Unified meeting recorder: captures Microphone, Tab/System (Google Meet/Zoom), or Both.
   * In 'both' mode, it mixes Mic + Tab audio and records with the Tab's visual video!
   */
  public async startMeetingRecording(
    source: 'microphone' | 'tab' | 'both',
    onStopSharing?: () => void
  ): Promise<MediaStream> {
    const ctx = await this.initAudioContext();

    if (source === 'microphone') {
      return this.startMicrophone(true);
    }

    if (source === 'tab') {
      return this.startTabAudio(true, onStopSharing);
    }

    // Source === 'both': Capture Tab Video + Tab Audio AND Local Microphone
    // 1. Capture Tab display media (screen/tab video + audio)
    this.tabStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    // 2. Capture Local Microphone
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (e) {
      console.warn('Could not access microphone in dual mode, continuing with tab audio only:', e);
    }

    // Bind onended to trigger meeting completion if user clicks "Stop sharing"
    const videoTrack = this.tabStream.getVideoTracks()[0];
    if (videoTrack && onStopSharing) {
      videoTrack.onended = () => {
        onStopSharing();
      };
    }

    // 3. Mix Tab Audio + Mic Audio via Web Audio Destination
    const destination = ctx.createMediaStreamDestination();

    if (this.tabStream.getAudioTracks().length > 0) {
      const tabSourceNode = ctx.createMediaStreamSource(this.tabStream);
      tabSourceNode.connect(destination);
    }

    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      const micSourceNode = ctx.createMediaStreamSource(this.micStream);
      micSourceNode.connect(destination);
    }

    // 4. Combine Video Track + Mixed Audio Track
    const mixedAudioTracks = destination.stream.getAudioTracks();
    const videoTracks = this.tabStream.getVideoTracks();

    this.combinedStream = new MediaStream([
      ...videoTracks,
      ...mixedAudioTracks
    ]);

    this.hasRecordedVideo = videoTracks.length > 0;
    if (mixedAudioTracks.length > 0) {
      this.connectSource(destination.stream, ctx);
      this.startAnalysisLoop();
    }

    this.startMediaRecorder(this.combinedStream, this.hasRecordedVideo);
    return this.combinedStream;
  }

  private startMediaRecorder(stream: MediaStream, hasVideo: boolean) {
    try {
      this.recordedChunks = [];
      let mimeType = '';

      if (hasVideo) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      this.recordedMimeType = mimeType || (hasVideo ? 'video/webm' : 'audio/webm');
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks for resilience
    } catch (err) {
      console.warn('Failed to start MediaRecorder for meeting recording:', err);
    }
  }

  /**
   * Stops meeting recording and generates a playable URL (video or audio).
   */
  public async stopMeetingRecording(): Promise<MeetingMediaResult | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length > 0) {
          const type = this.recordedMimeType || (this.hasRecordedVideo ? 'video/webm' : 'audio/webm');
          const blob = new Blob(this.recordedChunks, { type });
          const mediaUrl = URL.createObjectURL(blob);
          const result: MeetingMediaResult = {
            mediaUrl,
            hasVideo: this.hasRecordedVideo,
            mimeType: type,
            blob
          };
          this.recordedChunks = [];
          this.mediaRecorder = null;
          resolve(result);
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
    if (!stream || stream.getAudioTracks().length === 0) {
      return;
    }
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
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(t => t.stop());
      this.combinedStream = null;
    }
  }

  public isCapturing(): boolean {
    return !!(this.micStream || this.tabStream || this.combinedStream);
  }
}
