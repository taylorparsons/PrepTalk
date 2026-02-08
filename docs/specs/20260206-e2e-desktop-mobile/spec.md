# Feature Spec: 20260206-e2e-desktop-mobile

Status: Done
Created: 2026-02-06 18:18
Inputs: CR-20260206-1816, CR-20260206-1819
Decisions: D-20260206-1817, D-20260206-1820

## Summary
Provide full end-to-end Playwright evidence for both desktop and mobile viewport flows so verification reflects real UI journey coverage, not only minimal smoke checks.

## User Stories & Acceptance

### US1: Reviewer can see full flow proof on desktop and mobile (Priority: P1)
Narrative:
- As a reviewer, I want one reproducible run that covers question generation through scoring/export on desktop and mobile so I can trust release quality.

Acceptance scenarios:
1. Given mock adapter test mode, when Playwright runs the full interview flow on desktop viewport, then flow reaches results with export actions enabled. (Verifies: FR-001)
2. Given mock adapter test mode, when Playwright runs the same flow on mobile viewport, then flow reaches results with controls still operable. (Verifies: FR-002)
3. Given persona-answer hooks are available, when a persona answer is queued, then transcript records candidate and coach turns. (Verifies: FR-003)
4. Given the run completes, when artifacts are generated, then HTML report and screenshots/videos are available and opened. (Verifies: FR-004)

## Requirements

Functional requirements:
- FR-001: Add a dedicated desktop end-to-end test that executes setup → generate → session → help/submit behavior → results/export checks with positive and negative assertions for shipped backlog behavior. (Sources: CR-20260206-1816, CR-20260206-1819; D-20260206-1817, D-20260206-1820)
- FR-002: Add a dedicated mobile viewport end-to-end test with the same behavioral assertions and artifact capture. (Sources: CR-20260206-1816, CR-20260206-1819; D-20260206-1817, D-20260206-1820)
- FR-003: Use a persona answer path to validate candidate answer submission and coach response progression in the flow. (Sources: CR-20260206-1819; D-20260206-1820)
- FR-004: Generate a separate HTML Playwright report for this run and open it locally for review. (Sources: CR-20260206-1816, CR-20260206-1819; D-20260206-1817, D-20260206-1820)

## Verification
- `APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 npx playwright test tests/e2e/interview-flow-responsive.spec.js --grep "mobile" --workers=1 --reporter=line`
- `APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-responsive npx playwright test tests/e2e/interview-flow-responsive.spec.js tests/e2e/menu-flow.spec.js --reporter=line,html --workers=1`
