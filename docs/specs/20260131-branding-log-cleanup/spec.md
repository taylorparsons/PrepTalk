# Feature Spec: 20260131-branding-log-cleanup

Status: Done
Created: 2026-01-31 14:10
Inputs: CR-20260131-1410
Decisions: D-20260131-1410

## Summary
Remove legacy “Awesome Interview” naming from package metadata and log tooling, and strip the unused Live Stats label from the main UI bundle.

## User Stories & Acceptance

### US1: Consistent naming (Priority: P1)
Narrative:
- As a maintainer, I want the codebase metadata and tooling to reflect the PrepTalk name.

Acceptance scenarios:
1. Given package metadata, When I inspect `package.json`/`package-lock.json`, Then the app name reflects PrepTalk. (Verifies: FR-001)
2. Given log tooling, When I inspect logging config and the lnav setup docs, Then the logger/format/SQL use PrepTalk naming. (Verifies: FR-002)
3. Given the main UI bundle, When I search for Live Stats, Then the string is absent. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Update package metadata names from “awesome-interview-frontend” to a PrepTalk name. (Sources: CR-20260131-1410; D-20260131-1410)
- FR-002: Rename log tooling (logger + lnav format/SQL) and update README/docs to use PrepTalk naming. (Sources: CR-20260131-1410; D-20260131-1410)
- FR-003: Remove the unused Live Stats panel string from the main JS bundle. (Sources: CR-20260131-1410; D-20260131-1410)

## Edge cases
- Log tooling changes remain backward compatible with `setup.sh`. (Verifies: FR-002)
