# PrepTalk

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
- `INTERVIEW_ADAPTER=gemini`: Gemini text + turn-based TTS coaching (requires `GEMINI_API_KEY`; supports OpenAI or Gemini TTS providers)

## Environment

- `INTERVIEW_ADAPTER`: `mock` (default) or `gemini`
- `GEMINI_API_KEY`: AI Studio Gemini API key (required when `INTERVIEW_ADAPTER=gemini`)
- `GOOGLE_API_KEY`: optional fallback if `GEMINI_API_KEY` is not set
- `GEMINI_LIVE_MODEL`: reserved for live streaming (feature branch only)
- `GEMINI_LIVE_MODEL_FALLBACKS`: comma-separated fallback live audio models (feature branch only)
- `GEMINI_INTERVIEW_TEXT_MODEL`: override text model for question generation + scoring (default `gemini-3-pro-preview`)
- `GEMINI_TEXT_MODEL`: override text model for turn-based coaching (default `gemini-2.5-flash`)
- `VOICE_MODE`: `turn` only on `main` (live streaming is disabled)
- `VOICE_TTS_ENABLED`: enable server TTS for turn mode (default `1` when `INTERVIEW_ADAPTER=gemini`, else `0`)
- `VOICE_TTS_PROVIDER`: turn-mode TTS provider order (`openai`, `gemini`, or `auto`; default `openai`)
- `GEMINI_TTS_MODEL`: turn-mode TTS model (default `gemini-2.5-flash-native-audio-preview-12-2025`)
- `GEMINI_TTS_MODEL_FALLBACKS`: comma-separated fallback TTS models (default `gemini-2.5-pro-preview-tts`)
- `GEMINI_TTS_VOICE`: voice selection for turn TTS (default `Kore`)
- `GEMINI_TTS_LANGUAGE`: language code for turn TTS (default `en-US`)
- `OPENAI_API_KEY`: OpenAI API key for OpenAI TTS (`VOICE_TTS_PROVIDER=openai` or `auto`)
- `OPENAI_TTS_MODEL`: OpenAI TTS model (default `gpt-4o-mini-tts`)
- `OPENAI_TTS_VOICE`: OpenAI voice (default `alloy`)
- `OPENAI_TTS_FORMAT`: OpenAI audio format (default `wav`)
- `OPENAI_TTS_TIMEOUT_MS`: OpenAI TTS timeout override (default `VOICE_TTS_TIMEOUT_MS`)
- `VOICE_TTS_TIMEOUT_MS`: per-TTS request timeout (default `20000`)
- `VOICE_TTS_WAIT_MS`: max wait before returning text-only (default `2500`)
- `VOICE_TURN_END_DELAY_MS`: minimum answer time before enabling submit / checking if the candidate is done (default `10000`)
- `VOICE_TURN_COMPLETION_CONFIDENCE`: confidence threshold for prompting “Are you done?” (default `0.9`)
- `VOICE_TURN_COMPLETION_COOLDOWN_MS`: minimum delay between completion checks (default `0`)
- `VOICE_OUTPUT_MODE`: `browser`, `server`, or `auto` for turn audio output (default `auto` when `INTERVIEW_ADAPTER=gemini`, else `browser`)
- `UI_DEV_MODE`: reserved for feature-branch debug controls (ignored on `main`)
- `GEMINI_LIVE_RESUME`: live session resumption (feature branch only)
- `APP_API_BASE`: API base path for the UI (default `/api`)
- `SESSION_STORE_DIR`: session storage directory (default `app/session_store`)
- `APP_USER_ID`: default user id for session storage (default `local`)
- `LOG_DIR`: directory for archived logs (default `logs`)
- `PORT`: backend server port (default `8000`)
- `UI_PORT`: static UI port when no backend is present (default `5173`)
- `RELOAD`: set to `0` to disable uvicorn reload in `./run.sh ui`
- `E2E_BASE_URL`: override Playwright base URL (default `http://localhost:8000`)
- `E2E_LIVE`: set to `1` to run the optional live Gemini Playwright test

Example `.env` for turn mode with server TTS (OpenAI first, Gemini fallback):
```bash
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-openai-key
INTERVIEW_ADAPTER=gemini
GEMINI_INTERVIEW_TEXT_MODEL=gemini-3-pro-preview
GEMINI_TEXT_MODEL=gemini-2.5-flash
VOICE_MODE=turn
VOICE_TTS_ENABLED=1
VOICE_TTS_PROVIDER=openai
VOICE_TTS_TIMEOUT_MS=20000
VOICE_TTS_WAIT_MS=2500
VOICE_TURN_END_DELAY_MS=10000
VOICE_TURN_COMPLETION_CONFIDENCE=0.9
VOICE_TURN_COMPLETION_COOLDOWN_MS=0
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
OPENAI_TTS_FORMAT=wav
GEMINI_TTS_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_TTS_MODEL_FALLBACKS=gemini-2.5-pro-preview-tts
GEMINI_TTS_VOICE=Kore
GEMINI_TTS_LANGUAGE=en-US
VOICE_OUTPUT_MODE=auto
APP_API_BASE=/api
PORT=8000
```

Turn mode flow: the UI enables **Submit Answer** as soon as the coach finishes speaking and there is draft text. Completion checks still run in the background to assess whether the response looks attempted or complete.

Provider fallback behavior:
- `VOICE_TTS_PROVIDER=openai`: OpenAI first, Gemini fallback
- `VOICE_TTS_PROVIDER=gemini`: Gemini first, OpenAI fallback
- `VOICE_TTS_PROVIDER=auto`: OpenAI first when `OPENAI_API_KEY` is set, otherwise Gemini first

## AI Studio setup

See `docs/ai-studio-setup.md` for AI Studio project/key setup and shared endpoint notes.

## Cloud Run deployment (optional)

See `docs/cloud-run-deploy.md` for Cloud Run deployment steps and update options.

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
select event, status, count(*) from preptalk_log group by event, status order by count(*) desc;
select event, percentile(duration_ms, 95) from preptalk_log where duration_ms is not null group by event;
select interview_id, count(*) from preptalk_log group by interview_id order by count(*) desc;
select event, count(*) from preptalk_log where upper(log_level) = 'ERROR' or status = 'error' group by event;
```

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

Optional live Gemini E2E (feature branch only):
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

## License

This project is licensed under the Apache License 2.0. See `LICENSE`.
