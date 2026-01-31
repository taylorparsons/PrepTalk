# Feature Spec: 20260131-env-tts-typo

Status: Done
Created: 2026-01-31 14:04
Inputs: CR-20260131-1404
Decisions: D-20260131-1404

## Summary
Fix the local `.env` TTS model typo and remove the real API key from the local file.

## User Stories & Acceptance

### US1: Clean local config (Priority: P1)
Narrative:
- As a maintainer, I want the local `.env` to be typo-free and free of real secrets.

Acceptance scenarios:
1. Given the local `.env`, When I inspect the TTS model entry, Then it uses a single `=` and no warning is emitted about a malformed key. (Verifies: FR-001)
2. Given the local `.env`, When I check `GEMINI_API_KEY`, Then it is a placeholder and not committed. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Fix the `.env` typo for `GEMINI_TTS_MODEL` (single `=`). (Sources: CR-20260131-1404; D-20260131-1404)
- FR-002: Replace the real `GEMINI_API_KEY` value with a placeholder in the local `.env`. (Sources: CR-20260131-1404; D-20260131-1404)

## Edge cases
- `.env` stays untracked; no secrets are committed. (Verifies: FR-002)
