#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${E2E_LIVE_DURATION_MS:=240000}"
: "${E2E_LIVE_POLL_MS:=1000}"

E2E_LIVE=1 \
E2E_LIVE_LONG=1 \
E2E_LIVE_DURATION_MS="$E2E_LIVE_DURATION_MS" \
E2E_LIVE_POLL_MS="$E2E_LIVE_POLL_MS" \
  npm run test:e2e -- tests/e2e/live-interview-long.spec.js

trace_path="$(ls -t test-results/live-interview-long-*/trace.zip 2>/dev/null | head -n 1 || true)"
if [ -z "$trace_path" ]; then
  echo "Trace not found under test-results/live-interview-long-*/trace.zip"
  exit 1
fi

npx playwright show-trace "$trace_path"
