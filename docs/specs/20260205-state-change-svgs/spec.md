# Feature Spec: 20260205-state-change-svgs

Status: Active
Created: 2026-02-05 09:45
Updated: 2026-02-05 11:15
Inputs: CR-20260205-0940, CR-20260205-1110
Decisions: D-20260205-0942, D-20260205-1115

## Summary
Refresh the state-change SVGs to match the clarified UI flow: hero instructions and Candidate Setup collapse after questions are generated, voice chat sits above the fold during the interview, and Extras/Restart remain visible after stop.

## User Stories & Acceptance

### US1: Review state-change visuals (Priority: P1)
Narrative:
- As a product owner, I want one image per state-change step so that I can validate the UI flow without running the app.

Acceptance scenarios:
1. Given this spec, When I review the SVG list, Then I see six labeled steps with corresponding images that include collapsed hero/setup after questions, visible voice chat during the interview, and Extras/Restart in results. (Verifies: FR-001, FR-003)

## Requirements

Functional requirements:
- FR-001: Provide six SVGs representing the current UI state-change steps: Setup empty, Setup ready, Generating, Questions ready, Interview turn, Scoring/results. (Sources: CR-20260205-0940; D-20260205-0942)
- FR-002: Each SVG uses the current layout and includes the primary CTA plus a large state text line to signal the step. (Sources: CR-20260205-0940)
- FR-003: After questions are generated, the SVGs show the hero instructions and Candidate Setup collapsed; the interview state shows voice chat above the fold (left column); the results state keeps Extras/Restart visible with transcript collapsed but expandable. (Sources: CR-20260205-1110; D-20260205-1115)
- FR-004: The interview-state SVG shows Request Help output pinned at the top of Question Insights. (Sources: CR-20260205-1110)

## State-change SVGs

1. Setup empty (missing resume/job) — `assets/state-1-setup-empty.svg`
2. Setup ready to generate — `assets/state-2-ready-generate.svg`
3. Generating questions — `assets/state-3-generating.svg`
4. Questions ready (hero + setup collapsed, Start Interview visible) — `assets/state-4-questions-ready.svg`
5. Interview turn in progress (voice chat above fold, help pinned in insights) — `assets/state-5-interview-turn.svg`
6. Scoring/results (transcript collapsed, Extras/Restart visible) — `assets/state-6-scoring-results.svg`
