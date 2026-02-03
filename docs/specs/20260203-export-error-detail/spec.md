# Feature Spec: 20260203-export-error-detail

Status: Draft
Created: 2026-02-03 14:24
Inputs: CR-20260203-1424
Decisions: (none)

## Summary
Ensure PDF export errors in the Extras drawer surface the actual server message so users can troubleshoot export failures quickly.

## User Stories & Acceptance

### US1: Export error clarity (Priority: P1)
Narrative:
- As a user, I want export failures to show the real error, so I can fix missing dependencies or configuration issues.

Acceptance scenarios:
1. Given the export endpoint returns a non-JSON error message, When the user clicks Export PDF in Extras, Then the help text shows the server message instead of a generic error. (Verifies: FR-001)
2. Given the environment lacks `fpdf.enums`, When the server builds a PDF study guide, Then export succeeds using legacy line-break handling. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: When PDF export fails, the UI surfaces the server error detail in the Extras export help text. (Sources: CR-20260203-1424)
- FR-002: Extras export help text exposes a stable test id for E2E assertions. (Sources: CR-20260203-1424)
- FR-003: PDF export succeeds when `fpdf.enums` is unavailable by falling back to legacy `ln=True` behavior. (Sources: CR-20260203-1428; D-20260203-1428)

## Edge cases
- Missing PDF dependency: When the backend raises a PDF dependency error, the exact message appears in the export help text. (Verifies: FR-001)
