# Feature Spec: 20260129-e2e-real-files-env

Status: Done
Created: 2026-01-29 12:32
Inputs: CR-20260129-1232
Decisions: D-20260129-1232

## Summary
- Ensure live E2E real-file runs only use paths when the environment provides them and avoid hardcoding local paths in repo config.

## User Stories & Acceptance

### US1: Keep real-file paths opt-in (Priority: P1)
Narrative:
- As a developer, I want live E2E to use real resume/job files only when I explicitly set env vars, so the repo does not hardcode my local paths.

Acceptance scenarios:
1. Given `E2E_RESUME_PATH` and `E2E_JOB_PATH` are unset, When I run live E2E, Then the real-files test skips and no path values are pulled from code. (Verifies: FR-001)
2. Given `E2E_RESUME_PATH` and `E2E_JOB_PATH` are set (including in `.env`), When I run live E2E, Then the real-files test uses those paths. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Use `E2E_RESUME_PATH` and `E2E_JOB_PATH` from env (including `.env`) for live real-file E2E, and do not hardcode the file paths in code. (Sources: CR-20260129-1232, CR-20260129-1234; D-20260129-1232, D-20260129-1234)

## Edge cases
- If the env vars are set to missing files, the real-files test should skip (existing behavior). (Verifies: FR-001)
