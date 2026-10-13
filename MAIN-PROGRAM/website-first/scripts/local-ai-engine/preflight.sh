#!/usr/bin/env bash
set -euo pipefail
MODEL="${KV_INTERNAL_MODEL:-qwen3:32b}"
HF_MODEL="${KV_INTERNAL_HF_MODEL:-Qwen/Qwen3-32B-GGUF:Q4_K_M}"
MIN_RAM_GB="${KV_LOCAL_AI_MIN_RAM_GB:-24}"
MIN_DISK_GB="${KV_LOCAL_AI_MIN_DISK_GB:-25}"
echo "KV30 Internal AI Engine preflight"
echo "Target runtime model: ${MODEL}"
echo "Target GGUF artifact: ${HF_MODEL}"
if command -v llama >/dev/null 2>&1 || command -v llama-server >/dev/null 2>&1 || command -v llama-cli >/dev/null 2>&1; then echo "PASS: llama.cpp runtime detected"; else echo "WARN: llama.cpp runtime not detected"; fi
if command -v ollama >/dev/null 2>&1; then echo "PASS: Ollama runtime detected"; else echo "WARN: Ollama runtime not detected"; fi
if command -v vllm >/dev/null 2>&1; then echo "PASS: vLLM runtime detected"; else echo "WARN: vLLM runtime not detected"; fi
if command -v python3 >/dev/null 2>&1; then
  python3 - <<PY
import os, shutil
ram_gb=0
try:
    ram_gb=os.sysconf('SC_PHYS_PAGES')*os.sysconf('SC_PAGE_SIZE')/1024**3
except Exception: pass
free_gb=shutil.disk_usage(os.getcwd()).free/1024**3
print(f"INFO: detected RAM={ram_gb:.1f}GB free_disk={free_gb:.1f}GB")
if ram_gb and ram_gb < float(os.environ.get('KV_LOCAL_AI_MIN_RAM_GB','24')): print('WARN: RAM below configured preflight threshold')
if free_gb < float(os.environ.get('KV_LOCAL_AI_MIN_DISK_GB','25')): print('WARN: free disk below configured model threshold')
PY
fi
