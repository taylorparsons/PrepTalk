# Feature Spec: 20260129-submission-polish

Status: Active
Created: 2026-01-29 09:38
Inputs: CR-20260129-0938, CR-20260129-1105
Decisions: D-20260129-0938, D-20260129-0942, D-20260129-1105

## Summary
Polish the app for submission by (1) defaulting to Gemini 2.5-family models and (2) improving perceived voice quality by preferring server TTS output (with safe fallback), plus (3) simplifying the UI by hiding confusing debug/advanced controls by default.

## User Stories & Acceptance

### US1: Candidate hears natural coach voice (Priority: P1)
Narrative:
- As a candidate, I want coach voice output to sound less robotic, so that practicing feels realistic.

Acceptance scenarios:
1. Given voice mode is `turn` and output mode is `auto`, When the server returns coach audio, Then the client plays the audio instead of browser speech. (Verifies: FR-001)
2. Given voice mode is `turn` and output mode is `auto`, When the server does not return coach audio, Then the client speaks using browser speech. (Verifies: FR-001)

### US2: Submission defaults use Gemini 2.5 (Priority: P1)
Narrative:
- As the author, I want the app to default to Gemini 2.5 models, so that the demo matches the intended submission story without manual config.

Acceptance scenarios:
1. Given env vars are unset, When the server renders `/`, Then the default `textModel` in `__APP_CONFIG__` is a Gemini 2.5 text model string. (Verifies: FR-002)

### US3: UI is not full of confusing debug buttons (Priority: P1)
Narrative:
- As a user, I want a clean UI with only essential controls visible, so that I can understand what to do next.

Acceptance scenarios:
1. Given “advanced/dev controls” are disabled, When the UI renders, Then model override and debug sections are hidden by default. (Verifies: FR-003)

### US4: Turn mode submits quickly and reliably (Priority: P1)
Narrative:
- As a candidate, I want to submit my answer without waiting a full minute or hunting for confusing buttons, so that the flow stays natural.

Acceptance scenarios:
1. Given voice mode is `turn` and a coach question is awaiting an answer, When the candidate has been speaking for 10 seconds and there is caption text, Then “Submit Answer” is enabled. (Verifies: FR-005, FR-006)
2. Given voice mode is `turn`, When the candidate says “submit my answer” or “how did I do?”, Then the client submits the current answer text (excluding the command phrase). (Verifies: FR-005, FR-006)

### US5: Scoring feels visible and trustworthy (Priority: P1)
Narrative:
- As a user, I want a clear indication that scoring is happening and when it’s done, so that I don’t think the app is stuck.

Acceptance scenarios:
1. Given a session is stopped, When scoring begins, Then the UI shows “Scoring…” in the Score Summary panel and the session status. (Verifies: FR-008)
2. Given scoring completes, When results arrive, Then the Score Summary updates and is brought into view. (Verifies: FR-008)

## Requirements

Functional requirements:
- FR-001: In turn mode, `voiceOutputMode=auto` must not be forced to `browser`, and audio playback must prefer server audio when present with browser speech fallback. (Sources: CR-20260129-0938; D-20260129-0938)
- FR-002: Default model mapping: interview generation/scoring uses a Gemini 3 text model; turn-mode coaching uses Gemini 2.5 Flash unless overridden. (Sources: CR-20260129-0938; D-20260129-0942)
- FR-003: The UI hides confusing debug/advanced controls by default (opt-in for development). (Sources: CR-20260129-0938; D-20260129-0938)
- FR-004: Interview questions must render as human-readable strings even if the model returns question objects with `text`/`intent` fields. (Sources: CR-20260129-1105; D-20260129-1105)
- FR-005: Turn mode submit is available after ~10 seconds (configurable) and supports voice command triggers (“how did I do?”, “submit my answer”). (Sources: CR-20260129-1105; D-20260129-1105)
- FR-006: Remove the “Continue Speaking” UI and flow; turn mode exposes only a single submit action. (Sources: CR-20260129-1105; D-20260129-1105)
- FR-007: The “More” drawer must not be truncated on common mobile viewports and must be scrollable with accessible close controls. (Sources: CR-20260129-1105; D-20260129-1105)
- FR-008: Stopping a session must surface clear scoring progress and reveal score results when complete. (Sources: CR-20260129-1105; D-20260129-1105)

## Edge cases
- If server audio is delayed or missing, the client must still speak via browser speech (Verifies: FR-001).

## PEAS

Agent:
- The app’s “model selection + voice output” configuration.

Performance measure (P):
- Interview generation/scoring uses the configured interview model; turn-mode coaching uses the configured voice text model.
- Turn mode prefers server audio when available and otherwise speaks via browser speech.

Environment (E):
- No network calls in tests; Gemini calls are mocked.
- Config is driven by env vars and `__APP_CONFIG__` for the UI.

Actuators (A):
- Server: choose models via `GEMINI_INTERVIEW_TEXT_MODEL` and `GEMINI_TEXT_MODEL`, and choose voice output via `VOICE_OUTPUT_MODE` and `VOICE_TTS_ENABLED`.
- Client: choose `voiceOutputMode` and per-session model overrides via the session tools drawer.

Sensors (S):
- `tests/test_settings.py` for default settings.
- UI tests in `tests/components/*` for output-mode behavior.
