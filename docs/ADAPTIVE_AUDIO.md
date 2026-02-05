# Adaptive Audio Scout - Integration Guide

## Overview

The Audio Scout (`preflight-audio.js`) runs **before** the main app loads to:
- Measure network conditions (bandwidth, latency, connection type)
- Check device capabilities (CPU, memory, battery)
- Set optimal audio parameters dynamically
- Provide graceful fallbacks

## How It Works

```javascript
// 1. Scout runs first (in HTML <head>)
<script src="/static/js/preflight-audio.js"></script>

// 2. Scout measures environment and sets:
window.PREPTALK_AUDIO_CONFIG = {
  sampleRate: 48000,    // 48kHz, 24kHz, or 16kHz
  frameSize: 20,        // 20ms, 40ms, or 60ms
  bitrate: 128000,      // 128k, 64k, or 32k
  bufferSize: 2048,     // 2048 or 4096
  profile: 'high'       // 'high', 'medium', or 'low'
}
```

## Quality Profiles

| Profile | Network | Sample Rate | Use Case |
|---------|---------|-------------|----------|
| **High** | 4G, >5 Mbps | 48 kHz | Studio quality, low latency |
| **Medium** | 3G, >2 Mbps | 24 kHz | Balanced quality/bandwidth |
| **Low** | 2G, <2 Mbps | 16 kHz | Stability on poor networks |

## Integration in Voice Code

### Example: AudioContext Initialization

```javascript
// voice.js or audio/capture.js
function initAudioContext() {
  // Use adaptive config if available
  const config = window.PREPTALK_AUDIO_CONFIG || {
    sampleRate: 24000 // fallback
  };

  const audioContext = new AudioContext({
    sampleRate: config.sampleRate
  });

  console.log(`🎙️ Audio initialized: ${config.profile} profile`);
  return audioContext;
}
```

### Example: WebSocket Frame Size

```javascript
// transport.js or workers/network.worker.js
function setupAudioStreaming() {
  const config = window.PREPTALK_AUDIO_CONFIG || { frameSize: 60 };

  // Send audio in adaptive frame sizes
  const frameDuration = config.frameSize; // ms
  const samplesPerFrame = (config.sampleRate / 1000) * frameDuration;

  console.log(`📡 Streaming: ${frameDuration}ms frames`);
}
```

### Example: Bitrate Adjustment

```javascript
// For Opus or other codecs
function getEncoderConfig() {
  const config = window.PREPTALK_AUDIO_CONFIG || { bitrate: 64000 };

  return {
    codec: 'opus',
    bitrate: config.bitrate,
    sampleRate: config.sampleRate
  };
}
```

## Debug Mode

Add `?debug` to URL to see live quality indicator:

```
http://localhost:8000/prototype-c?debug
```

Shows floating badge with:
- Current profile (HIGH/MEDIUM/LOW)
- Sample rate
- Frame size
- Network type
- Latency

## Telemetry (for Demo/Judging)

The scout logs full telemetry to console:

```javascript
✅ Audio Scout Complete: {
  profile: "high",
  sampleRate: "48kHz",
  frameSize: "20ms",
  bitrate: "128kbps",
  network: "4g",
  bandwidth: "8.5 Mbps",
  latency: "45ms"
}
```

Perfect for showing judges the adaptive optimization in action.

## Error Handling

If critical features are missing:
1. Scout shows user-friendly error page
2. Logs detailed error for debugging
3. Prevents app from loading broken state

## Browser API Requirements

| API | Purpose | Fallback |
|-----|---------|----------|
| `navigator.connection` | Network detection | Assumes good connection |
| `navigator.deviceMemory` | Memory check | Assumes 4GB |
| `navigator.hardwareConcurrency` | CPU cores | Assumes 4 cores |
| `AudioContext` | **Required** | Shows error page |
| `getUserMedia` | **Required** | Shows error page |

## Testing Different Conditions

Chrome DevTools → Network tab:
- **Fast 3G** → Should select "medium" profile
- **Slow 3G** → Should select "low" profile
- **No throttling** → Should select "high" profile

Chrome DevTools → Performance tab:
- **CPU throttle 4x** → May downgrade to "medium"

## Why This Wins Hackathons

1. **Production thinking** - Solves real-world problems
2. **User-centric** - Adapts to user's environment
3. **Measurable** - Telemetry shows it working
4. **Google-aligned** - Performance and accessibility focus
5. **Demo-friendly** - Visible quality adjustments

## Next Steps

To integrate fully:
1. Update `voice.js` to use `PREPTALK_AUDIO_CONFIG.sampleRate`
2. Update `transport.js` to use `PREPTALK_AUDIO_CONFIG.frameSize`
3. Update `audio/capture.js` to use `PREPTALK_AUDIO_CONFIG.bufferSize`
4. Test with Chrome DevTools network throttling
5. Add to demo script: "Watch the audio adapt to network conditions..."
