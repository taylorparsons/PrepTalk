#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-.}"
cd "$REPO_ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for token leak checks." >&2
  exit 2
fi

# Block committed examples that look like live access tokens.
PATTERN='(access_token=|X-Access-Token:[[:space:]]*|APP_ACCESS_TOKENS[[:space:]]*=[[:space:]]*)(preptalk|ptk)-[A-Za-z0-9._:-]+'
SCOPE=(README.md docs app tests .github)

MATCHES="$(rg -n --pcre2 "$PATTERN" "${SCOPE[@]}" 2>/dev/null || true)"
if [[ -n "$MATCHES" ]]; then
  echo "ERROR: Live-looking access token references detected in tracked files:"
  echo "$MATCHES"
  echo "Use placeholders like 'test-token-example' in docs/examples."
  exit 1
fi

echo "OK: no live-looking access token references found."
