#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${VENV_DIR:-$ROOT_DIR/.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
MODE="${1:-ui}"

E2E_LIVE_PRESET="${E2E_LIVE-}"

load_dotenv() {
  local dotenv_file="$1"
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    key="${key#${key%%[![:space:]]*}}"
    key="${key%%[[:space:]]*}"
    if [[ -z "$key" || "$key" == \#* ]]; then
      continue
    fi
    key="${key#export }"
    if [[ -n "${!key-}" ]]; then
      continue
    fi
    value="${value#${value%%[![:space:]]*}}"
    value="${value%${value##*[![:space:]]}}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value#\"}"
      value="${value%\"}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value#\'}"
      value="${value%\'}"
    fi
    export "$key=$value"
  done < "$dotenv_file"
}

if [[ -f "$ROOT_DIR/.env" ]]; then
  load_dotenv "$ROOT_DIR/.env"
fi

if [[ "$MODE" == "e2e" && -z "$E2E_LIVE_PRESET" ]]; then
  unset E2E_LIVE
fi

usage() {
  cat <<'USAGE'
Usage: ./run.sh [install|ui|test|e2e|logs|deploy|voice-check]

install     Create venv (if missing), install Python deps (if requirements.txt), and npm install.
ui          Install deps and serve UI (static server if no backend entrypoint).
test        Run UI component tests (Vitest).
e2e         Run Playwright E2E tests.
logs        Install lnav helpers and open logs/app.log in lnav.
deploy      Run deployment checks for Taylor (see docs/TAYLOR_CHECKLIST.md).
voice-check Diagnose why voice/TTS isn't working.

Env vars:
  VENV_DIR           Path to virtualenv directory (default: ./.venv)
  PYTHON_BIN         Python interpreter to use (default: python3)
  UI_PORT            Port for static UI server (default: 5173)
  PORT               Port for backend server if app/main.py exists (default: 8000)
  RELOAD             Set to 0 to disable uvicorn reload (default: 1)
  PLAYWRIGHT_INSTALL Set to 1 to install Playwright browsers during e2e
USAGE
}

ensure_venv() {
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "Creating venv at $VENV_DIR"
    "$PYTHON_BIN" -m venv "$VENV_DIR"
  fi
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"

  if [[ -f "$ROOT_DIR/requirements.txt" ]]; then
    "$VENV_DIR/bin/python" -m pip install --upgrade pip
    "$VENV_DIR/bin/python" -m pip install -r "$ROOT_DIR/requirements.txt"
  fi
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is required." >&2
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required." >&2
    exit 1
  fi
}

install_ui() {
  if [[ -f "$ROOT_DIR/package.json" ]]; then
    npm install
  fi
}

open_logs() {
  if ! command -v lnav >/dev/null 2>&1; then
    echo "Error: lnav is required. Install it and re-run." >&2
    exit 1
  fi
  if [[ -x "$ROOT_DIR/tools/logs/lnav/setup.sh" ]]; then
    "$ROOT_DIR/tools/logs/lnav/setup.sh"
  fi
  exec lnav "$ROOT_DIR/logs/app.log"
}

start_backend() {
  local reload_flag="--reload"
  if [[ "${RELOAD:-1}" != "1" ]]; then
    reload_flag=""
  fi

  echo "Starting backend server on ${PORT:-8000}"
  exec "$VENV_DIR/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" $reload_flag
}

deploy_check() {
  echo "================================================"
  echo "🚀 PrepTalk Deployment Verification"
  echo "================================================"
  echo ""

  local errors=0

  # Step 1: Check .env file
  echo "[1/7] Checking .env configuration..."
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "  ❌ FAIL: .env file not found"
    echo "     Create .env with GEMINI_API_KEY=your_key"
    errors=$((errors + 1))
  else
    if grep -q "GEMINI_API_KEY=" "$ROOT_DIR/.env"; then
      local key_value=$(grep "GEMINI_API_KEY=" "$ROOT_DIR/.env" | cut -d'=' -f2)
      if [[ -z "$key_value" || "$key_value" == "your_actual_key_here" ]]; then
        echo "  ❌ FAIL: GEMINI_API_KEY not set in .env"
        errors=$((errors + 1))
      else
        echo "  ✅ PASS: .env configured with API key"
      fi
    else
      echo "  ❌ FAIL: GEMINI_API_KEY missing from .env"
      errors=$((errors + 1))
    fi
  fi

  # Step 2: Check /health endpoint in code
  echo "[2/7] Checking /health endpoint..."
  if grep -q "@app\.\(get\|head\)(.\"/health\")" "$ROOT_DIR/app/api.py" 2>/dev/null || \
     grep -q "@app\.\(get\|head\)(.\"/health\")" "$ROOT_DIR/app/main.py" 2>/dev/null; then
    echo "  ✅ PASS: /health endpoint found in code"
  else
    echo "  ❌ FAIL: /health endpoint not found"
    echo "     Add to app/api.py or app/main.py:"
    echo "     @app.get(\"/health\")"
    echo "     async def health_check(): return {\"status\": \"ok\"}"
    errors=$((errors + 1))
  fi

  # Step 3: Check config/data mounts
  echo "[3/7] Checking static file mounts..."
  if grep -q "app.mount(.\"/config\"" "$ROOT_DIR/app/main.py" 2>/dev/null; then
    echo "  ✅ PASS: /config mount found"
  else
    echo "  ❌ FAIL: /config mount not found in app/main.py"
    echo "     Add: app.mount(\"/config\", StaticFiles(directory=\"app/config\"), name=\"config\")"
    errors=$((errors + 1))
  fi

  if grep -q "app.mount(.\"/data\"" "$ROOT_DIR/app/main.py" 2>/dev/null; then
    echo "  ✅ PASS: /data mount found"
  else
    echo "  ❌ FAIL: /data mount not found in app/main.py"
    echo "     Add: app.mount(\"/data\", StaticFiles(directory=\"app/data\"), name=\"data\")"
    errors=$((errors + 1))
  fi

  # Step 4: Check WebSocket accepts sample_rate
  echo "[4/7] Checking WebSocket sample_rate handling..."
  if grep -rq "sample_rate.*=.*init_msg\.get\|await.*receive_json" "$ROOT_DIR/app" 2>/dev/null; then
    echo "  ✅ PASS: WebSocket receives init message"
  else
    echo "  ⚠️  WARN: WebSocket may not accept sample_rate from client"
    echo "     Add to WebSocket handler after accept():"
    echo "     init_msg = await websocket.receive_json()"
    echo "     sample_rate = init_msg.get('sample_rate', 24000)"
  fi

  # Step 5: Check production feature flags
  echo "[5/7] Checking feature flags..."
  if [[ -f "$ROOT_DIR/app/config/features.json" ]]; then
    if grep -q '"environment".*:.*"production"' "$ROOT_DIR/app/config/features.json"; then
      echo "  ✅ PASS: Environment set to production"
    else
      echo "  ⚠️  WARN: Environment not set to production"
      echo "     Set environment to 'production' in app/config/features.json"
    fi

    if grep -q '"demo_seeding".*:.*{' "$ROOT_DIR/app/config/features.json"; then
      if grep -A5 '"demo_seeding"' "$ROOT_DIR/app/config/features.json" | grep -q '"enabled".*:.*false'; then
        echo "  ✅ PASS: Demo seeding disabled"
      else
        echo "  ❌ FAIL: Demo seeding still enabled"
        echo "     Set demo_seeding.enabled to false in app/config/features.json"
        errors=$((errors + 1))
      fi
    fi
  else
    echo "  ❌ FAIL: app/config/features.json not found"
    errors=$((errors + 1))
  fi

  # Step 6: Check static files exist
  echo "[6/7] Checking frontend files..."
  local required_files=(
    "app/static/js/config-loader.js"
    "app/static/js/preflight-audio.js"
    "app/static/js/prototype-c/core.js"
    "app/static/js/prototype-c/stories.js"
    "app/static/js/prototype-c/practice.js"
    "app/static/css/prototype-c-components.css"
    "app/templates/prototype-c.html"
  )

  local missing=0
  for file in "${required_files[@]}"; do
    if [[ ! -f "$ROOT_DIR/$file" ]]; then
      echo "  ❌ Missing: $file"
      missing=$((missing + 1))
    fi
  done

  if [[ $missing -eq 0 ]]; then
    echo "  ✅ PASS: All frontend files present"
  else
    echo "  ❌ FAIL: $missing frontend files missing"
    errors=$((errors + 1))
  fi

  # Step 7: Check code quality (namespace, design tokens)
  echo "[7/9] Checking code quality..."

  # Check for namespaced globals
  if grep -q "window.PrepTalk.*=" "$ROOT_DIR/app/static/js/prototype-c/core.js" 2>/dev/null && \
     grep -q "window.PrepTalk.*=" "$ROOT_DIR/app/static/js/prototype-c/stories.js" 2>/dev/null && \
     grep -q "window.PrepTalk.*=" "$ROOT_DIR/app/static/js/prototype-c/practice.js" 2>/dev/null; then
    echo "  ✅ PASS: Global namespace used (PrepTalk.*)"
  else
    echo "  ⚠️  WARN: Functions exposed directly on window (should use PrepTalk namespace)"
  fi

  # Check for hardcoded colors in progress rings
  if grep -q "background:.*#[0-9A-Fa-f]\{6\}" "$ROOT_DIR/app/static/css/prototype-c-components.css" 2>/dev/null | \
     grep -q "\.progress-rings"; then
    echo "  ⚠️  WARN: Hardcoded colors found (should use design tokens)"
  else
    echo "  ✅ PASS: Using design tokens for colors"
  fi

  # Step 8: Check component library paths
  echo "[8/9] Checking component library..."
  if [[ -f "$ROOT_DIR/docs/component-library.html" ]]; then
    if grep -q 'href="/static/css/' "$ROOT_DIR/docs/component-library.html"; then
      echo "  ✅ PASS: Component library uses absolute paths"
    else
      echo "  ⚠️  WARN: Component library may have broken CSS paths"
    fi
  fi

  # Step 9: Check test suite
  echo "[9/9] Checking test configuration..."
  if [[ -f "$ROOT_DIR/package.json" ]]; then
    if grep -q '"test".*:' "$ROOT_DIR/package.json"; then
      echo "  ✅ PASS: Test scripts configured"
    else
      echo "  ⚠️  WARN: No test scripts in package.json"
    fi
  fi

  echo ""
  echo "================================================"
  if [[ $errors -eq 0 ]]; then
    echo "✅ All critical checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "1. Start server: ./run.sh ui"
    echo "2. Open browser: http://localhost:8000/prototype-c"
    echo "3. Test with debug mode: http://localhost:8000/prototype-c?debug=1"
    echo "4. Run tests: ./run.sh test && ./run.sh e2e"
    echo ""
    echo "See docs/TAYLOR_CHECKLIST.md for full testing instructions"
    return 0
  else
    echo "❌ $errors error(s) found. Fix these before deploying."
    echo ""
    echo "Read docs/TAYLOR_CHECKLIST.md for detailed instructions"
    return 1
  fi
  echo "================================================"
}

voice_diagnostic() {
  echo "================================================"
  echo "🎙️  Voice Feature Diagnostic"
  echo "================================================"
  echo ""

  local errors=0
  local warnings=0

  # Check 1: Health endpoint
  echo "[1/6] Checking health endpoint..."
  if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ PASS: /health endpoint responding"
  else
    echo "  ❌ FAIL: /health endpoint not responding"
    echo "     Is server running? Try: ./run.sh ui"
    errors=$((errors + 1))
  fi

  # Check 2: Gemini API key
  echo "[2/6] Checking Gemini API key..."
  if [[ -f "$ROOT_DIR/.env" ]] && grep -q "GEMINI_API_KEY=" "$ROOT_DIR/.env"; then
    local key_value=$(grep "GEMINI_API_KEY=" "$ROOT_DIR/.env" | cut -d'=' -f2)
    if [[ -n "$key_value" && "$key_value" != "your_actual_key_here" && ${#key_value} -gt 20 ]]; then
      echo "  ✅ PASS: Gemini API key configured (${#key_value} chars)"
    else
      echo "  ❌ FAIL: Gemini API key invalid or placeholder"
      echo "     Get key from: https://aistudio.google.com/app/apikey"
      errors=$((errors + 1))
    fi
  else
    echo "  ❌ FAIL: GEMINI_API_KEY not found in .env"
    errors=$((errors + 1))
  fi

  # Check 3: WebSocket endpoint exists
  echo "[3/6] Checking WebSocket endpoint..."
  local ws_response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8000/api/live/test 2>/dev/null)
  if [[ "$ws_response" == "426" || "$ws_response" == "101" ]]; then
    echo "  ✅ PASS: WebSocket endpoint exists (426 Upgrade Required)"
  elif [[ "$ws_response" == "404" ]]; then
    echo "  ❌ FAIL: WebSocket endpoint not found (404)"
    echo "     Check app/main.py for @app.websocket(\"/api/live/{session_id}\")"
    errors=$((errors + 1))
  else
    echo "  ⚠️  WARN: WebSocket status unclear (HTTP $ws_response)"
    warnings=$((warnings + 1))
  fi

  # Check 4: WebSocket accepts sample_rate
  echo "[4/6] Checking WebSocket sample_rate handling..."
  if grep -rq "sample_rate.*=.*init_msg\.get\|receive_json" "$ROOT_DIR/app" 2>/dev/null; then
    echo "  ✅ PASS: WebSocket accepts init message with sample_rate"
  else
    echo "  ❌ FAIL: WebSocket doesn't accept sample_rate from client"
    echo "     Add after websocket.accept():"
    echo "     init_msg = await websocket.receive_json()"
    echo "     sample_rate = init_msg.get('sample_rate', 24000)"
    errors=$((errors + 1))
  fi

  # Check 5: Gemini config uses dynamic sample_rate
  echo "[5/6] Checking Gemini sample_rate configuration..."
  if grep -rq "\"sample_rate\".*:.*24000\|sample_rate.*=.*24000" "$ROOT_DIR/app/services" 2>/dev/null; then
    echo "  ⚠️  WARN: Hardcoded sample_rate found (should be dynamic)"
    echo "     Change: sample_rate: 24000 → sample_rate: sample_rate"
    warnings=$((warnings + 1))
  else
    echo "  ✅ PASS: Using dynamic sample_rate (not hardcoded)"
  fi

  # Check 6: Front-end files present
  echo "[6/6] Checking front-end audio files..."
  local audio_files=(
    "app/static/js/preflight-audio.js"
    "app/static/js/voice.js"
    "app/static/js/transport.js"
  )

  local missing=0
  for file in "${audio_files[@]}"; do
    if [[ ! -f "$ROOT_DIR/$file" ]]; then
      missing=$((missing + 1))
    fi
  done

  if [[ $missing -eq 0 ]]; then
    echo "  ✅ PASS: Front-end audio files present"
  else
    echo "  ❌ FAIL: $missing front-end audio files missing"
    errors=$((errors + 1))
  fi

  echo ""
  echo "================================================"

  if [[ $errors -eq 0 && $warnings -eq 0 ]]; then
    echo "✅ All voice checks passed!"
    echo ""
    echo "If voice still doesn't work:"
    echo "1. Open browser console (F12)"
    echo "2. Check for WebSocket connection errors"
    echo "3. Check server logs: tail -f logs/app.log"
    echo "4. Try debug mode: http://localhost:8000/prototype-c?debug=1"
    return 0
  elif [[ $errors -eq 0 ]]; then
    echo "⚠️  $warnings warning(s) - voice may work with degraded quality"
    echo ""
    echo "Next steps:"
    echo "1. Fix warnings above for optimal quality"
    echo "2. Test voice: http://localhost:8000/prototype-c"
    echo "3. Check console (F12) for errors"
    return 0
  else
    echo "❌ $errors error(s), $warnings warning(s) - voice will NOT work"
    echo ""
    echo "Fix these errors first:"
    echo "1. Address each ❌ FAIL above"
    echo "2. Re-run: ./run.sh voice-check"
    echo "3. See: docs/VOICE_NOT_WORKING_FIX.md"
    return 1
  fi
  echo "================================================"
}

case "$MODE" in
  install)
    ensure_venv
    ensure_node
    install_ui
    ;;
  ui)
    ensure_venv
    ensure_node
    install_ui

    if [[ -f "$ROOT_DIR/app/main.py" ]]; then
      start_backend
    else
      STATIC_DIR="$ROOT_DIR/app/static"
      if [[ ! -d "$STATIC_DIR" ]]; then
        echo "Error: $STATIC_DIR not found." >&2
        exit 1
      fi
      echo "Serving static UI on http://localhost:${UI_PORT:-5173}"
      exec "$VENV_DIR/bin/python" -m http.server "${UI_PORT:-5173}" --directory "$STATIC_DIR"
    fi
    ;;
  test)
    ensure_node
    npm test
    ;;
  e2e)
    ensure_node
    install_ui
    if [[ "${PLAYWRIGHT_INSTALL:-0}" == "1" ]]; then
      npx playwright install
    fi
    npm run test:e2e
    ;;
  logs)
    open_logs
    ;;
  deploy)
    deploy_check
    ;;
  voice-check)
    voice_diagnostic
    ;;
  *)
    usage
    exit 1
    ;;
esac
