#!/usr/bin/env bash
set -euo pipefail
MODEL="${KV_INTERNAL_MODEL:-qwen3:32b}"
RUNTIME="${KV_INTERNAL_MODEL_PROVIDER:-auto}"
echo "Katha Vistaar v30 local AI provisioning"
echo "Target model: ${MODEL}"
echo "Provider: ${RUNTIME}"
if command -v ollama >/dev/null 2>&1; then
  echo "Ollama detected. Pulling ${MODEL}..."
  ollama pull "${MODEL}"
  echo "Verifying model is listed..."
  ollama list | grep -F "${MODEL}" >/dev/null || { echo "ERROR: configured model not listed after pull" >&2; exit 2; }
  echo "PASS: Ollama model ${MODEL} is installed."
  exit 0
fi
if command -v llama-server >/dev/null 2>&1 || command -v llama-cli >/dev/null 2>&1; then
  echo "llama.cpp detected."
  echo "Supply a verified licensed GGUF model outside the application ZIP and set KV_INTERNAL_MODEL_OPENAI_URL."
  echo "No model is downloaded automatically by this script."
  exit 3
fi
if command -v vllm >/dev/null 2>&1; then
  echo "vLLM detected."
  echo "Supply a verified licensed model and start the OpenAI-compatible server outside the application ZIP."
  exit 3
fi
echo "BLOCKED: no supported local inference runtime is installed."
echo "Install Ollama, llama.cpp or vLLM on the target server/device, then rerun this script."
exit 4
