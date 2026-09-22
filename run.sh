#!/usr/bin/env bash
# Starts the Laya playground on http://localhost:8000
cd "$(dirname "$0")"
exec .venv/bin/uvicorn server:app --host 0.0.0.0 --port "${PORT:-8000}"
