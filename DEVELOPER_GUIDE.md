# Developer Guide

## Overview
This repo is a voice-first interview practice app built with FastAPI and a vanilla JS UI. It uses Gemini text models for question generation and scoring, and Gemini Live for real-time audio and transcript streaming.

## Architecture
- Backend: FastAPI in `app/`, with routes in `app/api.py` and websocket handling in `app/ws.py`.
- Frontend: static app in `app/static/` with the main layout in `app/static/js/ui.js`.
- Gemini text: `app/services/gemini_text.py` for question generation and scoring.
- Gemini live: `app/services/gemini_live.py` for streaming audio + transcript.
- Live system prompt: `app/services/live_context.py` uses resume/job/questions.
- Session store: `app/services/store.py` writes per-user JSON under `app/session_store/`.
- Exports: `app/services/pdf_service.py` builds PDF and TXT study guides.

## Repository Layout
```
.
|-- app/
|   |-- api.py
|   |-- logging_config.py
|   |-- main.py
|   |-- schemas.py
|   |-- settings.py
|   |-- ws.py
|   |-- services/
|   |-- static/
|   |-- templates/
|   `-- session_store/
|-- docs/
|   |-- plans/
|   |-- testing/
|   `-- components.md
|-- tests/
|   |-- components/
|   |-- e2e/
|   `-- test_*.py
|-- DEVELOPER_GUIDE.md
|-- README.md
|-- run.sh
|-- requirements.txt
|-- pytest.ini
|-- package.json
|-- package-lock.json
|-- playwright.config.js
`-- vitest.config.js
```
Notes: runtime/build directories like `node_modules/`, `.venv/`, `logs/`, `test-results/`, and `.git/` are omitted.

## Local Setup
Prereqs:
- Python 3.11+
- Node.js + npm

Install:
```bash
./run.sh install
```

Run:
```bash
./run.sh ui
```

## Environment
Add values to `.env` as needed:
- `INTERVIEW_ADAPTER` (mock or gemini)
- `GEMINI_API_KEY`
- `GEMINI_LIVE_MODEL`
- `GEMINI_TEXT_MODEL`
- `SESSION_STORE_DIR`
- `APP_USER_ID`

## Session Flow
1. Upload resume + job description.
2. Backend generates questions and focus areas.
3. Start live session; audio and transcript stream over WebSocket.
4. Stop session; score and summary are generated.
5. Export study guide as PDF or TXT.

## Question Tracking
- Each question has a status: not_started, started, answered.
- UI updates status via `/api/interviews/{id}/questions/status`.
- Backend records `asked_question_index` and history in the session store.
- Server-side guard detects repeated questions in `app/services/gemini_live.py` and nudges the model to move on.

## Logging
- Logs are written to `logs/app.log` and archived on startup.
- IDs are short hashes for readability.
- Key events include interview create, live connect, and model calls.

## Tests
UI (Vitest):
```bash
./run.sh test
```

API (pytest):
```bash
./.venv/bin/python -m pytest
```

E2E (Playwright):
```bash
./run.sh e2e
```

Live E2E (optional):
```bash
E2E_LIVE=1 ./run.sh e2e
```

Manual voice smoke test:
- Follow `docs/testing/voice-smoke-test.md`.

## Troubleshooting
- Gemini Live errors: verify `GEMINI_API_KEY` and `GEMINI_LIVE_MODEL`.
- Text model errors: verify `GEMINI_TEXT_MODEL` supports generateContent.
- Mic issues: check browser permissions and device access.
