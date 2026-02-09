# Feature Spec: 20260209-kpi-journey-telemetry

Status: Done
Created: 2026-02-09 08:49
Inputs: CR-20260209-0846, CR-20260209-0920, CR-20260209-1206
Decisions: D-20260209-0848, D-20260209-0929, D-20260209-1206, D-20260209-1210

## Summary
- Add measurable user-journey KPI instrumentation from candidate setup through export, with server-side log visibility and optional GA4 forwarding. This enables funnel analytics and “new user” tracking without changing core interview behavior.

## User Stories & Acceptance

### US1: Track journey milestones (Priority: P1)
Narrative:
- As a product owner, I want key journey events captured, so that I can measure conversion through the interview workflow.

Acceptance scenarios:
1. Given a user opens the app and loads resume/job context, When they generate questions, start a session, answer, score, and export, Then telemetry includes each milestone event in order. (Verifies: FR-001, FR-002)
2. Given telemetry requests include journey metadata, When the backend receives them, Then logs include structured journey fields and `event=journey_kpi`. (Verifies: FR-003)
3. Given GA4 environment variables are configured, When journey telemetry is posted, Then events are forwarded to GA4 Measurement Protocol without blocking app flow. (Verifies: FR-004)
4. Given a candidate is preparing to upload resume/job content, When Candidate Setup is rendered, Then a privacy/analytics disclosure is visible in the UI. (Verifies: FR-005)

## Requirements

Functional requirements:
- FR-001: The UI MUST emit journey KPI events for app open, resume/job load, question generation, session start, candidate speech/submit, help request, score generation, and export completion. (Sources: CR-20260209-0846; D-20260209-0848)
- FR-002: Journey events MUST include enough context to build a funnel (`interview_id`, `session_id`, status/step, and event properties). (Sources: CR-20260209-0846; D-20260209-0848)
- FR-003: `/api/telemetry` MUST accept enriched payload fields and log `event=journey_kpi` for category `journey` events. (Sources: CR-20260209-0846; D-20260209-0848)
- FR-004: Backend telemetry MUST support optional GA4 forwarding controlled by env vars and remain best-effort/non-blocking on failures. (Sources: CR-20260209-0846; D-20260209-0848)
- FR-005: Candidate Setup MUST display user-facing disclosure text that anonymized journey telemetry is collected for product analytics. (Sources: CR-20260209-1206; D-20260209-1210)

Non-functional requirements:
- NFR-001: Existing telemetry clients remain backward compatible (old payload shape still accepted). (Sources: CR-20260209-0846; D-20260209-0848)
- NFR-002: Instrumentation MUST not block user actions when telemetry fails. (Sources: CR-20260209-0846; D-20260209-0848)

## Edge cases
- Telemetry endpoint receives legacy payload without journey fields (Verifies: FR-003, NFR-001)
- Browser storage is unavailable (private mode/restrictions) and anonymous ID cannot persist (Verifies: FR-002, NFR-002)
- GA4 returns non-2xx or times out (Verifies: FR-004, NFR-002)
- Candidate Setup disclosure copy is accidentally removed during UI changes (Verifies: FR-005)
