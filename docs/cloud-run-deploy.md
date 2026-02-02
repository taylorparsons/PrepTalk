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

## 3) Set runtime env vars
```bash
gcloud run services update preptalk \
  --region us-west1 \
  --set-env-vars INTERVIEW_ADAPTER=gemini,GEMINI_API_KEY=YOUR_KEY
```
If you prefer, you can set `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`.

## 4) Share the endpoint
The Cloud Run service URL is your shared endpoint. Point the UI at it with:
```bash
APP_API_BASE=https://your-service-url.a.run.app/api
```
See `docs/ai-studio-setup.md` for UI configuration notes.

## Deploying updates from a remote repo
You have two options:

**Option A — Manual re-deploy (simple)**
1. Pull the latest changes locally: `git pull`.
2. Re-run the deploy command from this doc.

**Option B — Continuous deployment from GitHub**
Use Cloud Run’s “Continuous deployment” flow (or a Cloud Build trigger) to build and deploy on each commit to your repo. This keeps Cloud Run in sync with your remote repository without manual redeploys.
