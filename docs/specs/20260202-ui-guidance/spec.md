# Feature Spec: 20260202-ui-guidance

Status: Done
Created: 2026-02-02 17:04
Inputs: CR-20260202-1704, CR-20260202-1720, CR-20260202-1740
Decisions: D-20260202-1704, D-20260202-1720, D-20260202-1740

## Summary
- Surface PrepTalk’s name and usage guidance in the UI, improve action button affordances, add a pin-able question insights panel, and allow a job-description URL input with file fallback.

## User Stories & Acceptance

### US1: Clear App Identity (Priority: P1)
Narrative:
- As a candidate, I want to see the app name and quick instructions, so I know what to do next.

Acceptance scenarios:
1. Given the app loads, When the UI renders, Then the PrepTalk name, intro, and 2–3 usage steps are visible above the main panels in a friendly, supportive tone. (Verifies: FR-001)
2. Given the instructions are visible, When the user reads them, Then they include turn-based button guidance (why Help/Submit are inactive while the coach is speaking). (Verifies: FR-001)

### US2: Action Clarity (Priority: P1)
Narrative:
- As a candidate, I want clear guidance for disabled actions and helpful tooltips when enabled, so I understand what’s happening.

Acceptance scenarios:
1. Given the coach is speaking, When Submit/Help are disabled, Then helper text explains why. (Verifies: FR-003)
2. Given actions are enabled, When the user hovers, Then a tooltip explains what each action does. (Verifies: FR-003)

### US3: Question Insights (Priority: P1)
Narrative:
- As a candidate, I want to see why a question is asked and which resume points to use, so I can craft a stronger answer.

Acceptance scenarios:
1. Given the questions list, When the user hovers a question, Then a persistent side panel shows the rubric/focus areas and resume pointers. (Verifies: FR-004)
2. Given the insights panel, When the user clicks a question to pin it, Then the panel stays locked on that question until cleared. (Verifies: FR-004)
3. Given questions are generated, When the UI updates, Then the insights panel defaults to the first question. (Verifies: FR-007)

### US4: Flexible Job Description Input (Priority: P1)
Narrative:
- As a candidate, I want to paste a job description URL instead of uploading a file, so setup is faster.

Acceptance scenarios:
1. Given the setup panel, When a valid URL is entered, Then questions can be generated without a job file. (Verifies: FR-005)
2. Given both a URL and file are provided, When the URL is reachable, Then the URL is used in place of the file; otherwise the file is used. (Verifies: FR-005)
3. Given a URL fetch fails but a file fallback succeeds, When the UI updates, Then the user sees a warning that the URL could not be reached. (Verifies: FR-008)

## Requirements

Functional requirements:
- FR-001: The UI displays the PrepTalk name, intro, and 2–3 step usage instructions (including turn-based button guidance) at the top of the app in a positive, supportive tone. (Sources: CR-20260202-1704, CR-20260202-1720, CR-20260202-1740; D-20260202-1704, D-20260202-1720, D-20260202-1740)
- FR-002: The “More” button and drawer are renamed to “Advanced Setup” with a short explanatory description. (Sources: CR-20260202-1704)
- FR-003: Turn action buttons show disabled-state guidance and enabled-state tooltips; enabled buttons are visually distinct from disabled. (Sources: CR-20260202-1704)
- FR-004: A persistent side panel shows question insights (rubric/focus areas + resume pointers) that update on question hover and can be pinned, computed client-side from resume/job excerpts. (Sources: CR-20260202-1704, CR-20260202-1720; D-20260202-1704, D-20260202-1720)
- FR-005: Candidate setup supports a job description URL input; if the URL is reachable it overrides the file, otherwise the file is used. (Sources: CR-20260202-1704, CR-20260202-1720; D-20260202-1704, D-20260202-1720)
- FR-006: AGENTS.md documents the PrepTalk name and purpose. (Sources: CR-20260202-1704; D-20260202-1704)
- FR-007: The question insights panel defaults to the first generated question after questions load. (Sources: CR-20260202-1740; D-20260202-1740)
- FR-008: When a job URL fails but a file fallback succeeds, the setup panel surfaces a warning about the failed URL fetch. (Sources: CR-20260202-1740; D-20260202-1740)

## Edge cases
- If no resume pointers match a question, show “No matching resume lines found.” (Verifies: FR-004)
- If a job URL fails to fetch and no file exists, surface a clear error and keep setup disabled. (Verifies: FR-005)
- If a job URL fails but a file exists, fall back to the file and proceed. (Verifies: FR-005)
- If a job URL fails but a file exists, a warning is shown that the URL could not be reached. (Verifies: FR-008)
- If a question is pinned, hover interactions should not replace the pinned insights until unpinned. (Verifies: FR-004)
