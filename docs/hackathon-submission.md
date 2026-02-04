# Hackathon Submission (Gemini 3)

Deadline: 2026-02-09 5:00pm PST
Freeze target: 2026-02-07 (48-hour buffer)

## Submission checklist
- Demo URL (Cloud Run): https://preptalk-west-cz47ti6tbq-uw.a.run.app
- Public repo URL: https://github.com/taylorparsons/PrepTalk
- 3-minute demo video (English): TODO
- Gemini integration write-up (200 words): see draft below
- Screenshots (optional): TODO

## Gemini integration write-up (draft ~200 words)
PrepTalk is a voice-first interview practice coach powered by Gemini. We use Gemini 3 (default: `gemini-3-pro-preview`) to generate tailored interview questions and score answers using the candidate’s resume and job description as grounding context. Gemini 2.5 Flash (`gemini-2.5-flash`) drives the turn-based coaching loop with fast, low-latency responses, while Gemini native audio TTS (`gemini-2.5-flash-native-audio-preview-12-2025`) produces a more natural spoken coach voice. This combination lets us deliver a guided, conversational experience without overwhelming the user: the app generates questions, listens to a draft answer, and then provides structured feedback and a study guide export (PDF/TXT). Gemini is central because it powers every core step: question generation, coaching responses, and scoring summaries that turn raw practice sessions into actionable insights. The app also includes explicit safeguards for reliability in a hackathon setting: turn-based interaction (not live streaming) for stability, server-side logging of model calls, and exportable summaries for interview prep. PrepTalk demonstrates how Gemini 3 can transform static resume/job documents into an interactive, personalized coaching workflow.

## 3-minute demo script (English)
Total length: ~3:00

0:00–0:20 — Problem & hook
- "Interview prep is hard because you don’t get real feedback. PrepTalk turns your resume + job description into a personal interview coach powered by Gemini."

0:20–1:20 — End-to-end demo
- Upload resume + job description
- Click Generate Questions
- Show question list appears
- Start interview (turn-based)
- Coach asks a question, candidate answers
- Submit Answer
- Show score + summary + strengths/improvements
- Export study guide (PDF/TXT)

1:20–2:10 — Gemini integration highlight
- Mention Gemini 3 Pro used for question generation and scoring
- Gemini 2.5 Flash for coaching loop
- Native audio TTS for cleaner voice
- Emphasize grounding: resume + job description drive the prompts

2:10–2:40 — Impact & use cases
- "Job seekers practice quickly, iterate, and walk away with a study guide."
- "Teams can standardize interview prep and get consistent feedback."

2:40–3:00 — Close
- "PrepTalk makes interview practice real, structured, and actionable with Gemini."
- Show repo + demo URL onscreen

## Shot list (quick capture)
- Home screen (inputs ready)
- Generate Questions
- Question list populated
- Start Interview
- Transcript + controls
- Submit Answer
- Score Summary + export buttons
- Export action

## QA checklist (before submission)
- Run full interview flow in demo
- Export PDF/TXT works from Extras + Results
- Confirm demo URL public (no login)
- Confirm video link public
