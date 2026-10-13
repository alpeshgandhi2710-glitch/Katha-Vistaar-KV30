# Katha Vistaar v30 — Local AI/TTS Zero-Cost Progress Verification

## Scope
This verification extends KV30-P2-30W without replacing the existing internal-AI architecture. It adds a real local TTS runtime adapter, a governed training-seed preparation path, and deployment preflight checks.

## Zero-cost environment findings
- Local LLM runtime: **not available** (Ollama, llama, llama-server absent).
- Local neural TTS (Piper): **not available**.
- eSpeak: **available** and successfully generated real WAV audio as a non-neural fallback.
- FFmpeg/FFprobe: available.
- NVIDIA SMI/GPU runtime: not available.
- Transformers Python package: not installed; installation attempt could not reach the package index in this sandbox.

## Actual TTS execution
Four real WAV files were generated from text using the local eSpeak engine:
- English warm profile
- English dramatic profile
- Hindi narrator
- Gujarati narrator

All four outputs were non-empty and validated with FFprobe for valid duration/size.

**Important:** eSpeak is an actual local speech engine but is **not** the neural TTS model required for the final production voice milestone. Therefore neural TTS remains BLOCKED until a neural engine/model is available.

## Training path
A governed seed dataset and manifest were generated locally. It contains only approved synthetic seed examples and no private user-data ingestion. User-content learning remains subject to consent, filtering, governance and evaluation.

Actual production-model fine-tuning was **not falsely marked complete** because a compatible model runtime and model weights were not present in the zero-cost sandbox.

## Release boundary
The application can now detect whether a real neural TTS provider is present and can use Piper when configured, with an explicitly labelled non-neural eSpeak fallback for development/testing. No cloud dependency is introduced.
