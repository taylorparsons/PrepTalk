# Config Migration Testing Checklist

## Pre-Testing Setup

- [x] All JavaScript files pass syntax check
- [x] Files remain under 800 lines
- [x] No function signatures changed
- [x] Fallback defaults match original hardcoded values
- [ ] Config loader script is included before app scripts in HTML

## Unit Testing

### Test File Verification
- [ ] Open `/app/static/js/prototype-c/test-config-migration.html` in browser
- [ ] All sections show green checkmarks (PASS)
- [ ] No red errors (FAIL)

### Expected Test Results
- [ ] PDF Config: 9 tests pass
- [ ] Readiness Calc: 4 tests pass
- [ ] Thresholds: 2 tests pass
- [ ] Timings: 2 tests pass
- [ ] Practice Improvement: 10 tests pass
- [ ] Calculation Test: 4 tests pass
- [ ] Limits: 2 tests pass
- [ ] Readiness Tiers: 3 tests pass

**Total: 36 tests should pass**

## Functional Testing

### 1. PDF Export (core.js)
- [ ] Navigate to prototype welcome screen
- [ ] Click through to completion/insights screen
- [ ] Click "Export PDF" button
- [ ] Verify PDF downloads with filename `PrepTalk_Report_YYYY-MM-DD.pdf`
- [ ] Open PDF and verify:
  - [ ] Header uses green color (#2D5A47 / rgb(45, 90, 71))
  - [ ] Four sections render (Continue, Lean Into, Add, Refine)
  - [ ] Footer includes PrepTalk logo and page numbers
  - [ ] Colors match design tokens

### 2. Story Capture (stories.js)
- [ ] Navigate to practice screen
- [ ] Complete a practice session
- [ ] Story capture card appears with:
  - [ ] Story name extracted from transcript
  - [ ] Tags assigned based on content
  - [ ] Readiness score calculated (0-100)
  - [ ] Insight message displayed
- [ ] Card auto-hides after 8 seconds
- [ ] Navigate to "My Stories"
- [ ] New story appears in shelf with correct:
  - [ ] Status badge (Interview-ready/Practicing/Needs work)
  - [ ] Readiness bar matches score
  - [ ] Practice count shows "Practiced once"

### 3. Readiness Calculation (stories.js)
Test with known filler word counts:

| Fillers/Min | Expected Readiness | Status |
|-------------|-------------------|---------|
| 0.0 | 100 | Ready |
| 1.0 | 100 | Ready |
| 2.0 | 90 | Ready |
| 4.0 | 60 | Practicing |
| 5.0 | 45 | Practicing |
| 7.0 | 20 | Needs work |
| 10.0 | 20 | Needs work |

- [ ] Verify calculations match expected values
- [ ] Status badges match thresholds (80, 40)

### 4. Story Shelf UI (stories.js)
- [ ] Stories display in cards
- [ ] Tag chips show with correct colors
- [ ] Click tag chip to filter stories
- [ ] Progress rings animate correctly
- [ ] Ring tooltips show on hover:
  - [ ] Outer ring: "Total: N stories collected"
  - [ ] Middle ring: "Interview-ready: N of M"
  - [ ] Inner ring (when filtered): "tag: N stories"
- [ ] Stats panel shows:
  - [ ] Total story count
  - [ ] Ready count (readiness >= 80)
  - [ ] Practice session count
- [ ] Filler trend chart displays with insight

### 5. Story Practice & Rescoring (practice.js)
- [ ] Click a story card to open practice modal
- [ ] Modal shows:
  - [ ] Story name
  - [ ] Current readiness bar
  - [ ] Practice count
  - [ ] Tags
  - [ ] Dynamic tip based on story state
- [ ] Click microphone button to start recording
- [ ] Timer counts up (0:00 → 0:30 → 1:00...)
- [ ] Click button again to stop
- [ ] "Processing..." appears for ~800ms
- [ ] Results screen shows:
  - [ ] Before/After readiness comparison
  - [ ] Improvement message
  - [ ] Updated readiness bar
  - [ ] Updated practice count

#### Rescoring Verification
Test with a story (readiness=50, practices=1):

| Duration | Expected Improvement | Notes |
|----------|---------------------|-------|
| 10s | ~10 points | Short, no duration bonus |
| 120s (2min) | ~13 points | Optimal duration (+3) |
| 350s (6min) | ~10 points | Too long, no bonus |

- [ ] Verify improvements match expected ranges
- [ ] Practice count increments by 1
- [ ] Fillers per minute decreases slightly
- [ ] Insight message updates based on new readiness

#### Diminishing Returns Test
Practice the same story multiple times:

| Practice # | Expected Bonus | Total Improvement |
|-----------|---------------|------------------|
| 1st | ~10.5 points | ~13.5 (with duration) |
| 2nd | ~9.0 points | ~12.0 |
| 3rd | ~7.5 points | ~10.5 |
| 5th | ~4.5 points | ~7.5 |
| 7th+ | ~2.0 points | ~5.0 (minimum) |

- [ ] Each practice shows less improvement
- [ ] Minimum bonus of 2 points is enforced
- [ ] High-readiness stories (>80) improve very slowly (×0.3)

### 6. Story Suggestions (practice.js)
- [ ] Navigate to practice screen
- [ ] Relevant stories suggested based on question type
- [ ] Suggestions show:
  - [ ] Story name
  - [ ] Status (Interview-ready/Practiced/New)
  - [ ] Practice count
- [ ] Click a suggestion to select it
- [ ] Click "Use this story" button
- [ ] Resume cue updates with story context

### 7. Demo Stories (stories.js)
On first load with empty localStorage:
- [ ] 7 demo stories appear automatically
- [ ] Stories have varied readiness (38-92)
- [ ] Stories have varied tags
- [ ] Session count shows 7
- [ ] Progress rings show appropriate fill

### 8. Tag Colors (stories.js)
Verify all 12 tag colors render correctly:

- [ ] leadership: Green (#2D8A5A)
- [ ] technical: Blue (#4A7A9A)
- [ ] conflict: Red (#9A4A4A)
- [ ] collaboration: Purple (#7A5A9A)
- [ ] results-driven: Teal (#5A8A7A)
- [ ] problem-solving: Olive (#8A7A4A)
- [ ] mentorship: Cyan (#4A9A8A)
- [ ] communication: Brown (#9A6A4A)
- [ ] innovation: Violet (#6A4A9A)
- [ ] growth: Forest (#4A8A6A)
- [ ] negotiation: Mauve (#8A4A6A)
- [ ] pressure: Lime (#6A8A4A)

## Edge Cases

### Missing Config Files
Test with no config files present:
- [ ] App loads without errors
- [ ] All fallback defaults are used
- [ ] Functionality works identically to hardcoded version
- [ ] Console shows warnings about missing configs

### Partial Config Files
Test with incomplete config files:
- [ ] Missing sections use fallback defaults
- [ ] Present sections override defaults
- [ ] No runtime errors occur

### Invalid Config Values
Test with malformed JSON:
- [ ] Config loader catches error
- [ ] Falls back to full defaults
- [ ] Console shows error message
- [ ] App continues to function

## Performance Testing

- [ ] Config loads in <100ms
- [ ] No lag when switching screens
- [ ] Story shelf renders in <500ms with 50+ stories
- [ ] PDF export completes in <2s
- [ ] Practice modal opens instantly
- [ ] No memory leaks during extended use

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Regression Testing

Verify no existing functionality broke:
- [ ] Welcome screen → Setup → Questions → Practice flow
- [ ] File uploads work
- [ ] Session persistence works (refresh page)
- [ ] "End Session" modal works
- [ ] Navigation between screens works
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility maintained

## Documentation

- [ ] config-migration-summary.md is accurate
- [ ] config-reference.md covers all values
- [ ] Code comments added where config is used
- [ ] README updated with config instructions (if needed)

## Deployment Checklist

- [ ] All tests pass
- [ ] No console errors in production build
- [ ] Config files deployed to `/app/static/config/`
- [ ] Data files deployed to `/app/static/data/`
- [ ] Config loader script included in HTML
- [ ] Config loader runs before app scripts
- [ ] Fallback defaults tested
- [ ] Monitoring added for config load failures

## Success Criteria

✅ All 36 unit tests pass
✅ All functional tests pass
✅ All edge cases handled gracefully
✅ No regressions in existing features
✅ Performance remains acceptable
✅ Cross-browser compatibility maintained
✅ Documentation complete and accurate

## Notes

Document any issues found during testing:

---

**Date Tested:** __________
**Tester:** __________
**Build Version:** __________
**Result:** PASS / FAIL / PARTIAL

---
