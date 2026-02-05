# Feature Spec: 20260204-state-clarity

Status: Active
Created: 2026-02-04 15:54
Inputs: CR-20260204-1553, CR-20260205-1005
Decisions: D-20260204-1554, D-20260205-1010

## Summary
Make state-change messaging easier to read, auto-collapse the hero intro and Candidate Setup after questions are generated, surface the transcript above the fold during interviews, keep Extras/Restart accessible after stop, and persist Request Help answers in Question Insights.

## User Stories & Acceptance

### US1: Readable state changes (Priority: P1)
Narrative:
- As a user, I want state changes to be easy to notice, so I immediately understand what I can do next.

Acceptance scenarios:
1. Given dynamic status messaging is shown, When the UI renders, Then the messaging uses a larger font via the `ui-state-text` class. (Verifies: FR-001)

### US2: Collapsible hero intro (Priority: P1)
Narrative:
- As a user, I want the intro details to collapse after setup, so the layout stays focused once questions are ready.

Acceptance scenarios:
1. Given questions are generated, When the UI updates, Then the hero intro content collapses automatically and the toggle allows re-opening it. (Verifies: FR-002)

### US3: Focused interview layout (Priority: P1)
Narrative:
- As a user, I want key interview content above the fold and essential actions still reachable after stopping, so I can continue without hunting for controls.

Acceptance scenarios:
1. Given questions are generated, When the UI updates, Then Candidate Setup collapses automatically while remaining expandable. (Verifies: FR-003)
2. Given transcript content exists, When the interview starts, Then the transcript panel appears above the questions/insights section. (Verifies: FR-004)
3. Given the session is stopped and results are showing, When I look for controls, Then Extras and Restart are still available. (Verifies: FR-005)
4. Given results are visible, When the UI updates, Then the transcript panel is hidden to keep the score view focused. (Verifies: FR-007)
5. Given the setup panel is tall, When the UI renders, Then the setup content remains scrollable without truncation. (Verifies: FR-008)
6. Given the Question Insights panel is tall, When I drag its resize handle, Then the panel content expands vertically and remains scrollable. (Verifies: FR-009)
7. Given the Question Insights panel is visible, When I look at the panel edge, Then the resize handle is available on the panel itself. (Verifies: FR-009)

### US4: Persisted help examples (Priority: P1)
Narrative:
- As a user, I want Request Help answers saved with the question insights so I can practice against the example.

Acceptance scenarios:
1. Given I request help, When the response arrives, Then the help answer appears at the top of Question Insights for the active question and stays available when revisiting that question. (Verifies: FR-006)

## Requirements

Functional requirements:
- FR-001: Apply a `ui-state-text` class to dynamic state-change messaging to increase font size. (Sources: CR-20260204-1553; D-20260204-1554)
- FR-002: Auto-collapse the hero intro content after questions are generated and provide a toggle to re-open it. (Sources: CR-20260204-1553; D-20260204-1554)
- FR-003: Auto-collapse Candidate Setup after questions are generated while keeping the manual toggle. (Sources: CR-20260205-1005; D-20260205-1010)
- FR-004: Reorder the transcript panel above questions/insights once transcript content exists. (Sources: CR-20260205-1005; D-20260205-1010)
- FR-005: Keep Extras and Restart accessible when results are visible by showing the controls panel in a results-safe mode. (Sources: CR-20260205-1005; D-20260205-1010)
- FR-006: Persist Request Help answers in Question Insights for the active question and auto-pin the related question. (Sources: CR-20260205-1005; D-20260205-1010)
- FR-007: Hide the transcript panel when results are visible to reduce clutter. (Sources: CR-20260205-0312)
- FR-008: Ensure the Candidate Setup content remains scrollable to avoid truncation on smaller viewports. (Sources: CR-20260205-2106)
- FR-009: Make the Question Insights panel vertically resizable with scrollable content. (Sources: CR-20260205-2112, CR-20260205-2122)

## Edge cases
- If questions are cleared or a new session starts, the hero intro expands again. (Verifies: FR-002)
- If a help response arrives without a matching question index, do not overwrite existing examples. (Verifies: FR-006)
