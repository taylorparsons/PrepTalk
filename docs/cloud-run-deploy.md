# Cloud Run deployment (hackathon)

This is an optional, hackathon-friendly deployment path for PrepTalk. It uses Cloud Run buildpacks to deploy the FastAPI backend and exposes a public URL you can share as the app’s endpoint.

## Prerequisites
- Google Cloud CLI (`gcloud`) installed and authenticated.
- Billing enabled on your GCP project.
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) available for server-side use.

## 1) Set project + enable services
```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 2) Deploy from source (buildpacks)
Cloud Run buildpacks default to `main:app`, so we pass an explicit entrypoint for this repo:
```bash
gcloud run deploy preptalk \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --set-build-env-vars GOOGLE_ENTRYPOINT="uvicorn app.main:app --host 0.0.0.0 --port 8080"
```

Use a region close to your users (e.g., `us-west1` for the PNW). The command prints the service URL on success.

## 2.5) Mandatory rollback capture + procedure
Before each deploy, capture the current ready revision:
```bash
SERVICE=preptalk-west-test
REGION=us-west1
PREV_REVISION=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --platform managed \
  --format='value(status.latestReadyRevisionName)')
echo "Previous ready revision: $PREV_REVISION"
```

If the release regresses, rollback immediately:
```bash
gcloud run services update-traffic "$SERVICE" \
  --region "$REGION" \
  --platform managed \
  --to-revisions "${PREV_REVISION}=100"
```

Post-rollback verification:
```bash
BASE_URL=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --platform managed \
  --format='value(status.url)')

curl -sS "$BASE_URL/health"
curl -sS -o /dev/null -w '%{http_code}\n' "$BASE_URL/"
curl -sS -H 'X-Access-Token: test-token-example' -o /dev/null -w '%{http_code}\n' "$BASE_URL/api/logs/summary"
```
- Expect `/health` JSON with `status=ok`.
- Expect `/` to return `401` when token gate is enabled.
- Expect `/api/logs/summary` to return `200` with valid token.

## 3) Set runtime env vars
```bash
gcloud run services update preptalk \
  --region us-west1 \
  --set-env-vars INTERVIEW_ADAPTER=gemini,GEMINI_API_KEY=YOUR_KEY
```
If you prefer, you can set `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`.

For token-gated public testing (optional):
```bash
gcloud run services update preptalk-west-test \
  --region us-west1 \
  --update-env-vars APP_ACCESS_TOKENS='test-token-1:tester-1,test-token-2'
```
- Format: `APP_ACCESS_TOKENS=token` or `APP_ACCESS_TOKENS=token:user_id`.
- A token can be shared across multiple deployments by setting the same value on each service.
- Users enter the token once on `/` (or via `?access_token=<token>`); cookie is reused for API + WebSocket.

Resume privacy toggle:
```bash
gcloud run services update preptalk-west-test \
  --region us-west1 \
  --update-env-vars APP_REDACT_RESUME_PII=1
```
- `APP_REDACT_RESUME_PII=1` (default) redacts resume PII before model calls/storage while keeping first name token.

### TTS model check (required)
Before calling a deploy "good", verify TTS model validity and quota on the live service.

Recommended runtime env:
```bash
gcloud run services update preptalk-west \
  --region us-west1 \
  --update-env-vars GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts,GEMINI_TTS_MODEL_FALLBACKS=
```

Post-deploy verification checklist:
- Open logs and confirm there are no new `event=tts_model_call status=error` entries.
- Validate a real `voice/intro` response includes `coach_audio` and `coach_audio_mime` (not null).
- If audio is missing, treat release as regressed and rollback immediately.

## 4) Share the endpoint
The Cloud Run service URL is your shared endpoint. Point the UI at it with:
```bash
APP_API_BASE=https://your-service-url.a.run.app/api
```
See `docs/ai-studio-setup.md` for UI configuration notes.

## Current service endpoints (2026-02-07 12:50 PST)

Production service (unchanged during test deploys):
- Service: `preptalk-west`
- URL: `https://preptalk-west-cz47ti6tbq-uw.a.run.app`
- Revision: `preptalk-west-00011-srn`

Test service (separate endpoint for experiments):
- Service: `preptalk-west-test`
- URL: `https://preptalk-west-test-cz47ti6tbq-uw.a.run.app`
- Revision: `preptalk-west-test-00022-ddx`
- Shared test token: `test-token-example`
- Known-good rollback target (previous revision): `preptalk-west-test-00021-kwv`

Exact rollback command for current test release:
```bash
gcloud run services update-traffic preptalk-west-test \
  --region us-west1 \
  --platform managed \
  --to-revisions preptalk-west-test-00021-kwv=100
```

Delete only the test endpoint when you are done:
```bash
gcloud run services delete preptalk-west-test --region us-west1 --platform managed
```

## Deploying updates from a remote repo
You have two options:

**Option A — Manual re-deploy (simple)**
1. Pull the latest changes locally: `git pull`.
2. Re-run the deploy command from this doc.

**Option B — Continuous deployment from GitHub**
Use Cloud Run’s “Continuous deployment” flow (or a Cloud Build trigger) to build and deploy on each commit to your repo. This keeps Cloud Run in sync with your remote repository without manual redeploys.
