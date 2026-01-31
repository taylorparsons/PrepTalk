# Feature Spec: 20260130-remove-veneo

Status: Done
Created: 2026-01-30 20:36
Inputs: CR-20260130-2036
Decisions: D-20260130-2036

## Summary
Remove all prior-employer-name references from the repository (UI copy and documentation) and add automated coverage to prevent reintroduction.

## User Stories & Acceptance

### US1: Remove brand references (Priority: P1)
Narrative:
- As a maintainer, I want no prior-employer-name references in the repo, so that hackathon materials and UI copy stay consistent.

Acceptance scenarios:
1. Given the current repo, When I scan tracked text files, Then no prior-employer-name references remain. (Verifies: FR-001, FR-002)

## Requirements

Functional requirements:
- FR-001: Replace or remove all prior-employer-name references in tracked repo text (UI copy + docs). (Sources: CR-20260130-2036; D-20260130-2036)
- FR-002: Add an automated test that fails if a prior-employer-name reference is reintroduced in tracked text files. (Sources: CR-20260130-2036; D-20260130-2036)

## Edge cases
- Ignore transient artifacts (logs, session_store, .venv) in the automated scan. (Verifies: FR-002)
