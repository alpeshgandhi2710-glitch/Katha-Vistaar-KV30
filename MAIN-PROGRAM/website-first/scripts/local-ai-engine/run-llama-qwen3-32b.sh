#!/usr/bin/env bash
set -euo pipefail
HF_MODEL="${KV_INTERNAL_HF_MODEL:-Qwen/Qwen3-32B-GGUF:Q4_K_M}"
HOST="${KV_INTERNAL_MODEL_HOST:-127.0.0.1}"
PORT="${KV_INTERNAL_MODEL_PORT:-8080}"
if command -v llama >/dev/null 2>&1; then
  exec llama serve -hf "${HF_MODEL}" --host "${HOST}" --port "${PORT}"
fi
if command -v llama-server >/dev/null 2>&1; then
  exec llama-server -hf "${HF_MODEL}" --host "${HOST}" --port "${PORT}"
fi
echo "ERROR: llama.cpp server executable not found" >&2
exit 4
