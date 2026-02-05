# Feature Spec: 20260204-ui-daisy-refresh

Status: Done
Created: 2026-02-04 15:31
Inputs: CR-20260204-1531
Decisions: D-20260204-1531

## Summary
Improve the UI polish and interaction clarity by applying DaisyUI component styling to core UI elements and adding a contextual setup hint that guides users to the next required action.

## User Stories & Acceptance

### US1: Visual polish and guidance (Priority: P1)
Narrative:
- As a candidate, I want the interface controls to look consistent and tell me what to do next, so I can move through setup and the session without confusion.

Acceptance scenarios:
1. Given the setup panel has no resume and no job details, When the page loads, Then the setup hint tells the user to add both inputs. (Verifies: FR-003)
2. Given a resume and job input are present, When the inputs are set, Then the setup hint indicates the user is ready to generate questions. (Verifies: FR-003)
3. Given core UI elements render, When the page loads, Then buttons/inputs/panels include DaisyUI component classes while retaining existing class hooks. (Verifies: FR-001, FR-002)

## Requirements

Functional requirements:
- FR-001: Load DaisyUI styles in the UI and set a light theme on the root element. (Sources: CR-20260204-1531; D-20260204-1531)
- FR-002: Core UI elements (buttons, inputs, panels, status pills) include DaisyUI component classes alongside existing `ui-*` classes. (Sources: CR-20260204-1531; D-20260204-1531)
- FR-003: Candidate Setup shows a dynamic hint describing which inputs are missing and when it is ready to generate questions. (Sources: CR-20260204-1531; D-20260204-1531)

## Edge cases
- Setup hint shows a "Generating..." message while questions are being created. (Verifies: FR-003)
