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
## D-20260203-2100
Date: 2026-02-03 21:00
Inputs: CR-20260203-2100
PRD: Core user flow, Next / backlog

Decision:
Implement Option A (Learning Mode) for teach-first coaching: show resume-grounded examples BEFORE presenting each question, enabling users to know which story to tell before being asked.

Rationale:
Target users freeze because they don't know which story to tell, not because they lack experience (ACCESS gap, not knowledge gap). Showing the example first prevents the freeze rather than rescuing from it. This aligns with proven pedagogy: "I do, we do, you do."

Alternatives considered:
- Option B: Proactive Guidance (rejected: requires hesitation detection tuning, still allows freeze to occur)
- Option C: Always-Visible Context (incorporated: split panel with resume cues will be part of practice phase)
- Keep current test-first model (rejected: positions PrepTalk as simulator, not coach)

Acceptance / test:
- Learning Card component shows resume fact + example answer + "why this works" before each question.
- "Show Example First" toggle defaults ON for new users.
- Split panel displays resume cues during answer phase.
- Messaging across all 5 journey phases reflects teach-first positioning.
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

## D-20260203-1428
Date: 2026-02-03 14:28
Inputs: CR-20260203-1428
PRD: Core requirements (export)

Decision:
Allow PDF export to work with older `fpdf` installs by decoupling the `fpdf.enums` import and falling back to legacy `ln=True` cell behavior when enums are unavailable.

Rationale:
Some environments resolve `fpdf` without `fpdf.enums`, which currently triggers a false "fpdf2 required" error and breaks PDF exports. Falling back preserves export functionality without forcing a dependency reinstall.

Alternatives considered:
- Force reinstall/upgrade of `fpdf2` (rejected: brittle for users running the app from an existing venv).
- Remove PDF export entirely when enums are missing (rejected: conflicts with the export requirement).

Acceptance / test:
- Unit test verifies PDF generation succeeds when enums are absent (skips if `fpdf` missing).

## D-20260203-1504
Date: 2026-02-03 15:04
Inputs: CR-20260203-1503, CR-20260203-1504
PRD: Hackathon submission docs

Decision:
Create a hackathon submission doc with draft write-up + video script and leave explicit placeholders for the demo URL/video link until provided.

Rationale:
The plan can be implemented without guessing live links, while giving a complete, ready-to-fill submission package.

Alternatives considered:
- Block on exact demo/video URLs (rejected: would stall deliverables and planning progress).

Acceptance / test:
- README links to the hackathon submission doc and lists placeholders for required links.

## D-20260204-1531
Date: 2026-02-04 15:31
Inputs: CR-20260204-1531
PRD: Next / backlog

Decision:
Interpret the request as a targeted UI/UX refresh that adds DaisyUI component styling (buttons, inputs, panels, badges) and improves interaction guidance with contextual setup hints, without changing the core interview flow or backend APIs.

Rationale:
The request is broad; scoping to visual polish + clearer guidance yields immediate UX gains while keeping the change set small and safe for the current codebase.

Alternatives considered:
- Full Tailwind build pipeline and complete markup rewrite (rejected: larger scope and unnecessary for incremental UX improvements).

Acceptance / test:
- UI elements include DaisyUI component classes alongside existing class hooks.
- Candidate setup displays a dynamic hint explaining what is needed before “Generate Questions” is enabled.
- A component test asserts the setup hint content changes based on missing inputs.

## D-20260204-1554
Date: 2026-02-04 15:54
Inputs: CR-20260204-1553
PRD: Next / backlog

Decision:
Treat “state change text should be larger” as applying a new `ui-state-text` class to dynamic status messaging (setup status, setup hint, turn-help, score notice, and export/restart/session status lines), and auto-collapse the hero intro content after questions are generated while keeping a manual toggle available.

Rationale:
This targets user-visible state transitions without inflating static field help, and aligns the header collapse behavior with the existing Candidate Setup pattern.

Alternatives considered:
- Increase all helper text sizes globally (rejected: would bloat static form guidance).
- Fully hide the hero section after generation (rejected: user asked for collapse with re-open).

Acceptance / test:
- State-change messaging uses a larger font via `ui-state-text` class.
- After questions are generated, the hero intro collapses automatically and can be expanded again.
- Component test asserts the hero auto-collapse behavior.

## D-20260205-0915
Date: 2026-02-05 09:15
Inputs: CR-20260205-0912
PRD: Next / backlog

Decision:
Provide three visual options that emphasize CTA clarity while preserving collapsible guidance: (1) Stepper Hero, (2) CTA Ribbon, (3) Compact Guide Card. Each option will include a single mock image and a short rationale.

Rationale:
Three distinct but feasible patterns give clear choice without overwhelming the decision, and each can be implemented with DaisyUI components and existing layout constraints.

Alternatives considered:
- Provide more than three options (rejected: slows decision-making).
- Provide only small variations of the current layout (rejected: fails to offer clear visual direction).

Acceptance / test:
- Spec lists three options with rationale and references a mock image for each.

## D-20260205-0927
Date: 2026-02-05 09:27
Inputs: CR-20260205-0925
PRD: Next / backlog

Decision:
Add a fourth, low-risk option that minimally refines the existing layout by enlarging state text, tightening spacing, and adding a collapsed guide row without moving core containers.

Rationale:
This meets the “smaller changes” request while still improving CTA clarity and state awareness.

Alternatives considered:
- Re-skin the entire layout (rejected: higher risk and more layout churn).

Acceptance / test:
- Spec includes Option 4 with a mock image and notes that it preserves the current layout.

## D-20260205-0942
Date: 2026-02-05 09:42
Inputs: CR-20260205-0940
PRD: Next / backlog

Decision:
Define the UI state-change steps as six core stages in the existing flow: (1) Setup empty, (2) Setup ready to generate, (3) Generating questions, (4) Questions ready to start interview, (5) Interview turn in progress (coach speaking/awaiting answer), (6) Scoring/results. Create one SVG per stage using the current two-container layout.

Rationale:
These are the user-visible state changes that drive CTA gating today, and they align with the existing CTA stage model without adding new states.

Alternatives considered:
- Add more granular states for each minor status line (rejected: too noisy for a top-level UI step set).

Acceptance / test:
- Spec lists six state-change SVGs matching the defined stages.

## D-20260205-1010
Date: 2026-02-05 10:10
Inputs: CR-20260205-1005
PRD: Next / backlog

Decision:
Keep the current layout but adjust state transitions: auto-collapse Candidate Setup + hero instructions when questions are generated, move the transcript panel above the questions once transcript content exists, keep the Session Controls panel visible in results so Extras/Restart remain reachable (hide only action rows), and persist Request Help responses in Question Insights (auto-pin the active question).

Rationale:
These changes address the CTA clarity and workflow friction without introducing a new layout or additional panels.

Alternatives considered:
- Keep results-stage panels hidden and add a separate Restart button near Score Summary (rejected: user explicitly wants Extras/Restart available, and a new location adds risk).
- Add a new Help panel for answers (rejected: higher complexity; Question Insights already exists).

Acceptance / test:
- Candidate Setup and hero instructions collapse immediately after questions are generated.
- Transcript appears above the fold once transcript content exists.
- Extras + Restart remain accessible after session stop (results view).
- Request Help responses persist at the top of Question Insights for the active question.

## D-20260205-1115
Date: 2026-02-05 11:15
Inputs: CR-20260205-1110
PRD: docs/specs/20260205-state-change-svgs/spec.md

Decision:
Depict the voice chat panel above the fold in the left column for the interview-state SVGs, collapse the transcript into an expandable row in the results-state SVG, and show Extras/Restart as visible controls after questions are generated and after the session stops.

Rationale:
The request allows left or center placement; left-column placement preserves the existing three-column grid while keeping voice chat above the fold. Collapsing the transcript in results matches the request to keep it available without dominating the score view.

Alternatives considered:
- Center the voice chat panel across all columns (rejected: would obscure questions/insights in the SVGs and diverge from the current layout).
- Hide Extras during results (rejected: user asked to keep Extras/Restart available after stop).

Acceptance / test:
- Interview-state SVG shows voice chat at the top of the left column.
- Results-state SVG shows a collapsed transcript row with a "Show" affordance.
- Extras and Restart buttons appear in questions-ready and results states.

## D-20260204-1848
Date: 2026-02-04 18:48
Inputs: CR-20260204-1846
PRD: Next / backlog

Decision:
Use DaisyUI `radial-progress` indicators as inline, indeterminate spinners: one adjacent to the Generate Questions CTA during question generation, and one in the Score Summary header while scoring is pending.

Rationale:
Radial progress signals “wait” without adding new panels or layout shifts, keeping the CTA hierarchy intact while making long-running steps obvious.

Alternatives considered:
- Linear progress bars (rejected: more vertical space and draws attention away from primary CTA placement).
- Full-panel loading states (rejected: higher risk and more layout churn).

Acceptance / test:
- Generate Questions shows a radial progress indicator while questions are generating.
- Score Summary shows a radial progress indicator while scoring is pending.
- Indicators are hidden once the step completes or fails.

## D-20260205-0313
Date: 2026-02-05 03:13
Inputs: CR-20260205-0312
PRD: Next / backlog

Decision:
Honor the HTML `hidden` attribute via CSS and only reveal transcript/score panels and radial progress indicators when the related session state is active (session running or transcript present for voice chat; scoring pending or score available for score summary).

Rationale:
The UI already toggles `hidden` flags, but DaisyUI/author styles can override UA defaults. Adding a single `hidden` rule ensures visibility matches state without restructuring panels.

Alternatives considered:
- Remove panels from the DOM until needed (rejected: more complexity for layout reflow and state reuse).
- Add separate loading modals (rejected: higher visual disruption).

Acceptance / test:
- Transcript and Score Summary panels are not visible on initial load.
- Generate/Score radial indicators remain hidden until generation/scoring is active.

## D-20260204-1930
Date: 2026-02-04 19:30
Inputs: CR-20260204-1928
PRD: Next / backlog

Decision:
Animate the radial progress indicators with an indeterminate spin + pulse and only toggle the animation while the related process is active.

Rationale:
The backend does not expose percentage progress, so an indeterminate animation provides clear “work in progress” feedback without implying a precise completion rate.

Alternatives considered:
- True percentage progress bars (rejected: no reliable progress signal from the API today).
- Static progress icon (rejected: users interpreted it as idle/unfinished).

Acceptance / test:
- Radial progress indicators are hidden until generation/scoring is active.
- When active, the indicators visibly animate and stop animating when hidden.

## D-20260204-1940
Date: 2026-02-04 19:40
Inputs: CR-20260204-1937
PRD: Next / backlog

Decision:
Format exported focus areas/rubric entries as human-readable bullets: title on the first line and the description indented on the next line when present.

Rationale:
Exports are intended for human review; flattening structured rubric objects avoids raw JSON/dict strings in the output.

Alternatives considered:
- Keep raw JSON strings (rejected: hard to read in PDF/TXT output).
- Drop descriptions and only show titles (rejected: loses critical context for practice).

Acceptance / test:
- Exported study guide (PDF/TXT) renders focus areas as readable bullets without JSON/dict strings.

## D-20260204-1942
Date: 2026-02-04 19:42
Inputs: CR-20260204-1940
PRD: Next / backlog

Decision:
Format the Score Summary value as "<score> / 100" whenever a numeric score is available.

Rationale:
Explicitly stating the scale reduces ambiguity and makes low scores (like 0) understandable at a glance.

Alternatives considered:
- Add a label next to the score only (rejected: still leaves the numeric value ambiguous in isolation).
- Use a percentage (rejected: users asked for “out of 100”).

Acceptance / test:
- Score Summary shows values like "70 / 100" and "0 / 100" when scores exist.

## D-20260204-1945
Date: 2026-02-04 19:45
Inputs: CR-20260204-1943
PRD: Next / backlog

Decision:
Remove the intro-script instruction to confirm readiness/role, and explicitly instruct the coach to proceed directly to the first interview question.

Rationale:
The user already completed setup; an extra confirmation question feels redundant and interrupts the flow.

Alternatives considered:
- Keep confirmation for missing role_title only (rejected: still adds a distracting extra question).

Acceptance / test:
- Intro prompt does not ask the candidate to confirm readiness or the role before the first interview question.

## D-20260204-1948
Date: 2026-02-04 19:48
Inputs: CR-20260204-1947
PRD: Next / backlog

Decision:
Attach full-page screenshots at each state-change step inside the Playwright mock + live flow tests, and generate separate HTML reports for mock and live runs.

Rationale:
Screenshots embedded in the Playwright report give a single review artifact for each state change without manual capture.

Alternatives considered:
- Capture screenshots only on failure (rejected: does not provide the full step-by-step documentation the user requested).
- Use a separate CLI automation flow (rejected: tests already encode the steps and state gating).

Acceptance / test:
- Playwright mock and live reports include screenshots for each labeled state-change step.


## D-20260204-2026
Date: 2026-02-04 20:26
Inputs: CR-20260204-2024
PRD: Export study guide (Score Summary)

Decision:
Sanitize PDF export text to a Latin-1-safe subset (map smart quotes/dashes and drop unsupported characters) instead of switching fonts.

Rationale:
This is the smallest, least risky fix that prevents 500 errors without introducing new font assets or layout changes.

Alternatives considered:
- Add a Unicode font and register it in FPDF (rejected because it adds asset management and larger changes).

Acceptance / test:
- Unit test builds a PDF with smart quotes/em dashes without raising errors.
- E2E export buttons trigger PDF/TXT downloads successfully.

## D-20260205-2138
Date: 2026-02-05 21:38
Inputs: CR-20260205-2138
PRD: Next / backlog

Decision:
Interpret the request as a turn-mode interrupt action that cancels coach speech (browser TTS or server audio) and re-enables user interaction without auto-skipping.

Rationale:
This is the smallest, safest behavior that lets faster readers move on while avoiding state errors.

Alternatives considered:
- Auto-skip to the next question (rejected: changes flow and could drop answers).
- Leave as-is and require waiting (rejected: does not meet the request).

Acceptance / test:
- In turn mode while the coach is speaking, activating Interrupt stops speech immediately and updates Help/Submit state without errors.

## D-20260205-1020
Date: 2026-02-05 10:20
Inputs: CR-20260205-1020
PRD: Next / backlog

Decision:
Capture the target session layout and state logic in a new RALPH feature spec, including ASCII state layouts, Mermaid state diagrams (logic + UI output), and explicit status/substatus/rubric rules. Use standard responsive breakpoints (mobile <=640px, tablet 641–1024px, desktop >=1025px) and show the menu only when active components are pushed below the fold.

Rationale:
The request is to align on state logic and layout before implementation; a spec with diagrams + ASCII frames provides a concrete, traceable target without changing code.

Alternatives considered:
- Document only prose requirements without diagrams (rejected: user explicitly wants ASCII + state diagrams).
- Treat menu visibility as always-on (rejected: user requested menu only when active items are below the fold).

Acceptance / test:
- Feature spec includes ASCII frames for each state/sub-state, Mermaid diagrams for logic and UI output, and a status/substatus/rubric mapping table.
- Spec defines menu visibility rules and responsive breakpoints.

## D-20260205-1330
Date: 2026-02-05 13:30
Inputs: CR-20260205-1327, CR-20260205-1328
PRD: Next / backlog

Decision:
Post-merge, update the session layout spec and PRD to reflect the shipped behavior: the overflow menu provides explicit show/hide toggles for active panels (not only below-fold gating), and Candidate Setup visibility is user-toggled rather than auto-collapsed by default.

Rationale:
The user requested merging the current branch “as is” and asked that RALPH artifacts be kept accurate; the spec must reflect the actual merged behavior.

Alternatives considered:
- Revert behavior to below-fold-only menu visibility (rejected: conflicts with the merged state).
- Leave spec as-is and mark it done (rejected: would misrepresent shipped behavior).

Acceptance / test:
- Spec and PRD describe always-available panel visibility toggles in the overflow menu.
- PRD backlog is reconciled to match shipped behavior with evidence paths.

## D-20260205-1702
Date: 2026-02-05 17:02
Inputs: CR-20260205-1701
PRD: Next / backlog

Decision:
Treat the iPhone no-sound issue as a client playback reliability bug in turn mode server audio, and implement two safeguards: (1) only treat server audio as successful after actual playback starts, and (2) immediately fall back to browser speech when audio MIME is unsupported.

Rationale:
Safari/Chrome on iOS can resolve `audio.play()` without entering a true playing state, which leaves users with no audible output. Gating success on `onplaying` and preserving browser-speech fallback ensures the user still hears the coach response.

Alternatives considered:
- Force browser-only output globally (rejected: loses higher-quality server audio where playback works).
- Switch to live voice to bypass turn-mode TTS (rejected: does not remove iOS autoplay/codec constraints and adds live-streaming error surface).

Acceptance / test:
- If server audio never reaches playing state, browser speech fallback still speaks the coach text.
- If server audio MIME is not playable, client skips blob playback and falls back to browser speech.

## D-20260205-2012
Date: 2026-02-05 20:12
Inputs: CR-20260205-1701, CR-20260205-1959
PRD: Functional requirements; Next / backlog

Decision:
Treat the remaining iPhone no-sound issue as two additional reliability gaps: (1) Gemini TTS can return raw PCM (`audio/L16`) that iOS browsers do not play directly, and (2) turn-mode endpoints can return before slow TTS completes due the wait budget. Convert raw PCM/L16 payloads to WAV server-side and extend turn-mode TTS waiting from `voice_tts_wait_ms` to the full timeout budget before returning without audio. Also prime client audio on the Start user gesture.

Rationale:
User logs showed successful TTS generation with silent playback and intermittent empty audio payloads. WAV normalization addresses browser compatibility, and extended wait prevents premature empty-audio responses on slow TTS generations.

Alternatives considered:
- Force browser-only speech output (rejected: lower quality and still subject to iOS speech synthesis constraints).
- Switch to live streaming mode (rejected: user reports instability and it does not remove iOS audio unlock/codec constraints in turn mode).

Acceptance / test:
- `generate_tts_audio` returns browser-playable `audio/wav` when Gemini emits `audio/L16`/`audio/pcm`.
- Turn-mode intro/help/turn endpoints continue waiting up to `VOICE_TTS_TIMEOUT_MS` after hitting `VOICE_TTS_WAIT_MS`, so slow but successful TTS is returned instead of null audio.
- On Start click, client primes speech/audio contexts to improve iOS autoplay reliability.

## D-20260205-2119
Date: 2026-02-05 21:19
Inputs: CR-20260205-2118
PRD: Functional requirements; Next / backlog

Decision:
Merge `ios-tts-audio-unlock` into local `main` now that targeted tests and Cloud Run verification show the iOS TTS fixes are working, and reconcile RALPH artifacts immediately after merge.

Rationale:
The user explicitly requested merging to main and keeping RALPH/PRD current. The branch already contains the required traceability and verification evidence for the shipped iOS TTS work.

Alternatives considered:
- Keep changes on the feature branch only (rejected: conflicts with explicit merge request).
- Merge without PRD/progress reconciliation (rejected: violates RALPH audit requirements).

Acceptance / test:
- Local `main` includes the iOS TTS commits from `ios-tts-audio-unlock`.
- `docs/PRD.md`, `docs/specs/20260205-ios-tts-fallback/spec.md`, and `docs/progress.txt` reflect shipped status on main with merge evidence.

## D-20260206-0825
Date: 2026-02-06 08:25
Inputs: CR-20260205-2118, CR-20260206-0824
PRD: Functional requirements; Next / backlog

Decision:
Execute the merge by stashing uncommitted `main` work (including untracked files), fast-forwarding `main` to `ios-tts-audio-unlock`, then popping the stash to restore the local in-progress changes.

Rationale:
`main` had overlapping uncommitted edits, so direct merge failed. The user explicitly selected option `2`, which preserves local work and allows merge completion without discarding changes.

Alternatives considered:
- Commit local `main` work before merge (rejected: user selected stash flow).
- Defer merge (rejected: conflicts with explicit merge request).

Acceptance / test:
- Fast-forward merge completes on `main`.
- Pre-existing local `main` edits are restored after `git stash pop`.
- RALPH artifacts and PRD are reconciled post-merge.

## D-20260206-1438
Date: 2026-02-06 14:38
Inputs: CR-20260206-1432
PRD: Security/Privacy hardening for shared deployments

Decision:
Add an application-level access token gate that protects `/`, `/api/*`, and `/ws/live` when `APP_ACCESS_TOKENS` is configured, and support token entries with optional user mapping (`token:user_id`). In the same change, redact resume PII before question generation/storage while preserving the first name, enabled by default and controllable via `APP_REDACT_RESUME_PII`.

Rationale:
The test endpoint is publicly reachable, so a lightweight gate is needed immediately without introducing full account auth. Mapping token→user stabilizes session ownership for shared tokens. Redacting resume PII reduces exposure risk in prompts, session cache, and transcript-adjacent UI while preserving useful personalization.

Alternatives considered:
- OAuth/identity-aware proxy only (rejected for now: heavier setup and slower iteration for test endpoint).
- Per-request manual token entry in the client (rejected: poor UX and easy to misuse).
- Full resume anonymization with no name retained (rejected: user asked to keep first name).

Acceptance / test:
- Without a valid token, `/api/*` returns 401 and `/` shows a token gate page.
- With a valid token, a cookie is set and subsequent API/WS calls succeed.
- When token is mapped to user ID, server-side user resolution prefers mapped user over client-provided `X-User-Id`.
- Resume excerpts returned by `/api/interviews` redact phone/email/location/linkedin handle and keep first name in the header line.

## D-20260206-1720
Date: 2026-02-06 17:20
Inputs: CR-20260206-1716, CR-20260206-1700
PRD: Functional requirements; Next / backlog

Decision:
Treat the four Session Controls backlog items as implementation work now (auto-start after generation, delayed controls visibility, compact controls, sticky controls/menu), and deploy a single shared test token on Cloud Run (`APP_ACCESS_TOKENS=preptalk-test`) for immediate external validation.

Rationale:
The user asked for the backlog items plus token gating to be operational and tested end-to-end on localhost and Google test. A single shared token is the smallest working control with minimal UX friction.

Alternatives considered:
- Keep items as backlog-only docs updates (rejected: conflicts with explicit request to ship and test).
- Use per-user mapped tokens only (rejected for this pass: more setup than needed for immediate testing).

Acceptance / test:
- Localhost: `/` is token-gated, `/?access_token=preptalk-test` works, `/api/logs/summary` enforces token.
- Cloud Run test endpoint shows the same token behavior.
- Question generation auto-starts the session and Session Controls layout/visibility behavior matches requested updates.

## D-20260206-1753
Date: 2026-02-06 17:53
Inputs: CR-20260206-1751, CR-20260206-1700
PRD: Functional requirements (audio reliability)

Decision:
Treat auto-start as a potential iOS audio-unlock regression and add a guard that primes audio immediately on the Generate click (user gesture) before async question-generation work, while keeping existing start-time priming as fallback.

Rationale:
Decision D-20260205-2012 relies on start-gesture priming for autoplay constraints. After D-20260206-1720 auto-start, the eventual `startSession` call may occur outside user activation due to async gaps, so priming only at auto-start can be unreliable on iOS.

Alternatives considered:
- Revert auto-start (rejected: conflicts with shipped UI requirement).
- Force browser-only TTS (rejected: reduces quality and conflicts with server-audio preference decisions).

Acceptance / test:
- Generate click path triggers audio prime before network awaits.
- Auto-start continues to function.
- Existing audio regression suites pass.

## D-20260206-1754
Date: 2026-02-06 17:54
Inputs: CR-20260206-1752
PRD: Release/deployment non-functional requirements

Decision:
Require every release flow to include a clear rollback section with copy-paste commands that can immediately restore service traffic to the prior known-good revision.

Rationale:
Fast rollback is necessary to limit user impact when regressions escape verification, especially for audio-sensitive changes.

Alternatives considered:
- Keep rollback as ad-hoc operator knowledge (rejected: inconsistent and error-prone).
- Document rollback outside the main deploy guide (rejected: reduces discoverability during incidents).

Acceptance / test:
- Deploy guide includes pre-release capture, rollback commands, and post-rollback validation checks.
- Current service/revision examples are listed so operators can execute rollback without discovery delay.

## D-20260206-1817
Date: 2026-02-06 18:17
Inputs: CR-20260206-1816
PRD: Testing evidence / release verification

Decision:
Add a dedicated full-flow Playwright spec that executes the interview journey in both desktop and mobile viewports under the mock adapter, and publish a separate HTML report folder for that run.

Rationale:
The request is for end-to-end evidence across desktop and mobile, not a lightweight cloud smoke check. Mock mode provides deterministic flow validation and reproducible report artifacts.

Alternatives considered:
- Use existing cloud smoke spec only (rejected: too simple and not end-to-end).
- Run live Gemini E2E as primary evidence (rejected: higher flake risk for viewport-focused validation).

Acceptance / test:
- Both desktop and mobile end-to-end tests pass in a single Playwright run.
- HTML report is generated and opened locally with artifact paths shared.

## D-20260206-1820
Date: 2026-02-06 18:20
Inputs: CR-20260206-1819
PRD: Testing evidence / backlog validation

Decision:
Extend responsive E2E coverage with (1) a dedicated menu behavior spec, and (2) persona-driven desktop/mobile full-flow assertions that include positive and negative checks for the shipped backlog behaviors.

Rationale:
The user requested explicit menu coverage and stronger validation depth beyond a simple flow test.

Alternatives considered:
- Keep one monolithic test only (rejected: harder to isolate menu regressions).
- Validate only positive path (rejected: user explicitly asked for positive and negative checks).

Acceptance / test:
- Menu spec validates hide/show toggles and closed/open negative states.
- Responsive full-flow spec validates pre-generate hidden controls (negative), post-generate auto-start/visible controls (positive), sticky positioning checks, and persona answer/coach response path in desktop and mobile.

## D-20260206-1851
Date: 2026-02-06 18:51
Inputs: CR-20260206-1840, CR-20260206-1841
PRD: Testing evidence / release verification

Decision:
Interpret “do all of the work” as running every live Playwright E2E path maintained in this repo: turn live flow, live websocket flow, real-file live flow, long live stability flow, and long barge-in flow. Record proof in a dedicated evidence doc and stage the evidence artifacts (docs + test updates) in git.

Rationale:
The user asked for full completion without stopping and specifically requested staged evidence for review.

Alternatives considered:
- Run only one live smoke test (rejected: insufficient against explicit “all” request).
- Stage raw Playwright report/video binaries (rejected: gitignored and unnecessary for repo history; stage durable evidence docs instead).

Acceptance / test:
- Each targeted live Playwright spec passes.
- A consolidated HTML report directory exists and is opened.
- Evidence commands/outcomes are documented in `docs/testing/...` and tracked in `docs/progress.txt`.
- Relevant files are staged in git for user review.

## D-20260206-2021
Date: 2026-02-06 20:21
Inputs: CR-20260206-2020
PRD: FR-UI-002, testing evidence / release verification

Decision:
Remove the Session Controls rubric toggle/popover UI entirely for both desktop and mobile, reduce controls panel spacing/height further, and rerun the full Playwright matrix with refreshed HTML reports before staging.

Rationale:
The rubric popover consumed too much vertical space and introduced interaction overlap on narrow viewports. Eliminating it simplifies the controls surface and directly addresses the regression concern while preserving turn controls.

Alternatives considered:
- Keep rubric but collapse by default (rejected: still adds layout and interaction overhead).
- Keep rubric in desktop only (rejected: inconsistent behavior and does not satisfy request).

Acceptance / test:
- Session Controls no longer render rubric toggle/popover in desktop or mobile flows.
- Controls panel footprint is reduced versus prior spacing.
- Playwright suites pass across non-live desktop/mobile/menu/token and all live variants with refreshed reports.

## D-20260209-0848
Date: 2026-02-09 08:48
Inputs: CR-20260209-0846
PRD: Functional requirements (telemetry/analytics)

Decision:
Implement journey KPI tracking by extending the existing `/api/telemetry` path (no new endpoint), adding explicit UI journey events, and optionally forwarding those events to GA4 Measurement Protocol when `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` are configured.

Rationale:
Reusing the existing telemetry path minimizes delivery risk and deployment surface. Optional GA4 forwarding supports dashboarding/funnel analysis in Google while preserving local/log-based analytics by default.

Alternatives considered:
- Add a separate analytics service and endpoint (rejected: unnecessary complexity and rollout risk).
- Client-only GA tags without server logging (rejected: weaker backend observability and less robust traceability).

Acceptance / test:
- UI emits journey events for setup, session start, speaking/submission, scoring, and export.
- Backend accepts enriched telemetry payload fields and logs `event=journey_kpi`.
- API tests and UI tests pass with the enriched schema.

## D-20260209-0929
Date: 2026-02-09 09:29
Inputs: CR-20260209-0920
PRD: Functional requirements (telemetry/analytics)

Decision:
Prioritize Cloud Run journey KPI export to BigQuery using a Cloud Logging sink and dataset in `us-west1`, and defer Dialogflow CX export wiring until a CX agent is in active use.

Rationale:
The user selected BigQuery as the immediate data source. Exporting existing journey logs provides immediate SQL analytics without requiring CX migration or additional runtime changes.

Alternatives considered:
- Block on Dialogflow CX-first setup (rejected: slower path to KPI visibility).
- Keep logs only in Cloud Logging (rejected: weaker SQL reporting/funnel analysis).

Acceptance / test:
- BigQuery dataset exists for analytics.
- Logging sink exists and has dataset writer permissions.
- Journey KPI rows are queryable in BigQuery.

## D-20260209-1116
Date: 2026-02-09 11:16
Inputs: CR-20260209-1116
PRD: FR-APP-013 (resume redaction)

Decision:
Change resume redaction scope to preserve location information while continuing to redact name suffix after first token, phone, email, and LinkedIn handle. Also support name redaction when PDF extraction merges name and contact fields onto one line.

Rationale:
The user explicitly requested that location not be redacted. The inline name/contact edge case was leaking full names in production excerpts and requires a prefix-name matcher rather than line-level gating.

Alternatives considered:
- Keep location redaction for maximum privacy (rejected: conflicts with explicit user requirement).
- Disable all redaction (rejected: would expose phone/email/LinkedIn and prior privacy guarantees).

Acceptance / test:
- Location text such as `Seattle, WA` and `Seattle, Washington` remains unchanged in redacted output.
- Phone/email/LinkedIn remain redacted.
- Header names redact to `<first token> [redacted]` even when name + contact are on one line.
- `pytest -q tests/test_pii_redaction.py tests/test_api_interviews.py` passes.

## D-20260209-1206
Date: 2026-02-09 12:06
Inputs: CR-20260209-1206
PRD: FR-APP-014 (journey KPI telemetry rollout status)

Decision:
Mark production GA4 telemetry wiring (`T-013`) and live KPI funnel validation (`T-009`) as complete based on fresh production log evidence and BigQuery counts, while keeping Dialogflow CX export and GA4 user-data acknowledgement/privacy disclosure as explicit NEXT items.

Rationale:
The user asked to update status and continue execution. Current evidence shows production `ga4_forward status=sent` and queryable journey funnel milestones, so those tasks are complete. CX adoption and GA4 policy acknowledgement remain external rollout steps and should stay open.

Alternatives considered:
- Keep T-009/T-013 open until a separate dashboard is built (rejected: completion criteria were log/query evidence, which is now satisfied).
- Mark T-012 done without explicit acknowledgement/privacy-language evidence (rejected: would be unverifiable).

Acceptance / test:
- Production logs include `event=ga4_forward status=sent` for journey events on `preptalk-west`.
- BigQuery query returns non-zero counts for `journey_app_open`, `journey_resume_loaded`, `journey_job_loaded`, `journey_session_started`, `journey_score_generated`, and `journey_export_completed`.

## D-20260209-1210
Date: 2026-02-09 12:10
Inputs: CR-20260209-1206
PRD: FR-APP-014 (telemetry rollout privacy checklist)

Decision:
Implement end-user analytics disclosure text directly in the Candidate Setup UI and keep GA4 User Data Collection Acknowledgement as a separate manual rollout step (`T-012`) because it must be completed in GA Admin by a property owner.

Rationale:
This keeps the code-side privacy disclosure shippable and testable today while preserving an explicit manual gate for GA policy compliance.

Alternatives considered:
- Leave disclosure documentation-only with no in-app copy (rejected: weaker end-user visibility).
- Mark T-012 done after code changes alone (rejected: GA Admin acknowledgement is an external required action).

Acceptance / test:
- Candidate Setup renders analytics/privacy disclosure copy (`data-testid=\"analytics-disclosure\"`).
- Component tests assert disclosure presence.
- `docs/analytics-kpi.md` lists both in-app disclosure and GA Admin acknowledgement as rollout prerequisites.

## D-20260209-1221
Date: 2026-02-09 12:21
Inputs: CR-20260209-1221
PRD: FR-APP-014 (GA4 rollout checklist)

Decision:
Mark `T-012` complete based on direct user confirmation that GA4 User Data Collection Acknowledgement was already completed, and keep screenshot capture as an optional evidence hardening step.

Rationale:
The acknowledgement is a manual GA Admin control that cannot be read programmatically from this environment; the authoritative source is the property owner’s statement.

Alternatives considered:
- Keep T-012 open until screenshot is provided (rejected: user has already confirmed completion and requested continued progress).
- Mark T-012 complete without recording provenance (rejected: weak audit trail).

Acceptance / test:
- Task list shows `T-012` as done with user-confirmed completion note.
- Progress log records that completion is based on user attestation.
