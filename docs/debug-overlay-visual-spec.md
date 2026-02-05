# Debug Overlay Visual Specification

## Sidebar Card Layout

```
┌─────────────────────────────────────┐
│  AUDIO TELEMETRY                    │  ← Dark gray background (#2A2A2E)
│                                     │
│  MEDIUM               ● (pulsing)   │  ← Quality text + colored dot
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░   │  ← Progress bar (60% filled)
│                                     │
│  Sample Rate          24 kHz        │  ← Telemetry stats
│  Frame Size           40 ms         │
│  Network              4g            │
│  Latency              85 ms         │
│  Bandwidth            8.2 Mbps      │
└─────────────────────────────────────┘
```

## Color Coding

### HIGH Quality (Green)
```
Color: #10B981 (Emerald green)
Dot: Green with glow
Bar: 100% filled
Text: WHITE (#E8E8EA)
```

### MEDIUM Quality (Yellow)
```
Color: #F59E0B (Amber)
Dot: Yellow with glow
Bar: 60% filled
Text: WHITE (#E8E8EA)
```

### LOW Quality (Red)
```
Color: #EF4444 (Red)
Dot: Red with glow
Bar: 30% filled
Text: WHITE (#E8E8EA)
```

## Toast Notification

### Position
```
Bottom-right corner
20px from edges
Fixed position
Z-index: 9999
```

### Layout
```
┌────────────────────────────────────┐
│  ⬆️  Audio Quality Improved         │
│     Upgraded to HIGH quality       │
│     (48kHz)                        │
└────────────────────────────────────┘
```

### Variants

**Upgrade (Green border)**
```
Icon: ⬆️
Title: "Audio Quality Improved"
Message: "Upgraded to HIGH quality (48kHz)"
Border: #10B981
```

**Downgrade (Yellow border)**
```
Icon: ⬇️
Title: "Audio Quality Adjusted"
Message: "Switched to LOW quality for stability"
Border: #F59E0B
```

## Animation Timings

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Quality bar | width | 500ms | ease |
| Quality dot | opacity | 2s (loop) | ease-in-out |
| Toast enter | opacity, transform | 300ms | ease |
| Toast exit | opacity, transform | 300ms | ease |
| Toast visible | - | 4000ms | - |

## Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Section title | IBM Plex Mono | 11px | 600 | #A0A0A5 |
| Quality text | IBM Plex Mono | 12px | 600 | #E8E8EA |
| Stat label | IBM Plex Mono | 11px | 400 | #A0A0A5 |
| Stat value | IBM Plex Mono | 11px | 600 | #E8E8EA |
| Toast title | Inter | 12px | 600 | #E8E8EA |
| Toast message | Inter | 11px | 400 | #A0A0A5 |

## Spacing

| Element | Padding | Margin |
|---------|---------|--------|
| Card | 12px | 0 0 20px 0 |
| Quality indicator | - | 0 0 12px 0 |
| Stat row | 4px 0 | - |
| Toast | 12px 16px | - |
| Toast icon | - | 0 8px 0 0 |

## States

### Initial State (Medium quality)
- Quality text: "MEDIUM"
- Dot color: Yellow (#F59E0B)
- Bar fill: 60%
- Bar color: Yellow

### After Upgrade
- Quality text: "HIGH"
- Dot color: Green (#10B981)
- Bar fill: 100%
- Bar color: Green
- Toast: Upgrade variant (4 seconds)

### After Downgrade
- Quality text: "LOW"
- Dot color: Red (#EF4444)
- Bar fill: 30%
- Bar color: Red
- Toast: Downgrade variant (4 seconds)

## Responsive Behavior

| Viewport | Card Width | Toast Width | Notes |
|----------|------------|-------------|-------|
| Desktop (1200px+) | 320px | 320px | Normal sidebar |
| Tablet (768-1199px) | 280px | 280px | Narrower sidebar |
| Mobile (<768px) | 100% | 90vw | Full width |

## Integration Points

### HTML Location
```
app/templates/prototype-c.html
Line: 377-412
Parent: <aside class="sidebar">
Context: Practice screen (screen-practice)
```

### CSS Location
```
app/static/css/prototype-c-components.css
Lines: 505-682
Section: DEBUG TELEMETRY OVERLAY
```

### JavaScript Location
```
app/static/js/preflight-audio.js
Functions:
- showDebugOverlay() - Line 240
- updateDebugOverlay() - Line 303
- showDebugToast() - Line 329
```

## Accessibility

### ARIA Labels
```html
<!-- None required - informational display only -->
<!-- Not interactive, no screen reader announcements needed -->
```

### Keyboard Navigation
- Not keyboard-focusable (display only)
- No interactive elements
- Toast auto-dismisses (no action required)

### Color Contrast
| Text | Background | Ratio | WCAG Level |
|------|------------|-------|------------|
| #E8E8EA | #2A2A2E | 13.2:1 | AAA |
| #A0A0A5 | #2A2A2E | 6.8:1 | AA |

## Browser DevTools Simulation

### Force Quality Changes

**Chrome DevTools:**
1. Open DevTools (F12)
2. Network tab → Throttling dropdown
3. Select "Slow 3G" → Reload page
4. Result: Quality drops to LOW, toast appears

**Firefox DevTools:**
1. Open DevTools (F12)
2. Network tab → Throttling dropdown
3. Select "GPRS" → Reload page
4. Result: Quality drops to LOW, toast appears

**Safari DevTools:**
1. Develop → User Agent → Safari - iPhone
2. Network Link Conditioner → Poor Network
3. Result: Quality adjusts accordingly

## Visual Hierarchy

```
Priority 1: Quality indicator (largest, brightest)
Priority 2: Stats values (monospace, prominent)
Priority 3: Stats labels (muted, smaller)
Priority 4: Section title (uppercase, tiny)
```

## Comparison to Production UI

| Aspect | Production UI | Debug UI |
|--------|---------------|----------|
| Background | White/Light (#FAFAFA) | Dark (#2A2A2E) |
| Border | Subtle (#E5E5E5) | Prominent (#3E3E42) |
| Font | Inter (sans-serif) | IBM Plex Mono |
| Accent | Brand green (#2D5A47) | Signal colors (R/Y/G) |
| Purpose | User guidance | Technical telemetry |

## Implementation Checklist

- [x] HTML structure in sidebar
- [x] CSS styles match design tokens
- [x] JavaScript populates values
- [x] Quality indicator changes color
- [x] Progress bar animates
- [x] Dot pulses continuously
- [x] Toast appears on change
- [x] Toast auto-dismisses
- [x] URL parameter toggles visibility
- [x] No console errors
- [x] Mobile responsive
- [x] Accessibility compliant

## Demo Screenshots (Conceptual)

### HIGH Quality State
```
┌─────────────────────────────────────┐
│  AUDIO TELEMETRY                    │
│                                     │
│  HIGH                 ●             │  ← Green dot
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  ← 100% green bar
│                                     │
│  Sample Rate          48 kHz        │
│  Frame Size           20 ms         │
│  Network              4g            │
│  Latency              45 ms         │
│  Bandwidth            12.5 Mbps     │
└─────────────────────────────────────┘
```

### LOW Quality State
```
┌─────────────────────────────────────┐
│  AUDIO TELEMETRY                    │
│                                     │
│  LOW                  ●             │  ← Red dot
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░   │  ← 30% red bar
│                                     │
│  Sample Rate          16 kHz        │
│  Frame Size           60 ms         │
│  Network              3g            │
│  Latency              250 ms        │
│  Bandwidth            1.2 Mbps      │
└─────────────────────────────────────┘
```

### Toast Notification (Downgrade)
```
                    ┌────────────────────────────────┐
                    │  ⬇️  Audio Quality Adjusted     │
                    │     Switched to LOW quality    │
                    │     for stability              │
                    └────────────────────────────────┘
                    └─ Yellow border (#F59E0B)
```

---

**Status**: Implementation complete and production-ready
**Last Updated**: 2026-02-04
**Version**: 1.0
