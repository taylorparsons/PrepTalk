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
- FR-APP-006: Export failures surface the server error detail in the UI to aid troubleshooting, and PDF export remains compatible with legacy `fpdf` installs. (Sources: CR-20260203-1424, CR-20260203-1428; D-20260203-1428)
- FR-APP-007: PDF exports sanitize unsupported Unicode characters to avoid 500 errors while preserving readable text. (Sources: CR-20260204-2024; D-20260204-2026)
- FR-APP-008: The Candidate Setup panel remains scrollable on smaller viewports to avoid truncation. (Sources: CR-20260205-2106)
- FR-APP-009: The Question Insights panel is vertically resizable with scrollable content. (Sources: CR-20260205-2112, CR-20260205-2122)

## Non-functional requirements (shipped)
- NFR-APP-001: The repo supports local development via `./run.sh` scripts (install, run UI, unit tests, e2e). (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-002: Logs are written to `logs/app.log` using key=value pairs (logfmt style) with colorized console logs. (Sources: CR-20260128-1409; D-20260128-1410)
- NFR-APP-003: The project includes automated test suites for UI (Vitest), API (pytest), and E2E (Playwright). (Sources: CR-20260128-1409; D-20260128-1410; CR-20260130-1445; D-20260130-1445)
- NFR-APP-004: Repository text and UI copy do not reference the prior employer name. (Sources: CR-20260130-2036; D-20260130-2036)
- NFR-APP-005: Package metadata and developer log tooling use the PrepTalk name; legacy “Awesome Interview” naming is removed. (Sources: CR-20260131-1410; D-20260131-1410)
- NFR-APP-006: Documentation covers AI Studio project/API key setup and shared endpoint configuration for hackathon use. (Sources: CR-20260202-1235; D-20260202-1235)
- NFR-APP-007: Documentation covers Cloud Run deployment steps and how to deploy updates from a remote repo. (Sources: CR-20260202-1408; D-20260202-1408)
- NFR-APP-008: Shared endpoints isolate session history per browser using an anonymous client user ID (no full auth). (Sources: CR-20260202-1424; D-20260202-1424)

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
- UI: enlarge state-change messaging and auto-collapse the header intro after questions are generated (with manual re-open). (Sources: CR-20260204-1553, CR-20260205-0910; D-20260204-1554)
- UI: add radial progress indicators for question generation and scoring pending states, animate them while active, and keep them hidden until needed. (Sources: CR-20260204-1846, CR-20260204-1928; D-20260204-1848, D-20260204-1930)
- UI: set the DaisyUI theme to `lemonade`. (Sources: CR-20260205-0249)
- UI: hide transcript/score panels and progress indicators until their related state is active. (Sources: CR-20260205-0312; D-20260205-0313)
- Export: format rubric/focus areas in study guide exports as human-readable bullets (no raw JSON/dict strings). (Sources: CR-20260204-1937; D-20260204-1940)
- UI: show score values in an explicit out-of-100 format (e.g., "70 / 100"). (Sources: CR-20260204-1940; D-20260204-1942)
- UX: provide four visual options with rationale and mock images for CTA-focused layouts, including a low-risk refinement of the existing UI. (Sources: CR-20260205-0912, CR-20260205-0925; D-20260205-0915, D-20260205-0927)
- UI refresh: apply DaisyUI component styling to buttons/inputs/panels and add contextual setup hints for primary actions. (Sources: CR-20260204-1531; D-20260204-1531)
- UX: create SVGs for each state-change step in the existing UI flow. (Sources: CR-20260205-0940; D-20260205-0942)
- UI flow: collapse Candidate Setup + hero instructions once questions are generated, surface transcript above the fold when it appears, keep Extras/Restart accessible after stop, and persist Request Help answers in Question Insights. (Sources: CR-20260205-1005; D-20260205-1010)
- Intro flow: do not ask for readiness/role confirmation before the first interview question. (Sources: CR-20260204-1943; D-20260204-1945)
- Test reporting: capture Playwright screenshots for each state-change step and generate HTML reports for mock + live runs. (Sources: CR-20260204-1947; D-20260204-1948)
- UI: show PrepTalk name + short how-to, improve action button guidance/tooltips, rename “Advanced Setup” to “Extras,” add client-side question insights side panel, and allow job description URL input. (Sources: CR-20260202-1704, CR-20260202-1740, CR-20260202-1816, CR-20260203-1044; D-20260202-1704, D-20260202-1740, D-20260202-1816)
- CTA hierarchy: enforce a single primary action per stage with explicit gating (Stage 1 Generate → Start; Stage 2 Submit Answer primary + Request Help secondary + inactivity hint; Stage 3 Restart primary + Export secondary + scoring completion notice). (Sources: CR-20260203-0949; D-20260203-1001)
- Stage gating: hide or collapse containers without relevant content per stage (e.g., collapse Candidate Setup after interview starts; hide questions/insights/transcript/score/controls panels until content exists; when results are pending/ready, hide questions/insights/transcript/controls to keep score + exports focused). (Sources: CR-20260203-1138, CR-20260203-1146, CR-20260203-1335; D-20260203-1138, D-20260203-1335)
- Turn mode: enable immediate submit after coach finishes speaking (no minimum delay) and add a resume-grounded help action (button + voice) that never fabricates and returns TTS + transcript output. (Sources: CR-20260202-1516; D-20260202-1520)
- Turn mode: allow interrupting coach speech to proceed without errors; interrupt cancels TTS and re-enables interaction. (Sources: CR-20260205-2138; D-20260205-2138)
- Record manual voice smoke-test results (`docs/testing/voice-smoke-test.md`). (Sources: CR-20260128-1409; D-20260128-1410)
- Fill hackathon deliverables in `README.md` (demo link, write-up, 3-minute video). (Sources: CR-20260128-1409; D-20260128-1410)
- Submission polish: use Gemini 3 for interview generation/scoring and Gemini 2.5 Flash for turn-based coaching; prefer server TTS in turn mode to reduce robotic output. (Sources: CR-20260129-0938; D-20260129-0938, D-20260129-0942)
- Submission polish: fix question formatting, remove “Continue Speaking”, enable submit after 10 seconds with voice triggers, fix “More” drawer truncation, and make scoring progress/results clear. (Sources: CR-20260129-1105; D-20260129-1105)
- Update turn-mode TTS defaults to use `gemini-2.5-flash-native-audio-preview-12-2025` with a legacy fallback. (Sources: CR-20260129-1221; D-20260129-1221)
- PEAS must be documented in AGENTS + PRD/specs for Gemini text/voice calls, require full-suite tests, and add log signals (`event=peas_eval`) for monitoring. (Sources: CR-20260129-1255; D-20260129-1255)
- Widen the “More” drawer to avoid truncating content. (Sources: CR-20260129-1402, CR-20260129-1404; D-20260129-1402, D-20260129-1404)
- Remove the voice-mode dropdown when only turn mode is available. (Sources: CR-20260129-1403; D-20260129-1403)
