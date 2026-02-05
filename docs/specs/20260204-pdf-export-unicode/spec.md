# Feature Spec: 20260204-pdf-export-unicode

Status: Active
Created: 2026-02-04 20:24
Inputs: CR-20260204-2024
Decisions: D-20260204-2026

## Summary
Fix PDF study guide exports so Unicode punctuation in transcripts or summaries does not crash the server, while keeping the output readable.

## User Stories & Acceptance

### US1: Reliable PDF export (Priority: P1)
Narrative:
- As a candidate, I want PDF exports to succeed even when my transcript contains smart quotes or dashes, so that I can download the study guide.

Acceptance scenarios:
1. Given a transcript containing smart quotes and em dashes, When I export the study guide as PDF, Then the download succeeds without a server error. (Verifies: FR-001)
2. Given a completed interview with a transcript, When I click PDF/TXT export in the Score Summary, Then a download is triggered for each format. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Sanitize PDF export text to a Latin-1-safe subset by mapping common Unicode punctuation to ASCII and removing unsupported characters. (Sources: CR-20260204-2024; D-20260204-2026)
- FR-002: Add automated tests covering PDF/TXT exports in unit and E2E suites. (Sources: CR-20260204-2024)

## Edge cases
- Transcript lines include emoji or non-Latin characters; export should still complete with best-effort sanitization. (Verifies: FR-001)
