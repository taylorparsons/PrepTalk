# GA4 User Data Acknowledgement Evidence

Status: Pending manual completion
Feature: 20260209-kpi-journey-telemetry
Task: T-012

## Required action in GA Admin
1. Open Google Analytics for property `G-79VB21CZWF`.
2. Go to `Admin -> Property settings -> Data collection`.
3. Click `I acknowledge` on the User Data Collection Acknowledgement modal.
4. Capture a screenshot showing the acknowledgement state.

## Evidence to attach
- Screenshot path: `docs/evidence/ga4-user-data-ack.png`
- Completed by: `<name>`
- Completed at (local time): `<YYYY-MM-DD HH:MM TZ>`

## Verification
- Production logs continue showing `event=ga4_forward status=sent` after acknowledgement.
