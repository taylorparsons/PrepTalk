# Feature Spec: 20260206-access-token-redaction

Status: Done
Created: 2026-02-06 14:40
Inputs: CR-20260206-1432
Decisions: D-20260206-1438

## Summary
Protect public test deployments with token access control and reduce resume PII exposure by redacting sensitive fields before interview generation/storage while keeping first-name personalization.

## User Stories & Acceptance

### US1: Deployment owner can gate public access with a shareable token (Priority: P1)
Narrative:
- As the app owner, I want to require a token before using the public endpoint so only invited testers can access the app.

Acceptance scenarios:
1. Given `APP_ACCESS_TOKENS` is set, When a user opens `/` without a valid token, Then the app shows an access token gate page. (Verifies: FR-001)
2. Given a valid token is provided, When `/` loads, Then the app sets an access cookie and allows normal app use. (Verifies: FR-001)
3. Given no valid token is provided, When `/api/*` is called, Then the API returns 401. (Verifies: FR-002)
4. Given no valid token is provided, When `/ws/live` is opened, Then the server rejects with an auth error. (Verifies: FR-003)

### US2: Owner can bind token usage to a stable server user ID (Priority: P1)
Narrative:
- As the app owner, I want token-to-user mapping so sessions and cached data stay consistently associated for a tester.

Acceptance scenarios:
1. Given `APP_ACCESS_TOKENS` entry `token-a:user-123`, When requests use `token-a`, Then server user resolution uses `user-123` instead of client header values. (Verifies: FR-004)

### US3: Candidate resume text is privacy-redacted but still personalized (Priority: P1)
Narrative:
- As the app owner, I want sensitive resume fields redacted before model calls while preserving first-name personalization.

Acceptance scenarios:
1. Given resume text with phone/email/location/linkedin handle, When interview prep runs, Then returned/stored resume excerpt redacts those fields. (Verifies: FR-005)
2. Given a resume name header line, When redaction runs, Then the first token remains and remaining name tokens are redacted. (Verifies: FR-006)

## Requirements

Functional requirements:
- FR-001: Root UI routes must enforce access token when `APP_ACCESS_TOKENS` is configured and provide a token-entry page + cookie persistence. (Sources: CR-20260206-1432; D-20260206-1438)
- FR-002: API routes under `/api` must enforce the same access token and return 401 on missing/invalid token. (Sources: CR-20260206-1432; D-20260206-1438)
- FR-003: `/ws/live` must enforce the same access token at connect time. (Sources: CR-20260206-1432; D-20260206-1438)
- FR-004: Token entries may optionally map to server user IDs using `token:user_id`; mapped ID takes precedence for server-side user resolution. (Sources: CR-20260206-1432; D-20260206-1438)
- FR-005: Resume PII redaction must run before interview question generation and persistence, covering email/phone/location/linkedin handle/address-like fields. (Sources: CR-20260206-1432; D-20260206-1438)
- FR-006: Resume name redaction must preserve the first name token in the header line while redacting the remainder. (Sources: CR-20260206-1432; D-20260206-1438)

## Edge cases
- Access control disabled (`APP_ACCESS_TOKENS` unset) keeps current open behavior. (Verifies: FR-001, FR-002, FR-003)
- Invalid token in query/header/cookie returns auth failure without using fallback IDs. (Verifies: FR-001, FR-002, FR-003)
- Token without mapped user ID continues existing user-id cookie/header behavior. (Verifies: FR-004)
- Redaction toggle can be disabled via `APP_REDACT_RESUME_PII=0`. (Verifies: FR-005, FR-006)
