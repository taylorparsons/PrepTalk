# Feature Spec: 20260129-peas-gemini-calls

Status: Done
Created: 2026-01-29 12:55
Inputs: CR-20260129-1255
Decisions: D-20260129-1255

## Summary
- Scope PEAS to Gemini text + voice calls, require full-suite verification, and add log signals for PEAS evaluation.

## User Stories & Acceptance

### US1: PEAS governs Gemini text + voice calls (Priority: P1)
Narrative:
- As a maintainer, I want the PEAS spec to focus on Gemini text and voice calls so I can evaluate quality and correctness consistently.

Acceptance scenarios:
1. Given the repo PEAS, When I review AGENTS and PRD/specs, Then Gemini text + voice calls are the explicit scope and the full test suite is listed as a performance requirement. (Verifies: FR-001, FR-002)
2. Given a Gemini text or TTS call succeeds, When logs are written, Then an `event=peas_eval` entry is recorded for monitoring. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Update PEAS in `AGENTS.md` to scope to Gemini text + voice calls. (Sources: CR-20260129-1255; D-20260129-1255)
- FR-002: Document the same PEAS scope in PRD/specs and include full-suite tests as a performance measure. (Sources: CR-20260129-1255; D-20260129-1255)
- FR-003: Emit `event=peas_eval` log entries for Gemini text and TTS calls. (Sources: CR-20260129-1255; D-20260129-1255)

## Edge cases
- If a Gemini call fails, log `event=peas_eval` with an error status. (Verifies: FR-003)
