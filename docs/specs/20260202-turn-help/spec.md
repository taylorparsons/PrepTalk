# Feature Spec: 20260202-turn-help

Status: Done
Created: 2026-02-02 15:20
Inputs: CR-20260202-1516
Decisions: D-20260202-1520

## Summary
- Remove the turn-mode submit delay and add a resume-grounded help action (button + voice) that speaks and logs help without fabrication.

## User Stories & Acceptance

### US1: Immediate Submit (Priority: P1)
Narrative:
- As a candidate, I want to submit my answer as soon as the coach stops speaking, so I can control the pace.

Acceptance scenarios:
1. Given turn mode with a coach question, When the coach finishes speaking and the candidate has any draft text, Then Submit Answer is enabled immediately. (Verifies: FR-001, FR-004)
2. Given turn mode with a coach question, When the candidate has no draft text, Then Submit Answer remains disabled. (Verifies: FR-001)

### US2: Resume-Grounded Help (Priority: P1)
Narrative:
- As a candidate, I want to request help by voice or button and get a resume-aligned draft, so I can respond without invented details.

Acceptance scenarios:
1. Given a question awaiting an answer, When the candidate presses Request Help, Then the app requests help, renders the response in the transcript, and plays it via TTS. (Verifies: FR-002, FR-004)
2. Given a resume with relevant facts, When help is requested, Then the response includes resume evidence snippets and avoids fabricated details. (Verifies: FR-003)
3. Given no relevant resume evidence, When help is requested, Then the response provides a safe fallback asking for missing details. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Turn-mode submit is enabled immediately after the coach finishes speaking when a question is awaiting an answer and draft text exists; no minimum delay gating. (Sources: CR-20260202-1516; D-20260202-1520)
- FR-002: Turn-mode help can be requested via a button or voice command; it does not advance the question and renders a coach help entry in the transcript with TTS playback. (Sources: CR-20260202-1516; D-20260202-1520)
- FR-003: Help responses must be grounded in resume evidence and never fabricate; if evidence is missing, return a safe fallback instead. (Sources: CR-20260202-1516; D-20260202-1520)
- FR-004: Help and submit actions are available only when the coach is not speaking. (Sources: CR-20260202-1516; D-20260202-1520)

## Edge cases
- Help requested without a current coach question should be a no-op. (Verifies: FR-002)
- Help requested while the coach is speaking should remain disabled. (Verifies: FR-004)
