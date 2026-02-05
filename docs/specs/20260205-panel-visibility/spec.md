# Feature Spec: 20260205-panel-visibility

Status: Done
Created: 2026-02-05 03:13
Updated: 2026-02-05 03:13
Inputs: CR-20260205-0312
Decisions: D-20260205-0313

## Summary
Hide transcript/score panels and progress indicators until their associated state is active.

## User Stories & Acceptance

### US1: Avoid premature panels (Priority: P1)
Narrative:
- As a candidate, I want transcript/score panels hidden until they matter so the UI stays focused on setup.

Acceptance scenarios:
1. Given initial load, When I view the layout, Then Transcript and Score Summary panels are hidden. (Verifies: FR-001)
2. Given generation/scoring is idle, When I view the UI, Then radial progress indicators are hidden. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Transcript and Score Summary panels are hidden until their related state is active. (Sources: CR-20260205-0312; D-20260205-0313)
- FR-002: Radial progress indicators remain hidden until generation/scoring begins. (Sources: CR-20260205-0312; D-20260205-0313)
- FR-003: The UI honors the HTML `hidden` attribute across panels and progress indicators. (Sources: CR-20260205-0312; D-20260205-0313)
