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

## CR-20260202-1720
Date: 2026-02-02 17:20
Source: chat

Request (verbatim):
1. yes pin click
2. yes keep support documents, but let a URL address to be added by the user in which if you can reach it you will that in place of the document for the Job Decrtiption
3. Creat an introduction of what the app does and then details how to use it. Getting Set up with resume and job details, Generate will create the questions, the user can optionaly addd more questions in the advanced setup and then starting the coach and how to user the buttons notes on when they are inactive as it is not live voice but turn based.

Notes:
- Add pin interaction in question insights and expand intro/how-to guidance.
- Prefer job URL if reachable; keep file support as fallback.

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
review logs/app.log when using the app with live mode only I see a lot of errors [Image #1] which caused the P0 to display itself where there are so many errros that the context is lost and my answer is no longer avaiable and the voice asks me again. see docs/plans/2026-01-19-p0-audio-playback.md.

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

## CR-20260202-1516
Date: 2026-02-02 15:16
Source: chat

Request (verbatim):
I need help planning out how the User flow for the following 
1. talking back to the coach, right now after I speak some time goes by before I can submit an answer.  
2. in addition to the submit answer I want another button to request help with the answer
2.1 when either asking for help verbally or using button it is important that the suggested answers tightly align with the resume the user has submitted do not make anything up, "Never makeup" the answer when helping it does not help. 

User $ralph and $create plan to address this

1. It can be pressed as soon as the Coach is not talking
2. voiced via TTS and shown in the transcript
3. No I want to remove the minimum delay, they do not even have speak.

Notes:
- Add a help action (button + voice) and allow immediate submit after coach finishes speaking.
- Help responses must be grounded in resume content with no fabrication.

## CR-20260202-1704
Date: 2026-02-02 17:04
Source: chat

Request (verbatim):
The buttons in the UI show gray symbol when they are disabled [Image #1], it would be better if they also said wait for the coach to finish talking to use.  They need more information why they are disabled.  The buttons need ot change color for when they are available.  If they are available the test on mouse over should help the users with what they are for.  The More button should be called advanced setup.

the app is missing a name of what it is, and instructions how to use it. The app is called PreTalk, it is designed to create contextual questions for an interview. 

user $create-plan and $ralph to hande these request also I need this information to be added to the AGENT.md file so that the codex when started can know this information

1. PrepTalk needs to be down in the UI not just in the tab of the browser 
2. draft 2-3 step version and some more information on the advanced setup 
3. be creative use the $frontend-component-system  for making it user friendly 

4. I have one more larger ask, more help full information for each question to be available in the UI when the users mouse goes over the questions that will share the inner rubic why the question is being asked, pointers frm their resume that can be used to tell the story.  There could be an adcanced screen that opens so the user can read it while that are crafting the interview.

1. client side view
2. side panel that stays open 
3. add one more feature that allows the user the option to paste in a URL to the live job decription in place of the file of the job description is they chose that option

Notes:
- Add visible app name + short usage instructions to the UI and AGENTS.md.
- Improve disabled button guidance, enabled styling, and tooltips.
- Rename “More” to “Advanced Setup” and add explanatory text.
- Add question hover insights + persistent side panel with rubric and resume pointers computed client-side.
- Add job description URL input as an alternative to file upload.

## CR-20260202-1740
Date: 2026-02-02 17:40
Source: chat

Request (verbatim):
1. first question
2. yes a warning always if a user action did not work 
3 yes I drafted my goals but help the user if I missed something fill it is give it an positive personality

Notes:
- Default the insights panel to the first question after generation.
- Show a warning whenever a user action (like a job URL fetch) fails, even if a fallback succeeds.
- Use a positive, supportive tone in the intro/how-to copy and fill in any missing guidance.

## CR-20260202-1816
Date: 2026-02-02 18:16
Source: chat

Request (verbatim):
I have a few details to be updated in the UI 
1. the question insights show json, this needs to be mapped to a formatted display 
eg """ocus areas
{'area': 'Technical Depth in Distributed Systems & AI', 'description': "Assess candidate's ability to discuss architectural trade-offs (CAP theorem, latency vs. accuracy) in data platforms and their specific knowledge of ML/LLM lifecycles beyond high-level buzzwords."}
{'area': 'Cross-Functional Dependency Management', 'description': "Evaluate experience in navigating complex organizational structures to align stakeholders (Engineering, Product, Data Science) on critical path schedules, specifically in high-stakes environments like Nordstrom's peak events."}
{'area': 'Operational Excellence & Quality Assurance', 'description': "Focus on the candidate's methodology for improving system reliability (SLO/SLA management, incident response) and their hands-on experience implementing testing cultures that reduce production failures."}
{'area': 'Data Governance & Privacy', 'description': "Given Apple's focus on user privacy, scrutinize the candidate's experience with AI governance and data ingestion security to ensure they prioritize protection alongside innovation."}"""
2. the interview questions have a lot of white space, stack the pin and status on top of each other or above the question so free up more white space
3. once app is running the Candidate setup should collaspable
4. the restart inteview that is in the advanced setting should be up on the main app as well. Perhaps but below the session controls and the advnaced setup button in the same container on the left menu

Notes:
- Format focus areas into a readable title + description layout instead of raw JSON strings.
- Stack question controls vertically to reduce whitespace.
- Make Candidate Setup collapsible once a session/interview exists.
- Add a main restart button near Session Controls (keep Advanced Setup version).

## CR-20260203-0949
Date: 2026-02-03 09:49
Source: chat

Request (verbatim):
$minimalist-voice-ux-enforcer with with  $ralph to create an update to this app to imrove the call to action

Notes:
- Stage 1 CTA emphasis: upload resume/job, generate questions, start interview (start gated by inputs).
- Stage 2 CTA emphasis: turn-based controls, request help button, rubric-based help info when not responding.
- Stage 3 CTA emphasis: score creation/notification, export PDF/TXT, restart session as the most prominent action.
- Provide a Mermaid flow diagram for the CTA flow across all stages.

## CR-20260203-1011
Date: 2026-02-03 10:11
Source: chat

Request (verbatim):
fix the mermai error so it renders Parse error on line 4:
...[Generate Questions (Primary)]    C[Que
-----------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'PIPE', 'CYLINDEREND', 'DIAMOND_STOP', 'TAGEND', 'TRAPEND', 'INVTRAPEND', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got 'PS'

Notes:

## CR-20260203-1017
Date: 2026-02-03 10:17
Source: chat

Request (verbatim):
ok the mermaid renders, now can you add using ascii text when each stage the  primary cta and sub cta in the spec so I can be sure we are going in the shared direction

Notes:

## CR-20260203-1022
Date: 2026-02-03 10:22
Source: chat

Request (verbatim):
$minimalist-voice-ux-enforcer add ascii text in code blocks to I can see the wire frames for each stage

Notes:

## CR-20260203-1024
Date: 2026-02-03 10:24
Source: chat

Request (verbatim):
try again show the mobile and web view of the stages CTA and add to the spec.md for this

Notes:

## CR-20260203-1027
Date: 2026-02-03 10:27
Source: chat

Request (verbatim):
I want the write frames add to the spec I do not see it can you do that I only see this [Image #1]

Notes:

## CR-20260203-1030
Date: 2026-02-03 10:30
Source: chat

Request (verbatim):
I see them now can you create an image for the web view for each stage ?

Notes:

## CR-20260203-1034
Date: 2026-02-03 10:34
Source: chat

Request (verbatim):
add the mobile views now

Notes:

## CR-20260203-1038
Date: 2026-02-03 10:38
Source: chat

Request (verbatim):
update the spec so I can see the images in context

Notes:

## CR-20260203-1050
Date: 2026-02-03 10:50
Source: chat

Request (verbatim):
$ralph this CTA change needs to include updated playright end2end for both mock and live testings

Notes:

## CR-20260203-1054
Date: 2026-02-03 10:54
Source: chat

Request (verbatim):
1. yes turn based live 
2. same as used on main. 
3. lets put these changes on a new feature branch

Notes:
- Live E2E should run turn-based (same as main), not streaming.
- Create and work on a new feature branch for CTA changes.

## CR-20260203-1138
Date: 2026-02-03 11:38
Source: chat

Request (verbatim):
OK my bad the image shows the questions that are not filled in and the session conrols docs/specs/20260203-cta-clarity/assets/web-stage1.svg and a screen shot from the video shows [Image #1] other containers like the question help, transcript, report and controls all of which are not needed.  Let update the plan in $ralph to make sure the CTA are narrows to the CTA that has content. For example at the interview starts the container for adding a resume and job description is not needed.  That can collaps or be removed until the interview is over. I am more partial to using he collapsed contianer in case the user want to open again, for their own reason.

Notes:
- Stage gating: hide non-relevant containers; CTA should only appear with relevant content.
- Collapse Candidate Setup after interview starts; allow user to re-open.

## CR-20260203-1146
Date: 2026-02-03 11:46
Source: chat

Request (verbatim):
yes hidden until it exists, that can be true for all content like the report at the end of the session.

Notes:
- Hide panels until they have content (insights, transcript, score/report).

## CR-20260203-1044
Date: 2026-02-03 10:44
Source: chat

Request (verbatim):
6

Notes:
- User selected label option 6 from provided list: rename “Advanced Setup” to “Extras”.

## CR-20260203-1253
Date: 2026-02-03 12:53
Source: chat

Request (verbatim):
using the app I did not see it collapse automatically or for the manual [Image #1] fix the UI and the test so all actions in the spec and the user action are tested.

Notes:
- Ensure Candidate Setup auto-collapses on session start and manual collapse/expand works; add tests for both.

## CR-20260203-1321
Date: 2026-02-03 13:21
Source: chat

Request (verbatim):
I am not seeing it collapse in the video, running the app now and the container does not collapse

Notes:
- Fix auto-collapse + manual collapse visibility in the UI and update tests to verify actual hidden content.

## CR-20260203-1328
Date: 2026-02-03 13:28
Source: chat

Request (verbatim):
lets keep going stage 2

Notes:
- Implement Stage 2 CTA gating, inactivity help hint, and rubric-based help surface with tests.

## CR-20260203-1335
Date: 2026-02-03 13:35
Source: chat

Request (verbatim):
work on stage 3 as well and i wil test together

Notes:
- Implement Stage 3 results focus updates alongside Stage 2; update tests.
