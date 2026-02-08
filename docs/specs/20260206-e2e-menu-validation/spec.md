# Feature Spec: 20260206-e2e-menu-validation

Status: Done
Created: 2026-02-06 18:22
Inputs: CR-20260206-1819
Decisions: D-20260206-1820

## Summary
Add dedicated Playwright coverage for overflow menu behavior with positive and negative assertions in both desktop and mobile viewports.

## User Stories & Acceptance

### US1: Menu controls are reliable and stateful (Priority: P1)
Narrative:
- As a reviewer, I want menu behavior validated independently so hide/show regressions are caught quickly.

Acceptance scenarios:
1. Given setup state before generation, when menu is closed, then menu items are not visible (negative). (Verifies: FR-001)
2. Given generated session state, when menu opens, then `Hide Candidate Setup` is available and works (positive). (Verifies: FR-002)
3. Given candidate setup is hidden, when menu opens again, then `Show Candidate Setup` is available and `Hide Candidate Setup` is absent (negative/positive). (Verifies: FR-003)
4. Given desktop and mobile viewports, when the same checks run, then both pass with artifacts. (Verifies: FR-004)

## Requirements

Functional requirements:
- FR-001: Add negative menu-closed visibility checks. (Sources: CR-20260206-1819; D-20260206-1820)
- FR-002: Add positive hide/setup toggle validation via menu in generated state. (Sources: CR-20260206-1819; D-20260206-1820)
- FR-003: Add complementary negative check that opposite action is absent after toggle state change. (Sources: CR-20260206-1819; D-20260206-1820)
- FR-004: Execute menu validation in desktop and mobile viewport variants. (Sources: CR-20260206-1819; D-20260206-1820)

## Verification
- `APP_ACCESS_TOKENS=local-pass E2E_ACCESS_TOKEN=local-pass E2E_LIVE=0 PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-responsive npx playwright test tests/e2e/interview-flow-responsive.spec.js tests/e2e/menu-flow.spec.js --reporter=line,html --workers=1`
