// Real-Time Automatic Acoustic Voice Diarizer & Speaker Profiler Engine
// Analyzes pitch (F0 via autocorrelation), spectral centroid (timbre), and source energy
// to automatically discover, cluster, and track distinct speakers in real-time.

import { MeetingParticipant } from '../../../shared/types';

export interface SpeakerVoiceProfile {
  id: string;
  name: string;
  color: string;
  avgPitch: number;      // Fundamental frequency in Hz (human voice: ~75 - 400 Hz)
  avgCentroid: number;   // Spectral centroid in Hz (timbre/vocal tract: ~800 - 3500 Hz)
  samplesCount: number;
  lastSpokenTimestamp: number;
  source: 'mic' | 'tab' | 'general';
}

export interface DiarizerCallbacks {
  onActiveSpeakerChange?: (speaker: SpeakerVoiceProfile) => void;
  onNewSpeakerDiscovered?: (speaker: SpeakerVoiceProfile) => void;
  onSpeakersUpdated?: (speakers: SpeakerVoiceProfile[]) => void;
}

const SPEAKER_PALETTE = [
  '#00f2fe', // Cyber Cyan (Speaker 1 / You)
  '#10b981', // Emerald (Speaker 2)
  '#f59e0b', // Amber (Speaker 3)
  '#8b5cf6', // Violet (Speaker 4)
  '#ec4899', // Pink (Speaker 5)
  '#38bdf8', // Sky Blue (Speaker 6)
  '#fb923c', // Orange (Speaker 7)
  '#a3e635'  // Lime (Speaker 8)
];

export class VoiceDiarizer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private tabAnalyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isRunning = false;

  private speakers: Map<string, SpeakerVoiceProfile> = new Map();
  private currentSpeaker: SpeakerVoiceProfile | null = null;
  private callbacks: DiarizerCallbacks = {};

  // Utterance accumulation
  private utterancePitches: number[] = [];
  private utteranceCentroids: number[] = [];
  private utteranceSource: 'mic' | 'tab' | 'general' = 'general';
  private silenceFrames = 0;
  private isVoiceActive = false;

  constructor(callbacks: DiarizerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: DiarizerCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initializes diarization with audio context and streams.
   */
  public attach(
    audioCtx: AudioContext,
    mainStream: MediaStream,
    micStream?: MediaStream | null,
    tabStream?: MediaStream | null,
    initialParticipants?: MeetingParticipant[]
  ) {
    this.detach();

    this.audioCtx = audioCtx;
    this.speakers.clear();

    // Populate initial participants if rejoining or resuming
    if (initialParticipants && initialParticipants.length > 0) {
      initialParticipants.forEach((p, idx) => {
        this.speakers.set(p.name, {
          id: p.id,
          name: p.name,
          color: p.color || SPEAKER_PALETTE[idx % SPEAKER_PALETTE.length],
          avgPitch: 120 + idx * 45, // reasonable dispersion prior
          avgCentroid: 1400 + idx * 300,
          samplesCount: 5,
          lastSpokenTimestamp: Date.now(),
          source: idx === 0 ? 'mic' : 'general'
        });
      });
      const first = Array.from(this.speakers.values())[0];
      this.currentSpeaker = first;
    }

    try {
      // Main analyser with 2048 FFT for high-resolution pitch detection
      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;

      const sourceNode = audioCtx.createMediaStreamSource(mainStream);
      sourceNode.connect(this.analyser);

      // Separate analyzers for mic vs tab if in dual capture mode
      if (micStream && micStream.getAudioTracks().length > 0) {
        this.micAnalyser = audioCtx.createAnalyser();
        this.micAnalyser.fftSize = 256;
        const micNode = audioCtx.createMediaStreamSource(micStream);
        micNode.connect(this.micAnalyser);
      }

      if (tabStream && tabStream.getAudioTracks().length > 0) {
        this.tabAnalyser = audioCtx.createAnalyser();
        this.tabAnalyser.fftSize = 256;
        const tabNode = audioCtx.createMediaStreamSource(tabStream);
        tabNode.connect(this.tabAnalyser);
      }

      this.isRunning = true;
      this.startLoop();
    } catch (err) {
      console.warn('VoiceDiarizer attach error:', err);
    }
  }

  public detach() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.analyser = null;
    this.micAnalyser = null;
    this.tabAnalyser = null;
    this.audioCtx = null;
  }

  public getCurrentSpeaker(): SpeakerVoiceProfile {
    if (this.currentSpeaker) return this.currentSpeaker;

    if (this.speakers.size === 0) {
      const defaultSpeaker: SpeakerVoiceProfile = {
        id: 'speaker_1',
        name: 'Speaker 1 (You)',
        color: SPEAKER_PALETTE[0],
        avgPitch: 130,
        avgCentroid: 1500,
        samplesCount: 1,
        lastSpokenTimestamp: Date.now(),
        source: 'mic'
      };
      this.speakers.set(defaultSpeaker.name, defaultSpeaker);
      this.currentSpeaker = defaultSpeaker;
      this.callbacks.onNewSpeakerDiscovered?.(defaultSpeaker);
      this.callbacks.onSpeakersUpdated?.(Array.from(this.speakers.values()));
      return defaultSpeaker;
    }

    const first = Array.from(this.speakers.values())[0];
    this.currentSpeaker = first;
    return first;
  }

  public getSpeakers(): SpeakerVoiceProfile[] {
    return Array.from(this.speakers.values());
  }

  public renameSpeaker(oldName: string, newName: string) {
    const existing = this.speakers.get(oldName);
    if (existing) {
      this.speakers.delete(oldName);
      existing.name = newName;
      this.speakers.set(newName, existing);
      if (this.currentSpeaker && this.currentSpeaker.name === oldName) {
        this.currentSpeaker = existing;
      }
      this.callbacks.onSpeakersUpdated?.(Array.from(this.speakers.values()));
    }
  }

  private startLoop() {
    if (!this.analyser || !this.audioCtx) return;

    const timeData = new Float32Array(this.analyser.fftSize);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    const micData = this.micAnalyser ? new Uint8Array(this.micAnalyser.frequencyBinCount) : null;
    const tabData = this.tabAnalyser ? new Uint8Array(this.tabAnalyser.frequencyBinCount) : null;

    const analyze = () => {
      if (!this.isRunning || !this.analyser || !this.audioCtx) return;

      this.analyser.getFloatTimeDomainData(timeData);
      this.analyser.getByteFrequencyData(freqData);

      // 1. RMS Energy Check
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        sumSq += timeData[i] * timeData[i];
      }
      const rms = Math.sqrt(sumSq / timeData.length);

      // Speech threshold
      if (rms > 0.016) {
        this.silenceFrames = 0;
        this.isVoiceActive = true;

        // 2. Dual-source comparison if available
        let detectedSource: 'mic' | 'tab' | 'general' = 'general';
        if (this.micAnalyser && this.tabAnalyser && micData && tabData) {
          this.micAnalyser.getByteFrequencyData(micData);
          this.tabAnalyser.getByteFrequencyData(tabData);
          const micVol = micData.reduce((a, b) => a + b, 0) / micData.length;
          const tabVol = tabData.reduce((a, b) => a + b, 0) / tabData.length;

          if (micVol > tabVol * 1.3 && micVol > 12) {
            detectedSource = 'mic';
          } else if (tabVol > 12) {
            detectedSource = 'tab';
          }
        }
        this.utteranceSource = detectedSource;

        // 3. Pitch Detection via Normalized Autocorrelation with Parabolic Interpolation
        const { pitch, confidence } = this.detectPitch(timeData, this.audioCtx.sampleRate);
        if (confidence > 0.36 && pitch >= 75 && pitch <= 450) {
          this.utterancePitches.push(pitch);
        }

        // 4. Spectral Centroid
        const centroid = this.detectSpectralCentroid(freqData, this.audioCtx.sampleRate, this.analyser.fftSize);
        if (centroid > 300) {
          this.utteranceCentroids.push(centroid);
        }

        // 5. In-flight continuous speaker matching if enough frames accumulated
        if (this.utterancePitches.length >= 4) {
          this.matchOrRegisterSpeaker(false);
        }
      } else {
        // Silence frame
        if (this.isVoiceActive) {
          this.silenceFrames++;
          // When 20 consecutive silent frames occur (~300ms pause), resolve the completed utterance
          if (this.silenceFrames > 18) {
            this.matchOrRegisterSpeaker(true);
            this.isVoiceActive = false;
            this.utterancePitches = [];
            this.utteranceCentroids = [];
            this.silenceFrames = 0;
          }
        }
      }

      this.animFrameId = requestAnimationFrame(analyze);
    };

    this.animFrameId = requestAnimationFrame(analyze);
  }

  /**
   * Evaluates accumulated pitch & centroid to identify existing speaker or spawn new speaker.
   */
  private matchOrRegisterSpeaker(isFinalTurn: boolean) {
    if (this.utterancePitches.length === 0) return;

    // Filter outliers: use median pitch
    const sorted = [...this.utterancePitches].sort((a, b) => a - b);
    const medianPitch = sorted[Math.floor(sorted.length / 2)];

    // Mean spectral centroid
    const avgCentroid = this.utteranceCentroids.length > 0
      ? this.utteranceCentroids.reduce((a, b) => a + b, 0) / this.utteranceCentroids.length
      : 1500;

    // If no speakers registered yet, create Speaker 1
    if (this.speakers.size === 0) {
      const name = this.utteranceSource === 'mic' ? 'Speaker 1 (You)' : 'Speaker 1';
      const newSpeaker: SpeakerVoiceProfile = {
        id: 'speaker_1',
        name,
        color: SPEAKER_PALETTE[0],
        avgPitch: medianPitch,
        avgCentroid,
        samplesCount: 1,
        lastSpokenTimestamp: Date.now(),
        source: this.utteranceSource
      };
      this.speakers.set(name, newSpeaker);
      this.currentSpeaker = newSpeaker;
      this.callbacks.onNewSpeakerDiscovered?.(newSpeaker);
      this.callbacks.onActiveSpeakerChange?.(newSpeaker);
      this.callbacks.onSpeakersUpdated?.(Array.from(this.speakers.values()));
      return;
    }

    // Compare against registered speakers
    let bestSpeaker: SpeakerVoiceProfile | null = null;
    let minDistance = Infinity;

    for (const speaker of this.speakers.values()) {
      // Source bonus/penalty: if mic source and speaker is marked 'mic' (You), strongly favor
      let sourcePenalty = 0;
      if (this.utteranceSource === 'mic' && speaker.source !== 'mic') {
        sourcePenalty = 0.9;
      } else if (this.utteranceSource === 'tab' && speaker.source === 'mic') {
        sourcePenalty = 0.9;
      }

      // Normalized pitch difference (32 Hz typical pitch discrimination threshold)
      const pitchDiff = Math.abs(medianPitch - speaker.avgPitch) / 32.0;

      // Normalized centroid difference (500 Hz typical formant timbre discrimination threshold)
      const centroidDiff = Math.abs(avgCentroid - speaker.avgCentroid) / 500.0;

      const distance = 0.65 * pitchDiff + 0.35 * centroidDiff + sourcePenalty;

      if (distance < minDistance) {
        minDistance = distance;
        bestSpeaker = speaker;
      }
    }

    // Similarity threshold: distance < 1.05 implies matching existing speaker
    if (bestSpeaker && minDistance < 1.05) {
      // Smooth update profile statistics
      bestSpeaker.avgPitch = 0.85 * bestSpeaker.avgPitch + 0.15 * medianPitch;
      bestSpeaker.avgCentroid = 0.85 * bestSpeaker.avgCentroid + 0.15 * avgCentroid;
      bestSpeaker.samplesCount++;
      bestSpeaker.lastSpokenTimestamp = Date.now();

      if (this.currentSpeaker?.id !== bestSpeaker.id) {
        this.currentSpeaker = bestSpeaker;
        this.callbacks.onActiveSpeakerChange?.(bestSpeaker);
      }
    } else if (isFinalTurn && minDistance >= 1.05 && this.utterancePitches.length >= 6) {
      // New distinct voice detected during speech! Spawn new speaker automatically.
      const speakerIndex = this.speakers.size + 1;
      const speakerId = `speaker_${speakerIndex}`;
      const name = this.utteranceSource === 'mic' && !Array.from(this.speakers.values()).some(s => s.source === 'mic')
        ? `Speaker ${speakerIndex} (You)`
        : `Speaker ${speakerIndex}`;

      const color = SPEAKER_PALETTE[(speakerIndex - 1) % SPEAKER_PALETTE.length];

      const newSpeaker: SpeakerVoiceProfile = {
        id: speakerId,
        name,
        color,
        avgPitch: medianPitch,
        avgCentroid,
        samplesCount: 1,
        lastSpokenTimestamp: Date.now(),
        source: this.utteranceSource
      };

      this.speakers.set(name, newSpeaker);
      this.currentSpeaker = newSpeaker;
      this.callbacks.onNewSpeakerDiscovered?.(newSpeaker);
      this.callbacks.onActiveSpeakerChange?.(newSpeaker);
      this.callbacks.onSpeakersUpdated?.(Array.from(this.speakers.values()));
    }
  }

  /**
   * High-accuracy Autocorrelation with Parabolic Sub-sample Peak Fitting
   */
  private detectPitch(timeData: Float32Array, sampleRate: number): { pitch: number; confidence: number } {
    const minLag = Math.floor(sampleRate / 450); // ~75-450 Hz human vocal range
    const maxLag = Math.floor(sampleRate / 70);

    if (maxLag >= timeData.length) return { pitch: 0, confidence: 0 };

    let bestLag = -1;
    let maxCorr = -1;

    let energy0 = 0;
    for (let i = 0; i < timeData.length - maxLag; i++) {
      energy0 += timeData[i] * timeData[i];
    }
    if (energy0 < 1e-5) return { pitch: 0, confidence: 0 };

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      let energyLag = 0;
      const len = timeData.length - lag;

      for (let i = 0; i < len; i += 2) { // 2-step hop for fast 60fps performance
        sum += timeData[i] * timeData[i + lag];
        energyLag += timeData[i + lag] * timeData[i + lag];
      }

      const norm = Math.sqrt(energy0 * energyLag) || 1e-6;
      const corr = (2 * sum) / norm;

      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    if (maxCorr < 0.36 || bestLag <= 0) {
      return { pitch: 0, confidence: maxCorr };
    }

    // Parabolic interpolation for fine sub-sample frequency resolution
    let fineLag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const prevLag = bestLag - 1;
      const nextLag = bestLag + 1;
      let sumP = 0;
      let sumN = 0;
      for (let i = 0; i < timeData.length - nextLag; i += 2) {
        sumP += timeData[i] * timeData[i + prevLag];
        sumN += timeData[i] * timeData[i + nextLag];
      }
      const delta = (sumN - sumP) / (2 * (2 * maxCorr - sumP - sumN) || 1e-6);
      if (Math.abs(delta) < 1) {
        fineLag += delta;
      }
    }

    const pitch = sampleRate / fineLag;
    return { pitch, confidence: maxCorr };
  }

  /**
   * Computes Spectral Centroid (timbre center of mass)
   */
  private detectSpectralCentroid(freqData: Uint8Array, sampleRate: number, fftSize: number): number {
    const binWidth = sampleRate / fftSize;
    let num = 0;
    let den = 0;

    for (let i = 0; i < freqData.length; i++) {
      const mag = freqData[i];
      if (mag > 6) {
        const freq = i * binWidth;
        num += freq * mag;
        den += mag;
      }
    }

    return den > 0 ? num / den : 0;
  }
}
