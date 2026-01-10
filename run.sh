#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${VENV_DIR:-$ROOT_DIR/.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
MODE="${1:-ui}"

usage() {
  cat <<'USAGE'
Usage: ./run.sh [install|ui|test|e2e]

install  Create venv (if missing), install Python deps (if requirements.txt), and npm install.
ui       Install deps and serve UI (static server if no backend entrypoint).
test     Run UI component tests (Vitest).
e2e      Run Playwright E2E tests.

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
    python -m pip install --upgrade pip
    pip install -r "$ROOT_DIR/requirements.txt"
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

start_backend() {
  local reload_flag="--reload"
  if [[ "${RELOAD:-1}" != "1" ]]; then
    reload_flag=""
  fi

  echo "Starting backend server on ${PORT:-8000}"
  exec "$VENV_DIR/bin/uvicorn" app.main:app --host 0.0.0.0 --port "${PORT:-8000}" $reload_flag
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
  *)
    usage
    exit 1
    ;;
esac
