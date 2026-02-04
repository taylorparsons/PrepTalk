# Taylor's Integration Checklist ✅

**CRITICAL**: Follow this step-by-step. Don't skip steps.

---

## Before You Start

**Read This First**: `/docs/DEPLOYMENT_GUIDE.md` (comprehensive guide)
**This Checklist**: Quick steps to avoid mistakes

---

## Step 1: Environment Variables

Create `.env` file in project root with:

```bash
GEMINI_API_KEY=your_actual_key_here  # ⚠️ REQUIRED
GEMINI_MODEL=gemini-2.0-flash-exp
```

**Test it works**:
```bash
# This should print your key (first 10 chars)
echo $GEMINI_API_KEY | cut -c1-10
```

---

## Step 2: Add Health Endpoint (2 minutes)

**File**: `app/api.py`

Add this anywhere in the file:

```python
@app.head("/health")
@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

**Why**: The audio scout needs this to measure latency.

**Test it works**:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

---

## Step 3: Mount Config Directories (2 minutes)

**File**: `app/main.py`

Add these lines BEFORE your other `app.mount()` calls:

```python
from fastapi.staticfiles import StaticFiles

# Add these:
app.mount("/config", StaticFiles(directory="app/config"), name="config")
app.mount("/data", StaticFiles(directory="app/data"), name="data")
```

**Why**: Front-end needs to fetch JSON config files.

**Test it works**:
```bash
curl http://localhost:8000/config/features.json
# Should return JSON (not 404)
```

---

## Step 4: Update WebSocket to Accept Sample Rate (5 minutes)

**File**: `app/ws.py` or wherever your WebSocket handler is

**Find this**:
```python
@app.websocket("/api/live/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
```

**Add this right after `accept()`**:
```python
    # Receive audio config from front-end
    try:
        init_msg = await websocket.receive_json()
        sample_rate = init_msg.get('sample_rate', 24000)
        print(f"🎙️ Using adaptive sample rate: {sample_rate}Hz")
    except:
        sample_rate = 24000  # Fallback
        print("⚠️ No sample rate received, using default 24kHz")
```

**Why**: Front-end sends optimal sample rate based on network conditions.

**What NOT to do**:
- ❌ Don't hardcode sample_rate = 24000 everywhere
- ❌ Don't ignore the init message
- ✅ DO pass sample_rate to Gemini config

---

## Step 5: Pass Sample Rate to Gemini (3 minutes)

**File**: `app/services/gemini_live.py` or wherever you configure Gemini

**Find where you configure Gemini audio**. It might look like:
```python
config = {
    "audio_config": {
        "sample_rate": 24000,  # ← This line
```

**Replace with**:
```python
config = {
    "audio_config": {
        "sample_rate": sample_rate,  # ← Use the variable from Step 4
```

**Why**: This makes audio quality adapt to user's network.

---

## Step 6: Set Production Feature Flags (1 minute)

**File**: `app/config/features.json`

**Change these values**:
```json
{
  "features": {
    "demo_seeding": {
      "enabled": false  // ← IMPORTANT: Set to false for production
    }
  },
  "environment": "production"  // ← Set to "production"
}
```

**Why**: Prevents demo stories from showing to real users.

**What NOT to do**:
- ❌ Don't leave `demo_seeding.enabled: true` in production
- ❌ Don't leave `environment: "development"`

---

## Step 7: Test Everything (10 minutes)

### A. Start Server
```bash
./run.sh ui
```

### B. Open Browser Console
```
http://localhost:8000/prototype-c.html
```

### C. Check Console Logs

**You should see**:
```
✓ Config loaded successfully: ui-strings
✓ Config loaded successfully: business-rules
✓ Config loaded successfully: features
✓ Config loaded successfully: pdf-template
✓ Config loaded successfully: design-tokens
✓ Config loaded successfully: demo-stories (if dev mode)
✓ Config loaded successfully: topics
✓ Config loaded successfully: questions
🔍 PrepTalk Audio Scout: Analyzing environment...
✓ Audio Scout Complete: {profile: 'medium', sampleRate: '24kHz', ...}
```

**If you see errors**, stop and fix them before proceeding.

### D. Test with Debug Mode
```
http://localhost:8000/prototype-c.html?debug=1
```

**You should see**:
- Telemetry card in right sidebar
- Quality indicator (HIGH/MEDIUM/LOW)
- Sample rate, frame size, network type, latency

### E. Test Upload Flow
1. Click "Get started"
2. Upload a resume (PDF/DOCX)
3. Upload a job description or paste URL
4. Click "Continue"

**Check Network tab**:
- `POST /api/interviews` → Status 200
- Response has `{ id: "...", status: "..." }`

### F. Test WebSocket
1. Start an interview session
2. Check Network tab → WS tab
3. Should see: `WS /api/live/...` → Status 101

**Check Console**:
- "🎙️ Using adaptive sample rate: 24000Hz" (or similar)

### G. Test Voice
1. Click microphone button
2. Speak
3. Verify audio captures
4. Verify Gemini responds
5. Verify you hear TTS

---

## Step 8: Run Test Suite (5 minutes)

```bash
# Run all tests
./run.sh test

# Run E2E tests
./run.sh e2e
```

**All tests must pass** before merging.

---

## Common Mistakes (Don't Do These!)

### ❌ Mistake 1: Forgot to mount /config/ directory
**Symptom**: Console shows "❌ Config failed to load"
**Fix**: Add `app.mount("/config", ...)` in Step 3

### ❌ Mistake 2: Hardcoded sample rate in Gemini config
**Symptom**: Always uses 24kHz, never adapts
**Fix**: Use `sample_rate` variable from WebSocket init message

### ❌ Mistake 3: Demo seeding enabled in production
**Symptom**: Real users see fake demo stories
**Fix**: Set `demo_seeding.enabled: false` in `features.json`

### ❌ Mistake 4: Forgot health endpoint
**Symptom**: Audio scout logs "Failed to measure latency"
**Fix**: Add `/health` endpoint in Step 2

### ❌ Mistake 5: Wrong WebSocket URL protocol
**Symptom**: "WebSocket connection failed"
**Fix**: Use `wss://` for HTTPS, `ws://` for HTTP

---

## Files You'll Touch

Only these files need changes:

1. `.env` - Add GEMINI_API_KEY
2. `app/api.py` - Add /health endpoint
3. `app/main.py` - Mount /config and /data directories
4. `app/ws.py` - Accept sample_rate from init message
5. `app/services/gemini_live.py` - Use adaptive sample_rate
6. `app/config/features.json` - Set production flags

**That's it. 6 files.** Don't touch anything else.

---

## What NOT to Touch

Don't modify these (they're already configured):
- ✅ All files in `app/config/` (except features.json)
- ✅ All files in `app/data/`
- ✅ All files in `app/static/js/prototype-c/`
- ✅ All files in `app/static/css/prototype-c-*.css`
- ✅ `app/templates/prototype-c.html`
- ✅ `app/static/js/config-loader.js`
- ✅ `app/static/js/preflight-audio.js`

**These files are production-ready. Don't "improve" them.**

---

## When You're Done

**Check these before calling it done**:

- [ ] `.env` has GEMINI_API_KEY
- [ ] `/health` endpoint returns 200
- [ ] `/config/features.json` returns JSON (not 404)
- [ ] Browser console shows "✓ Config loaded successfully" (8 times)
- [ ] Browser console shows "✓ Audio Scout Complete"
- [ ] Debug mode works (`?debug=1` shows telemetry)
- [ ] Upload flow works (resume + job)
- [ ] WebSocket connects (check Network tab)
- [ ] Console shows "🎙️ Using adaptive sample rate"
- [ ] Voice capture works
- [ ] Gemini responds
- [ ] TTS plays
- [ ] `./run.sh test` passes
- [ ] `demo_seeding.enabled` is `false` (production only)
- [ ] `environment` is `"production"` (production only)

**All checked?** You're done! 🎉

---

## If Something Breaks

1. **Don't panic**
2. Check browser console for errors
3. Check server logs
4. Re-read this checklist
5. Check `/docs/DEPLOYMENT_GUIDE.md` for details
6. If still stuck, message Jennifer with:
   - What you did
   - What error you see
   - Browser console screenshot
   - Server log excerpt

---

## Emergency Rollback

If everything is broken:

```bash
# Switch back to main branch
git checkout main

# Restart server
./run.sh ui
```

The old version will work while you debug.

---

**Last Updated**: 2026-02-04
**Status**: Production-Ready (follow checklist carefully)
**Questions**: Read `/docs/DEPLOYMENT_GUIDE.md` or ask Jennifer
