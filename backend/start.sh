#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting backend API..."

if [ ! -d ".venv" ]; then
    echo "⚠️  .venv not found. Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# python -m pip install -q --upgrade pip
# python -m pip install -q -r requirements.txt

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

echo "✅ Backend running on http://${HOST}:${PORT}"
echo "📘 Docs available at http://${HOST}:${PORT}/docs"

exec python -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
