# Feature Spec: 20260130-branch-protection

Status: Blocked
Created: 2026-01-30 17:29
Inputs: CR-20260130-1729
Decisions: D-20260130-1729

## Summary
Enable remote branch protection on `main` to prevent deletion.

## User Stories & Acceptance

### US1: Protect main from deletion (Priority: P1)
Narrative:
- As a maintainer, I want `main` protected so it can’t be deleted remotely.

Acceptance scenarios:
1. Given the repo settings allow branch protection, When protection is applied to `main`, Then deletion is disallowed. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Remote `main` branch protection disables deletion. (Sources: CR-20260130-1729; D-20260130-1729)

## Edge cases
- GitHub plan does not allow branch protection: record blocker and retry once enabled. (Verifies: FR-001)
