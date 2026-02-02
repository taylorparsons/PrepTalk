# Customer Requests (append-only)

## CR-20260128-1409
Date: 2026-01-28 14:09
Source: chat

Request (verbatim):
use $ralph and the git history to create the prd for this project

Notes:
- Use repository artifacts (README/DEVELOPER_GUIDE/docs/plans) plus `git log` to ground the PRD in what’s actually shipped.

## CR-20260129-0938
Date: 2026-01-29 09:38
Source: chat

Request (verbatim):
I need to imprive this app for submitting using gemini 2.5 and make an attempt to improve the quality of sound less robtic and clean up the UX/IU which is not full of debug buttons which even as the author are very confusing

Notes:
- Submission polish request: Gemini 2.5 defaults, better audio output quality, and fewer confusing debug/advanced controls in the UI.

## CR-20260129-1105
Date: 2026-01-29 11:05
Source: chat

Request (verbatim):
all of the test passed did that include playwright with a live test? I am seeing poorly formatted questions {'id': 'technical_prototyping', 'text': 'You led the development of dual-mode search architectures and agent workflows at a previous employer using AutoGen. Can you walk us through a specific technical trade-off you made during that system design regarding latency versus response quality? How did you validate that this architecture was ready for enterprise use rather than just a demo?', 'intent': 'Assess hands-on technical fluency with LLM limitations, architectural decision-making, and the ability to move from prototype to production-grade software.'} dev mode is off 2. sub-mitting the answer needs to be activated sooner and a few trigger phrases to submit the anser. 3. continue speaking is not working why is the button there at all? 4. when I click More button the pop-up is trunctated 5. when I end the session the Score Summary did not appear and I have no sense or indication that it was happening, make it more clear it is happening.

Notes:
- Clarifications: remove Continue Speaking; submit triggers: “how did I do?” and “submit my answer”; submit timing target: 10 seconds.
- Validation requirement: Playwright live E2E is required and should be run with `.env` (`E2E_LIVE=1`).

## CR-20260129-1221
Date: 2026-01-29 12:21
Source: chat

Request (verbatim):
update to use this exact version for voice gemini-2.5-flash-native-audio-preview-12-2025

Notes:
- Interpret “voice” as the default turn-mode TTS model unless otherwise specified.

## CR-20260129-1228
Date: 2026-01-29 12:28
Source: chat

Request (verbatim):
update .env

Notes:
- Update the TTS model entries to match the new default.

## CR-20260129-1232
Date: 2026-01-29 12:32
Source: chat

Request (verbatim):
is they are not set then do not use this, do not hard code the values

Notes:
- Ensure live E2E real-file paths are only used when env vars are set; do not hardcode file paths in repo config.

## CR-20260129-1234
Date: 2026-01-29 12:34
Source: chat

Request (verbatim):
you mis-understood, please the values in .env but to not hard code the values in the code

Notes:
- Keep the real-file paths in `.env`, but do not hardcode file paths in code.

## CR-20260129-1235
Date: 2026-01-29 12:35
Source: chat

Request (verbatim):
$ralph make sure my inputs here are considered user input and are tracked  look here [LOCAL_USER]/.codex/skills/ralph

Notes:
- Track this instruction as a user request in the RALPH log.

## CR-20260129-1255
Date: 2026-01-29 12:55
Source: chat

Request (verbatim):
make sure you are also using the skill peas use $create-plan to build out peas [LOCAL_USER]/.codex/skills/peas/SKILL.md

Notes:
- Update PEAS in AGENTS + PRD/specs; scope to Gemini text/voice calls; include full-suite tests and log-based PEAS eval signals.

## CR-20260129-1328
Date: 2026-01-29 13:28
Source: chat

Request (verbatim):
yes

Notes:
- Run the full test suite including live E2E.

## CR-20260129-1357
Date: 2026-01-29 13:57
Source: chat

Request (verbatim):
why does the app still have the option for live (streaming) ? It should not at this point as it is too buggy for this use case. remove it

Notes:
- Scope live streaming to dev mode only.

## CR-20260129-1359
Date: 2026-01-29 13:59
Source: chat

Request (verbatim):
how about we only have live streaming in the develop mode

Notes:
- Confirmed intent to keep live streaming behind `UI_DEV_MODE`.

## CR-20260129-1400
Date: 2026-01-29 14:00
Source: chat

Request (verbatim):
when done hold off on testing I have a few more tasks to be done

Notes:
- Defer tests per user request.

## CR-20260129-1402
Date: 2026-01-29 14:02
Source: chat

Request (verbatim):
earlier I reported that the more link is not large enough to display the content it is cut off make it wider so it fits

Notes:
- Increase the More drawer width to avoid truncation.

## CR-20260129-1403
Date: 2026-01-29 14:03
Source: chat

Request (verbatim):
remove the voice mode option having a drop down on 1 is stupid.

Notes:
- When only turn mode is available, remove the dropdown UI.

## CR-20260129-1404
Date: 2026-01-29 14:04
Source: chat

Request (verbatim):
the more pop up still does not fit

Notes:
- Widen the More drawer further.

## CR-20260129-1520
Date: 2026-01-29 15:20
Source: chat

Request (verbatim):
if the app is running in dev mode add it here at he bottom.  Adapter: gemini | Voice: Turn-based | Text: gemini-3-flash-preview | TTS: gemini-2.5-flash-native-audio-preview-12-2025 | Output: Browser TTS | mode: Develop mode

I cleared my cache I still see voice mode drop down

also make sure the Session Controls always aligns to the top just below the Candidate Setup section

Notes:
- Add a dev-mode indicator to the adapter meta line.
- Ensure voice-mode dropdown only appears when dev mode is enabled.
- Keep the Session Controls panel aligned directly beneath Candidate Setup.

## CR-20260129-1521
Date: 2026-01-29 15:21
Source: chat

Request (verbatim):
CREATE/edit tests and run all test to support these changes before you say you are done

Notes:
- Add/update automated tests and run full suites (pytest, Vitest, Playwright mock + live).

## CR-20260129-1543
Date: 2026-01-29 15:43
Source: chat

Request (verbatim):
this test is not using the real values availavble that sre set .env Ran set -a; source .env; set +a; E2E_LIVE=1 npm run test:e2e

Notes:
- Investigate why the live real-file E2E path is skipping despite `.env` values.

## CR-20260129-1544
Date: 2026-01-29 15:44
Source: chat

Request (verbatim):
do not run the live stream end to end tests

Notes:
- Skip Playwright live streaming tests unless explicitly re-enabled.

## CR-20260129-1551
Date: 2026-01-29 15:51
Source: chat

Request (verbatim):
no do not edit .env 
I want the end live test to use a real resume and job description the one I mention did not E2E_RESUME_PATH="[LOCAL_USER]/Documents/taylor_resumes/expedia_principle_ai_builder/Taylor_Parsons_Expedia_Principal_PM_AI_Builder_Resume.docx"
E2E_JOB_PATH="[LOCAL_USER]/Documents/taylor_resumes/expedia_principle_ai_builder/Principal Product Manager, AI Builder Experiences in Seattle, Washington _ Expedia Group _ Careers.pdf"

Notes:
- Do not modify `.env`.
- Ensure live real-file E2E uses the specified resume/job paths when it is explicitly run.

## CR-20260129-1600
Date: 2026-01-29 16:00
Source: chat

Request (verbatim):
yes do this   If you want, I can switch the live‑streaming model in the app’s dev‑only mode to gemini-2.5-flash-native-audio-
  preview-12-2025 so you can test live voice without Gemini 3

Notes:
- Dev-only live streaming should use `gemini-2.5-flash-native-audio-preview-12-2025` instead of Gemini 3.

## CR-20260129-1632
Date: 2026-01-29 16:32
Source: chat

Request (verbatim):
I RAN A TEST I HAVE TTS which looks like internal thoughts then i heard both the live voice and the TTS.  see exported session Interview Study Guide

Interview ID: 2cc743cf-e281-42ad-9574-0eef56a8636c
Adapter: gemini

Overall Score: 0

Summary
Unable to evaluate. The provided transcript contains only the interviewer's internal system logs, reasoning, and the formulation of the first question. There is no candidate response or dialogue to assess against the defined focus areas.

...

Transcript
[22:49:00] coach: **Initiating Interview Protocol**
...
and look at the logs/app.log 2cc743cf-e281-42ad-9574-0eef56a8636c

Notes:
- Live mode produced both live audio and browser TTS; avoid double playback.
- Live transcript captured internal reasoning; block this in coach output.
- Use `logs/app.log` to investigate the interview with ID `2cc743cf-e281-42ad-9574-0eef56a8636c`.

## CR-20260130-0920
Date: 2026-01-30 09:20
Source: chat

Request (verbatim):
review logs/app.log when using the app with live mode only I see a lot of errors [Image #1] which caused the P0 to display itself where there are so many errros that the context is lost and my answer is no longer avaiable and the voice asks me again. see /Volumes/T9/code/PrepTalk/docs/plans/2026-01-19-p0-audio-playback.md.

Notes:
- Investigate log error counts in Live Stats for live mode.
- Fix error inflation that hides context and causes repeated prompts.

## CR-20260130-0922
Date: 2026-01-30 09:22
Source: chat

Request (verbatim):
the fallback from the live voice to the TTS is bad user expereince it should be long tail exception not the norm if  I want to fix so I can sue the live mode.  Feel free to use mcp context7 other sources

Notes:
- Live mode should not default to browser TTS fallback.
- Use other sources if needed for live audio guidance.

## CR-20260130-1445
Date: 2026-01-30 14:45
Source: chat

Request (verbatim):
working from main branch I want to do the following
1. remove the develop view with the live chat and only have TTS as the option
2.  complete the original work for submit this for the hackathon
3. clean up the UI
4. once approved I will clean up git with $git-workflow-automation
1. I want the live mode removed from the main branch but keep it on the feature branch that is not main for now
2. docs/plans/2026-01-10-gemini-live-design.md 
3. remove all debug text
1. yes remove from main because we are removing the buggy live mode, and can add later
2. remove the requirement and log in the ralphs desion
follow $ralph audit trail and staging work as we move along

Notes:
- Remove live mode from `main` while keeping it on the feature branch.
- Update `docs/plans/2026-01-10-gemini-live-design.md` for hackathon submission scope.
- Remove debug UI text and dev-only live chat view from `main`.

## CR-20260130-1727
Date: 2026-01-30 17:27
Source: chat

Request (verbatim):
look in the app for the previous name called awesome interview and place with the app name

Notes:
- Replace “Awesome Interview” naming with the app name across UI/docs.

## CR-20260130-1729
Date: 2026-01-30 17:29
Source: chat

Request (verbatim):
add protection on the main branch on remote to put in basic protection to prevent deletion of main

Notes:
- Apply remote branch protection to prevent deleting `main`.

## CR-20260130-2036
Date: 2026-01-30 20:36
Source: chat

Request (verbatim):
I want any reference to the prior employer name removed you can do that now on this code base or merge the pull request whichever is safer

Notes:
- Remove all prior-employer-name references from the repository; choose the safest approach between merging PR #2 or manual edits.

## CR-20260130-2053
Date: 2026-01-30 20:53
Source: chat

Request (verbatim):
remove the pul PR #2 when done to clean up

Notes:
- Close PR #2 and delete its branch after the manual removal is pushed.

## CR-20260131-1313
Date: 2026-01-31 13:13
Source: chat

Request (verbatim):
yes run the full suit

Notes:
- Run the full test suite: pytest, Vitest, Playwright mock, and Playwright live with `.env`.

## CR-20260131-1404
Date: 2026-01-31 14:04
Source: chat

Request (verbatim):
working with $ralph to fix this   - Local .env has a typo: GEMINI_TTS_MODEL==... (.env:12) causing the “model not found” warning; also contains a real

Notes:
- Fix the `.env` typo for `GEMINI_TTS_MODEL` and remove the real API key from the local `.env`.

## CR-20260131-1410
Date: 2026-01-31 14:10
Source: chat

Request (verbatim):
$ralph also handle these finds - Legacy app name still present in package metadata: package.json:2, package-lock.json:2 (awesome-interview-frontend). If “Awesome Interview” must be fully replaced, update these.
  - README/log tooling still uses awesome_log and awesome_interview.json: README.md:102, docs/plans/2026-01-13-log-analysis-design.md:15. Decide whether to rename the log format + examples.
  - Live Stats UI string still exists in main JS bundle: app/static/js/ui.js:2249. It’s not rendered, but debug text still ships.

Notes:
- Update package metadata to the PrepTalk name.
- Rename log tooling format/view names and update README/docs references.
- Remove the Live Stats UI string from the main JS bundle.

## CR-20260202-1235
Date: 2026-02-02 12:35
Source: chat

Request (verbatim):
$ralph $create-plan to import this project into ai.google.com so I can share that enpoint with this code base running on their platform

Notes:
- Use the Gemini API via AI Studio (API key).
- Provide a shared endpoint approach.
- Choose the option that works for the hackathon.

## CR-20260202-1408
Date: 2026-02-02 14:08
Source: chat

Request (verbatim):
yes document, but can I deploy any updates from my remote repo?

Notes:
- Document Cloud Run deployment steps and how to deploy updates from a remote repo.

## CR-20260202-1424
Date: 2026-02-02 14:24
Source: chat

Request (verbatim):
I think I found a security issue https://preptalk-west-cz47ti6tbq-uw.a.run.app/ the session history will have other people account information, can you please check? I do not have any way for users to sigin to create an accunt to keep previous use from others

Notes:
- Address session isolation on the shared endpoint without full user auth.
