#!/usr/bin/env bash
set -euo pipefail
MODEL="${KV_INTERNAL_MODEL:-qwen3:32b}"
HF_MODEL="${KV_INTERNAL_HF_MODEL:-Qwen/Qwen3-32B-GGUF:Q4_K_M}"
EXPECTED_SHA256="${KV_QWEN3_32B_Q4_K_M_SHA256:-efd971561896866f0e910cce52761ca77b1b138090c7f15fe284676d57d1f689}"
echo "KV30 Qwen3:32B provisioning"
if command -v llama >/dev/null 2>&1; then
  echo "Using llama.cpp HF model provisioning: ${HF_MODEL}"
  echo "The runtime will download the model outside the KV30 ZIP."
  echo "Pinned GGUF SHA-256: ${EXPECTED_SHA256}"
  echo "Start with: llama serve -hf ${HF_MODEL}"
  exit 0
fi
if command -v ollama >/dev/null 2>&1; then
  echo "Using Ollama provisioning for ${HF_MODEL}"
  ollama pull "hf.co/${HF_MODEL}"
  ollama list | grep -F "qwen3:32b" >/dev/null || ollama list | grep -F "Qwen3-32B-GGUF" >/dev/null || { echo "ERROR: Qwen3:32B model not visible after pull" >&2; exit 2; }
  echo "PASS: model provisioned and visible to Ollama"
  exit 0
fi
if command -v llama-server >/dev/null 2>&1 || command -v llama-cli >/dev/null 2>&1; then
  echo "llama.cpp binary detected; provide/use the HF model with the server's -hf option."
  echo "Pinned GGUF SHA-256: ${EXPECTED_SHA256}"
  exit 0
fi
if command -v vllm >/dev/null 2>&1; then
  echo "vLLM detected. Provision an approved Qwen3:32B artifact outside the application ZIP and start an OpenAI-compatible server."
  echo "Pinned GGUF SHA-256 reference: ${EXPECTED_SHA256}"
  exit 0
fi
echo "NO_SUPPORTED_RUNTIME: install llama.cpp, Ollama, or vLLM on the dedicated local AI host."
exit 4
