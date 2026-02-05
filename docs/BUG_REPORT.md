# PrepTalk Full Bug Report

**Date:** 2026-02-04
**Branch:** `feature/jennifer-dev`
**Sources:** Frontend Specialist Audit, UX Specialist Audit, A11y Audit, Prototype C Session

---

## Summary

| Category | Total Found | Resolved | Pending |
|----------|-------------|----------|---------|
| Frontend/CSS | 47 | 10 | 37 |
| UX/Messaging | 6 | 0 | 6 |
| Accessibility | 12 | 12 | 0 |
| Prototype C Specific | 10 | 10 | 0 |
| **TOTAL** | **75** | **32** | **43** |

---

## SECTION A: Frontend Specialist Audit Issues

**Source:** `docs/audits/20260203-frontend-specialist-review.md`
**Severity Scale:** High / Medium / Low / Minor / Info

### A1. Hardcoded Colors Outside Design Tokens (40+ instances)

| # | Line | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | 123 | Hardcoded gradient: `#FDF8F0, #FAF5EB` | Minor | PENDING |
| 2 | 156 | Hardcoded hover color: `#5A6A78` | Minor | PENDING |
| 3 | 188 | Hardcoded danger hover: `#B5746A` | Minor | PENDING |
| 4 | 213 | Hardcoded ready background: `#FDF8F0` | Minor | PENDING |
| 5 | 259 | Hardcoded icon-button danger text: `#fff6f5` | Minor | PENDING |
| 6-10 | 353-407 | Multiple hardcoded field/list backgrounds | Minor | PENDING |
| 11-15 | 460-465 | Hardcoded question status backgrounds | Minor | PENDING |
| 16-20 | 605-620 | Hardcoded pill variant text colors | Minor | PENDING |
| 21-25 | 636-651 | Hardcoded transcript row backgrounds | Minor | PENDING |
| 26-30 | 689-700 | Hardcoded markdown backgrounds | Minor | PENDING |
| 31-40 | 714-765 | Hardcoded caption/metric card colors | Medium | PENDING |
| 41-45 | 1020-1084 | Hardcoded learning card colors | Minor | PENDING |

**Recommendation:** Create additional design tokens for hover states, background tints, and semantic surface colors.

### A2. Code Architecture Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 46 | ui.js is 2800+ lines - consider splitting | Medium | PENDING |
| 47 | Dual CSS maintenance (Tailwind + vanilla tokens) | Low | PENDING |

### A3. Testing Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 48 | Form a11y compliance threshold at 50% (too low) | Medium | PENDING |

**Recommendation:** Increase compliance threshold to 80% minimum.

### A4. Minor Code Quality

| # | Line | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 49 | learning-card.js:63-64 | String truncation without word boundary check | Minor | PENDING |
| 50 | learning-card.js:82-83 | Fallback text visible when no data provided | Info | PENDING |
| 51 | learning-card.js:206 | Placeholder brackets visible to user | Minor | PENDING |

---

## SECTION B: UX Specialist Audit Issues

**Source:** `docs/audits/20260203-ux-specialist-review.md`
**Focus:** Teach-first coaching model, messaging consistency

### B1. "Score" Terminology (Contradicts Coaching Model)

| # | Location | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 52 | ui.js:2828-2829 | Panel title "Score Summary" is evaluative | HIGH | PENDING |
| 53 | ui.js:2261 | Status pill shows "Scoring" | HIGH | PENDING |
| 54 | ui.js:2301 | Error shows "Score Error" | Medium | PENDING |
| 55 | ui.js:2303 | Error message "Scoring failed" | Low | PENDING |

**Recommendations:**
- "Score Summary" → "Session Insights"
- "Scoring" → "Preparing feedback"
- "Score Error" → "Feedback unavailable"
- "Scoring failed" → "Feedback is temporarily unavailable. Your practice transcript is saved."

### B2. Messaging Inconsistencies

| # | Location | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 56 | index.html:6 | Page title "Interview Coach" may add anxiety | Medium | PENDING |
| 57 | ui.js:788 | Error uses "questions" instead of "practice topics" | Low | PENDING |

**Recommendations:**
- "PrepTalk Interview Coach" → "PrepTalk - Practice Coach"
- "Unable to generate questions" → "Unable to prepare practice topics"

---

## SECTION C: Accessibility Audit Issues

**Source:** `docs/audits/20260203-phase4-a11y.md`
**All items RESOLVED**

| # | Issue | Status |
|---|-------|--------|
| 58 | Skip-to-main link present | RESOLVED |
| 59 | Skip link targets #main-content | RESOLVED |
| 60 | App shell has role="application" | RESOLVED |
| 61 | Session status has aria-live="polite" | RESOLVED |
| 62 | Turn help has aria-live="polite" | RESOLVED |
| 63 | Focus-visible styles applied | RESOLVED |
| 64 | prefers-reduced-motion respected | RESOLVED |
| 65 | session-select label association | RESOLVED |
| 66 | session-name-input label association | RESOLVED |
| 67 | export-format label association | RESOLVED |
| 68 | custom-question-position label association | RESOLVED |
| 69 | custom-question-input label association | RESOLVED |

---

## SECTION D: Prototype C Session Issues

**Source:** This session (2026-02-04)
**All items RESOLVED**

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 70 | Logo link turns blue on click | Low | RESOLVED |
| 71 | Ring tooltips not visible / positioned wrong | Medium | RESOLVED |
| 72 | Excessive em-dashes (14 instances) - AI writing pattern | Medium | RESOLVED |
| 73 | Starfish card colors all same green tone | Low | RESOLVED |
| 74 | 50+ inline styles in HTML | Medium | RESOLVED |
| 75 | ~180 lines inline JavaScript | Medium | RESOLVED |
| 76 | PDF export content overflow | High | RESOLVED |
| 77 | Missing ARIA attributes on dropzones/cards | Medium | RESOLVED |
| 78 | File inputs using inline display:none | Low | RESOLVED |
| 79 | Topic cards not keyboard accessible | Medium | RESOLVED |

---

## SECTION E: Pending Items by Priority

### Must Fix (Before Launch)

| # | Issue | Location |
|---|-------|----------|
| 52 | "Score Summary" panel title | ui.js:2828 |
| 53 | "Scoring" status pill | ui.js:2261 |
| 54 | "Score Error" status | ui.js:2301 |
| 55 | "Scoring failed" message | ui.js:2303 |

### Should Fix (Next Sprint)

| # | Issue | Location |
|---|-------|----------|
| 31-40 | Hardcoded caption/metric card colors | components.css:714-765 |
| 46 | Split ui.js (2800+ lines) | ui.js |
| 48 | Increase a11y test threshold to 80% | tests/e2e/ |
| 56 | Page title "Interview" wording | index.html:6 |
| 57 | "questions" vs "practice topics" error | ui.js:788 |

### Low Priority (Future)

| # | Issue | Location |
|---|-------|----------|
| 1-30 | Remaining hardcoded colors | components.css |
| 47 | Tailwind/vanilla CSS dual maintenance | config |
| 49-51 | Learning card minor issues | learning-card.js |

---

## Test Results

| Suite | Passed | Failed |
|-------|--------|--------|
| Unit Tests (Vitest) | 64 | 0 |
| Component Tests | 22 files | 0 |
| A11y E2E Tests | 3 | 0 |

---

## Resolved This Session

- All 10 Prototype C issues (Section D)
- PDF export with Prep branding
- Production-quality code refactor
- Documentation created (README, Customization Guide)

---

*Full audit report compiled 2026-02-04*
*Sources: Frontend Specialist, UX Specialist, A11y Phase 4, Prototype C Session*
