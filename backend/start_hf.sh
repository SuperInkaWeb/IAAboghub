#!/usr/bin/env bash
set -e

ollama serve &
sleep 5

MODELO="${DEFAULT_LLM_MODEL:-qwen3:4b}"
ollama pull "$MODELO"

exec uvicorn main:app --host 0.0.0.0 --port 7860
