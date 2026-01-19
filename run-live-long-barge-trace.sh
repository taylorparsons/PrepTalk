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

: "${E2E_LIVE_BARGE_DURATION_MS:=120000}"
: "${E2E_LIVE_BARGE_INTERVAL_MS:=1000}"
: "${E2E_LIVE_AUDIO_BURST_FRAMES:=6}"
: "${E2E_LIVE_AUDIO_FREQUENCY_HZ:=440}"
: "${E2E_LIVE_AUDIO_AMPLITUDE:=0.2}"

E2E_LIVE=1 \
E2E_LIVE_LONG_BARGE=1 \
E2E_LIVE_BARGE_DURATION_MS="$E2E_LIVE_BARGE_DURATION_MS" \
E2E_LIVE_BARGE_INTERVAL_MS="$E2E_LIVE_BARGE_INTERVAL_MS" \
E2E_LIVE_AUDIO_BURST_FRAMES="$E2E_LIVE_AUDIO_BURST_FRAMES" \
E2E_LIVE_AUDIO_FREQUENCY_HZ="$E2E_LIVE_AUDIO_FREQUENCY_HZ" \
E2E_LIVE_AUDIO_AMPLITUDE="$E2E_LIVE_AUDIO_AMPLITUDE" \
  npm run test:e2e -- tests/e2e/live-interview-long-barge.spec.js

trace_path="$(ls -t test-results/live-interview-long-barge-*/trace.zip 2>/dev/null | head -n 1 || true)"
if [ -z "$trace_path" ]; then
  echo "Trace not found under test-results/live-interview-long-barge-*/trace.zip"
  exit 1
fi

npx playwright show-trace "$trace_path"
