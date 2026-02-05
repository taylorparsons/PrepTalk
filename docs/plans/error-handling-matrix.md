# Error Handling Matrix - PrepTalk Audio System

**Target:** Google Hackathon (Gemini 2.5)
**Principle:** Never lose user data, graceful degradation, clear recovery

---

## Error Categories

### 1. Network Errors

| Error | Detection | Recovery | User Experience |
|-------|-----------|----------|-----------------|
| WebSocket disconnect | `ws.onclose` event | Auto-reconnect (3 attempts, exponential backoff) | "Reconnecting..." status pill |
| Reconnect failed | Max attempts exceeded | Save transcript locally, offer retry | "Connection lost. Your transcript is saved." |
| Network timeout | No response in 30s | Retry with shorter timeout | "Slow connection. Retrying..." |
| SSL/TLS error | `ws.onerror` | Cannot recover automatically | "Secure connection failed. Check network." |

**Implementation:**
```javascript
// In network.worker.js
ws.onclose = (event) => {
  if (event.code === 1006) {
    // Abnormal closure - network issue
    scheduleReconnect();
  } else if (event.code === 1000) {
    // Normal closure - don't reconnect
  }
};

// Save transcript to localStorage on disconnect
function saveTranscriptLocally(transcript) {
  const key = `preptalk_backup_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(transcript));
}
```

---

### 2. Gemini API Errors

| Error | Detection | Recovery | User Experience |
|-------|-----------|----------|-----------------|
| Gemini timeout | No response in 60s | Retry once, then fallback | "AI is thinking... Taking longer than usual." |
| Gemini rate limit | 429 response | Queue with delay | "High demand. Your request is queued." |
| Gemini unavailable | 503 response | Retry with backoff | "AI temporarily unavailable." |
| Invalid response | Parse error | Log and skip | Silent - continue session |
| Context too long | 400 response | Trim history, retry | Silent retry with shorter context |

**Implementation:**
```javascript
// Backend handles Gemini errors
async function callGemini(prompt) {
  try {
    const response = await gemini.generate(prompt);
    return response;
  } catch (error) {
    if (error.status === 429) {
      await delay(error.retryAfter || 5000);
      return callGemini(prompt); // Retry
    }
    if (error.status === 503) {
      // Service unavailable - notify frontend
      return { type: 'error', recoverable: true, message: 'AI temporarily busy' };
    }
    throw error;
  }
}
```

---

### 3. Audio/Microphone Errors

| Error | Detection | Recovery | User Experience |
|-------|-----------|----------|-----------------|
| Mic permission denied | `getUserMedia` reject | Cannot recover | "Microphone access needed. Check browser settings." |
| Mic permission revoked | MediaStream `ended` event | Prompt re-permission | "Microphone disconnected. Click to reconnect." |
| AudioContext suspended | `context.state === 'suspended'` | `context.resume()` on user gesture | "Click anywhere to resume audio." |
| AudioWorklet crash | Worker `error` event | Restart worklet | Silent restart |
| No audio input | RMS below threshold for 30s | Warning | "No audio detected. Check microphone." |

**Implementation:**
```javascript
// In capture.js
stream.getTracks()[0].onended = () => {
  onError?.({ type: 'mic_disconnected', recoverable: true });
};

// Handle AudioContext suspension (common on mobile)
document.addEventListener('click', async () => {
  if (context?.state === 'suspended') {
    await context.resume();
  }
}, { once: true });
```

---

### 4. Browser/Tab Errors

| Error | Detection | Recovery | User Experience |
|-------|-----------|----------|-----------------|
| Tab backgrounded | `visibilitychange` event | Pause capture, keep connection | Session pauses, resumes on return |
| Tab closed | `beforeunload` event | Save state to localStorage | Restore on next visit |
| Browser crash | No event | Restore from localStorage | "Resume previous session?" prompt |
| Memory pressure | `memory` API (if available) | Trim buffers | Silent optimization |

**Implementation:**
```javascript
// Pause on background (saves battery, prevents audio issues)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseCapture();
    saveSessionState();
  } else {
    resumeCapture();
  }
});

// Save before unload
window.addEventListener('beforeunload', () => {
  saveSessionState();
});

// Session state to save
function saveSessionState() {
  const state = {
    interviewId: state.interviewId,
    transcript: state.transcript,
    currentQuestion: state.currentQuestionIndex,
    timestamp: Date.now()
  };
  localStorage.setItem('preptalk_session', JSON.stringify(state));
}
```

---

### 5. Worker Errors

| Error | Detection | Recovery | User Experience |
|-------|-----------|----------|-----------------|
| Worker crash | `worker.onerror` | Create new worker | Silent restart |
| Worker unresponsive | No heartbeat response | Terminate and restart | Brief pause |
| Message serialization error | Try-catch in handler | Log and skip | Silent |

**Implementation:**
```javascript
// Heartbeat to detect unresponsive worker
let lastWorkerResponse = Date.now();

worker.onmessage = () => {
  lastWorkerResponse = Date.now();
};

setInterval(() => {
  if (Date.now() - lastWorkerResponse > 5000) {
    console.warn('Worker unresponsive, restarting');
    restartWorker();
  }
}, 2000);
```

---

## Data Persistence Strategy

### What's Saved Locally

| Data | Storage | Retention |
|------|---------|-----------|
| Session transcript | localStorage | Until explicit clear |
| Question progress | localStorage | Until session end |
| Audio settings | localStorage | Permanent |
| Resume/job files | sessionStorage | Tab lifetime only |

### Recovery Flow

```
User returns to PrepTalk
        │
        ▼
┌───────────────────────┐
│ Check localStorage    │
│ for saved session     │
└───────────┬───────────┘
            │
     Session found?
     /           \
   Yes            No
    │              │
    ▼              ▼
┌─────────────┐  ┌─────────────┐
│ "Resume     │  │ Start fresh │
│ previous    │  │ session     │
│ session?"   │  └─────────────┘
└──────┬──────┘
       │
   User choice
   /        \
 Resume    New
   │         │
   ▼         ▼
┌─────────┐ ┌─────────────────┐
│ Restore │ │ Clear old data, │
│ state   │ │ start new       │
└─────────┘ └─────────────────┘
```

---

## Status Messages

| Severity | Style | Example |
|----------|-------|---------|
| Info | Blue pill | "Connecting to AI..." |
| Warning | Yellow pill | "Slow connection. Retrying..." |
| Error (recoverable) | Orange pill | "Connection lost. Reconnecting..." |
| Error (fatal) | Red pill | "Session ended. Your transcript is saved." |

---

## Testing Checklist

- [ ] Kill WebSocket mid-session → reconnects, no data loss
- [ ] Disable network mid-session → saves locally, offers retry
- [ ] Revoke mic permission mid-session → clear error, recovery option
- [ ] Background tab for 5 minutes → resumes cleanly
- [ ] Close tab mid-session → can restore on return
- [ ] Simulate Gemini 429 → queues and retries
- [ ] Simulate Gemini 503 → graceful error message
- [ ] Fill localStorage → handles gracefully

---

## Code Changes Required

### 1. Add to ui.js (session recovery)
```javascript
function checkForSavedSession() {
  const saved = localStorage.getItem('preptalk_session');
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    // Only offer to restore if less than 24 hours old
    if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
      return session;
    }
  } catch (e) {
    localStorage.removeItem('preptalk_session');
  }
  return null;
}
```

### 2. Add to transport-v2.js (connection resilience)
```javascript
// Already implemented: reconnect with exponential backoff
// Add: transcript backup on disconnect
```

### 3. Add to capture.js (audio resilience)
```javascript
// Add: mic disconnect handler
// Add: AudioContext resume on user gesture
```

---

*Error handling ensures Google judges see a production-ready app, not a demo that crashes.*
