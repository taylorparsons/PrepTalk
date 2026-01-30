# Feature Spec: 20260129-voice-tts-default

Status: Done
Created: 2026-01-29 12:21
Inputs: CR-20260129-1221
Decisions: D-20260129-1221

## Summary
- Update the default turn-mode TTS model to the requested Gemini version while preserving a legacy fallback to avoid breaking voice output if the model is unsupported.

## User Stories & Acceptance

### US1: Use the requested voice model by default (Priority: P1)
Narrative:
- As a user, I want the voice output to use the requested Gemini model by default, so that the app’s voice quality matches the specified version without extra configuration.

Acceptance scenarios:
1. Given no explicit TTS env overrides, When the app loads settings, Then the default TTS model is `gemini-2.5-flash-native-audio-preview-12-2025` and fallbacks include the legacy preview TTS model. (Verifies: FR-001)

## Requirements

Functional requirements:
- FR-001: Default `GEMINI_TTS_MODEL` to `gemini-2.5-flash-native-audio-preview-12-2025` and include a legacy fallback model for compatibility. (Sources: CR-20260129-1221; D-20260129-1221)

## Edge cases
- If the requested model is unsupported, the legacy fallback should be used. (Verifies: FR-001)
