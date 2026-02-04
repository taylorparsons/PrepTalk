# Debug Overlay Test Plan

## Pre-Flight Check

Before testing, verify files are in place:

```bash
# Check HTML has debug card
grep -n "debug-telemetry-card" app/templates/prototype-c.html

# Check CSS has debug styles
grep -c "debug-" app/static/css/prototype-c-components.css

# Check JS has debug functions
grep "showDebugOverlay\|updateDebugOverlay" app/static/js/preflight-audio.js
```

Expected output:
- HTML: Line number around 377
- CSS: Count around 27
- JS: Function definitions found

## Test 1: Debug Mode Disabled (Default)

**Objective:** Verify debug overlay is completely hidden without URL parameter.

**Steps:**
1. Open `http://localhost:5000/prototype-c`
2. Navigate to practice screen (click through setup)
3. Inspect sidebar

**Expected Result:**
- No dark telemetry card visible
- Sidebar shows only "Quick Reference" section
- No console errors

**Pass Criteria:** ✅ Debug card not visible

---

## Test 2: Debug Mode Enabled

**Objective:** Verify debug overlay appears with URL parameter.

**Steps:**
1. Open `http://localhost:5000/prototype-c?debug=1`
2. Navigate to practice screen
3. Look at sidebar

**Expected Result:**
- Dark telemetry card visible at top of sidebar
- Card shows "AUDIO TELEMETRY" title
- Quality indicator displays (MEDIUM most likely)
- Colored dot is pulsing
- Progress bar is partially filled
- 5 stat rows show values

**Pass Criteria:** ✅ All elements visible and populated

---

## Test 3: Quality Indicator Colors

**Objective:** Verify color coding matches quality level.

**Steps:**
1. With debug mode enabled, check current quality
2. Note the dot color and bar color

**Expected Results:**

| Quality | Dot Color | Bar Color | Bar Width |
|---------|-----------|-----------|-----------|
| HIGH    | Green     | Green     | 100%      |
| MEDIUM  | Yellow    | Yellow    | 60%       |
| LOW     | Red       | Red       | 30%       |

**Pass Criteria:** ✅ Colors and width match quality level

---

## Test 4: Telemetry Values

**Objective:** Verify stat values are realistic and properly formatted.

**Steps:**
1. With debug mode enabled, check sidebar values
2. Verify formatting

**Expected Values:**

| Stat | Format | Example | Range |
|------|--------|---------|-------|
| Sample Rate | `NN kHz` | `24 kHz` | 16-48 |
| Frame Size | `NN ms` | `40 ms` | 20-60 |
| Network | Text | `4g` | 3g/4g/slow-2g |
| Latency | `NN ms` | `85 ms` | 10-500 |
| Bandwidth | `N.N Mbps` | `8.2 Mbps` | 0.5-20 |

**Pass Criteria:** ✅ All values present and properly formatted

---

## Test 5: Pulsing Dot Animation

**Objective:** Verify quality dot animates continuously.

**Steps:**
1. With debug mode enabled, watch the colored dot
2. Observe for 5 seconds

**Expected Result:**
- Dot pulses in/out smoothly
- Animation loops continuously
- No jarring jumps or flickers

**Pass Criteria:** ✅ Smooth pulsing animation

---

## Test 6: Toast Notification (Network Downgrade)

**Objective:** Verify toast appears when quality degrades.

**Steps:**
1. Open `http://localhost:5000/prototype-c?debug=1`
2. Navigate to practice screen
3. Open Chrome DevTools (F12)
4. Network tab → Throttling dropdown
5. Select "Slow 3G"
6. Reload page
7. Watch sidebar and bottom-right corner

**Expected Result:**
- Quality drops to LOW (red dot, 30% bar)
- Toast appears bottom-right with:
  - ⬇️ icon
  - Yellow border
  - Title: "Audio Quality Adjusted"
  - Message: "Switched to LOW quality for stability"
- Toast fades in smoothly
- Toast auto-dismisses after 4 seconds

**Pass Criteria:** ✅ Toast appears and dismisses correctly

---

## Test 7: Toast Notification (Network Upgrade)

**Objective:** Verify toast appears when quality improves.

**Steps:**
1. With quality at LOW, reset throttling to "No throttling"
2. Reload page
3. Watch for toast

**Expected Result:**
- Quality increases to MEDIUM or HIGH
- Toast appears with:
  - ⬆️ icon
  - Green border
  - Title: "Audio Quality Improved"
  - Message: "Upgraded to [QUALITY] quality ([RATE]kHz)"
- Toast fades in and auto-dismisses

**Pass Criteria:** ✅ Upgrade toast shows correctly

---

## Test 8: Runtime API

**Objective:** Verify JavaScript API works for testing.

**Steps:**
1. With debug mode enabled, open browser console (F12)
2. Paste this code:
```javascript
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
3. Press Enter

**Expected Result:**
- Quality indicator changes to LOW (red)
- Progress bar shrinks to 30%
- Stats update:
  - Sample Rate: 16 kHz
  - Frame Size: 60 ms
  - Network: 3g
  - Latency: 250 ms
  - Bandwidth: 1.2 Mbps
- Toast appears

**Pass Criteria:** ✅ All values update, toast appears

---

## Test 9: Responsive Layout (Mobile)

**Objective:** Verify debug card works on mobile viewports.

**Steps:**
1. With debug mode enabled, open DevTools
2. Toggle device toolbar (mobile view)
3. Select iPhone or Android device
4. Navigate to practice screen

**Expected Result:**
- Debug card fits in narrower sidebar
- No horizontal scrolling
- All text readable
- Toast fits on screen

**Pass Criteria:** ✅ Layout adapts to mobile

---

## Test 10: No Console Errors

**Objective:** Verify clean console with no errors.

**Steps:**
1. Open `http://localhost:5000/prototype-c?debug=1`
2. Open DevTools Console tab
3. Navigate through app (welcome → setup → practice)
4. Trigger quality change
5. Watch console

**Expected Result:**
- No red error messages
- No yellow warning messages
- Only info/log messages (optional)

**Pass Criteria:** ✅ Clean console

---

## Test 11: Interactive Demo File

**Objective:** Verify standalone demo works without app.

**Steps:**
1. Open `/docs/debug-overlay-demo.html` directly in browser
2. Click "Simulate HIGH Quality" button
3. Click "Simulate LOW Quality" button
4. Click "Simulate MEDIUM Quality" button

**Expected Result:**
- Each click updates card immediately
- Quality indicator changes color
- Progress bar animates
- Stats update
- Toast appears on each change

**Pass Criteria:** ✅ Demo fully functional

---

## Test 12: Performance Impact

**Objective:** Verify negligible performance overhead.

**Steps:**
1. Open DevTools Performance tab
2. Start recording
3. Navigate to practice screen with `?debug=1`
4. Trigger quality change
5. Stop recording
6. Check frame rate and CPU usage

**Expected Result:**
- No frame drops
- CPU spike <50ms on quality change
- Smooth 60fps animations
- Memory stable (no leaks)

**Pass Criteria:** ✅ Performance acceptable

---

## Test 13: Accessibility

**Objective:** Verify debug overlay doesn't break accessibility.

**Steps:**
1. Navigate with keyboard only (Tab key)
2. Use screen reader (if available)
3. Check color contrast

**Expected Result:**
- Debug card not in tab order (not interactive)
- Screen reader ignores debug card
- Text contrast meets WCAG AA (>4.5:1)

**Pass Criteria:** ✅ No accessibility issues

---

## Test 14: Edge Cases

**Objective:** Test unusual scenarios.

### 14a: Rapid Quality Changes
```javascript
// In console
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    window.updateAudioDebugOverlay({
      profile: i % 2 ? 'high' : 'low',
      sampleRate: i % 2 ? 48000 : 16000,
      frameSize: i % 2 ? 20 : 60,
      telemetry: { bandwidth: i % 2 ? 10 : 1, effectiveType: '4g', latency: 50 }
    });
  }, i * 500);
}
```

**Expected:** Toasts don't stack (one at a time), values update smoothly

### 14b: Missing Telemetry
```javascript
window.updateAudioDebugOverlay({
  profile: 'medium',
  sampleRate: 24000,
  frameSize: 40,
  telemetry: {} // Empty
});
```

**Expected:** No crash, shows default/fallback values

### 14c: Invalid Quality
```javascript
window.updateAudioDebugOverlay({
  profile: 'invalid',
  sampleRate: 24000,
  frameSize: 40,
  telemetry: { bandwidth: 5, effectiveType: '4g', latency: 80 }
});
```

**Expected:** Falls back to MEDIUM or ignores

**Pass Criteria:** ✅ No crashes or errors

---

## Test Summary Checklist

Run through all tests and check off:

- [ ] Test 1: Hidden without debug param ✅
- [ ] Test 2: Visible with `?debug=1` ✅
- [ ] Test 3: Colors match quality ✅
- [ ] Test 4: Stats properly formatted ✅
- [ ] Test 5: Dot animates smoothly ✅
- [ ] Test 6: Downgrade toast works ✅
- [ ] Test 7: Upgrade toast works ✅
- [ ] Test 8: Runtime API functional ✅
- [ ] Test 9: Responsive on mobile ✅
- [ ] Test 10: No console errors ✅
- [ ] Test 11: Demo file works ✅
- [ ] Test 12: Performance acceptable ✅
- [ ] Test 13: Accessible ✅
- [ ] Test 14: Edge cases handled ✅

## Regression Tests

If modifying debug overlay in future, re-run:

1. Tests 2, 3, 4 (basic functionality)
2. Tests 6, 7 (toast notifications)
3. Test 8 (runtime API)
4. Test 10 (no console errors)

## Known Limitations

1. **Network detection accuracy** - Navigator API may not perfectly reflect real conditions
2. **Toast stacking** - Only one toast shown at a time (by design)
3. **Battery API** - May not be available in all browsers (degrades gracefully)
4. **AudioWorklet** - Fallback to ScriptProcessor if unavailable

## Troubleshooting

### Debug card not appearing?
- Check URL has `?debug=1`
- Navigate to practice screen (not welcome/setup)
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

### Toast not showing?
- Quality must actually change (not just reload)
- Check `window.PREPTALK_AUDIO_CONFIG` exists
- Try runtime API command manually

### Stats show "NaN" or undefined?
- Browser may not support Navigator API
- Check `navigator.connection` in console
- Fallback values should still appear

## Success Criteria

All 14 tests pass without errors.

**Status:** Ready for production demo ✅
