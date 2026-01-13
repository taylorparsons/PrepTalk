# Manual Voice Smoke Test

## Purpose
Validate microphone permissions, live audio loop, transcript updates, and latency feel for the Gemini Live session.

## Setup
- Set `INTERVIEW_ADAPTER=gemini`.
- Set `GEMINI_API_KEY`.
- Start the app: `./run.sh ui`.
- Open `http://localhost:8000` in Chrome.

## Steps
1. Load the page and confirm the UI renders.
2. Upload a resume (PDF, DOCX, or TXT) and a job description (PDF, DOCX, or TXT).
3. Click **Generate Questions** and confirm questions appear.
4. Click **Start Interview** and allow microphone permissions.
5. Speak a short answer (5-10 seconds) and confirm:
   - Transcript updates with your speech.
   - You can hear the coach audio response.
6. Ask the coach for help (e.g., “give me a draft”) and confirm:
   - Coach provides a concise sample answer.
   - Coach asks you to respond in your own words.
7. Click **Stop Session** and confirm:
   - Score panel populates.
   - Transcript remains visible.

## Pass/Fail Criteria
- Mic permission prompt appears and is accepted.
- Transcript updates within a few seconds.
- Audio playback is audible and not distorted.
- UI remains responsive throughout.

## Result Log
- Date:
- Tester:
- Environment:
- Notes:
- Result: PENDING (manual run required)
