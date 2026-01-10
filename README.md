# Awesome Interview

Voice-first interview practice app for the Gemini hackathon.

## Quickstart

```bash
./run.sh install
./run.sh ui
```

## Environment

- `INTERVIEW_ADAPTER`: `mock` (default) or `gemini`
- `GEMINI_API_KEY`: required when `INTERVIEW_ADAPTER=gemini`
- `GEMINI_LIVE_MODEL`: override live audio model (default `gemini-2.5-flash-native-audio-preview-12-2025`)
- `GEMINI_TEXT_MODEL`: override text model for questions/scoring (default `gemini-3`)
- `APP_API_BASE`: API base path for the UI (default `/api`)
- `PORT`: backend server port (default `8000`)
- `UI_PORT`: static UI port when no backend is present (default `5173`)
- `RELOAD`: set to `0` to disable uvicorn reload in `./run.sh ui`
- `E2E_BASE_URL`: override Playwright base URL (default `http://localhost:8000`)

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

E2E via helper script (same harness as above):
```bash
./run.sh e2e
```

If Playwright browsers are missing:
```bash
PLAYWRIGHT_INSTALL=1 ./run.sh e2e
```
