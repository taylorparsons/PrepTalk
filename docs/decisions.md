# Decisions (append-only)

## D-20260128-1410
Date: 2026-01-28 14:10
Inputs: CR-20260128-1409
PRD: Scope, Requirements, Roadmap

Decision:
Write a “current-state” PRD derived from repository artifacts and main-branch git history, focusing on shipped behavior and explicitly separating backlog items from implemented requirements.

Rationale:
The request is to create a PRD “for this project” using git history; the safest interpretation is a retrospective PRD that matches the implementation and avoids inventing future scope.

Alternatives considered:
- Write an aspirational PRD for a future product (rejected: would require guessing requirements not evidenced in repo/history).

Acceptance / test:
- `docs/PRD.md` documents goals, core user flow, functional/non-functional requirements, and out-of-scope items grounded in current code/docs and commit history.
- Backlog items appear only under an explicit “Next / backlog” section.

## D-20260129-0938
Date: 2026-01-29 09:38
Inputs: CR-20260129-0938
PRD: Next / backlog

Decision:
Interpret “less robotic sound” as preferring server-provided audio (Gemini TTS) in turn mode with an “auto” fallback to browser speech when server audio is missing. Update defaults to use Gemini 2.5-family models for text by default.

Rationale:
The current UX already supports both server audio (TTS) and browser speech; the most direct way to reduce “robotic” output is to default to server TTS in turn mode while keeping a fallback path so the app stays functional if server audio is unavailable.

Alternatives considered:
- Add client-side audio post-processing (rejected: higher complexity, unclear benefit without measurement).
- Switch live audio buffering/resampling settings (rejected: unrelated to “robotic” browser TTS in turn mode).

Acceptance / test:
- In turn mode with `voiceOutputMode=auto`, the UI does not force output to `browser`.
- When server audio payload is missing, the UI falls back to browser speech in both `auto` and `server` modes.
- Default `GEMINI_TEXT_MODEL` uses a Gemini 2.5 text model unless explicitly overridden by env.

## D-20260129-0942
Date: 2026-01-29 09:42
Inputs: CR-20260129-0938
PRD: Next / backlog

Decision:
Split Gemini text model defaults: use Gemini 3 for interview generation/scoring, and Gemini 2.5 Flash for turn-based voice coaching (intro/turn completion/feedback).

Rationale:
Interview generation/scoring can favor higher quality; turn-based voice interactions benefit from lower latency. Keeping separate defaults reduces manual config while preserving existing overrides.

Alternatives considered:
- One global `GEMINI_TEXT_MODEL` for everything (rejected: forces a quality/latency tradeoff across unrelated flows).

Acceptance / test:
- `GeminiInterviewAdapter` uses `GEMINI_INTERVIEW_TEXT_MODEL` (default Gemini 3) for question generation and scoring.
- Turn-mode voice endpoints continue to default to `GEMINI_TEXT_MODEL` (default Gemini 2.5 Flash) unless overridden.

## D-20260129-1105
Date: 2026-01-29 11:05
Inputs: CR-20260129-1105
PRD: Next / backlog

Decision:
Implement the requested UX fixes as a submission-polish feature extension: normalize Gemini “question objects” into plain question strings, remove the “Continue Speaking” button, enable turn-mode submit after 10 seconds, add voice command triggers (“how did I do?”, “submit my answer”), fix the “More” drawer truncation via CSS, and make scoring progress/results unmistakable.

Rationale:
These are UX-level issues and can be addressed with small, targeted changes without altering the core live audio pipeline.

Alternatives considered:
- Keep the confirm-step UI (rejected: user explicitly wants “Continue Speaking” removed).
- Gate “Submit Answer” strictly on completion confidence (rejected: user wants predictable 10-second activation).

Acceptance / test:
- Questions render as readable strings even if Gemini returns objects with `text`.
- Turn mode exposes only “Submit Answer”; it becomes available after ~10s (configurable) and supports voice triggers.
- “More” drawer is scrollable and not visually truncated on small viewports.
- Stopping a session shows clear “Scoring…” feedback and the Score Summary updates when complete.
- Required validations include Playwright mock + Playwright live with `.env` (`E2E_LIVE=1`).

## D-20260129-1221
Date: 2026-01-29 12:21
Inputs: CR-20260129-1221
PRD: Next / backlog

Decision:
Treat “voice” in this request as the default turn-mode TTS model. Update `GEMINI_TTS_MODEL` default to `gemini-2.5-flash-native-audio-preview-12-2025` and keep a legacy TTS fallback to preserve compatibility.

Rationale:
Turn mode relies on server TTS for voice output; updating the default aligns the voice experience with the requested model while retaining a safe fallback if the model is unsupported.

Alternatives considered:
- Only update the live streaming model (rejected: already set to the requested model; does not affect turn-mode TTS output).

Acceptance / test:
- `load_settings()` defaults `voice_tts_model` to `gemini-2.5-flash-native-audio-preview-12-2025`.
- `voice_tts_models` includes the new default plus the legacy fallback.
- README defaults reflect the updated model.

## D-20260129-1232
Date: 2026-01-29 12:32
Inputs: CR-20260129-1232
PRD: Next / backlog

Decision:
Do not commit real file paths for live E2E data; rely on `E2E_RESUME_PATH` and `E2E_JOB_PATH` only when explicitly set, and remove those entries from `.env`.

Rationale:
Keeping paths out of repo config avoids hardcoding local machine details while still allowing live E2E to use real files when the env is set.

Alternatives considered:
- Keep the paths in `.env` (rejected: violates “do not hard code the values”).

Acceptance / test:
- `.env` does not contain `E2E_RESUME_PATH` or `E2E_JOB_PATH`.
- Live real-file E2E continues to skip when env vars are unset (existing test behavior).

## D-20260129-1234
Date: 2026-01-29 12:34
Inputs: CR-20260129-1234
PRD: Next / backlog

Decision:
Keep `E2E_RESUME_PATH` and `E2E_JOB_PATH` in `.env`, but do not hardcode those values anywhere in code. The live real-files test should still rely exclusively on env vars.

Rationale:
The user wants real-file defaults in `.env` while keeping code flexible and portable across environments.

Alternatives considered:
- Remove the `.env` entries entirely (rejected: user explicitly wants them present).

Acceptance / test:
- `.env` includes the provided `E2E_RESUME_PATH` and `E2E_JOB_PATH`.
- No code hardcodes those file paths; tests read only env vars.

## D-20260129-1255
Date: 2026-01-29 12:55
Inputs: CR-20260129-1255
PRD: Next / backlog

Decision:
Update PEAS in `AGENTS.md` and PRD/specs, scoped to Gemini text + voice calls. Require full-suite tests in PEAS performance measures, and add explicit log signals (`event=peas_eval`) for monitoring those calls.

Rationale:
The user wants PEAS to govern Gemini text/voice behavior specifically, and expects verification via the full test suite plus observable log signals.

Alternatives considered:
- Keep the prior submission-polish PEAS as-is (rejected: scope must change to Gemini calls).

Acceptance / test:
- `AGENTS.md` PEAS focuses on Gemini text/voice calls and includes full-suite tests.
- PRD/specs include the same scoped PEAS requirements.
- Gemini text + TTS calls emit `event=peas_eval` log entries.

## D-20260129-1328
Date: 2026-01-29 13:28
Inputs: CR-20260129-1328
PRD: Next / backlog

Decision:
Increase the live E2E timeout waiting for score completion in turn-mode to avoid flaking on Gemini scoring latency.

Rationale:
Live scoring can exceed the default 10s wait; extending the timeout preserves coverage without changing product behavior.

Alternatives considered:
- Skip the score assertion in live E2E (rejected: reduces verification coverage).

Acceptance / test:
- Live E2E passes with the extended score wait in `tests/e2e/live-turn-interview.spec.js`.

## D-20260129-1357
Date: 2026-01-29 13:57
Inputs: CR-20260129-1357, CR-20260129-1359
PRD: Next / backlog

Decision:
Restrict live streaming to dev mode only by forcing the UI to turn-based voice when `UI_DEV_MODE=0` and hiding the live option from the voice-mode selector.

Rationale:
The user reports live streaming is too buggy for the current use case and wants it removed for non-dev usage without deleting the implementation.

Alternatives considered:
- Fully remove live streaming codepaths (rejected: more invasive and harder to re-enable later).

Acceptance / test:
- When `UI_DEV_MODE=0`, the voice mode is forced to turn-based and the “Live (streaming)” option is not shown.
- When `UI_DEV_MODE=1`, the live option remains available.

## D-20260129-1402
Date: 2026-01-29 14:02
Inputs: CR-20260129-1402
PRD: Next / backlog

Decision:
Increase the More drawer width to reduce content truncation.

Rationale:
The drawer was too narrow to display its contents comfortably; widening it improves readability without affecting layout on small screens.

## D-20260130-0925
Date: 2026-01-30 09:25
Inputs: CR-20260130-0920, CR-20260130-0922
PRD: Next / backlog

Decision:
Treat live-mode browser TTS as an explicit override only (output mode = browser) and exclude disconnect events from Live Stats error counts.

Rationale:
Live mode should prioritize streamed audio; browser TTS fallback should be rare and only when intentionally selected. Disconnects are already tracked separately and should not inflate the Errors card.

Alternatives considered:
- Keep auto fallback to browser TTS in live mode (rejected: creates frequent double-audio and poor UX).
- Continue counting disconnects as errors (rejected: hides real errors and overwhelms Live Stats).

Acceptance / test:
- In live mode with output mode `auto`, coach transcripts do not trigger browser TTS.
- Live Stats Errors reflect only real errors (level ERROR/status=error); disconnects show only in disconnect metrics.

Alternatives considered:
- Keep width and rely on scrolling (rejected: user still experienced truncation).

Acceptance / test:
- Drawer width increases on desktop while remaining constrained on small screens.

## D-20260129-1403
Date: 2026-01-29 14:03
Inputs: CR-20260129-1403
PRD: Next / backlog

Decision:
Replace the voice-mode dropdown with a static label when only turn mode is available (non-dev mode).

Rationale:
With a single option, a dropdown adds confusion and no value.

Alternatives considered:
- Hide the entire row (rejected: keep clarity about current mode).

Acceptance / test:
- When `UI_DEV_MODE=0`, no `voice-mode-select` appears and a static “Turn-based (TTS)” value is shown.
- When `UI_DEV_MODE=1`, the dropdown remains available.

## D-20260129-1404
Date: 2026-01-29 14:04
Inputs: CR-20260129-1404
PRD: Next / backlog

Decision:
Increase the More drawer width again to improve fit on larger viewports.

Rationale:
User feedback indicated the previous width was still too narrow.

Alternatives considered:
- Increase only padding (rejected: width, not padding, was the limiting factor).

Acceptance / test:
- Drawer width increases further on desktop while remaining within the viewport on smaller screens.

## D-20260129-1522
Date: 2026-01-29 15:22
Inputs: CR-20260129-1520, CR-20260129-1521
PRD: Next / backlog

Decision:
Append a dev-mode indicator to the adapter meta line only when `UI_DEV_MODE` is truthy, harden `uiDevMode` parsing so string values like "0" are treated as false, and align the two-column layout to the top so Session Controls sit directly beneath Candidate Setup.

Rationale:
The meta line provides a visible confirmation when dev mode is on. Robust boolean parsing avoids accidental dev-mode exposure. Aligning grid items to the top prevents the left column from stretching and pushing Session Controls down.

Alternatives considered:
- Add a separate dev banner (rejected: user asked for the inline meta line).
- Keep `Boolean(config.uiDevMode)` and assume server booleans only (rejected: string configs can be truthy and cause confusion).
- Add fixed heights/margins to panels (rejected: brittle across viewports).

Acceptance / test:
- When `UI_DEV_MODE=1`, the adapter meta line ends with `mode: Develop mode`.
- When `uiDevMode` is `"0"` or absent, the voice-mode dropdown is not rendered.
- Session Controls appear immediately under Candidate Setup regardless of right-column height.

## D-20260129-1545
Date: 2026-01-29 15:45
Inputs: CR-20260129-1543, CR-20260129-1544
PRD: Next / backlog

Decision:
Do not run Playwright live streaming E2E tests unless explicitly requested. Document why live real-file tests skip when `VOICE_MODE=turn` and `UI_DEV_MODE` is off.

Rationale:
User asked to avoid live streaming tests. The real-file live spec is intentionally skipped when the UI is forced into turn mode; documenting this prevents confusion about `.env` values not being used.

Alternatives considered:
- Force live mode during tests regardless of UI settings (rejected: violates dev-only live streaming constraint).

Acceptance / test:
- No live streaming E2E tests are run without explicit user request.
- Explanation includes the specific `.env` values required for live real-file tests to execute.

## D-20260129-1601
Date: 2026-01-29 16:01
Inputs: CR-20260129-1600
PRD: Next / backlog

Decision:
When `UI_DEV_MODE=1`, force the live streaming model to `gemini-2.5-flash-native-audio-preview-12-2025` regardless of `GEMINI_LIVE_MODEL`, so dev-only live voice testing does not rely on Gemini 3.

Rationale:
The request is specifically about dev-only live streaming; overriding the live model in dev mode ensures Gemini 2.5 Native Audio is used without editing `.env`.

Alternatives considered:
- Add a new `GEMINI_LIVE_MODEL_DEV` env override (rejected: extra configuration not requested).
- Update `.env` defaults (rejected: user asked not to edit `.env`).

Acceptance / test:
- With `UI_DEV_MODE=1` and `GEMINI_LIVE_MODEL=gemini-3-flash-preview`, `settings.live_model` resolves to `gemini-2.5-flash-native-audio-preview-12-2025`.

## D-20260129-1635
Date: 2026-01-29 16:35
Inputs: CR-20260129-1632
PRD: Next / backlog

Decision:
In live mode, only play server audio when output mode is `auto` or `server`, and cancel any pending browser TTS when live audio arrives. Also, strengthen the live system prompt to forbid internal reasoning or system-log narration in coach output.

Rationale:
The user reported hearing both live audio and browser TTS plus internal-thought transcripts. Respecting the output mode avoids double playback, while prompt constraints reduce internal reasoning in transcripts.

Alternatives considered:
- Post-filter transcript text to strip reasoning (rejected: brittle and risks removing useful content).
- Always prefer server audio even in browser mode (rejected: violates explicit output choice).

Acceptance / test:
- In live mode with output mode `auto`, incoming live audio prevents browser TTS playback.
- In live mode with output mode `browser`, incoming live audio does not suppress browser TTS.
- Live system prompt contains an explicit instruction to avoid internal reasoning.

## D-20260129-1702
Date: 2026-01-29 17:02
Inputs: CR-20260129-1632
PRD: Next / backlog

Decision:
Truncate live system prompt resume/job excerpts to a fixed max length to reduce live-session instability with large real-file inputs.

Rationale:
The real-file live E2E sessions disconnect repeatedly without producing audio/transcripts. Limiting prompt size keeps the live audio context within stable bounds.

Alternatives considered:
- Leave prompts unbounded (rejected: repeated live disconnects on large inputs).
- Aggressive summarization (rejected: higher complexity and non-determinism).

Acceptance / test:
- Live prompts include at most 4000 characters each for resume and job excerpts.

## D-20260130-1445
Date: 2026-01-30 14:45
Inputs: CR-20260130-1445
PRD: Functional requirements, Next / backlog

Decision:
Remove the live-mode requirement from the main-branch PRD and ship a TTS-only (turn-based) UI on `main`. Keep backend live endpoints in place for future stabilization, but remove live controls and debug panels from the main UI.

Rationale:
Live mode is currently too unstable for the hackathon submission; a turn-based TTS flow is reliable and aligns with the submission scope while preserving the option to reintroduce live mode later.

Alternatives considered:
- Keep live mode behind dev gating (rejected: still exposes unstable behavior in main and confuses submission UX).
- Remove live backend endpoints entirely (rejected: larger change that blocks later reintroduction).

Acceptance / test:
- Main UI exposes only turn-based controls; no live mode selector, live transcript label, or Live Stats panel.
- PRD shipped requirements no longer claim live streaming or Live Stats as shipped in main.

## D-20260130-1729
Date: 2026-01-30 17:29
Inputs: CR-20260130-1729
PRD: N/A (repo governance)

Decision:
Attempted to enable branch protection on `main` via GitHub API; the request is blocked because branch protection requires GitHub Pro or a public repo for this account.

Rationale:
The GitHub API returned HTTP 403 with guidance to upgrade or make the repository public; no server-side change can be applied without that prerequisite.

Alternatives considered:
- Apply protection locally only (rejected: does not prevent remote deletion).
- Use rulesets API (rejected: same plan restriction).

Acceptance / test:
- Once the repo is public or upgraded, re-run the branch protection API call to set “Allow deletions” = false.

## D-20260130-2036
Date: 2026-01-30 20:36
Inputs: CR-20260130-2036
PRD: Next / backlog, Non-functional requirements

Decision:
Remove all references to the prior employer name directly in the working tree on `main` instead of merging PR #2. Redact existing occurrences in docs (including historical request text) to satisfy the removal request.

Rationale:
Direct edits minimize scope and avoid unintended changes from an unmerged PR; the user explicitly requested removal across the codebase, which includes documentation.

Alternatives considered:
- Merge PR #2 (rejected: unknown diff scope and potential extra changes).
- Leave historical request entries untouched (rejected: conflicts with “remove any reference” directive).

Acceptance / test:
- Repo scan for the prior-employer term returns no matches in tracked files.
- Automated test asserts no prior-employer-name references remain in repository text files.

## D-20260131-1404
Date: 2026-01-31 14:04
Inputs: CR-20260131-1404
PRD: N/A (local config hygiene)

Decision:
Fix the `.env` typo (`GEMINI_TTS_MODEL==`) and replace the real API key with a placeholder value in the local `.env`. Do not commit `.env`.

Rationale:
The typo triggers model lookup warnings, and leaving a real key in a local config risks accidental exposure. `.env` is already gitignored, so changes remain local.

Alternatives considered:
- Keep the real key and only fix the typo (rejected: leaves secret in a working file).

Acceptance / test:
- `.env` uses a single `=` for `GEMINI_TTS_MODEL`.
- `GEMINI_API_KEY` is set to a placeholder and not committed.

## D-20260131-1410
Date: 2026-01-31 14:10
Inputs: CR-20260131-1410
PRD: Non-functional requirements

Decision:
Replace legacy “Awesome Interview” naming in package metadata and log tooling with “PrepTalk”, and remove the unused Live Stats panel string from the main UI bundle by deleting the log dashboard panel code.

Rationale:
These names are legacy artifacts and do not reflect the current app branding; removing the Live Stats label ensures debug text is not shipped in main.

Alternatives considered:
- Leave package metadata unchanged (rejected: conflicts with branding cleanup request).
- Keep log tooling names and only update README (rejected: mismatched tooling and docs).
- Leave Live Stats code as dead UI (rejected: debug string still ships).

Acceptance / test:
- `package.json` and `package-lock.json` use the PrepTalk frontend name.
- lnav format/SQL filenames and view name use PrepTalk naming, and README/docs reflect it.
- `rg -n "Live Stats" app/static/js/ui.js` returns no matches.

## D-20260202-1235
Date: 2026-02-02 12:35
Inputs: CR-20260202-1235
PRD: Functional requirements, Non-functional requirements

Decision:
Treat “import into ai.google.com” as AI Studio project + API key setup and document the steps. Keep the Gemini API key server-side via `GEMINI_API_KEY` (with `GOOGLE_API_KEY` fallback) and describe the shared endpoint as the app’s FastAPI base URL for hackathon sharing.

Rationale:
AI Studio provides the Gemini API key and project context, while the app already exposes a FastAPI endpoint; this is the smallest hackathon-ready path without exposing secrets in the client.

Alternatives considered:
- Use a client-side API key (rejected: exposes secret and violates best practices).
- Require Vertex AI service accounts (rejected: heavier setup than needed for hackathon).

Acceptance / test:
- Docs include AI Studio project + API key setup and shared endpoint notes.
- Gemini adapter accepts `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
- Unit test verifies the fallback key path.

## D-20260202-1408
Date: 2026-02-02 14:08
Inputs: CR-20260202-1408
PRD: Non-functional requirements

Decision:
Document Cloud Run deployment for hackathon use, including a buildpack entrypoint override for `app.main:app`, and describe two update paths: re-deploy from the latest repo checkout or enable continuous deployment from a GitHub repository via Cloud Run/Cloud Build.

Rationale:
The request is to document deployment and answer whether remote repo updates can be deployed. Documentation is the smallest change that answers this without altering runtime behavior.

Alternatives considered:
- Add a CI/CD pipeline or Terraform automation (rejected: larger scope and not required for hackathon docs).

Acceptance / test:
- `docs/cloud-run-deploy.md` includes deployment and update guidance.
- README and developer guide link to the Cloud Run deployment doc.

## D-20260202-1424
Date: 2026-02-02 14:24
Inputs: CR-20260202-1424
PRD: Non-functional requirements

Decision:
Isolate session history per browser by generating and persisting an anonymous client user ID (localStorage) and sending it on API and WebSocket calls, treating the `local` user as a fallback only.

Rationale:
The shared Cloud Run endpoint has no authentication; all clients defaulting to `local` will see each other’s sessions. A per-browser anonymous ID is the smallest change that partitions session data without introducing auth.

Alternatives considered:
- Add full authentication and accounts (rejected: larger scope for hackathon).
- Disable session listing on shared endpoints (rejected: removes core feature).

Acceptance / test:
- New browser sessions receive a unique user ID stored in localStorage.
- API calls send `X-User-Id` with the stored user ID by default.

## D-20260202-1520
Date: 2026-02-02 15:20
Inputs: CR-20260202-1516
PRD: Next / backlog

Decision:
Enable manual submit immediately after coach speech ends (no minimum delay), while still requiring non-empty answer text to submit. Add a dedicated help action (button + voice command) that returns TTS + transcript help grounded in resume evidence; if no relevant resume evidence is found, return a safe fallback instead of fabricating.

Rationale:
The request is to remove the delay and ensure help never makes up details. Keeping a non-empty answer requirement avoids server validation errors, and evidence-gated help provides a concrete guardrail against hallucinations.

Alternatives considered:
- Allow empty submit to skip a question (rejected: requires a new “skip” flow and server changes not requested).
- Provide help without evidence validation (rejected: violates the “never make up” requirement).

Acceptance / test:
- Submit is enabled as soon as the coach finishes speaking when a question is awaiting an answer and there is any transcript text.
- Help responses include resume evidence snippets and fall back to “insufficient resume detail” messaging when evidence is missing.

## D-20260202-1704
Date: 2026-02-02 17:04
Inputs: CR-20260202-1704
PRD: Next / backlog

Decision:
Use the existing “PrepTalk” product name in the UI and AGENTS docs (treat “PreTalk” as a typo), add client-side question insights using resume/job excerpts returned at interview creation (no extra model calls), and allow a job description URL as an alternative to file upload via server-side fetch + HTML/PDF extraction.

Rationale:
Keeping the existing brand avoids inconsistent naming across repo/docs. Client-side insights meet the “client side view” requirement while leveraging already-extracted text. Allowing a URL option reduces friction while reusing the existing extraction pipeline on the server.

Alternatives considered:
- Rename the product to “PreTalk” across the repo (rejected: conflicts with existing “PrepTalk” naming already shipped).
- Generate question insights via new model calls (rejected: not “client side view” and adds cost/latency).
- Require users to paste job text instead of URL (rejected: less convenient).

Acceptance / test:
- UI displays “PrepTalk” and a short how-to; AGENTS.md includes the app name/purpose.
- Question hover updates a persistent side panel with rubric/focus areas and resume pointers computed client-side.
- Create interview accepts either job file or job URL and returns resume/job excerpts used by the UI.

## D-20260202-1720
Date: 2026-02-02 17:20
Inputs: CR-20260202-1720
PRD: Next / backlog

Decision:
Add a pin interaction so users can lock question insights in the side panel, expand the PrepTalk intro to include a short “how to use it” flow and turn-based button guidance, and prefer a reachable job URL over an uploaded job file (fall back to the file if the URL fetch fails).

Rationale:
Pinning keeps the insights panel useful while drafting responses. A fuller intro reduces confusion about setup and turn-based controls. Preferring the URL when it works aligns with the request while keeping document uploads as a reliable fallback.

Alternatives considered:
- Only update insights on hover with no pin (rejected: user asked for pin click).
- Hide the job file field when a URL is provided (rejected: removes a useful fallback).
- Error out when the URL fails even if a file exists (rejected: the request implies a fallback).

Acceptance / test:
- Question insights can be pinned and remain visible until cleared.
- The intro includes what the app does and step-by-step usage plus turn-based button guidance.
- When both URL and file are provided, the server uses the URL if reachable and otherwise processes the file.

## D-20260202-1740
Date: 2026-02-02 17:40
Inputs: CR-20260202-1740
PRD: Next / backlog

Decision:
Default the insights panel to the first generated question, surface a UI warning when a job URL fetch fails even if a file fallback succeeds, and update the PrepTalk intro copy with a positive, supportive tone that fills in missing “how to use it” guidance.

Rationale:
The user explicitly asked for first-question defaults and warnings on failed actions; adding a positive, supportive tone reduces confusion and aligns with the requested UX.

Alternatives considered:
- Leave insights empty until hover (rejected: user asked for first-question default).
- Only warn on hard failures (rejected: request asked to warn on any failed action).

Acceptance / test:
- After question generation, the insights panel shows question 1 details by default.
- When a job URL fetch fails but a file fallback succeeds, the setup panel shows a warning message.
- The hero copy includes a friendly intro plus step-by-step usage guidance.

## D-20260202-1816
Date: 2026-02-02 18:16
Inputs: CR-20260202-1816
PRD: Next / backlog

Decision:
Format focus areas into title + description blocks on the client, stack question controls vertically above the question text to reduce whitespace, make the Candidate Setup panel collapsible once an interview is created, and add a main-page restart button that mirrors the Advanced Setup restart behavior.

Rationale:
These choices preserve existing backend contracts while improving readability and scanability in the UI, and they expose frequent actions without forcing users into the drawer.

Alternatives considered:
- Change the backend focus area payload shape (rejected: higher risk for adapters and stored data).
- Auto-collapse setup on session start (rejected: user asked for collapsible, not forced).

Acceptance / test:
- Focus areas render as formatted title + description blocks.
- Question controls stack vertically above question text.
- Candidate Setup can be collapsed after interview creation.
- Main restart button appears and follows the same enable/disable rules as the drawer restart.

## D-20260203-1001
Date: 2026-02-03 10:01
Inputs: CR-20260203-0949
PRD: Next / backlog

Decision:
Define a stage-specific CTA hierarchy with a single primary action per state: Stage 1 promotes “Generate Questions” once inputs are complete and switches to “Start Interview” when questions are ready; Stage 2 promotes “Submit Answer” when the coach finishes speaking and keeps “Request Help” as a secondary action with a non-blocking inactivity hint; Stage 3 promotes “Restart Interview” as the primary CTA while exports are secondary.

Rationale:
This matches the user’s CTA priorities while preserving minimal-cognition rules (one primary CTA, gated by state) and keeping Stage 2 focused on live interaction.

Alternatives considered:
- Make “Export Study Guide” the primary CTA on Stage 3 (rejected: user explicitly wants restart front and center).
- Show a persistent insights side panel during Stage 2 (rejected: conflicts with focus-mode minimalism).

Acceptance / test:
- The UI spec and Mermaid flow diagram show a single primary CTA per stage with explicit gating rules.
- PRD backlog includes the staged CTA hierarchy update.

## D-20260203-1138
Date: 2026-02-03 11:38
Inputs: CR-20260203-1138
PRD: Next / backlog

Decision:
Apply stricter stage gating so only panels with relevant content are shown. When an interview starts, the Candidate Setup panel collapses by default (but remains accessible via the collapse toggle) to keep focus on live session content.

Rationale:
The user wants the UI to surface only content-relevant CTAs and containers; collapsing setup reduces cognitive load while preserving access if needed.

Alternatives considered:
- Remove Candidate Setup entirely during Stage 2 (rejected: user prefers collapsible access).
- Keep all panels visible and rely on visual hierarchy (rejected: user wants irrelevant containers hidden).

Acceptance / test:
- Stage 1 hides transcript/score panels until a session starts; Stage 2 hides or collapses setup by default; Stage 3 focuses on score + exports with setup collapsed.
- Playwright mock + live turn-based E2E assert setup is collapsed after session start and transcript/score visibility matches stage.

## D-20260203-1328
Date: 2026-02-03 13:28
Inputs: CR-20260203-1328
PRD: Next / backlog

Decision:
Implement Stage 2 help guidance as a non-blocking hint after 12s of inactivity while awaiting an answer, and show a compact “Answer rubric” card sourced from the current question (last coach question, else asked question) when the hint triggers or the user clicks Request Help.

Rationale:
A short inactivity window provides gentle guidance without interrupting turn-based flow. Using the locally-derived rubric keeps help grounded and immediate without extra model calls.

Alternatives considered:
- Always show rubric during Stage 2 (rejected: too visually noisy for focus mode).
- Only show rubric after server help returns (rejected: adds latency and requires a model call).

Acceptance / test:
- E2E asserts Submit/Help CTA gating, auto-collapse, and that the rubric card becomes visible on help click and is hidden when collapsed.
- UI shows a single-line hint pointing to Request Help after inactivity.

## D-20260203-1335
Date: 2026-02-03 13:35
Inputs: CR-20260203-1335
PRD: Next / backlog

Decision:
When Stage 3 (score pending or complete) is active and the session is not running, hide question/insights/transcript/controls panels to keep the results view focused on the score + export/restart CTAs.

Rationale:
Stage 3 is a results-only moment; hiding non-results panels reduces distraction while keeping exports and restart front and center.

Alternatives considered:
- Leave questions/transcript visible after scoring (rejected: increases clutter and competes with results CTAs).

Acceptance / test:
- E2E asserts questions/insights/transcript/controls panels are hidden after stop + score, while score panel remains visible.
