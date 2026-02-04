# PrepTalk Deployment & Configuration Guide

**For**: Taylor (Backend Integration)
**Date**: 2026-02-04
**Feature Branch**: `feature/architecture-optimization-config`

---

## Overview

This guide shows how to configure the new prototype-c front-end with the production Gemini API, voice services, and backend endpoints.

---

## Architecture Overview

```
New Front-End (prototype-c.html)
    ↓
Config Loader (loads JSON configs)
    ↓
Preflight Audio Scout (measures network)
    ↓
Application JS (core.js, stories.js, practice.js)
    ↓
Backend Integration Points:
    - FastAPI REST endpoints (/api/*)
    - Gemini Live API (WebSocket)
    - Gemini Text API (interview generation)
    - Gemini TTS (voice synthesis)
```

---

## Step 1: Environment Configuration

### Create/Update `.env` File

**Location**: `/app/.env` (root of project)

```bash
# Gemini API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp  # or your preferred model

# Audio Configuration
AUDIO_SAMPLE_RATE=24000  # Default, will be overridden by adaptive scout
AUDIO_CHANNELS=1

# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8000

# CORS Configuration (if different origin)
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# Feature Flags (optional, can override config/features.json)
DEBUG_MODE=false
ENABLE_TELEMETRY=false

# Session Configuration
SESSION_TIMEOUT_MINUTES=30
MAX_UPLOAD_SIZE_MB=5
```

### Update `app/config/features.json` (if needed)

Set environment field to match your deployment:

```json
{
  "features": {
    "environment": "production"  // Change to "development", "staging", or "production"
  }
}
```

---

## Step 2: Backend API Endpoints

### Verify FastAPI Routes Are Accessible

The new front-end expects these endpoints to exist:

#### A. Session Management
```
POST   /api/interviews              # Create new session (upload resume/job)
GET    /api/interviews/{id}         # Get session details
DELETE /api/interviews/{id}         # End session
```

#### B. Question Generation
```
POST   /api/interviews/{id}/questions  # Generate questions from resume/job
GET    /api/interviews/{id}/questions  # Retrieve generated questions
```

#### C. Audio/Voice
```
WebSocket /api/live/{session_id}    # Gemini Live API connection
POST      /api/tts                   # Text-to-speech (if using Gemini TTS)
```

#### D. Health Check (used by preflight-audio.js)
```
HEAD   /health                       # Latency measurement endpoint
```

**Action Required**: If `/health` endpoint doesn't exist, add it to `app/api.py`:

```python
@app.head("/health")
@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

---

## Step 3: Connect Front-End to Backend

### A. Update HTML to Load from Correct Origin

**File**: `app/templates/prototype-c.html`

Verify script and CSS paths are correct:

```html
<!-- Config loader (must load first) -->
<script src="/static/js/config-loader.js"></script>
<script src="/static/js/preflight-audio.js"></script>

<!-- Application JS -->
<script src="/static/js/prototype-c/core.js"></script>
<script src="/static/js/prototype-c/stories.js"></script>
<script src="/static/js/prototype-c/practice.js"></script>
```

If serving from a different domain, update to absolute URLs:
```html
<script src="https://your-domain.com/static/js/config-loader.js"></script>
```

### B. Configure API Base URL

**File**: `app/static/js/prototype-c/core.js`

Find or add the API base URL configuration:

```javascript
// Near top of core.js, add:
const API_BASE_URL = window.location.origin;  // Uses same origin
// OR for different backend:
// const API_BASE_URL = 'https://api.preptalk.com';

// Update fetch calls to use API_BASE_URL:
async function createInterview(resumeFile, jobFile, jobUrl, roleTitle) {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  if (jobFile) formData.append('job_description', jobFile);
  if (jobUrl) formData.append('job_description_url', jobUrl);
  if (roleTitle) formData.append('role_title', roleTitle);

  const response = await fetch(`${API_BASE_URL}/api/interviews`, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
```

### C. Configure WebSocket URL

**File**: `app/static/js/voice.js` or wherever WebSocket connection is made

```javascript
// Update WebSocket connection to use correct endpoint
const WS_BASE_URL = window.location.protocol === 'https:'
  ? 'wss://' + window.location.host
  : 'ws://' + window.location.host;

function connectToGeminiLive(sessionId) {
  const ws = new WebSocket(`${WS_BASE_URL}/api/live/${sessionId}`);

  ws.onopen = () => {
    console.log('Connected to Gemini Live API');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}
```

---

## Step 4: Gemini API Integration

### A. Verify Backend Gemini Configuration

**File**: `app/services/gemini_text.py`

Ensure it reads from environment:

```python
import os
from google import generativeai as genai

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Use configured model
model = genai.GenerativeModel(os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp'))
```

### B. Verify Gemini Live WebSocket Handler

**File**: `app/services/gemini_live.py` or `app/ws.py`

Ensure WebSocket handler passes through Gemini Live connection:

```python
import websockets
import os

async def handle_gemini_live(websocket, session_id):
    # Connect to Gemini Live API
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    gemini_uri = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={gemini_api_key}"

    async with websockets.connect(gemini_uri) as gemini_ws:
        # Proxy messages between client and Gemini
        # ... (existing implementation)
```

### C. Configure Adaptive Audio Parameters

The front-end's `preflight-audio.js` determines optimal sample rate. Backend should respect this:

**File**: `app/services/gemini_live.py`

```python
async def configure_gemini_session(sample_rate: int = 24000):
    """Configure Gemini Live session with adaptive sample rate"""
    config = {
        "generation_config": {
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Puck"  # Or your preferred voice
                    }
                }
            }
        },
        "audio_config": {
            "sample_rate": sample_rate,  # Use adaptive value from front-end
            "encoding": "linear16",
            "channels": 1
        }
    }
    return config
```

**Update WebSocket handler to receive sample rate from client**:

```python
@app.websocket("/api/live/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # First message from client should include audio config
    init_msg = await websocket.receive_json()
    sample_rate = init_msg.get('sample_rate', 24000)  # From preflight-audio.js

    # Configure Gemini with adaptive sample rate
    gemini_config = await configure_gemini_session(sample_rate)

    # ... rest of WebSocket handling
```

---

## Step 5: Config Files Integration

### A. Serve Config Files as Static Assets

**File**: `app/main.py`

Ensure `/config/` and `/data/` directories are served:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Serve config files
app.mount("/config", StaticFiles(directory="app/config"), name="config")
app.mount("/data", StaticFiles(directory="app/data"), name="data")

# Serve static assets
app.mount("/static", StaticFiles(directory="app/static"), name="static")
```

### B. Verify Config Files Are Accessible

Test in browser:
```
http://localhost:8000/config/ui-strings.json
http://localhost:8000/config/business-rules.json
http://localhost:8000/config/features.json
http://localhost:8000/data/demo-stories.json
```

All should return JSON (not 404).

---

## Step 6: Feature Flags Configuration

### Enable/Disable Features Based on Environment

**File**: `app/config/features.json`

```json
{
  "features": {
    "debug_telemetry": {
      "enabled": false,
      "environments": ["development", "staging"],
      "override_url_param": "debug",
      "description": "Show audio quality telemetry in sidebar"
    },
    "story_suggestions": {
      "enabled": true,
      "environments": ["all"],
      "description": "Suggest relevant stories during practice"
    },
    "demo_seeding": {
      "enabled": false,  // Set to false in production
      "environments": ["development", "staging"],
      "description": "Auto-populate demo stories on first load"
    },
    "pdf_export": {
      "enabled": true,
      "environments": ["all"],
      "description": "Export practice summary as PDF"
    }
  },
  "environment": "production"  // Set to match deployment
}
```

**Production Settings**:
- `debug_telemetry.enabled`: `false` (can enable with `?debug=1`)
- `demo_seeding.enabled`: `false` (real users shouldn't see demo data)
- `environment`: `"production"`

---

## Step 7: Test Integration

### A. Test Config Loading

1. Open browser DevTools console
2. Navigate to `http://localhost:8000/prototype-c.html`
3. Check console for:
   ```
   ✓ Config loaded successfully: ui-strings
   ✓ Config loaded successfully: business-rules
   ✓ Config loaded successfully: features
   ... (all 8 configs)
   ✓ PrepTalk Audio Scout: Analyzing environment...
   ✓ Audio Scout Complete: { profile: 'medium', sampleRate: '24kHz', ... }
   ```

### B. Test Adaptive Audio

1. Open with debug mode: `http://localhost:8000/prototype-c.html?debug=1`
2. Check sidebar for "Audio Telemetry" card
3. Verify it shows:
   - Quality indicator (HIGH/MEDIUM/LOW)
   - Sample rate (e.g., "24 kHz")
   - Frame size (e.g., "40 ms")
   - Network type (e.g., "4g")
   - Latency (e.g., "85 ms")

### C. Test Backend Connection

1. Upload a resume
2. Check Network tab for API call:
   ```
   POST /api/interviews
   Status: 200
   Response: { id: "...", status: "processing" }
   ```

3. Start interview session
4. Check WebSocket connection:
   ```
   WS /api/live/{session_id}
   Status: 101 Switching Protocols
   ```

### D. Test Voice Pipeline

1. Click microphone button
2. Speak into microphone
3. Verify audio is captured and sent to backend
4. Verify Gemini response comes through WebSocket
5. Verify TTS audio plays through speakers

---

## Step 8: Production Checklist

Before deploying to production:

### Security
- [ ] `GEMINI_API_KEY` stored securely (not in git)
- [ ] CORS origins restricted (not wildcard `*`)
- [ ] HTTPS enabled for WebSocket (`wss://`)
- [ ] File upload size limits enforced (5MB max)
- [ ] Input validation on all API endpoints

### Performance
- [ ] Static assets cached (CSS, JS, JSON)
- [ ] Gzip compression enabled
- [ ] CDN configured (optional)
- [ ] Health check endpoint responds quickly (<50ms)

### Features
- [ ] Demo seeding disabled (`demo_seeding.enabled: false`)
- [ ] Debug telemetry disabled by default (`debug_telemetry.enabled: false`)
- [ ] Environment set to `"production"` in `features.json`

### Monitoring
- [ ] Backend logging configured
- [ ] WebSocket connection monitoring
- [ ] API error tracking (Sentry, etc.)
- [ ] Audio quality metrics logged

### Testing
- [ ] All 64 tests passing (`./run.sh test`)
- [ ] E2E tests pass (`./run.sh e2e`)
- [ ] Manual test with real resume/job
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (responsive design)

---

## Troubleshooting

### Config Files Not Loading
**Symptom**: Console shows "❌ Config failed to load"
**Fix**: Verify `/config/` directory is mounted in `app/main.py`

### Audio Scout Fails
**Symptom**: No audio quality telemetry
**Fix**: Ensure `/health` endpoint exists and responds quickly

### WebSocket Connection Fails
**Symptom**: "WebSocket connection error"
**Fixes**:
- Check GEMINI_API_KEY is set
- Verify WebSocket URL uses correct protocol (ws:// vs wss://)
- Check CORS settings allow WebSocket upgrade

### Adaptive Sample Rate Not Applied
**Symptom**: Always uses 24kHz regardless of network
**Fix**:
1. Verify `preflight-audio.js` is loaded before other scripts
2. Check WebSocket handler reads `sample_rate` from init message
3. Check Gemini config uses adaptive value

### Demo Stories Showing in Production
**Symptom**: Users see fake demo stories
**Fix**: Set `demo_seeding.enabled: false` in `features.json`

---

## Environment-Specific Configs

### Development
```json
{
  "environment": "development",
  "features": {
    "debug_telemetry": { "enabled": true },
    "demo_seeding": { "enabled": true }
  }
}
```

### Staging
```json
{
  "environment": "staging",
  "features": {
    "debug_telemetry": { "enabled": true },
    "demo_seeding": { "enabled": false }
  }
}
```

### Production
```json
{
  "environment": "production",
  "features": {
    "debug_telemetry": { "enabled": false },
    "demo_seeding": { "enabled": false }
  }
}
```

---

## Quick Start Commands

```bash
# 1. Set environment variables
export GEMINI_API_KEY=your_key_here
export GEMINI_MODEL=gemini-2.0-flash-exp

# 2. Install dependencies
pip install -r requirements.txt
npm install

# 3. Run tests
./run.sh test

# 4. Start server
./run.sh ui

# 5. Open browser
open http://localhost:8000/prototype-c.html

# 6. Test with debug mode
open http://localhost:8000/prototype-c.html?debug=1
```

---

## Questions?

**For front-end issues**: Check `/docs/CHANGE_MANAGEMENT_2026-02-04.md`
**For RALPH docs**: See `/docs/requests/`, `/docs/decisions/`, `/docs/specs/`
**For architecture**: See `/docs/diagrams/architecture-diagram.md`

---

**Prepared for**: Taylor (Backend Integration)
**Last Updated**: 2026-02-04
**Status**: Ready for Production Deployment
