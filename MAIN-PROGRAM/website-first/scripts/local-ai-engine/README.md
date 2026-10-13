# KV30 Internal Local AI Engine Deployment

This package prepares a real, cloud-independent local inference engine boundary for Katha Vistaar.

## Approved target
- Model: `Qwen/Qwen3-32B-GGUF:Q4_K_M`
- Format: GGUF
- Expected model artifact size: about 19.8 GB
- Runtime preference: llama.cpp OpenAI-compatible server
- Alternate runtime: Ollama
- KV30 also accepts vLLM/OpenAI-compatible local endpoints.

The application ZIP does **not** contain the model weights. The weights are provisioned on the dedicated local AI host and recorded by manifest/checksum outside the application artifact.

## Quick start

1. Run `preflight.sh` on the AI host.
2. Run `provision-qwen3-32b.sh` to obtain the model through the selected local runtime.
3. Run `run-llama-qwen3-32b.sh` when using a local llama.cpp binary.
4. Run `verify.sh` to confirm the exact model is visible and real inference returns non-empty text.
5. Point KV30 at the resulting OpenAI-compatible endpoint (`KV_INTERNAL_MODEL_OPENAI_URL`) or use Ollama (`KV_INTERNAL_MODEL_URL`).

Never place live credentials or model weights inside the KV30 application ZIP.
