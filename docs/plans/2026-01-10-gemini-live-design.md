# Gemini Live Interview Practice Design

## Context
- New repo in /Volumes/T9/awesome_interview for the Gemini 3 Hackathon.
- Gemini 3 Live full-duplex voice is the primary interface via AI Studio; no text input.
- Multi-model Gemini 3 usage: questions, live coaching, summaries.
- Demo likely delivered via an AI Studio app.

## Goals
- Voice-first interview practice with streaming audio in and out.
- Session persistence for transcripts, scoring, and PDF study guides.
- Simple FastAPI backend and vanilla JS frontend for rapid iteration.
- Responsive layout that works on mobile and desktop.

## Non-Goals
- Text-only fallback.
- Third-party voice services.
- Production-scale auth, billing, or team management.

## Decisions
- Audio streaming format: PCM16 mono at 24 kHz in ~20 ms frames for natural conversation.
- Study guide includes rubric, transcript, and summary.
- Session persistence is per user, stored under app/session_store/<user_id>.

## Architecture Overview
The backend runs a FastAPI service that handles uploads, session state, and Gemini 3 calls. A WebSocket endpoint bridges the browser microphone stream to Gemini Live and streams audio responses back to the client. A separate Gemini text client handles agenda generation and post-session summaries. Session data is stored as per-user JSON on disk (app/session_store/<user_id>) and used to generate a PDF study guide with rubric, transcript, and summary.

## Components
### Backend
- FastAPI routes for session creation, upload, summary retrieval, and PDF export.
- WebSocket route for Gemini Live audio streaming.
- Audio format for live streaming: PCM16 mono @ 24 kHz (~20 ms frames).
- Gemini Live client to create sessions, forward audio frames, and receive audio or transcript events.
- Gemini text client for question agenda and summary generation.
- Session store for per-user JSON persistence under app/session_store/<user_id>.
- PDF renderer using WeasyPrint or a similar library (includes rubric + transcript + summary).
- Test-only Gemini Live adapter to simulate streaming events for E2E tests.

### Frontend
- app/templates/index.html: voice-first UI with start and stop controls.
- app/static/js/voice.js: mic capture, audio buffering, and playback.
- app/static/js/transport.js: WebSocket lifecycle, reconnect, and status.
- app/static/js/ui.js: transcript rendering and session status.
- Responsive layout with stacked panels on mobile and split panes on desktop.

## Data Flow
1. User uploads resume and job description.
2. Backend uses Gemini question model to create an agenda and evaluation rubric.
3. User starts the live interview; browser streams mic audio to the backend.
4. Backend forwards audio to Gemini Live; receives audio and transcript events.
5. Client plays coach audio and renders rolling transcripts.
6. On stop, backend runs Gemini summary model and generates a PDF study guide with rubric and transcript.

## Error Handling and Resilience
- Mic permission denied: block the session and display clear re-enable steps.
- WebSocket disconnect: offer retry and preserve session state on disk.
- Gemini Live errors: log details, show user-friendly messages, and backoff.
- Rate limits or quota: notify the user and keep the transcript for later resume.

## Testing Plan
- Unit tests for session storage and transcript assembly.
- Mocked Gemini Live streaming tests to validate message flow.
- API tests for session lifecycle endpoints.
- Manual voice smoke tests for mic permissions and playback latency.

## Integration Test Plan
- Playwright E2E script that drives the UI like a user: upload resume/JD, start session, stream audio, verify transcript, score, and PDF export.
- Test-only adapter provides deterministic Gemini Live events in mock mode.
- Optional live mode runs against AI Studio with a test persona on request.

## Hackathon Compliance Notes
- New project created during the contest period.
- Gemini 3 is central to questions, live coaching, and summaries.
- English UI and submission materials.
- Provide AI Studio demo link, public repo, 3-minute video, and Gemini integration write-up.


## Implementation Checklist

### Backend
- [x] FastAPI scaffold and base routes (`/`, `/health`).
- [x] Interview API endpoints (mock): create, live session, scoring.
- [x] WebSocket endpoint for full-duplex audio streaming.
- [x] Gemini Live adapter: session creation + audio frame forwarding.
- [x] Gemini text adapter: question generation + scoring.
- [x] Session store persistence on disk (`app/session_store/<user_id>`).
- [x] PDF study guide rendering + export endpoint (rubric + transcript + summary).
- [x] Error handling for mic denial, WS disconnects, and quota limits.

### Frontend
- [x] Voice-first UI shell (setup, controls, transcript, score).
- [x] Microphone capture + audio playback pipeline (PCM16 @ 24 kHz).
- [x] WebSocket transport layer with reconnect + status.
- [x] Live transcript streaming + incremental updates.
- [x] Responsive layout (split on desktop, stack on mobile).

### Testing
- [x] API tests for session lifecycle (mock adapter).
- [x] Playwright E2E flow (mock adapter).
- [x] Mocked Gemini Live streaming tests for event flow.
- [ ] Manual voice smoke tests (mic permissions + latency).
- [ ] Optional live-mode E2E with AI Studio persona.

### Hackathon Deliverables
- [ ] AI Studio demo link.
- [ ] Gemini integration write-up.
- [ ] 3-minute demo video.
