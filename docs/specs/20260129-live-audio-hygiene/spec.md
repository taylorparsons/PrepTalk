# Feature Spec: 20260129-live-audio-hygiene

Status: Active
Created: 2026-01-29 16:36
Inputs: CR-20260129-1632
Decisions: D-20260129-1635

## Summary
- Prevent double playback in live mode and avoid internal-reasoning transcripts from the coach.

## User Stories & Acceptance

### US1: Clean live audio output (Priority: P1)
Narrative:
- As a user, I want live mode to play either server audio or browser TTS (not both) and to only hear the coach’s question/feedback without internal reasoning.

Acceptance scenarios:
1. Given live mode with output `auto`, When live audio arrives after a transcript, Then browser TTS does not fire. (Verifies: FR-001)
2. Given live mode with output `browser`, When live audio arrives, Then browser TTS still speaks the transcript. (Verifies: FR-002)
3. Given a live session, When the coach responds, Then system instructions forbid internal reasoning in the coach output. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: In live mode, receiving live audio cancels pending browser TTS when output mode is `auto` or `server`. (Sources: CR-20260129-1632; D-20260129-1635)
- FR-002: In live mode with output mode `browser`, live audio should not suppress browser TTS. (Sources: CR-20260129-1632; D-20260129-1635)
- FR-003: Live system prompts must explicitly forbid internal reasoning or system-log narration. (Sources: CR-20260129-1632; D-20260129-1635)

## Edge cases
- Live audio arrives before transcript text; browser TTS should remain suppressed in `auto`/`server`. (Verifies: FR-001)
