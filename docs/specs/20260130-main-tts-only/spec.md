# Feature Spec: 20260130-main-tts-only

Status: Done
Created: 2026-01-30 14:45
Inputs: CR-20260130-1445
Decisions: D-20260130-1445

## Summary
Main branch ships a simplified, turn-based TTS experience for hackathon submission. Live streaming and debug panels are removed from the UI, while backend live endpoints remain for future stabilization.

## User Stories & Acceptance

### US1: Simple TTS-only interview flow (Priority: P1)
Narrative:
- As a candidate, I want a clean TTS-only UI so I can focus on answering without live/debug controls.

Acceptance scenarios:
1. Given the main UI is loaded, When I open Session Controls, Then there is no live mode selector and the flow is turn-based only. (Verifies: FR-001)
2. Given the main UI is loaded, When I review panels, Then no debug meta text or Live Stats panel appears. (Verifies: FR-002)

### US2: Hackathon submission alignment (Priority: P1)
Narrative:
- As the submitter, I want the hackathon design plan updated to reflect the TTS-only scope on main.

Acceptance scenarios:
1. Given `docs/plans/2026-01-10-gemini-live-design.md`, When reviewed, Then it notes TTS-only submission scope with live deferred. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Main UI supports only turn-based TTS; live mode is not selectable or started in the UI. (Sources: CR-20260130-1445; D-20260130-1445)
- FR-002: Debug/advanced UI text and panels (adapter meta, live stats, live model inputs) are removed from main. (Sources: CR-20260130-1445; D-20260130-1445)
- FR-003: `docs/plans/2026-01-10-gemini-live-design.md` is updated to reflect TTS-only submission scope. (Sources: CR-20260130-1445; D-20260130-1445)

## Edge cases
- `VOICE_MODE=live` is set in `.env`: main UI still forces turn-based mode. (Verifies: FR-001)
