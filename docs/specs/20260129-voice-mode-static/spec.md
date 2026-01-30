# Feature Spec: 20260129-voice-mode-static

Status: Done
Created: 2026-01-29 14:03
Inputs: CR-20260129-1403
Decisions: D-20260129-1403

## Summary
- Replace the voice-mode dropdown with a static value when only turn mode is available.

## User Stories & Acceptance

### US1: Single-mode UI is not a dropdown (Priority: P1)
Narrative:
- As a user, I want the voice mode displayed as a simple label when there’s only one choice.

Acceptance scenarios:
1. Given `UI_DEV_MODE=0`, When the controls render, Then no dropdown is shown and “Turn-based (TTS)” appears as a static value. (Verifies: FR-001)
2. Given `UI_DEV_MODE=1`, When the controls render, Then the dropdown is shown with Live and Turn-based options. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Render a non-interactive voice mode value when only turn mode is available. (Sources: CR-20260129-1403; D-20260129-1403)
- FR-002: Keep the dropdown when dev mode enables live streaming. (Sources: CR-20260129-1403; D-20260129-1403)

## Edge cases
- The static value should still reflect the current mode label. (Verifies: FR-001)
