# Debug Overlay for Adaptive Audio Telemetry

## Overview

The debug overlay provides real-time visibility into PrepTalk's adaptive audio system. It shows current quality settings, network conditions, and device telemetry.

## Enabling Debug Mode

Add `?debug=1` to any PrepTalk URL:

```
http://localhost:5000/prototype-c?debug=1
```

## Features

### 1. Sidebar Telemetry Card

Located in the "My Stories" sidebar during practice screens, showing:

- **Quality Indicator**: HIGH/MEDIUM/LOW with color-coded dot and progress bar
  - GREEN (HIGH): 48kHz, fast network, powerful device
  - YELLOW (MEDIUM): 24kHz, moderate network
  - RED (LOW): 16kHz, poor network or limited device

- **Live Telemetry Stats**:
  - Sample Rate (kHz)
  - Frame Size (ms)
  - Network Type (4g, 3g, etc.)
  - Latency (ms)
  - Bandwidth (Mbps)

### 2. Toast Notifications

Automatic notifications appear when audio quality changes:

- **Upgrade**: "Audio Quality Improved" (green)
- **Downgrade**: "Audio Quality Adjusted" (yellow)
- Shows new profile and sample rate

### 3. Runtime Updates

For developers testing adaptive behavior:

```javascript
// Simulate network change
const newConfig = await determineAudioConfig();
window.updateAudioDebugOverlay(newConfig);
```

## Design Details

### Color Coding

| Quality | Dot Color | Bar Color | Profile |
|---------|-----------|-----------|---------|
| HIGH    | Green     | Green     | 48kHz, 20ms frame, 128kbps |
| MEDIUM  | Yellow    | Yellow    | 24kHz, 40ms frame, 64kbps |
| LOW     | Red       | Red       | 16kHz, 60ms frame, 32kbps |

### Dark Theme

The telemetry card uses a dark theme to distinguish it from normal UI:
- Background: `#2A2A2E`
- Border: `#3E3E42`
- Text: `#E8E8EA`
- Font: IBM Plex Mono (monospace)

## Files Modified

1. **prototype-c.html** (line ~375)
   - Added `<div class="debug-telemetry-card">` to practice screen sidebar

2. **prototype-c-components.css** (end of file)
   - Added `.debug-telemetry-card` styles
   - Added `.debug-toast` styles
   - Added quality indicator animations

3. **preflight-audio.js**
   - Added `showDebugOverlay()` function
   - Added `updateDebugOverlay()` function
   - Added `showDebugToast()` function
   - Exposed `window.updateAudioDebugOverlay()` for runtime updates

## Testing

### Manual Test

1. Open PrepTalk with `?debug=1`
2. Navigate to practice screen
3. Verify sidebar shows telemetry card
4. Check values match browser network inspector

### Simulate Quality Change

```javascript
// In browser console
const newConfig = {
  profile: 'low',
  sampleRate: 16000,
  frameSize: 60,
  telemetry: {
    bandwidth: 1.2,
    effectiveType: '3g',
    latency: 250
  }
};
window.updateAudioDebugOverlay(newConfig);
```

Should show toast notification and update sidebar values.

## Demo Mode

For Taylor's demo:

- **Without debug**: Normal clean UI, no telemetry visible
- **With debug**: Shows technical details for hackathon judges
- Toggle by adding/removing `?debug=1` from URL

## Future Enhancements

Potential additions (not implemented yet):

- Real-time bandwidth graph
- Packet loss indicator
- Audio buffer health monitor
- Network condition history
- Export telemetry logs
