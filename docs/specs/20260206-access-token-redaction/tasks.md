# Tasks: 20260206-access-token-redaction

Spec: docs/specs/20260206-access-token-redaction/spec.md

## NEXT
- (none)

## IN PROGRESS
- (none)

## DONE
- [2026-02-06 14:45] T-001: Add shared access-control helpers for HTTP + WebSocket, including token parsing and optional token→user mapping. (Implements: FR-001, FR-002, FR-003, FR-004)
- [2026-02-06 14:48] T-002: Enforce access control on root/prototype pages, `/api/*`, and `/ws/live`; add token entry page + cookie flow. (Implements: FR-001, FR-002, FR-003)
- [2026-02-06 14:52] T-003: Add resume PII redaction service and apply it before interview question generation/storage; keep first name token. (Implements: FR-005, FR-006)
- [2026-02-06 14:58] T-004: Add/extend tests for token-gated routes/websocket and resume redaction behavior. (Implements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)
- [2026-02-09 11:16] T-005: Update resume redaction scope to preserve location text while retaining phone/email/linkedin redaction. (Implements: FR-005)
- [2026-02-09 11:16] T-006: Fix inline header/contact name redaction and add regression coverage for merged PDF extraction lines. (Implements: FR-006)
