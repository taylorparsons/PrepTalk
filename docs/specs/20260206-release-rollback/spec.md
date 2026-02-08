# Feature Spec: 20260206-release-rollback

Status: Done
Created: 2026-02-06 17:57
Inputs: CR-20260206-1752
Decisions: D-20260206-1754

## Summary
Add an explicit rollback standard to release operations so every deploy has immediate, copy-paste recovery steps tied to Cloud Run revisions.

## User Stories & Acceptance

### US1: Operator can rollback in minutes (Priority: P1)
Narrative:
- As an operator, I want exact rollback commands available in the deploy guide so I can quickly revert traffic after a bad release.

Acceptance scenarios:
1. Given a service deploy, when the new revision is unhealthy, then the guide provides commands to route 100% traffic back to the previous revision. (Verifies: FR-001)
2. Given rollback is executed, when health/API checks are run, then operator can confirm service recovery. (Verifies: FR-002)

## Requirements

Functional requirements:
- FR-001: Deploy documentation must include a pre-deploy capture step for prior revision and an explicit traffic rollback command. (Sources: CR-20260206-1752; D-20260206-1754)
- FR-002: Deploy documentation must include post-rollback verification commands for health and token-gated API behavior. (Sources: CR-20260206-1752; D-20260206-1754)
- FR-003: Current endpoint section must reference the known-good rollback target revision for the active test service. (Sources: CR-20260206-1752; D-20260206-1754)

## Verification
- Manual doc validation: follow rollback steps against `preptalk-west-test` revision history and confirm command correctness.
