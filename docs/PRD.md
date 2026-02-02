# PRD: PrepTalk

Status: Active
Updated: 2026-01-28 14:10
Inputs: CR-20260128-1409
Decisions: D-20260128-1410

## Summary
Voice-first interview practice app for the Gemini hackathon. (Sources: CR-20260128-1409; D-20260128-1410)

## Goals
- Provide a voice-first practice loop: upload context → practice answering → get scoring/feedback → export study materials. (Sources: CR-20260128-1409; D-20260128-1410)
- Support deterministic local development/testing and a Gemini-powered turn-based voice experience. (Sources: CR-20260128-1409; D-20260128-1410; CR-20260130-1445; D-20260130-1445)

## Target users
- Job seekers practicing interview responses (especially for spoken answers). (Sources: CR-20260128-1409; D-20260128-1410)
- Builders/demoers needing a reliable mock mode and repeatable tests. (Sources: CR-20260128-1409; D-20260128-1410)

## Core user flow (current)
1) Upload resume + job description.
2) Generate questions and focus areas.
3) Start a turn-based interview session.
4) Stop/submit; score and summarize.
5) Export a study guide (PDF/TXT). (Sources: CR-20260128-1409; D-20260128-1410)

## Functional requirements (shipped)
- FR-APP-001: The app runs with a FastAPI backend and a static vanilla JS UI. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-002: The system supports two interview adapters: `mock` (deterministic) and `gemini` (Gemini text + TTS for turn-based coaching). (Sources: CR-20260128-1409; D-20260128-1410; CR-20260130-1445; D-20260130-1445)
- FR-APP-002a: When `INTERVIEW_ADAPTER=gemini`, the system requires `GEMINI_API_KEY` to be set. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-002b: The Gemini adapter accepts an AI Studio API key via `GEMINI_API_KEY` or `GOOGLE_API_KEY`. (Sources: CR-20260202-1235; D-20260202-1235)
- FR-APP-003: The system supports a turn-based voice mode with completion checks and optional TTS. (Sources: CR-20260128-1409; D-20260128-1410; CR-20260130-1445; D-20260130-1445)
- FR-APP-004: The app persists interview session state per user/interview as JSON under `app/session_store/<user_id>/<interview_id>.json`. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-005: The app exports a study guide in PDF and TXT formats. (Sources: CR-20260128-1409; D-20260128-1410)

## Non-functional requirements (shipped)
- NFR-APP-001: The repo supports local development via `./run.sh` scripts (install, run UI, unit tests, e2e). (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-002: Logs are written to `logs/app.log` using key=value pairs (logfmt style) with colorized console logs. (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-003: The project includes automated test suites for UI (Vitest), API (pytest), and E2E (Playwright). (Sources: CR-20260128-1409; D-20260128-1410; CR-20260130-1445; D-20260130-1445)
- NFR-APP-004: Repository text and UI copy do not reference the prior employer name. (Sources: CR-20260130-2036; D-20260130-2036)
- NFR-APP-005: Package metadata and developer log tooling use the PrepTalk name; legacy “Awesome Interview” naming is removed. (Sources: CR-20260131-1410; D-20260131-1410)
- NFR-APP-006: Documentation covers AI Studio project/API key setup and shared endpoint configuration for hackathon use. (Sources: CR-20260202-1235; D-20260202-1235)

## Out of scope (explicitly not required by this PRD)
- A LiveKit-based “voice coach” implementation (there is a plan doc, but no requirement to ship it). (Sources: CR-20260128-1409; D-20260128-1410)
- Live streaming (Gemini Live) in the main-branch submission; deferred to a feature branch. (Sources: CR-20260130-1445; D-20260130-1445)
- Production hosting/deployment, auth/multi-tenant accounts, payments. (Sources: CR-20260128-1409; D-20260128-1410)

## Evidence (git history milestones)
These commits are used as implementation evidence for the “shipped” scope above:
- `0b2daf4`: websocket transport + mic capture
- `a821857`: audio playback pipeline
- `14e17f7`: Gemini Live audio streaming wired
- `c64377e`: persistence, PDF export, Gemini text scoring
- `a61088f` / `2e5e14b`: question status tracking
- `74899c4`: server-side repeated-question guard
- `dc6ae10` → `fa6c2cc`: log parsing + `/api/logs/summary`
- `6becd48`: Live Stats dashboard UI
- `07106a3` / `6dca54e`: Gemini Live reconnect + resumption
- `af3f2d4`: turn-mode timing adjustment

## Next / backlog (not shipped requirements)
- Record manual voice smoke-test results (`docs/testing/voice-smoke-test.md`). (Sources: CR-20260128-1409; D-20260128-1410)
- Fill hackathon deliverables in `README.md` (demo link, write-up, 3-minute video). (Sources: CR-20260128-1409; D-20260128-1410)
- Submission polish: use Gemini 3 for interview generation/scoring and Gemini 2.5 Flash for turn-based coaching; prefer server TTS in turn mode to reduce robotic output. (Sources: CR-20260129-0938; D-20260129-0938, D-20260129-0942)
- Submission polish: fix question formatting, remove “Continue Speaking”, enable submit after 10 seconds with voice triggers, fix “More” drawer truncation, and make scoring progress/results clear. (Sources: CR-20260129-1105; D-20260129-1105)
- Update turn-mode TTS defaults to use `gemini-2.5-flash-native-audio-preview-12-2025` with a legacy fallback. (Sources: CR-20260129-1221; D-20260129-1221)
- PEAS must be documented in AGENTS + PRD/specs for Gemini text/voice calls, require full-suite tests, and add log signals (`event=peas_eval`) for monitoring. (Sources: CR-20260129-1255; D-20260129-1255)
- Widen the “More” drawer to avoid truncating content. (Sources: CR-20260129-1402, CR-20260129-1404; D-20260129-1402, D-20260129-1404)
- Remove the voice-mode dropdown when only turn mode is available. (Sources: CR-20260129-1403; D-20260129-1403)
