# Feature Spec: 20260204-score-format

Status: Done
Created: 2026-02-04 19:42
Updated: 2026-02-04 19:43
Inputs: CR-20260204-1940
Decisions: D-20260204-1942

## Summary
Display score values with a clear out-of-100 label in the Score Summary panel.

## User Stories & Acceptance

### US1: Understand the score scale (Priority: P1)
Narrative:
- As a candidate, I want to see the score scale so I understand what the number means.

Acceptance scenarios:
1. Given a numeric score exists, When I view the Score Summary, Then the score shows as "<score> / 100". (Verifies: FR-001)
2. Given the score is missing or pending, When I view the Score Summary, Then the placeholder remains "--". (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Format numeric score values as "<score> / 100". (Sources: CR-20260204-1940; D-20260204-1942)
- FR-002: Keep the placeholder "--" when no numeric score is available. (Sources: CR-20260204-1940)
