# Feature Spec: 20260129-more-drawer-width

Status: Done
Created: 2026-01-29 14:02
Inputs: CR-20260129-1402, CR-20260129-1404
Decisions: D-20260129-1402, D-20260129-1404

## Summary
- Widen the “More” drawer to prevent content truncation.

## User Stories & Acceptance

### US1: More drawer fits content (Priority: P1)
Narrative:
- As a user, I want the More drawer to be wide enough to read all controls without truncation.

Acceptance scenarios:
1. Given a desktop viewport, When the More drawer opens, Then it is wide enough to show its content without truncation. (Verifies: FR-001)
2. Given a small viewport, When the More drawer opens, Then it remains within the screen width. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Increase the drawer width while keeping a responsive max width on small screens. (Sources: CR-20260129-1402, CR-20260129-1404; D-20260129-1402, D-20260129-1404)

## Edge cases
- On mobile widths, the drawer should not exceed the viewport. (Verifies: FR-001)
