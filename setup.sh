#!/usr/bin/env bash
# Crea .venv e instala dependencias (torch en versión CPU, sin CUDA).
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"
"$PYTHON" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install --index-url https://download.pytorch.org/whl/cpu torch==2.14.0
.venv/bin/python -m pip install -r requirements.txt

echo
echo "Listo. Arranca con: ./run.sh"
