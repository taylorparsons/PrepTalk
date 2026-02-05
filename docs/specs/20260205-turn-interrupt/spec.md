# Feature Spec: 20260205-turn-interrupt

Status: Done
Created: 2026-02-05 21:38
Inputs: CR-20260205-2138
Decisions: D-20260205-2138

## Summary
- Allow users in turn mode to interrupt coach speech so they can move on faster without errors, by canceling TTS/audio and re-enabling interaction.

## User Stories & Acceptance

### US1: Interrupt coach speech (Priority: P1)
Narrative:
- As a candidate, I want to interrupt the coach while she is speaking so I can proceed faster.

Acceptance scenarios:
1. Given a turn-mode session and the coach is speaking, When the user activates Interrupt, Then coach speech stops immediately and Help/Submit state updates for the current question. (Verifies: FR-001, FR-002)
2. Given the coach is not speaking, When the user activates Interrupt, Then no error occurs and the session state remains unchanged. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Turn mode provides an interrupt action that cancels coach speech (browser TTS or server audio) without errors. (Sources: CR-20260205-2138; D-20260205-2138)
- FR-002: Interrupting does not auto-skip; it keeps the current question active and re-enables user interaction. (Sources: CR-20260205-2138; D-20260205-2138)

## Edge cases
- Interrupt during non-speaking states should be a no-op. (Verifies: FR-001)
- Interrupt should not change question status or progress. (Verifies: FR-002)
