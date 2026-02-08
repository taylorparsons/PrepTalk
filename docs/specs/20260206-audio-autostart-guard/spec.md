# Feature Spec: 20260206-audio-autostart-guard

Status: Done
Created: 2026-02-06 17:54
Inputs: CR-20260206-1751
Decisions: D-20260206-1753

## Summary
Audit audio behavior against prior iOS reliability decisions and close the regression risk introduced by auto-start by preserving a user-gesture audio prime path during question generation.

## User Stories & Acceptance

### US1: iOS user still gets reliable audio with auto-start enabled (Priority: P1)
Narrative:
- As a mobile user, I want coach audio to remain reliable even when session start is automatic.

Acceptance scenarios:
1. Given the user taps Generate Questions, when generation begins, then audio priming is attempted immediately in that click handler before async API calls. (Verifies: FR-001)
2. Given auto-start runs after generation, when session start executes, then existing start-time prime remains as a fallback. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Generate click flow must invoke audio priming via the UI control surface before awaiting interview generation. (Sources: CR-20260206-1751; D-20260206-1753)
- FR-002: Start-session flow must retain existing audio-prime call for manual-start and fallback safety. (Sources: CR-20260206-1751; D-20260206-1753)
- FR-003: Regression audit must explicitly call out audio risks relative to D-20260205-1702 and D-20260205-2012. (Sources: CR-20260206-1751; D-20260206-1753)

## Verification
- `npm run test -- tests/components/voice-layout.test.js tests/components/voice-playback.test.js tests/components/voice-output-mode.test.js`
- `./.venv/bin/python -m pytest tests/test_voice_turn_tts.py tests/test_gemini_tts.py -q`
- `APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 npx playwright test tests/e2e/interview-flow.spec.js --reporter=line`
