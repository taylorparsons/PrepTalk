# Discovery: Gemini Model Limits and Daily Request Caps

Date: 2026-02-08 (UTC-8)
Owner: PrepTalk

## Context
- During live testing on 2026-02-08, coaching behavior regressed (cutoffs, repeated retries, and setup failures).
- Investigation combined:
  - Gemini quota dashboard readings shared during testing.
  - Cloud Run logs from `preptalk-west` and `preptalk-west-test`.

## Model Limits (Observed)
- `gemini-2.5-pro-preview-tts`
  - Daily requests (RPD): **50/day**
  - Observed usage during test window: **54/50** (over limit)
- `gemini-2.5-flash-preview-tts`
  - Daily requests (RPD): **100/day**
  - Observed usage during test window: **101/100** (over limit)
- `gemini-3-pro-preview` (text generation in app)
  - Cloud Run error showed:
    - `RESOURCE_EXHAUSTED`
    - quota metric: `generate_requests_per_model_per_day`
    - limit: **0**
  - Practical effect: question generation failures and downstream UI test instability.

## Root-Cause Notes
- Quota pressure and per-model daily caps can trigger:
  - 429s for text generation.
  - fallback or degraded voice behavior when TTS limits are exceeded.
- The app was previously using `gemini-3-pro-preview` for interview-generation path in some flows; that path became non-viable under current quota settings.

## Mitigation Applied (2026-02-08)
- Updated both Cloud Run services to use:
  - `GEMINI_INTERVIEW_TEXT_MODEL=gemini-3-flash-preview`
- Kept TTS provider set to OpenAI in production path to avoid Gemini TTS daily cap exhaustion for core coach audio path.

## Current Deployed Revisions
- Production: `preptalk-west-00035-cm7`
- Test: `preptalk-west-test-00025-jrb`

## Project Record Summary (Copy/Paste)
On 2026-02-08, we confirmed Gemini per-model daily limits were a production risk. Observed caps were 50/day for `gemini-2.5-pro-preview-tts` and 100/day for `gemini-2.5-flash-preview-tts`, both exceeded during testing. We also observed `gemini-3-pro-preview` returning `RESOURCE_EXHAUSTED` with per-model daily limit effectively 0 for our current project quota path. We mitigated by moving interview generation to `gemini-3-flash-preview` and keeping OpenAI TTS as the primary provider for coach audio reliability.
