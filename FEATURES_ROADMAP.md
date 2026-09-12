# RVoice Proton — Features Roadmap & Execution Tracker

> **Status Legend**:
> - 📋 `PLANNED` — Defined and queued for implementation
> - ⚡ `EXECUTING` — Currently being implemented
> - 🧪 `TESTING` — Implemented, undergoing verification & testing
> - ✅ `DONE` — Fully implemented, tested, and verified

---

## 1. Core Voice Assistant Engine (Strictly Conversational — Zero Code)

> [!IMPORTANT]
> **Strict Separation Rule**: Voice Chat is 100% conversational dialogue, natural reasoning, and brainstorming. The voice model is system-prompted and constrained to **never output code or programming syntax**. All coding tasks are strictly routed to the separate **Normal Text Chat & Code Studio**.

| ID | Feature | Status | Priority | Description |
|---|---|---|---|---|
| **VA-01** | LM Studio Local Engine Integration | 📋 `PLANNED` | High | Streaming OpenAI-compatible client connecting to `http://localhost:1234/v1` with auto-model discovery. |
| **VA-02** | Low-Latency Streaming Pipeline | 📋 `PLANNED` | High | Sentence-boundary predictive chunking for TTS while tokens are actively streaming from LM Studio. |
| **VA-03** | Zero-Latency Barge-in / Interruption | 📋 `PLANNED` | High | Client VAD detects user voice instantly, halts active TTS audio buffer playback, and aborts LM Studio stream. |
| **VA-04** | Client Voice Activity Detection (VAD) | 📋 `PLANNED` | High | Web Audio API RMS & spectral flux silence detection with auto-calibrating ambient noise threshold. |
| **VA-05** | Browser Web Speech + Neural TTS Dual-Mode | 📋 `PLANNED` | High | Zero-cost browser speech synthesis out-of-the-box with seamless fallback and pluggable neural TTS. |
| **VA-06** | Real-time 60fps Audio Visualizer | 📋 `PLANNED` | High | Responsive HTML5 Canvas visualizer rendering dynamic 3D particle sphere and frequency waves reacting to speech. |
| **VA-07** | Custom Wake Word Detection ("Hey Proton") | 📋 `PLANNED` | Medium | In-browser lightweight neural keyword spotting to activate the assistant hands-free. |
| **VA-08** | Real-time Noise Gate & Echo Cancellation | 📋 `PLANNED` | Medium | Acoustic echo cancellation and Web Audio bandpass/compressor filter to prevent speaker loopback. |
| **VA-09** | Multi-Persona Voice & System Profiles | 📋 `PLANNED` | Medium | Switchable assistant personas (Executive Brief, Casual Friend, Tutor, Philosophy Partner). |
| **VA-10** | Strict Zero-Code Enforcement in Voice Mode | 📋 `PLANNED` | High | System prompt and pipeline filters strictly prohibit code generation in voice mode; redirects coding queries to the dedicated Code Studio. |

---

## 2. Dedicated Normal Text Chat & Code Studio (Text Only)

> [!NOTE]
> This mode is completely isolated from voice/TTS. Designed specifically for programming, code generation, refactoring, and text discussions without any audio distractions.

| ID | Feature | Status | Priority | Description |
|---|---|---|---|---|
| **CS-01** | Dedicated Code Studio & Text Chat Interface | 📋 `PLANNED` | High | Full-featured text chat with multi-language code canvas, line numbers, syntax highlighting, and copy buttons. |
| **CS-02** | LM Studio Coding Model Adapter | 📋 `PLANNED` | High | Optimized system prompts for coding (Qwen-Coder, DeepSeek-Coder, Llama-Code) in text-only mode. |
| **CS-03** | Code Diff & Version History | 📋 `PLANNED` | Medium | Visual side-by-side diffs showing AI code changes and revision history. |
| **CS-04** | Snippet Export & Download | 📋 `PLANNED` | Medium | Download generated code files directly (.py, .ts, .js, .html, .css, .json, .cpp). |

---

## 3. Intelligent Meeting Notetaker & AI Summarizer

| ID | Feature | Status | Priority | Description |
|---|---|---|---|---|
| **MN-01** | Dual Audio Source Capture | 📋 `PLANNED` | High | Record from Microphone or Browser Tab / System Audio (`getDisplayMedia`) for Google Meet, Zoom, and Teams. |
| **MN-02** | Live Continuous Rolling Transcript | 📋 `PLANNED` | High | Timestamped real-time transcription with continuous scrolling and active speaking indication. |
| **MN-03** | LM Studio Executive Summary Generator | 📋 `PLANNED` | High | High-level executive brief generated locally by LM Studio from meeting transcripts. |
| **MN-04** | Automated Action Item & Decision Extraction | 📋 `PLANNED` | High | Structured checklist of decisions made, tasks assigned, owners, and expected deadlines. |
| **MN-05** | Real-time Highlight & Bookmarking | 📋 `PLANNED` | High | Click or voice-command bookmarking ("Mark that down") to tag key moments during live meetings. |
| **MN-06** | Multi-Format Export (MD, JSON, Print/PDF) | 📋 `PLANNED` | High | One-click export of meeting minutes, transcript, and summaries to Markdown, PDF, or clipboard. |
| **MN-07** | Click-to-Play Transcript Sync | 📋 `PLANNED` | Medium | Click on any transcript paragraph to jump audio playback to that exact timestamp. |
| **MN-08** | Speaker Tagging & Diarization | 📋 `PLANNED` | Medium | Participant labeling with color-coded speaker badges and talk-time distribution. |
| **MN-09** | Automated Follow-up Email Generator | 📋 `PLANNED` | Medium | One-click generation of professional follow-up recap emails formatted for stakeholders. |
| **MN-10** | In-Meeting AI Q&A ("Ask the Meeting") | 📋 `PLANNED` | Medium | Ask questions about past points in the meeting without interrupting the recording. |

---

## 4. Visual Aesthetics, Animations & Motion Design System

| ID | Feature | Status | Priority | Description |
|---|---|---|---|---|
| **ANI-01** | Morphing 3D Particle Orb Core | 📋 `PLANNED` | High | 60 FPS Canvas/WebGL particle orb that morphs dynamically: Idle breathing, Listening wave ripples, Thinking swirling neural vortex, Speaking blooming frequency pulse. |
| **ANI-02** | Particle Magnetic Cursor Physics | 📋 `PLANNED` | High | Interactive cursor physics where mouse movement gently repels and attracts glowing particles in the orb field. |
| **ANI-03** | Fluid Aurora Audio Ribbon & Waveform | 📋 `PLANNED` | High | Multi-layered sine wave aurora ribbon running along the bottom HUD, reacting smoothly to FFT audio frequencies. |
| **ANI-04** | Cinematic Ambient Glow & State Lighting | 📋 `PLANNED` | High | Dynamic background ambient glow that shifts smoothly across states: Electric Cyan (Listening), Cyber Violet (Thinking), Emerald (Speaking), Amber (Recording). |
| **ANI-05** | Kinetic Typography & Token Stream Fade | 📋 `PLANNED` | High | Fluid letter/word entrance animations as LM Studio streams tokens, giving a living kinetic text display. |
| **ANI-06** | Interactive Meeting Audio Timeline Waveform | 📋 `PLANNED` | High | Animated scrubbable soundwave canvas with pulsing bookmark flags, live recording playhead, and hover zoom. |
| **ANI-07** | Live Token Generation Speedometer | 📋 `PLANNED` | Medium | Neon radial SVG gauge with smooth animated needle and glowing trail indicating live tokens/second velocity. |
| **ANI-08** | 3D Tilt Cards & Glassmorphism Micro-Physics | 📋 `PLANNED` | Medium | Perspective 3D tilt on card hover, glass reflection sweep, magnetic action buttons, and water-drop ripple clicks. |
| **ANI-09** | Radar Discovery Sweep for LM Studio | 📋 `PLANNED` | Medium | Sleek circular radar sweep animation on connection search, transitioning into a steady biometric heartbeat pulse when connected. |

---

## 5. Telemetry, Diagnostics & UI Experience

| ID | Feature | Status | Priority | Description |
|---|---|---|---|---|
| **UI-01** | Cyber-Slate Glassmorphism Design System | 📋 `PLANNED` | High | Bespoke dark UI with neon cyan/violet accents, glowing states, smooth micro-interactions, responsive HUD. |
| **UI-02** | Live Latency & Performance Diagnostics HUD | 📋 `PLANNED` | High | Real-time display of STT latency, LM Studio TTFT, tokens/second rate, TTS latency, and roundtrip ms. |
| **UI-03** | LM Studio Health & Model Picker Panel | 📋 `PLANNED` | High | Dynamic model selector populated from LM Studio `/v1/models`, endpoint URL tester, and status beacon. |
| **UI-04** | Audio Device & Sensitivity Controls | 📋 `PLANNED` | High | Microphone selector, input gain meter, VAD threshold slider, and push-to-talk toggle. |

---

## 6. Execution Changelog & Audit Trail

| Date / Timestamp | Feature ID | Action / Change | Details |
|---|---|---|---|
| 2026-09-12 10:42 | ALL | Created Roadmap | Initialized comprehensive development-grade feature tracker. |
| 2026-09-12 10:47 | ANI-01 to ANI-09 | Added Motion System | Added 9 advanced animation & visual physics features (3D Morphing Orb, Aurora Ribbon, Kinetic Typography, Audio Waveform Timeline, Speedometer). |
| 2026-09-12 10:50 | VA-10 & CS-01 | Strict Zero-Code in Voice | Enforced 100% strict prohibition of code in voice chat; segregated all coding strictly into the text-only Code Studio mode. |
