# Feature Spec: 20260129-live-context-truncation

Status: Active
Created: 2026-01-29 17:03
Inputs: CR-20260129-1632
Decisions: D-20260129-1702

## Summary
- Limit live system prompt size by truncating large resume/job excerpts to stabilize live sessions on real-file inputs.

## User Stories & Acceptance

### US1: Stable live prompt size (Priority: P1)
Narrative:
- As a developer running live interviews with real resumes and job descriptions, I want the live prompt size capped so the live session stays connected and responsive.

Acceptance scenarios:
1. Given a resume or job excerpt longer than the limit, When the live system prompt is built, Then it is truncated with an ellipsis. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Truncate live system prompt resume/job excerpts to a fixed max length. (Sources: CR-20260129-1632; D-20260129-1702)

## Edge cases
- Missing resume/job text still returns “No content available.” (Verifies: FR-001)
