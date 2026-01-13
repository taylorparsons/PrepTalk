# Awesome Interview

Voice-first interview practice app for the Gemini hackathon.

## Quickstart

```bash
./run.sh install
./run.sh ui
```

Developer guide: `DEVELOPER_GUIDE.md`

## Run Modes

Script modes (`./run.sh`):
- `./run.sh install`: create venv + install Python deps + npm install
- `./run.sh ui`: start the app
- `./run.sh test`: run Vitest UI tests
- `./run.sh e2e`: run Playwright E2E tests

Adapter modes (set in `.env`):
- `INTERVIEW_ADAPTER=mock`: mock questions, transcript, scoring
- `INTERVIEW_ADAPTER=gemini`: Gemini Live + Gemini text scoring (requires `GEMINI_API_KEY`)

## Environment

- `INTERVIEW_ADAPTER`: `mock` (default) or `gemini`
- `GEMINI_API_KEY`: required when `INTERVIEW_ADAPTER=gemini`
- `GEMINI_LIVE_MODEL`: override live audio model (default `gemini-2.5-flash-native-audio-preview-12-2025`)
- `GEMINI_TEXT_MODEL`: override text model for questions/scoring (default `gemini-3-pro-preview`)
- `APP_API_BASE`: API base path for the UI (default `/api`)
- `SESSION_STORE_DIR`: session storage directory (default `app/session_store`)
- `APP_USER_ID`: default user id for session storage (default `local`)
- `LOG_DIR`: directory for archived logs (default `logs`)
- `PORT`: backend server port (default `8000`)
- `UI_PORT`: static UI port when no backend is present (default `5173`)
- `RELOAD`: set to `0` to disable uvicorn reload in `./run.sh ui`
- `E2E_BASE_URL`: override Playwright base URL (default `http://localhost:8000`)
- `E2E_LIVE`: set to `1` to run the optional live Gemini Playwright test

## Tests

UI component tests (Vitest):
```bash
./run.sh test
```

API tests (pytest):
```bash
./.venv/bin/python -m pytest
```

E2E tests (Playwright, starts the app automatically):
```bash
npm run test:e2e
```

Optional live Gemini E2E (requires `GEMINI_API_KEY`):
```bash
E2E_LIVE=1 GEMINI_API_KEY=your-key npm run test:e2e
```

E2E via helper script (same harness as above):
```bash
./run.sh e2e
```

If Playwright browsers are missing:
```bash
PLAYWRIGHT_INSTALL=1 ./run.sh e2e
```

## Hackathon Deliverables

- AI Studio demo link: TODO
- Gemini integration write-up: TODO
- 3-minute demo video: TODO
