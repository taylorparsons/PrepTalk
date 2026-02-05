# Debug Overlay Quick Reference

## Enable Debug Mode

Add `?debug=1` to URL:
```
http://localhost:5000/prototype-c?debug=1
```

## What You'll See

### In Sidebar (Practice Screen)
- Dark card with "AUDIO TELEMETRY" header
- Quality indicator: HIGH/MEDIUM/LOW with colored dot
- 5 stats: Sample Rate, Frame Size, Network, Latency, Bandwidth

### Toast Notifications (When Quality Changes)
- Bottom-right corner
- Shows upgrade (⬆️ green) or downgrade (⬇️ yellow)
- Auto-dismisses after 4 seconds

## Demo Script

### 1. Normal Demo (No Debug)
```
URL: /prototype-c
```
"This is the user experience - clean, focused on coaching, no technical distractions."

### 2. Technical Demo (With Debug)
```
URL: /prototype-c?debug=1
```
"Behind the scenes, PrepTalk continuously monitors network and device conditions..."

**Navigate to practice screen:**

"Notice the telemetry card in the sidebar. Right now we're at MEDIUM quality - 24kHz sampling, 40ms frame size."

### 3. Simulate Network Change

**Open Chrome DevTools:**
1. F12 to open DevTools
2. Network tab
3. Throttling dropdown → "Slow 3G"
4. Reload page

**Watch the magic:**
- Quality drops to LOW (red)
- Toast appears: "Audio Quality Adjusted"
- Stats update: 16kHz, 60ms, 250ms latency

"The system automatically adjusted to maintain stable audio - lower quality, but no dropouts."

## Talking Points

### Problem
"Real-world interviews happen on spotty WiFi, cellular hotspots, bandwidth-constrained networks."

### Solution
"PrepTalk adapts in real-time. We detect network conditions before audio breaks, and adjust parameters seamlessly."

### Impact
"Users practice confidently knowing the system won't fail them during critical moments."

## Quality Levels

| Level | Sample Rate | Frame Size | Network | Use Case |
|-------|-------------|------------|---------|----------|
| HIGH | 48 kHz | 20 ms | Fast (>5 Mbps) | Home WiFi, strong cellular |
| MEDIUM | 24 kHz | 40 ms | Moderate (2-5 Mbps) | Typical WiFi |
| LOW | 16 kHz | 60 ms | Poor (<2 Mbps) | Coffee shop, 3G |

## Live Testing in Browser Console

```javascript
// Simulate quality change
window.updateAudioDebugOverlay({
  profile: 'low',
  sampleRate: 16000,
  frameSize: 60,
  telemetry: {
    bandwidth: 1.2,
    effectiveType: '3g',
    latency: 250
  }
});
```

## Troubleshooting

**Card not showing?**
- Check URL has `?debug=1`
- Navigate to practice screen (not welcome/setup)
- Refresh page

**Toast not appearing?**
- Quality must actually change (not just page reload)
- Use browser DevTools throttling or console command

**Values look wrong?**
- Browser may cache network detection
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Files Modified

- `app/templates/prototype-c.html` - Added debug card HTML
- `app/static/css/prototype-c-components.css` - Added debug styles
- `app/static/js/preflight-audio.js` - Added debug functions

## Production Readiness

✅ Toggle via URL parameter (no code changes to deploy)
✅ Hidden by default (zero impact on users)
✅ No performance overhead when disabled
✅ Production-quality styling
✅ Comprehensive documentation

---

**Ready to demo!** 🚀
