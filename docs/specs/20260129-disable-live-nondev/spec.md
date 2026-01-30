# Feature Spec: 20260129-disable-live-nondev

Status: Done
Created: 2026-01-29 13:57
Inputs: CR-20260129-1357, CR-20260129-1359
Decisions: D-20260129-1357

## Summary
- Restrict live streaming to dev mode and keep turn-based voice as the only option in non-dev usage.

## User Stories & Acceptance

### US1: Live streaming only in dev mode (Priority: P1)
Narrative:
- As a user, I want the app to hide live streaming unless I am in dev mode, so the default experience is stable.

Acceptance scenarios:
1. Given `UI_DEV_MODE=0`, When the controls render, Then the voice mode selector only offers turn-based and the UI forces turn mode. (Verifies: FR-001, FR-002)
2. Given `UI_DEV_MODE=1`, When the controls render, Then the “Live (streaming)” option is available. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Hide the live streaming option in the voice mode selector unless `UI_DEV_MODE=1`. (Sources: CR-20260129-1357, CR-20260129-1359; D-20260129-1357)
- FR-002: Force turn-based mode when `UI_DEV_MODE=0`, even if config defaults to live. (Sources: CR-20260129-1357, CR-20260129-1359; D-20260129-1357)

## Edge cases
- If the app loads with `VOICE_MODE=live` and `UI_DEV_MODE=0`, it still starts in turn mode. (Verifies: FR-002)
