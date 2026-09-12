# ⚛️ RVoice Proton

> **Next-Generation Development-Grade Voice AI Workstation & Meeting Intelligence Platform**  
> Powered by **LM Studio** local models, real-time audio visualization, zero-latency barge-in, and strict separation between conversational voice and dedicated code development.

---

## ⚡ Core Highlights

- 🎙️ **Conversational Voice Assistant**: Ultra-low-latency bidirectional voice dialogue powered by local LM Studio models (`http://localhost:1234/v1`).
- 🚫 **Strict Zero-Code Voice Enforcement**: Voice mode is 100% natural conversational dialogue; no code reading, no syntax recitation.
- 💻 **Dedicated Code Studio**: An isolated text-only developer workbench for writing, refactoring, and inspecting code with syntax highlighting, line numbers, and copy-to-clipboard (zero audio/TTS).
- 📝 **Intelligent Meeting Notetaker & Summarizer**: Dual audio recording (Microphone + System/Tab Audio from Google Meet, Zoom, MS Teams) with live rolling transcripts and automated local executive summaries.
- 🔮 **Cinematic Motion & Visuals**: 60 FPS Canvas 3D particle orb, magnetic cursor physics, fluid Aurora audio ribbons, and dynamic ambient glow.
- 📊 **Telemetry & Speedometer HUD**: Real-time monitoring of LM Studio tokens/second velocity, Time-to-First-Token (TTFT), and audio pipeline latency.
- 🔒 **100% Local & Private**: Runs completely on your workstation with local LM Studio models (Llama 3, Qwen 2.5, DeepSeek, Mistral) — zero cloud fees, zero data tracking.

---

## 🛠️ Architecture

```
                                  +-------------------------------------------------------------+
                                  |                  Client Browser (Web UI)                    |
                                  |                                                             |
[ Mic / Tab Audio ] -> AudioWorklet  |  +--------------------+  +----------------------------+  |
                             |       |  |  Morphing 3D Orb   |  |   Mode Switcher:           |  |
                             v       |  | & Aurora Ribbon    |  |   1. Voice Assistant (HUD) |  |
                        [ VAD Engine]|  +--------------------+  |      (Pure Dialogue,       |  |
                             |       |                          |       ZERO Code)           |  |
                             v       |                          |   2. Code Studio & Chat    |  |
                      WebSocket Client<=======================+ |      (Text Only, Syntax)   |  |
                             ||                               | |   3. Meeting Notetaker     |  |
                             ||                               | |      (Record & Summarize)  |  |
                             ||                               | +----------------------------+  |
                             vv
            +-----------------------------------+
            |       Proton Gateway Server       |
            |  (Node.js / Express / WebSockets) |
            +-----------------------------------+
               |                    |                 |
               v                    v                 v
       [ STT Engine ]      [ LM Studio Engine ] [ Streaming TTS Pipeline ]
       - WebSpeech (Local)  http://localhost:1234 - Voice Mode: Pure dialogue speech
       - Local Whisper      - Llama 3 / Qwen /    - Code Studio Mode: TTS Disabled
       - Deepgram (Opt)       Mistral / DeepSeek  - Web Speech API / Local Neural
                            - Streaming SSE
```

---

## 🚀 Quick Start

### 1. Launch LM Studio
1. Open **LM Studio**.
2. Load any model of your choice (e.g., `Meta-Llama-3-8B-Instruct`, `Qwen2.5-7B-Instruct`, `DeepSeek-Coder`).
3. Start the local server on port `1234` (`http://localhost:1234/v1`).

### 2. Install & Run
```bash
# Install root dependencies
npm install

# Start development servers (Server Gateway + React Client)
npm run dev
```

---

## 📋 Feature Roadmap & Progress
Track live implementation progress in [FEATURES_ROADMAP.md](./FEATURES_ROADMAP.md).

---

## 📄 License
MIT License. Created by [Arjun Divekar](https://github.com/arjunmdivekar-afk).
