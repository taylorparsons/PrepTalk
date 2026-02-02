# Feature Spec: 20260202-cloud-run-deploy

Status: Done
Created: 2026-02-02 14:08
Inputs: CR-20260202-1408
Decisions: D-20260202-1408

## Summary
Document Cloud Run deployment for hackathon use, including how to deploy from source and how to keep the service updated from a remote repository.

## User Stories & Acceptance

### US1: Cloud Run deployment guidance (Priority: P1)
Narrative:
- As a maintainer, I want Cloud Run deployment steps and update options documented, so I can deploy and refresh the service from the repo during the hackathon.

Acceptance scenarios:
1. Given the deployment doc, When I follow the steps, Then I can deploy the FastAPI service to Cloud Run with the correct entrypoint. (Verifies: FR-001)
2. Given the update section, When I need to ship new changes, Then I can either re-deploy from a fresh checkout or enable continuous deployment from GitHub. (Verifies: FR-002)
3. Given the runtime env section, When I configure the service, Then I can set the Gemini API key server-side. (Verifies: FR-003)

## Requirements

Functional requirements:
- FR-001: Add documentation for Cloud Run deployment steps, including the buildpack entrypoint override for `app.main:app`. (Sources: CR-20260202-1408; D-20260202-1408)
- FR-002: Document how to deploy updates from a remote repo (manual redeploy or continuous deployment). (Sources: CR-20260202-1408; D-20260202-1408)
- FR-003: Document setting server-side API keys for Gemini in the Cloud Run service. (Sources: CR-20260202-1408; D-20260202-1408)

## Edge cases
- Cloud Run deploy fails without billing or required APIs enabled. (Verifies: FR-001)
