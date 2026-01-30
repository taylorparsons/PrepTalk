# Feature Spec: 20260129-dev-live-model

Status: Active
Created: 2026-01-29 16:02
Inputs: CR-20260129-1600
Decisions: D-20260129-1601

## Summary
- Force the dev-only live streaming model to Gemini 2.5 Native Audio so live voice tests can run without Gemini 3.

## User Stories & Acceptance

### US1: Dev-mode live voice model (Priority: P1)
Narrative:
- As a developer, I want live streaming in dev mode to use Gemini 2.5 Native Audio, so I can test live voice without Gemini 3.

Acceptance scenarios:
1. Given `UI_DEV_MODE=1` and `GEMINI_LIVE_MODEL=gemini-3-flash-preview`, When settings load, Then `live_model` is `gemini-2.5-flash-native-audio-preview-12-2025`. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: In dev mode, live streaming always uses `gemini-2.5-flash-native-audio-preview-12-2025` regardless of `GEMINI_LIVE_MODEL`. (Sources: CR-20260129-1600; D-20260129-1601)

## Edge cases
- Dev mode on with no `GEMINI_LIVE_MODEL` still uses the same dev live model. (Verifies: FR-001)
