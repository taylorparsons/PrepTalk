# PrepTalk Update (Customer-First)

## Customer
PrepTalk is built for job seekers and career switchers who want realistic interview practice, fast feedback, and a study artifact they can use before real interviews.

## What it does
PrepTalk is a voice-first interview simulator and coach.

- Contextual setup: Users upload a resume and target job description.
- Guided simulation: The app generates role-specific questions, runs a voice session, listens to answers, and can provide resume-grounded help on demand.
- Adaptive coaching loop: Users can submit answers, request coaching help, and continue through a structured interview flow.
- Comprehensive feedback: At session end, PrepTalk generates a downloadable Study Guide (PDF/TXT) with transcript, score, strengths, and improvement areas.

## How we built it
PrepTalk is a production-oriented voice web app with model routing and fallback controls.

- Backend: FastAPI on Cloud Run, with REST endpoints for turn-based coaching and a WebSocket path for live audio mode.
- AI core:
  - Gemini text models generate interview questions and score final transcripts.
  - Turn coaching uses Gemini text responses grounded in resume + JD context.
  - Server TTS is provider-routed, with OpenAI TTS as primary in production and Gemini TTS available as fallback path.
- Frontend: Vanilla JS + browser audio APIs, adaptive capture/playback, session-state controls, and transcript-first UX for mobile + desktop.
- Output: Interview transcript is persisted and exported as PDF/TXT with actionable coaching guidance.

## Challenges we ran into
- Model quota limits: Per-model daily request caps caused unstable behavior in high test periods; we moved interview-generation traffic to `gemini-3-flash-preview`.
- Voice concurrency: We had to prevent dual voice playback and stale response overlap when fallback audio paths triggered at nearly the same time.
- Turn control correctness: We tightened state locks so submit/help/listening transitions cannot race each other.
- Browser variance: Audio start events differ by browser; we hardened playback detection to avoid false fallback and mid-sentence cutoff.

## Accomplishments we’re proud of
- Natural voice practice flow with stable turn controls and explicit recovery options.
- Resume-grounded, role-specific coaching that is materially better than generic Q&A.
- Exportable study guide (PDF/TXT) that users can review after each run.
- Token-gated public deployment and full desktop/mobile Playwright coverage with artifacts.

## What we learned
- Reliability beats novelty in voice UX: fast but inconsistent audio feels broken to users.
- Voice products need strict state management to preserve context and prevent overlapping output.
- Test realism matters: cloud E2E is required because model quotas and browser behavior can differ from local runs.

## What’s next for PrepTalk
- Stronger live-mode noise rejection and clearer barge-in behavior defaults.
- Quota-aware model routing and more explicit degradation modes before users hit failures.
- Persona packs for company/interviewer style (for example: structured enterprise panel vs startup founder interview).
- Deeper coaching analytics over multiple sessions (trendline on clarity, relevance, and confidence).
