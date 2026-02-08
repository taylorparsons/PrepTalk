# Feature Spec: 20260206-e2e-live-evidence

Status: Done
Created: 2026-02-06 18:51
Inputs: CR-20260206-1840, CR-20260206-1841
Decisions: D-20260206-1851

## Summary
Run full live Playwright E2E coverage and produce staged, review-ready evidence so live voice behavior can be validated end-to-end.

## User Stories & Acceptance

### US1: Reviewer gets complete live E2E evidence in one pass (Priority: P1)
Narrative:
- As a reviewer, I want all maintained live E2E paths executed and documented so I can assess release readiness quickly.

Acceptance scenarios:
1. Given live turn mode, when Playwright runs turn live E2E, then the flow completes to scored results. (Verifies: FR-001)
2. Given live mode, when Playwright runs standard/real-file/long/barge E2E paths, then each run stays stable and completes to scored results. (Verifies: FR-002, FR-003, FR-004, FR-005)
3. Given all runs complete, when evidence is assembled, then report path + command outcomes are documented and staged. (Verifies: FR-006)

## Requirements

Functional requirements:
- FR-001: Execute `tests/e2e/live-turn-interview.spec.js` in live turn mode. (Sources: CR-20260206-1840; D-20260206-1851)
- FR-002: Execute `tests/e2e/live-interview.spec.js` in live mode. (Sources: CR-20260206-1840; D-20260206-1851)
- FR-003: Execute `tests/e2e/live-interview-real.spec.js` with concrete resume/job file inputs. (Sources: CR-20260206-1840; D-20260206-1851)
- FR-004: Execute `tests/e2e/live-interview-long.spec.js` with long-run gating enabled. (Sources: CR-20260206-1840; D-20260206-1851)
- FR-005: Execute `tests/e2e/live-interview-long-barge.spec.js` with barge-run gating enabled. (Sources: CR-20260206-1840; D-20260206-1851)
- FR-006: Produce a consolidated live HTML report and stage durable evidence docs/progress updates for review. (Sources: CR-20260206-1840, CR-20260206-1841; D-20260206-1851)

## Verification
- `npm run test -- tests/components/voice-layout.test.js tests/components/session-tools.test.js tests/components/voice-playback.test.js tests/components/voice-output-mode.test.js tests/components/audio-activity.test.js tests/components/config-userid.test.js`
- `./.venv/bin/python -m pytest tests/test_voice_turn_tts.py tests/test_gemini_tts.py tests/test_ws_live.py tests/test_api_interviews.py tests/test_app_routes.py tests/test_pii_redaction.py tests/test_settings.py -q`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-mock npx playwright test tests/e2e/interview-flow.spec.js tests/e2e/interview-flow-responsive.spec.js tests/e2e/menu-flow.spec.js tests/e2e/cloud-access.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=turn PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-turn npx playwright test tests/e2e/live-turn-interview.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=live PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-main npx playwright test tests/e2e/live-interview.spec.js tests/e2e/live-interview-real.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG=1 VOICE_MODE=live PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-long npx playwright test tests/e2e/live-interview-long.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG_BARGE=1 VOICE_MODE=live PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-barge npx playwright test tests/e2e/live-interview-long-barge.spec.js --reporter=line,html --workers=1`
