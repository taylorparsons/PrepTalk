# Tasks: 20260205-ios-tts-fallback

Spec: docs/specs/20260205-ios-tts-fallback/spec.md

## NEXT
- (none)

## IN PROGRESS
- (none)

## DONE
- [2026-02-05 17:04] T-001: Tighten turn-mode server-audio success criteria to require actual playback start and preserve fallback. (Implements: FR-001)
- [2026-02-05 17:04] T-002: Add MIME-playability guard before blob playback to avoid silent unsupported-format failures. (Implements: FR-002)
- [2026-02-05 17:04] T-003: Add/update component coverage for server-audio fallback behavior in turn mode. (Implements: FR-001)
- [2026-02-05 19:28] T-004: Add regression coverage for unsupported server-audio MIME fallback to browser speech. (Implements: FR-002)
- [2026-02-05 20:05] T-005: Normalize Gemini PCM/L16 payloads to WAV in the TTS service and add unit tests. (Implements: FR-003)
- [2026-02-05 20:13] T-006: Extend turn-mode intro/turn/help TTS wait behavior so slow responses can complete within timeout budget. (Implements: FR-004)
- [2026-02-05 20:05] T-007: Prime speech/audio contexts on Start tap to improve iOS fallback speech reliability. (Implements: FR-005)
- [2026-02-05 20:14] T-008: Validate live intro endpoint returns non-empty WAV audio under Gemini adapter. (Implements: FR-003, FR-004)
