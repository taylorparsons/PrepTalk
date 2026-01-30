# Feature Spec: 20260128-prd-from-git-history

Status: Done
Created: 2026-01-28 14:10
Inputs: CR-20260128-1409
Decisions: D-20260128-1410

## Summary
Create a source-traceable PRD for the existing project using repository documentation and `git` history as grounding evidence.

## User Stories & Acceptance

### US1: Maintain a PRD grounded in reality (Priority: P1)
Narrative:
- As a maintainer, I want a PRD that reflects what’s actually implemented, so that future work and testing stays aligned with shipped behavior.

Acceptance scenarios:
1. Given the repo docs and git history, when I open `docs/PRD.md`, then I can identify the product scope, core flows, and requirements with traceability and without speculative features. (Verifies: FR-001, FR-002, FR-003)

## Requirements

Functional requirements:
- FR-001: Add RALPH traceability scaffolding (`docs/requests.md`, `docs/decisions.md`, `docs/TRACEABILITY.md`). (Sources: CR-20260128-1409)
- FR-002: Expand `docs/PRD.md` into a structured PRD (goals, core flow, requirements, out of scope, backlog). (Sources: CR-20260128-1409; D-20260128-1410)
- FR-003: Ground the PRD in repository artifacts and git history by including an evidence/milestones section and separating backlog from shipped capabilities. (Sources: CR-20260128-1409; D-20260128-1410)

## Edge cases
- Repo contains design-only plan docs: PRD must not treat them as shipped requirements unless they are evidenced in code/tests. (Verifies: FR-002, FR-003)

