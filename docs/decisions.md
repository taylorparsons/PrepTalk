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
