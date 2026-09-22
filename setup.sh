#!/usr/bin/env bash
# Crea .venv e instala dependencias (torch en versión CPU, sin CUDA).
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"
"$PYTHON" -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.14.0
.venv/bin/pip install -r requirements.txt

echo
echo "Listo. Arranca con: ./run.sh"
