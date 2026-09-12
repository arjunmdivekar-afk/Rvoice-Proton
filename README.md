# ⚛️ RVoice Proton

> **Next-Generation Development-Grade Voice AI Workstation & Meeting Intelligence Platform**  
> Powered by **LM Studio** and **Ollama** local models, real-time audio visualization, zero-latency barge-in, and strict separation between conversational voice and dedicated code development.

---

## ⚡ Core Highlights

- 🎙️ **Conversational Voice Assistant**: Ultra-low-latency bidirectional voice dialogue powered by local **LM Studio** (`http://localhost:1234/v1`) or **Ollama** (`http://localhost:11434`).
- 🔄 **Dual Local Model Providers**: Switch seamlessly between LM Studio and Ollama with live model auto-discovery (`/api/tags` and `/v1/models`).
- 🚫 **Strict Zero-Code Voice Enforcement**: Voice mode is 100% natural conversational dialogue; no code reading, no syntax recitation.
- 💻 **Dedicated Code Studio**: An isolated text-only developer workbench for writing, refactoring, and inspecting code with syntax highlighting, line numbers, and copy-to-clipboard (zero audio/TTS).
- 📝 **Intelligent Meeting Notetaker & Summarizer**: Dual audio recording (Microphone + System/Tab Audio from Google Meet, Zoom, MS Teams) with live rolling transcripts and automated local executive summaries.
- 🔮 **Cinematic Motion & Visuals**: 60 FPS Canvas 3D particle orb, magnetic cursor physics, fluid Aurora audio ribbons, and dynamic ambient glow.
- 📊 **Telemetry & Speedometer HUD**: Real-time monitoring of local LLM tokens/second velocity, Time-to-First-Token (TTFT), and audio pipeline latency.
- 🔒 **100% Local & Private**: Runs completely on your workstation with local models (Llama 3.2, Qwen 2.5, DeepSeek-R1, Mistral, Phi-4) — zero cloud fees, zero data tracking.

---

## 🚀 Quick Start

### 1. Launch Your Preferred Local Model Provider

#### Option A: Ollama
```bash
# Run any model in Ollama
ollama run llama3.2
# Ollama serves automatically on http://localhost:11434
```

#### Option B: LM Studio
1. Open **LM Studio**.
2. Load any model of your choice (e.g., `Meta-Llama-3-8B-Instruct`, `Qwen2.5-7B-Instruct`, `DeepSeek-Coder`).
3. Start the local server on port `1234` (`http://localhost:1234/v1`).

### 2. Install & Run RVoice Proton
```bash
# In c:\Users\arjun.divekar\Desktop\RvoiceProton:
npm run dev
```

Open **`http://localhost:3000`** in your browser!
In the top-right Settings icon, you can switch between **LM Studio** and **Ollama** at any time with 1 click.

---

## 📋 Feature Roadmap & Progress
Track live implementation progress in [FEATURES_ROADMAP.md](./FEATURES_ROADMAP.md).

---

## 📄 License
MIT License. Created by [Arjun Divekar](https://github.com/arjunmdivekar-afk).
