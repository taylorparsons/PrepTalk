# Feature Spec: 20260130-live-fallback-stability

Status: Active
Created: 2026-01-30 09:30
Inputs: CR-20260130-0920, CR-20260130-0922
Decisions: D-20260130-0925

## Summary
Reduce unintended browser TTS fallback during live sessions and make Live Stats error counts reflect real errors only.

## User Stories & Acceptance

### US1: Live audio priority (Priority: P1)
Narrative:
- As a candidate using live mode, I want streamed audio to be the default so I only hear live voice unless I explicitly choose browser TTS.

Acceptance scenarios:
1. Given live mode with output mode `auto`, when a coach transcript arrives without live audio, then browser TTS does not play. (Verifies: FR-001)

### US2: Clear error reporting (Priority: P1)
Narrative:
- As an operator, I want Live Stats errors to reflect true errors so disconnect noise doesn’t hide real issues.

Acceptance scenarios:
1. Given a log summary with disconnects and one real error, when Live Stats renders, then Errors shows only the real error count. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: In live mode, browser TTS only plays when output mode is explicitly set to `browser`. (Sources: CR-20260130-0922; D-20260130-0925)
- FR-002: Live Stats Errors counts only real errors (level ERROR / status=error); disconnects are excluded. (Sources: CR-20260130-0920; D-20260130-0925)

## Edge cases
- Missing `error_event_count` in summary falls back to `error_count` only (Verifies: FR-002)
