# Tasks: 20260209-kpi-journey-telemetry

Spec: docs/specs/20260209-kpi-journey-telemetry/spec.md

## NEXT
- T-011: If Dialogflow CX is adopted, configure CX interaction logging export to the same BigQuery dataset and document the CX table mappings. (Implements: FR-004)
- T-015 (optional): Archive screenshot evidence for GA4 acknowledgement at `docs/evidence/ga4-user-data-ack.png` using `docs/evidence/ga4-user-data-ack.md`. (Implements: FR-004)

## IN PROGRESS
- (none)

## DONE
- [2026-02-09 08:49] T-000: Capture request and decision trail for KPI journey instrumentation. (Implements: FR-001)
- [2026-02-09 08:52] T-001: Extend telemetry schema/settings for journey metadata and GA4 config flags. (Implements: FR-002, FR-003, FR-004)
- [2026-02-09 08:52] T-002: Add UI journey event hooks for setup, voice session, answer/help, scoring, and export. (Implements: FR-001, FR-002)
- [2026-02-09 08:52] T-003: Add optional GA4 forwarding service and wire it to backend telemetry. (Implements: FR-004, NFR-002)
- [2026-02-09 08:52] T-004: Add documentation for KPI events and GA4 setup. (Implements: FR-001, FR-004)
- [2026-02-09 08:52] T-005: Run regression checks (API + UI) for telemetry changes and update spec status to Done. (Implements: FR-003, FR-004, NFR-001)
- [2026-02-09 08:52] T-006: Reconcile PRD/progress entries with shipped KPI telemetry and evidence links. (Implements: FR-001, FR-004)
- [2026-02-09 09:27] T-007: Configure BigQuery export pipeline for journey logs (`preptalk_analytics` dataset + `preptalk-journey-kpi-sink` + sink writer IAM) and verify ingestion starts. (Implements: FR-004)
- [2026-02-09 09:28] T-010: Add BigQuery SQL examples for KPI funnel reporting and verification to analytics docs. (Implements: FR-001, FR-004)
- [2026-02-09 10:15] T-008: Set GA4 env vars on `preptalk-west-test` and verify server-side forwarding logs (`event=ga4_forward status=sent`). (Implements: FR-004)
- [2026-02-09 12:06] T-009: Validate “ready today” KPI funnel with live data by confirming counts for app open, setup complete (`journey_resume_loaded`/`journey_job_loaded`), session start, score generated, and export completed. (Implements: FR-001, FR-002, FR-003)
- [2026-02-09 12:06] T-013: Set GA4 env vars on `preptalk-west` (prod) to match test and verify `event=ga4_forward status=sent` in prod logs. (Implements: FR-004)
- [2026-02-09 12:06] T-014: Add end-user analytics/privacy disclosure copy to Candidate Setup UI and document disclosure + GA4 rollout checklist. (Implements: FR-005)
- [2026-02-09 12:21] T-012: Complete GA4 User Data Collection Acknowledgement in GA Admin for the production property (user-confirmed complete). (Implements: FR-004)
