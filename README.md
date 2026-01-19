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
- `VOICE_MODE`: `live` or `turn` for voice flow (default `live`)
- `VOICE_TTS_ENABLED`: enable server TTS for turn mode (default `0`)
- `GEMINI_TTS_MODEL`: turn-mode TTS model (default `gemini-2.5-flash-tts`)
- `GEMINI_TTS_MODEL_FALLBACKS`: comma-separated fallback TTS models (default `gemini-2.5-flash-preview-tts`)
- `GEMINI_TTS_VOICE`: voice selection for turn TTS (default `Kore`)
- `GEMINI_TTS_LANGUAGE`: language code for turn TTS (default `en-US`)
- `VOICE_TTS_TIMEOUT_MS`: per-TTS request timeout (default `20000`)
- `VOICE_TTS_WAIT_MS`: max wait before returning text-only (default `12000`)
- `VOICE_TURN_END_DELAY_MS`: delay before sending a turn after speech ends (default `1500`)
- `VOICE_OUTPUT_MODE`: `browser`, `server`, or `auto` for turn audio output (default `browser`)
- `GEMINI_LIVE_RESUME`: enable auth-token session resumption for transient drops (default `1`)
- `APP_API_BASE`: API base path for the UI (default `/api`)
- `SESSION_STORE_DIR`: session storage directory (default `app/session_store`)
- `APP_USER_ID`: default user id for session storage (default `local`)
- `LOG_DIR`: directory for archived logs (default `logs`)
- `PORT`: backend server port (default `8000`)
- `UI_PORT`: static UI port when no backend is present (default `5173`)
- `RELOAD`: set to `0` to disable uvicorn reload in `./run.sh ui`
- `E2E_BASE_URL`: override Playwright base URL (default `http://localhost:8000`)
- `E2E_LIVE`: set to `1` to run the optional live Gemini Playwright test

Example `.env` for turn mode with browser TTS:
```bash
GEMINI_API_KEY=your-key
INTERVIEW_ADAPTER=gemini
GEMINI_LIVE_MODEL=gemini-3-flash-preview
GEMINI_TEXT_MODEL=gemini-3-flash-preview
VOICE_MODE=turn
VOICE_TTS_ENABLED=1
VOICE_TTS_TIMEOUT_MS=20000
VOICE_TTS_WAIT_MS=15000
VOICE_TURN_END_DELAY_MS=2000
GEMINI_TTS_MODEL=gemini-2.5-pro-preview-tts
GEMINI_TTS_MODEL_FALLBACKS=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE=Kore
GEMINI_TTS_LANGUAGE=en-US
VOICE_OUTPUT_MODE=browser
APP_API_BASE=/api
PORT=8000
```

## FastAPI URLs

- Base: `http://localhost:8000` (or `PORT` if overridden)
- Health: `http://localhost:8000/health`
- Docs: `http://localhost:8000/docs`

## Log analysis (lnav)

Install the lnav helpers (format + SQL view):
```bash
./tools/logs/lnav/setup.sh
```

Open logs:
```bash
lnav logs/app.log
```

Example queries (run in lnav with `;`):
```sql
select event, status, count(*) from awesome_log group by event, status order by count(*) desc;
select event, percentile(duration_ms, 95) from awesome_log where duration_ms is not null group by event;
select interview_id, count(*) from awesome_log group by interview_id order by count(*) desc;
select event, count(*) from awesome_log where upper(log_level) = 'ERROR' or status = 'error' group by event;
```

## Live log dashboard

The UI includes a Live Stats panel that polls `/api/logs/summary` for disconnects
and error counts. Client-side disconnects are logged via `/api/telemetry`.

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
