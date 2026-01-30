# PRD: Awesome Interview (PrepTalk)

Status: Active
Updated: 2026-01-28 14:10
Inputs: CR-20260128-1409
Decisions: D-20260128-1410

## Summary
Voice-first interview practice app for the Gemini hackathon. (Sources: CR-20260128-1409; D-20260128-1410)

## Goals
- Provide a voice-first practice loop: upload context → practice answering → get scoring/feedback → export study materials. (Sources: CR-20260128-1409; D-20260128-1410)
- Support both deterministic local development/testing and optional Gemini-powered live experiences. (Sources: CR-20260128-1409; D-20260128-1410)

## Target users
- Job seekers practicing interview responses (especially for spoken answers). (Sources: CR-20260128-1409; D-20260128-1410)
- Builders/demoers needing a reliable mock mode and repeatable tests. (Sources: CR-20260128-1409; D-20260128-1410)

## Core user flow (current)
1) Upload resume + job description.
2) Generate questions and focus areas.
3) Start an interview session (live or turn-based).
4) Stop/submit; score and summarize.
5) Export a study guide (PDF/TXT). (Sources: CR-20260128-1409; D-20260128-1410)

## Functional requirements (shipped)
- FR-APP-001: The app runs with a FastAPI backend and a static vanilla JS UI. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-002: The system supports two interview adapters: `mock` (deterministic) and `gemini` (Gemini Live + Gemini text). (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-002a: When `INTERVIEW_ADAPTER=gemini`, the system requires `GEMINI_API_KEY` to be set. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-003: The system supports two voice modes: `live` (full-duplex streaming) and `turn` (turn-based, with completion check and optional TTS). (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-004: The app persists interview session state per user/interview as JSON under `app/session_store/<user_id>/<interview_id>.json`. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-005: The app exports a study guide in PDF and TXT formats. (Sources: CR-20260128-1409; D-20260128-1410)
- FR-APP-006: The UI includes a Live Stats panel that polls `/api/logs/summary`, and the client can send telemetry to `/api/telemetry`. (Sources: CR-20260128-1409; D-20260128-1410)

## Non-functional requirements (shipped)
- NFR-APP-001: The repo supports local development via `./run.sh` scripts (install, run UI, unit tests, e2e). (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-002: Logs are written to `logs/app.log` using key=value pairs (logfmt style) with colorized console logs. (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-003: The project includes automated test suites for UI (Vitest), API (pytest), and E2E (Playwright), including an optional live Gemini E2E path gated by env vars. (Sources: CR-20260128-1409; D-20260128-1410)

## Out of scope (explicitly not required by this PRD)
- A LiveKit-based “voice coach” implementation (there is a plan doc, but no requirement to ship it). (Sources: CR-20260128-1409; D-20260128-1410)
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
- Validate and update Live audio model defaults (see `docs/progress.txt` and `docs/plans/2026-01-16-gemini-live-audio-model-options.md`). (Sources: CR-20260128-1409; D-20260128-1410)
- Record manual voice smoke-test results (`docs/testing/voice-smoke-test.md`). (Sources: CR-20260128-1409; D-20260128-1410)
- Fill hackathon deliverables in `README.md` (demo link, write-up, 3-minute video). (Sources: CR-20260128-1409; D-20260128-1410)
- Submission polish: use Gemini 3 for interview generation/scoring and Gemini 2.5 Flash for turn-based coaching; prefer server TTS in turn mode to reduce robotic output. (Sources: CR-20260129-0938; D-20260129-0938, D-20260129-0942)
- Submission polish: simplify UI by hiding confusing debug/advanced controls by default (keep an opt-in dev mode). (Sources: CR-20260129-0938; D-20260129-0938)
- Submission polish: fix question formatting, remove “Continue Speaking”, enable submit after 10 seconds with voice triggers, fix “More” drawer truncation, and make scoring progress/results clear. (Sources: CR-20260129-1105; D-20260129-1105)
- Update turn-mode TTS defaults to use `gemini-2.5-flash-native-audio-preview-12-2025` with a legacy fallback. (Sources: CR-20260129-1221; D-20260129-1221)
- Live E2E real-file tests must use `E2E_RESUME_PATH`/`E2E_JOB_PATH` from env (may be set in `.env`), and the code must not hardcode those paths. (Sources: CR-20260129-1232, CR-20260129-1234; D-20260129-1232, D-20260129-1234)
- PEAS must be documented in AGENTS + PRD/specs for Gemini text/voice calls, require full-suite tests, and add log signals (`event=peas_eval`) for monitoring. (Sources: CR-20260129-1255; D-20260129-1255)
- Live streaming is available only in dev mode; production UI is turn-based only. (Sources: CR-20260129-1357, CR-20260129-1359; D-20260129-1357)
- Widen the “More” drawer to avoid truncating content. (Sources: CR-20260129-1402, CR-20260129-1404; D-20260129-1402, D-20260129-1404)
- Remove the voice-mode dropdown when only turn mode is available. (Sources: CR-20260129-1403; D-20260129-1403)
- Session Controls stay directly beneath Candidate Setup; adapter meta appends `mode: Develop mode` when `UI_DEV_MODE=1`, and `uiDevMode` parsing must treat string `"0"` as false so the voice-mode dropdown stays hidden in non-dev. (Sources: CR-20260129-1520; D-20260129-1522)
- When `UI_DEV_MODE=1`, force the live streaming model to `gemini-2.5-flash-native-audio-preview-12-2025` so dev-only live voice testing does not use Gemini 3. (Sources: CR-20260129-1600; D-20260129-1601)
- Live mode must not play both server audio and browser TTS; browser TTS should be suppressed when live audio arrives in auto/server mode, and live system prompts must forbid internal reasoning in coach output. (Sources: CR-20260129-1632; D-20260129-1635)
- Live system prompts must truncate resume/job excerpts to keep live sessions stable for large inputs. (Sources: CR-20260129-1632; D-20260129-1702)
- Live mode should only use browser TTS when explicitly selected; auto mode should not speak in live sessions. (Sources: CR-20260130-0922; D-20260130-0925)
- Live Stats Errors should count real errors only; disconnects are tracked in separate cards. (Sources: CR-20260130-0920; D-20260130-0925)
