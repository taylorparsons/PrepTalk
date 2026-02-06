# Feature Spec: 20260205-ios-tts-fallback

Status: Active
Created: 2026-02-05 17:03
Inputs: CR-20260205-1701
Decisions: D-20260205-1702

## Summary
Fix turn-mode coach audio audibility on iPhone by making server-audio playback success stricter and preserving browser-speech fallback when server audio is not actually playable.

## User Stories & Acceptance

### US1: iPhone user still hears the coach when server audio does not truly start (Priority: P1)
Narrative:
- As an iPhone user, I want the coach response to remain audible even when server audio playback fails silently.

Acceptance scenarios:
1. Given turn mode and `voiceOutputMode=server` or `auto`, When server audio `play()` resolves but playback never reaches `playing`, Then browser speech fallback speaks the same coach text. (Verifies: FR-001)

### US2: Unsupported MIME should not block speech (Priority: P1)
Narrative:
- As a user, I want unsupported server audio formats to skip directly to fallback speech instead of silent failure.

Acceptance scenarios:
1. Given turn mode server audio and an unplayable MIME type, When the coach reply is handled, Then blob playback is skipped and browser speech fallback is used. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Server-audio playback is considered successful only after the audio element emits a real playing signal; otherwise the client must keep fallback behavior available. (Sources: CR-20260205-1701; D-20260205-1702)
- FR-002: Before attempting blob playback, the client must probe MIME support and skip server audio when the MIME type is unplayable, allowing browser speech fallback. (Sources: CR-20260205-1701; D-20260205-1702)

## Edge cases
- `audio.play()` promise resolves but no audible playback begins. (Verifies: FR-001)
- MIME includes codec/rate parameters that fail `canPlayType`. (Verifies: FR-002)
