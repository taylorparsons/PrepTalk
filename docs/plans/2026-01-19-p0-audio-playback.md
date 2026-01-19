# P0: Turn-Mode Audio Playback

This P0 issue supersedes all other plans in `docs/plans/` until resolved.
If turn-mode audio is not reliably audible in Chrome, the project will be cancelled.

## Goal
- Ensure coach audio is audible in turn mode every session.

## Success criteria
- Chrome turn mode produces audible coach speech without manual retries.
- Server TTS failures still result in browser TTS output.

## Logged issue
- Gemini 2.5 TTS (2.5-*-tts) produced repeated 504/500 errors in `logs/app.log`, leading to unreliable playback and loss of session flow; default to browser TTS until server TTS stabilizes.
