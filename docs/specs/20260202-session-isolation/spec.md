# Feature Spec: 20260202-session-isolation

Status: Done
Created: 2026-02-02 14:24
Inputs: CR-20260202-1424
Decisions: D-20260202-1424

## Summary
Prevent shared session history on the public endpoint by issuing a per-browser anonymous user ID and using it in API/WebSocket calls, with a server-side cookie fallback.

## User Stories & Acceptance

### US1: Anonymous per-browser sessions (Priority: P1)
Narrative:
- As a user on a shared endpoint, I want my session history isolated from other browsers so that I don’t see other users’ sessions.

Acceptance scenarios:
1. Given a new browser visit, When the UI loads, Then it generates and stores an anonymous user ID and uses it for API calls. (Verifies: FR-001)
2. Given an existing browser visit, When the UI reloads, Then it reuses the stored user ID. (Verifies: FR-001)
3. Given a server-provided user ID not equal to `local`, When the UI loads, Then it respects the provided user ID. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Generate and persist a per-browser anonymous user ID and use it for API and WS calls by default. (Sources: CR-20260202-1424; D-20260202-1424)
- FR-002: Respect a non-`local` user ID provided by server config. (Sources: CR-20260202-1424; D-20260202-1424)
- FR-003: When no client header is provided (or it is `local`), fall back to a server-issued cookie user ID. (Sources: CR-20260202-1424; D-20260202-1424)

## Edge cases
- Local storage unavailable or blocked (fallback to per-load anonymous ID). (Verifies: FR-001)
