# Feature Spec: 20260206-session-controls-autostart

Status: Done
Created: 2026-02-06 17:22
Inputs: CR-20260206-1700, CR-20260206-1716, CR-20260206-2020
Decisions: D-20260206-1720, D-20260206-2021

## Summary
Ship the requested Session Controls behavior updates so practice starts automatically after question generation, controls stay out of the way until generation starts, controls use a denser footprint, menu/controls remain anchored while reading content, and rubric popover UI is removed.

## User Stories & Acceptance

### US1: Questions generation starts practice automatically (Priority: P1)
Narrative:
- As a candidate, I want the session to auto-start after questions are ready so I can continue without an extra click.

Acceptance scenarios:
1. Given question generation succeeds, when the result is applied, then the app starts the session automatically and shows welcoming/listening status. (Verifies: FR-001)

### US2: Controls panel appears only when flow has started (Priority: P1)
Narrative:
- As a candidate, I do not want Session Controls visible before setup begins.

Acceptance scenarios:
1. Given initial load before generation, when setup is idle, then Session Controls are hidden. (Verifies: FR-002)
2. Given generation has started or interview/session data exists, then Session Controls are visible. (Verifies: FR-002)

### US3: Controls and menu stay compact and reachable (Priority: P1)
Narrative:
- As a candidate, I want smaller controls and sticky top anchoring so I can read transcript/questions while keeping controls available.

Acceptance scenarios:
1. Session Controls and header menu stay sticky near the top on desktop and mobile breakpoints. (Verifies: FR-003)
2. Controls row/button spacing is reduced compared with prior layout and remains usable on desktop/mobile. (Verifies: FR-004)
3. Session Controls do not render a rubric toggle/popover in desktop or mobile views. (Verifies: FR-005)

## Requirements

Functional requirements:
- FR-001: After successful question generation, the UI must auto-start the session and trigger coach intro flow without requiring a manual start click. (Sources: CR-20260206-1700, CR-20260206-1716; D-20260206-1720)
- FR-002: Session Controls panel must remain hidden before generation starts and become visible once generation starts/session state exists. (Sources: CR-20260206-1700, CR-20260206-1716; D-20260206-1720)
- FR-003: Header/menu and Session Controls must be sticky to the top so controls remain available while reading content. (Sources: CR-20260206-1700; D-20260206-1720)
- FR-004: Session Controls layout must be condensed on desktop and mobile (reduced padding/gaps/button size with responsive action-row handling). (Sources: CR-20260206-1700; D-20260206-1720)
- FR-005: Session Controls must not include the rubric toggle/popover UI in desktop or mobile; rubric guidance is requested only through coach help action. (Sources: CR-20260206-2020; D-20260206-2021)

## Verification
- `npm run test -- tests/components/voice-layout.test.js tests/components/session-tools.test.js tests/components/voice-playback.test.js tests/components/voice-output-mode.test.js tests/components/audio-activity.test.js tests/components/config-userid.test.js`
- `APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 npx playwright test tests/e2e/interview-flow.spec.js --reporter=line`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-mock npx playwright test tests/e2e/interview-flow.spec.js tests/e2e/interview-flow-responsive.spec.js tests/e2e/menu-flow.spec.js tests/e2e/cloud-access.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=turn E2E_RESUME_PATH=/tmp/preptalk-e2e-resume.txt E2E_JOB_PATH=/tmp/preptalk-e2e-job.txt PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-turn npx playwright test tests/e2e/live-turn-interview.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 VOICE_MODE=live E2E_RESUME_PATH=/tmp/preptalk-e2e-resume.txt E2E_JOB_PATH=/tmp/preptalk-e2e-job.txt E2E_LIVE_DURATION_MS=30000 E2E_LIVE_REAL_DURATION_MS=30000 E2E_LIVE_REAL_ANSWER_MS=6000 E2E_LIVE_REAL_WARMUP_MS=1200 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-main npx playwright test tests/e2e/live-interview.spec.js tests/e2e/live-interview-real.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG=1 VOICE_MODE=live E2E_LIVE_DURATION_MS=30000 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-long npx playwright test tests/e2e/live-interview-long.spec.js --reporter=line,html --workers=1`
- `CI=1 APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=1 E2E_LIVE_LONG_BARGE=1 VOICE_MODE=live E2E_LIVE_BARGE_DURATION_MS=30000 E2E_LIVE_BARGE_INTERVAL_MS=1000 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-live-barge npx playwright test tests/e2e/live-interview-long-barge.spec.js --reporter=line,html --workers=1`
