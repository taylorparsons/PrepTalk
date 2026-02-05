# Feature Spec: 20260204-export-focus-areas

Status: Done
Created: 2026-02-04 19:40
Updated: 2026-02-04 19:41
Inputs: CR-20260204-1937
Decisions: D-20260204-1940

## Summary
Format exported focus areas (rubric) as human-readable bullets so study guide exports do not contain raw JSON/dict strings.

## User Stories & Acceptance

### US1: Readable rubric in exports (Priority: P1)
Narrative:
- As a candidate, I want the exported rubric to be readable so I can use it as a study guide.

Acceptance scenarios:
1. Given focus areas include dict-like entries, When I export PDF/TXT, Then the rubric renders title + description as readable bullets. (Verifies: FR-001, FR-003)
2. Given focus areas include plain text, When I export PDF/TXT, Then the rubric preserves those bullets as-is. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Parse dict-like focus area entries (area/title + description) and render them as bullet title lines with description on the next indented line. (Sources: CR-20260204-1937; D-20260204-1940)
- FR-002: Plain-string focus area entries render as simple bullets. (Sources: CR-20260204-1937)
- FR-003: Export output must not contain raw JSON/dict strings for focus areas. (Sources: CR-20260204-1937; D-20260204-1940)

## Edge cases
- Missing descriptions should render title-only bullets. (Verifies: FR-001)
