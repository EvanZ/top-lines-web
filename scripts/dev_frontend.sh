#!/usr/bin/env bash
set -euo pipefail

# Start Vite dev server on a clean port.
# Usage: ./scripts/dev_frontend.sh [port]

PORT="${1:-5174}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti ":${PORT}" || true)"
  if [[ -n "${PIDS}" ]]; then
    echo "Killing processes on port ${PORT}: ${PIDS}"
    kill -9 ${PIDS} || true
  fi
fi

echo "Starting Vite on port ${PORT}"
cd "$FRONTEND_DIR"
npm run dev -- --host 127.0.0.1 --port "${PORT}" --strictPort
