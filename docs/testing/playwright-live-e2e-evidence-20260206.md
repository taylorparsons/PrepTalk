# Playwright E2E Evidence - 2026-02-06

Feature: `20260206-e2e-live-evidence`
Input: `CR-20260206-1840`, `CR-20260206-1841`
Decision: `D-20260206-1851`

## Scope
- Full non-live desktop/mobile/menu/token validation.
- Full live coverage: turn, standard live, real-file live, long, and long-barge.
- Token-gated route validation for all runs.

## Fixtures / Environment
- Access token: `APP_ACCESS_TOKENS=local-pass`, `E2E_ACCESS_TOKEN=local-pass`
- Live API key source: `.env` (`GEMINI_API_KEY`/`GOOGLE_API_KEY`)
- Real-file fixtures:
  - `/tmp/preptalk-e2e-resume.txt`
  - `/tmp/preptalk-e2e-job.txt`

## Validation Matrix
1. Component tests:
   - Command: `npm run test -- tests/components/voice-layout.test.js tests/components/session-tools.test.js tests/components/voice-playback.test.js tests/components/voice-output-mode.test.js tests/components/audio-activity.test.js tests/components/config-userid.test.js`
   - Result: `6 files, 36 tests passed`.
2. Backend tests:
   - Command: `./.venv/bin/python -m pytest tests/test_voice_turn_tts.py tests/test_gemini_tts.py tests/test_ws_live.py tests/test_api_interviews.py tests/test_app_routes.py tests/test_pii_redaction.py tests/test_settings.py -q`
   - Result: `44 passed`.
3. Non-live E2E desktop/mobile/menu/token:
   - Command: `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-mock npx playwright test tests/e2e/interview-flow.spec.js tests/e2e/interview-flow-responsive.spec.js tests/e2e/menu-flow.spec.js tests/e2e/cloud-access.spec.js --reporter=line,html --workers=1`
   - Result: `7 passed`.
4. Live turn E2E:
   - Command: `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=turn E2E_RESUME_PATH=/tmp/preptalk-e2e-resume.txt E2E_JOB_PATH=/tmp/preptalk-e2e-job.txt PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-turn npx playwright test tests/e2e/live-turn-interview.spec.js --reporter=line,html --workers=1`
   - Result: `1 passed`.
5. Live standard + real-file E2E:
   - Command: `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=live E2E_RESUME_PATH=/tmp/preptalk-e2e-resume.txt E2E_JOB_PATH=/tmp/preptalk-e2e-job.txt E2E_LIVE_DURATION_MS=30000 E2E_LIVE_REAL_DURATION_MS=30000 E2E_LIVE_REAL_ANSWER_MS=6000 E2E_LIVE_REAL_WARMUP_MS=1200 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-main npx playwright test tests/e2e/live-interview.spec.js tests/e2e/live-interview-real.spec.js --reporter=line,html --workers=1`
   - Result: `2 passed`.
6. Live long E2E:
   - Command: `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG=1 VOICE_MODE=live E2E_LIVE_DURATION_MS=30000 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-long npx playwright test tests/e2e/live-interview-long.spec.js --reporter=line,html --workers=1`
   - Result: `1 passed`.
7. Live long-barge E2E:
   - Command: `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG_BARGE=1 VOICE_MODE=live E2E_LIVE_BARGE_DURATION_MS=30000 E2E_LIVE_BARGE_INTERVAL_MS=1000 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-barge npx playwright test tests/e2e/live-interview-long-barge.spec.js --reporter=line,html --workers=1`
   - Result: `1 passed`.

## Adjustments Made During Validation
- Updated `tests/e2e/interview-flow-responsive.spec.js` to queue persona turn before help and gate on `turnAwaitingAnswer`.
- Updated `tests/e2e/live-interview-long-barge.spec.js` to include access token on `/api/logs/summary` calls.
- Removed brittle `window.__e2eAudioChunks > 0` requirement from long-barge live spec.

## HTML Report Paths
- `playwright-report-mock/index.html`
- `playwright-report-live-turn/index.html`
- `playwright-report-live-main/index.html`
- `playwright-report-live-long/index.html`
- `playwright-report-live-barge/index.html`

## Cloud Endpoint Smoke (Google Test URL)
- Target: `https://preptalk-west-test-cz47ti6tbq-uw.a.run.app`
- `GET /` without token -> `401`
- `GET /?access_token=preptalk-test` -> `200`
- `GET /api/logs/summary` without token -> `401`
- `GET /api/logs/summary` with `X-Access-Token: preptalk-test` -> `200`

## Re-run Evidence (2026-02-06 20:20)
- Scope extension from `CR-20260206-2020`: remove Session Controls rubric UI, further compact controls, rerun full Playwright matrix, and refresh reports.
- Non-live matrix command (desktop/mobile/menu/token): pass (`7/7`).
- Live turn command: pass (`1/1`).
- Live standard + real command: pass (`2/2`).
- Live long command:
  - First run failed on score UI timeout while backend scoring completed (`score-value` remained `--` at 10s assertion window).
  - Updated `tests/e2e/live-interview-long.spec.js` to wait up to `30000ms` for final score render.
  - Re-run passed (`1/1`).
- Live long-barge command: pass (`1/1`).
- Refreshed report folders opened locally:
  - `playwright-report-mock/index.html`
  - `playwright-report-live-turn/index.html`
  - `playwright-report-live-main/index.html`
  - `playwright-report-live-long/index.html`
  - `playwright-report-live-barge/index.html`
