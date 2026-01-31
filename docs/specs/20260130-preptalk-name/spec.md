# Feature Spec: 20260130-preptalk-name

Status: Done
Created: 2026-01-30 17:27
Inputs: CR-20260130-1727
Decisions: None

## Summary
Replace the legacy “Awesome Interview” name with the PrepTalk app name across the UI and docs.

## User Stories & Acceptance

### US1: Consistent PrepTalk branding (Priority: P1)
Narrative:
- As a user, I want the app and docs to show the PrepTalk name so branding is consistent.

Acceptance scenarios:
1. Given the UI template is rendered, When the title is read, Then it uses “PrepTalk Interview Coach”. (Verifies: FR-001)
2. Given docs are reviewed, When the README/PRD/log title is read, Then it uses “PrepTalk”. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Replace the HTML title to “PrepTalk Interview Coach”. (Sources: CR-20260130-1727)
- FR-002: Replace “Awesome Interview” in README, PRD, and log title with “PrepTalk”. (Sources: CR-20260130-1727)

## Edge cases
- None.
