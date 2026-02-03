# Developer Guide

## Overview
This repo is a voice-first interview practice app built with FastAPI and a vanilla JS UI. It uses Gemini text models for question generation and scoring, plus Gemini TTS for turn-based coaching. Live streaming is deferred on `main`.

## Architecture
- Backend: FastAPI in `app/`, with routes in `app/api.py` and websocket handling in `app/ws.py`.
- Frontend: static app in `app/static/` with the main layout in `app/static/js/ui.js`.
- Gemini text: `app/services/gemini_text.py` for question generation and scoring.
- Gemini live: `app/services/gemini_live.py` remains for future stabilization (not exposed in the main UI).
- Live system prompt: `app/services/live_context.py` uses resume/job/questions (feature branch only).
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
- `GEMINI_API_KEY` (AI Studio Gemini API key)
- `GOOGLE_API_KEY` (optional fallback)
- `GEMINI_LIVE_MODEL`
- `GEMINI_LIVE_MODEL_FALLBACKS`
- `GEMINI_INTERVIEW_TEXT_MODEL`
- `GEMINI_TEXT_MODEL`
- `GEMINI_LIVE_RESUME`
- `VOICE_MODE`
- Live streaming UI option is disabled on `main`.
- `VOICE_TTS_ENABLED`
- `GEMINI_TTS_MODEL`
- `GEMINI_TTS_MODEL_FALLBACKS`
- `GEMINI_TTS_VOICE`
- `GEMINI_TTS_LANGUAGE`
- `VOICE_TTS_TIMEOUT_MS`
- `VOICE_TTS_WAIT_MS`
- `VOICE_TURN_END_DELAY_MS`
- `VOICE_TURN_COMPLETION_CONFIDENCE`
- `VOICE_TURN_COMPLETION_COOLDOWN_MS`
- `VOICE_OUTPUT_MODE`
- `UI_DEV_MODE`
- `SESSION_STORE_DIR`
- `APP_USER_ID`

AI Studio setup notes: `docs/ai-studio-setup.md`.
Cloud Run deployment notes: `docs/cloud-run-deploy.md`.

## Session Flow
1. Upload resume + job description.
2. Backend generates questions and focus areas.
3. Start turn-based session; coaching and transcript update during the session.
4. Stop session; score and summary are generated.
5. Export study guide as PDF or TXT.

Turn mode confirmation:
- In `VOICE_MODE=turn`, **Submit Answer** is available as soon as the coach finishes speaking and the candidate has draft text. The UI still checks Gemini for completion in the background to assess attempted/complete status.

## Question Tracking
- Each question has a status: not_started, started, answered.
- UI updates status via `/api/interviews/{id}/questions/status`.
- Backend records `asked_question_index` and history in the session store.
- Server-side guard detects repeated questions in `app/services/gemini_live.py` and nudges the model to move on.

## Logging
- Logs are written to `logs/app.log` and archived on startup.
- IDs are short hashes for readability.
- Key events include interview create, live connect, and model calls.
- Live Stats panel is removed from the main UI; log endpoints remain for debugging.

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

Live E2E (feature branch only):
```bash
E2E_LIVE=1 ./run.sh e2e
```

Long live E2E with full trace (optional):
```bash
E2E_LIVE=1 E2E_LIVE_LONG=1 ./run.sh e2e
```
Trace output: `test-results/live-interview-long-*/trace.zip` (open with `npx playwright show-trace ...`).

Real-file live E2E (optional):
- Set `E2E_RESUME_PATH` and `E2E_JOB_PATH` to local files (docx/pdf).
- Optional tuning: `E2E_LIVE_REAL_DURATION_MS`, `E2E_LIVE_REAL_ANSWER_MS`, `E2E_LIVE_REAL_ANSWER_PAUSE_MS`, `E2E_LIVE_MALE_FREQUENCY_HZ`.

Manual voice smoke test:
- Follow `docs/testing/voice-smoke-test.md`.

## Troubleshooting
- Gemini Live errors: verify `GEMINI_API_KEY` and `GEMINI_LIVE_MODEL`.
- Interview text model errors: verify `GEMINI_INTERVIEW_TEXT_MODEL` supports generateContent.
- Turn-mode text model errors: verify `GEMINI_TEXT_MODEL` supports generateContent.
- Mic issues: check browser permissions and device access.
