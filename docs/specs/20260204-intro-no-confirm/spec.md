# Feature Spec: 20260204-intro-no-confirm

Status: Done
Created: 2026-02-04 19:45
Updated: 2026-02-04 19:46
Inputs: CR-20260204-1943
Decisions: D-20260204-1945

## Summary
Remove the intro confirmation question so the coach proceeds directly to the first interview question.

## User Stories & Acceptance

### US1: Skip redundant confirmation (Priority: P1)
Narrative:
- As a candidate, I want to start immediately so I can answer the first interview question without extra confirmation steps.

Acceptance scenarios:
1. Given the interview intro begins, When the coach speaks, Then the intro does not ask for readiness or role confirmation before the first interview question. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: The intro prompt must explicitly avoid asking for readiness/role confirmation and proceed directly to the first interview question. (Sources: CR-20260204-1943; D-20260204-1945)
