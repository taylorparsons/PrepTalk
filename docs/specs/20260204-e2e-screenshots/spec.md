# Feature Spec: 20260204-e2e-screenshots

Status: Active
Created: 2026-02-04 19:48
Inputs: CR-20260204-1947
Decisions: D-20260204-1948

## Summary
Capture Playwright screenshots for each state-change step and include them in HTML reports for mock and live runs.

## User Stories & Acceptance

### US1: Review state changes in a report (Priority: P1)
Narrative:
- As a product owner, I want a single Playwright report with screenshots of each state so I can review the flow before merging.

Acceptance scenarios:
1. Given the mock flow runs, When I open the HTML report, Then I see screenshots for each labeled state-change step. (Verifies: FR-001, FR-002)
2. Given the live turn flow runs, When I open the HTML report, Then I see screenshots for each labeled state-change step. (Verifies: FR-001, FR-003)

## Requirements

Functional requirements:
- FR-001: Attach full-page screenshots for each state-change step during Playwright runs. (Sources: CR-20260204-1947; D-20260204-1948)
- FR-002: Ensure the mock interview flow test includes step-labeled screenshots for setup, generating, questions ready, interview turn, and results. (Sources: CR-20260204-1947)
- FR-003: Ensure the live turn interview flow test includes the same step-labeled screenshots. (Sources: CR-20260204-1947)
- FR-004: Allow Playwright webServer runs to bind to a configurable host via `E2E_HOST`/`HOST`. (Sources: CR-20260204-1947; D-20260204-1948)
