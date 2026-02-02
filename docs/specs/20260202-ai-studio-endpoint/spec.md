# Feature Spec: 20260202-ai-studio-endpoint

Status: Done
Created: 2026-02-02 12:35
Inputs: CR-20260202-1235
Decisions: D-20260202-1235

## Summary
Document AI Studio setup for Gemini API keys, support `GOOGLE_API_KEY` as a fallback for the Gemini adapter, and explain how to share the app endpoint for hackathon use.

## User Stories & Acceptance

### US1: AI Studio setup (Priority: P1)
Narrative:
- As a maintainer, I want clear AI Studio setup steps and a compatible API key path so I can run the app against Gemini and share the endpoint for the hackathon.

Acceptance scenarios:
1. Given the setup docs, When I follow the AI Studio steps, Then I can create/select a project and obtain an API key for Gemini. (Verifies: FR-001)
2. Given only `GOOGLE_API_KEY` is set, When the Gemini adapter loads, Then it accepts the key and runs without configuration errors. (Verifies: FR-002)
3. Given a deployed backend URL, When I set `APP_API_BASE`, Then the UI can target the shared endpoint. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Add documentation for AI Studio project import/key creation and how to configure the app with the key. (Sources: CR-20260202-1235; D-20260202-1235)
- FR-002: Support `GOOGLE_API_KEY` as a fallback when `GEMINI_API_KEY` is not set. (Sources: CR-20260202-1235; D-20260202-1235)
- FR-003: Document the shared endpoint configuration for hackathon use (backend URL + `APP_API_BASE`). (Sources: CR-20260202-1235; D-20260202-1235)

## Edge cases
- If neither API key variable is set, the app surfaces a clear configuration error. (Verifies: FR-002)
