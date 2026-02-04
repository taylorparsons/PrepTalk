# Voice Feature Not Working - Quick Fix for Taylor

**Issue:** Voice/TTS is not responding when user speaks
**Status:** Backend integration needed

---

## Why Voice Isn't Working

The **front-end is ready**, but the **backend needs 3 things connected**:

1. ❌ WebSocket endpoint needs Gemini Live API integration
2. ❌ Gemini TTS needs to be configured
3. ⚠️ WebSocket may not be accepting `sample_rate` from client

---

## Quick Diagnostic

### Check 1: Is WebSocket Endpoint Responding?

Open browser DevTools → Network tab → WS tab

**Expected:** `ws://localhost:8000/api/live/{session_id}` with Status 101 (Switching Protocols)

**If you see 404 or 500:**
→ WebSocket endpoint not configured

**If you see nothing:**
→ Front-end not attempting connection (check console for errors)

---

## What Taylor Needs to Do

### Step 1: WebSocket Must Accept Sample Rate (5 min)

**File:** `app/ws.py` or wherever your WebSocket handler is

**Add this right after `await websocket.accept()`:**

```python
# Receive audio config from front-end
try:
    init_msg = await websocket.receive_json()
    sample_rate = init_msg.get('sample_rate', 24000)
    print(f"🎙️ Using adaptive sample rate: {sample_rate}Hz")
except Exception as e:
    sample_rate = 24000  # Fallback
    print(f"⚠️ No sample rate received, using default 24kHz: {e}")
```

**Why:** The preflight-audio.js scout sends optimal sample rate (16kHz-48kHz) based on network conditions. Backend must receive and use it.

---

### Step 2: Pass Sample Rate to Gemini (3 min)

**File:** `app/services/gemini_live.py` or wherever you configure Gemini

**Find this:**
```python
config = {
    "audio_config": {
        "sample_rate": 24000,  # ← HARDCODED (bad)
```

**Change to:**
```python
config = {
    "audio_config": {
        "sample_rate": sample_rate,  # ← DYNAMIC (good)
```

**Pass the `sample_rate` variable** from Step 1 to Gemini config.

---

### Step 3: Verify Gemini API Key (1 min)

**Check `.env` file:**
```bash
GEMINI_API_KEY=AIza...your_actual_key_here
```

**Test it:**
```bash
echo $GEMINI_API_KEY | cut -c1-10
# Should print: AIzaSyBxYz (or similar)
```

**If empty or says "your_actual_key_here":**
→ Get real API key from https://aistudio.google.com/app/apikey

---

## Testing Voice Feature

### 1. Start Server
```bash
./run.sh ui
```

### 2. Open Browser Console (F12)
Navigate to: http://localhost:8000/prototype-c

### 3. Check Console Logs

**You should see:**
```
✓ Audio Scout Complete: {profile: 'medium', sampleRate: '24kHz', ...}
🔍 PrepTalk: Initializing audio system
```

**When you click the microphone:**
```
🎙️ Microphone started
📡 WebSocket connected
🎙️ Using adaptive sample rate: 24000Hz
```

**If you see errors like:**
- ❌ "WebSocket connection failed" → WebSocket endpoint not set up
- ❌ "Failed to connect to /api/live/" → Backend not running
- ❌ "Gemini API error: Invalid API key" → Check .env file
- ❌ No response after speaking → Gemini not responding (check API key)

---

## Still Not Working?

### Debug Checklist

1. **Check server logs** for errors:
   ```bash
   tail -f logs/app.log
   # OR
   ./run.sh logs
   ```

2. **Check Network tab** (DevTools):
   - WebSocket should show "101 Switching Protocols"
   - Should see binary frames being sent/received

3. **Check Console tab** (DevTools):
   - Should see "🎙️ Using adaptive sample rate" message
   - No red errors

4. **Test with debug mode:**
   ```
   http://localhost:8000/prototype-c?debug=1
   ```
   - Telemetry card shows network info
   - Quality indicator (HIGH/MEDIUM/LOW)

---

## Files to Check

| File | What to Look For |
|------|------------------|
| `app/ws.py` | WebSocket accepts init message with sample_rate |
| `app/services/gemini_live.py` | Uses dynamic sample_rate (not hardcoded) |
| `.env` | Has valid GEMINI_API_KEY |
| `app/main.py` | WebSocket route is registered |

---

## Expected Flow

```
User clicks mic
  ↓
Front-end: preflight-audio.js measures network → 24kHz recommended
  ↓
Front-end: Opens WebSocket to /api/live/{session_id}
  ↓
Front-end: Sends init message: {"sample_rate": 24000}
  ↓
Backend: Receives init message
  ↓
Backend: Configures Gemini with sample_rate=24000
  ↓
Backend: Connects to Gemini Live API
  ↓
User speaks
  ↓
Front-end: Captures audio at 24kHz
  ↓
Front-end: Sends audio chunks via WebSocket
  ↓
Backend: Forwards to Gemini Live API
  ↓
Gemini: Processes speech, generates response
  ↓
Backend: Receives Gemini response
  ↓
Backend: Sends audio back via WebSocket
  ↓
Front-end: Plays TTS audio
  ↓
User hears response ✅
```

**If voice isn't working, the break is somewhere in this chain.**

---

## Quick Test Script

```bash
# Test health endpoint
curl http://localhost:8000/health
# Should return: {"status":"ok"}

# Test config endpoint
curl http://localhost:8000/config/features.json
# Should return JSON (not 404)

# Check if WebSocket endpoint exists
curl -i http://localhost:8000/api/live/test-session
# Should return: 426 Upgrade Required (means WebSocket is there)
```

---

## Summary

**Front-end is ready.** The audio scout measures network, the WebSocket client sends optimal sample rate, and the UI captures/plays audio correctly.

**Backend needs:**
1. WebSocket to accept init message with sample_rate
2. Pass sample_rate to Gemini config (don't hardcode 24000)
3. Gemini API key configured in .env

**Time to fix:** ~10 minutes for experienced backend dev

**Full instructions:** See `/docs/TAYLOR_CHECKLIST.md` Steps 4-5 and "Test Voice" section

---

**Questions?** Check browser console first, then server logs, then ask Jennifer.
