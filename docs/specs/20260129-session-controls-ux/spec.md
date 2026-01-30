# Feature Spec: 20260129-session-controls-ux

Status: Active
Created: 2026-01-29 15:23
Inputs: CR-20260129-1520, CR-20260129-1521
Decisions: D-20260129-1522

## Summary
- Add a dev-mode indicator to the adapter meta line, ensure non-dev mode never renders the voice-mode dropdown (even with string config values), and keep Session Controls aligned directly beneath Candidate Setup.

## User Stories & Acceptance

### US1: Session controls clarity (Priority: P1)
Narrative:
- As a user, I want the Session Controls panel to sit directly beneath Candidate Setup and see when dev mode is enabled, so the UI feels stable and obvious.

Acceptance scenarios:
1. Given `UI_DEV_MODE=1`, When the UI loads, Then the adapter meta line ends with `mode: Develop mode`. (Verifies: FR-001)
2. Given `uiDevMode` is `"0"` or unset, When the UI renders, Then no voice-mode dropdown is shown and a static turn-based value is displayed. (Verifies: FR-002)
3. Given a taller right column, When the layout renders, Then the Session Controls panel remains directly below Candidate Setup without extra vertical spacing. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: When dev mode is enabled, append `mode: Develop mode` to the adapter meta line. (Sources: CR-20260129-1520; D-20260129-1522)
- FR-002: Treat string config values like `"0"` as false for `uiDevMode` to avoid showing the voice-mode dropdown in non-dev. (Sources: CR-20260129-1520; D-20260129-1522)
- FR-003: Keep the Session Controls panel aligned directly beneath Candidate Setup regardless of right-column height. (Sources: CR-20260129-1520; D-20260129-1522)

## Edge cases
- Dev mode enabled while in turn mode still shows the dev-mode indicator. (Verifies: FR-001)
