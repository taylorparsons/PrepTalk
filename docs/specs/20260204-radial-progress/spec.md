# Feature Spec: 20260204-radial-progress

Status: Done
Created: 2026-02-04 18:48
Updated: 2026-02-04 19:30
Inputs: CR-20260204-1846, CR-20260204-1928
Decisions: D-20260204-1848, D-20260204-1930

## Summary
Add small radial progress indicators to make long-running waits obvious during question generation and scoring, and animate them only while active.

## User Stories & Acceptance

### US1: See wait state while generating questions (Priority: P1)
Narrative:
- As a candidate, I want a clear wait indicator while questions are generating so I know the app is still working.

Acceptance scenarios:
1. Given generation is in progress, When I view Candidate Setup, Then a radial progress indicator appears next to the Generate Questions CTA. (Verifies: FR-001, FR-003, FR-004)
2. Given generation is idle, When I view Candidate Setup, Then the indicator is hidden and not animating. (Verifies: FR-003, FR-004)

### US2: See wait state while scoring (Priority: P1)
Narrative:
- As a candidate, I want a clear wait indicator while scoring runs so I know when results are pending.

Acceptance scenarios:
1. Given scoring is pending, When I view the Score Summary panel, Then a radial progress indicator appears next to the score value. (Verifies: FR-002, FR-003, FR-004)
2. Given scoring is not pending, When I view the Score Summary panel, Then the indicator is hidden and not animating. (Verifies: FR-003, FR-004)

## Requirements

Functional requirements:
- FR-001: Show an indeterminate radial progress indicator adjacent to the Generate Questions CTA while question generation is pending. (Sources: CR-20260204-1846; D-20260204-1848)
- FR-002: Show an indeterminate radial progress indicator in the Score Summary header while scoring is pending. (Sources: CR-20260204-1846; D-20260204-1848)
- FR-003: Hide both indicators once the respective process completes or fails. (Sources: CR-20260204-1846; D-20260204-1848)
- FR-004: Animate the indicators while active and stop animating when hidden. (Sources: CR-20260204-1928; D-20260204-1930)
