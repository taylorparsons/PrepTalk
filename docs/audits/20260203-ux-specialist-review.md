# UX Specialist Validation Audit

**Date:** 2026-02-03
**Auditor:** UX Specialist (Independent Review)
**Focus:** Teach-first coaching model, journey messaging, and "coach not judge" promise

---

## Executive Summary

PrepTalk has made significant progress in repositioning from "interview simulator" to "confidence-building practice coach." The majority of user-facing messaging now uses coach framing, and the Learning Card component provides genuine teach-first functionality. However, several inconsistencies remain that undermine the coaching promise, particularly in panel titles and post-session feedback areas.

**Overall Verdict: CONDITIONAL PASS**

The core UX delivers on the coaching promise, but 6 specific issues require attention before full alignment is achieved.

---

## 1. Journey Messaging Analysis

### Hero Section (PASS)

The hero section in `buildAppHeader()` (ui.js:409-453) successfully establishes the coaching frame:

| Element | Content | Assessment |
|---------|---------|------------|
| Eyebrow | "PrepTalk - Your Interview Practice Coach" | Excellent - establishes relationship |
| Subtitle | "Build confidence with personalized practice topics drawn from your experience. Your coach will guide you through each answer, one step at a time." | Excellent - emphasizes confidence-building and guidance |
| Steps | Uses "practice", "coach", "help" terminology | Good - action-oriented without anxiety |
| Note | "Practice is turn-based" | Good - sets clear expectations |

**Strengths:**
- "Your coach will guide you" establishes the supportive relationship immediately
- "Build confidence" directly addresses the user's emotional need
- "One step at a time" reduces overwhelm

### Setup Panel (PASS)

Location: ui.js:810-811
```javascript
title: 'Candidate Setup',
subtitle: 'Share your background to personalize the practice session.'
```

**Assessment:** Good framing. "Share your background" feels collaborative rather than evaluative.

### Session Controls (MINOR ISSUE)

Location: ui.js:2372-2373
```javascript
title: 'Session Controls',
subtitle: 'Turn-based coaching controls.'
```

**Issue:** "Controls" is mechanical language. Consider "Session Progress" or "Practice Session."

### Practice Topics Panel (PASS)

Location: ui.js:2650-2651
```javascript
title: 'Practice Topics',
subtitle: 'Personalized from your background. Hover for coaching tips.'
```

**Assessment:** Excellent. "Practice Topics" replaces "Interview Questions" - removes test framing. "Coaching tips" reinforces supportive model.

### Question Insights Panel (PASS)

Location: ui.js:2740-2741
```javascript
title: 'Question Insights',
subtitle: 'Hover a question or click Pin to keep details visible.'
```

**Assessment:** Good. "Insights" suggests learning opportunity rather than evaluation criteria.

---

## 2. Learning Card UX Analysis

### Component Structure (PASS)

File: `/app/static/js/components/learning-card.js`

The Learning Card implements the teach-first model correctly:

| Section | Label | Purpose | Assessment |
|---------|-------|---------|------------|
| Eyebrow | "Before we practice..." | Sets learning context | Excellent |
| Title | "Here's an example from your experience" | Resume-grounded | Excellent |
| Preview | "Coming up:" | Shows next question | Good - reduces surprise |
| Fact | "From your resume" | Grounds in user's history | Excellent |
| Example | "Example approach" | Shows HOW to answer | Excellent |
| Why | "Why this works" | Coaching explanation | Excellent |
| CTA | "I'm Ready to Practice" | User-initiated progression | Excellent |

**Information Hierarchy:** Correct order - shows example before asking question, which directly addresses the "I don't know which story to tell" problem.

**Cognitive Load:** Reduced by:
- Breaking content into labeled sections
- Using blockquotes for resume facts
- Muted text for explanatory content

**Coaching Tone:** Consistently supportive:
- "Here's an example" (giving, not testing)
- "Why this works" (teaching, not grading)
- "I'm Ready to Practice" (user agency)

### Generated Content (learning-card.js:140-254)

The `generateLearningContent()` function provides contextual coaching:

**Strengths:**
- STAR format guidance for behavioral questions
- Role-specific advice (leadership, technical)
- Connects resume content to question types

**Minor Issue:** Line 206: "I'm a [role] with experience" uses placeholder brackets visible to user. Should be populated or rephrased.

---

## 3. Color Psychology Assessment (PASS)

### Nordic Warmth Palette

File: `/app/static/css/components.css` (lines 6-37)

| Token | Value | Psychological Effect | Assessment |
|-------|-------|---------------------|------------|
| `--ui-color-surface` | #FAF8F5 (Linen) | Warmth, comfort, safety | Excellent for coaching |
| `--ui-color-raised` | #FEFDFB (Cream) | Clean, approachable | Good |
| `--ui-color-birch` | #F5F0E8 | Natural, calming | Excellent |
| `--ui-color-primary` | #6B7B8A (Muted slate) | Trustworthy, professional | Good |
| `--ui-color-accent` | #D4A574 (Amber) | Warm encouragement | Excellent |
| `--ui-color-danger` | #C4847A (Soft coral) | Gentle alert, not alarming | Good choice |
| `--ui-color-secondary` | #7A8B7A (Sage) | Growth, learning | Excellent |

**Assessment:** The palette successfully conveys warmth, trust, and calm. The muted tones avoid the anxiety typically associated with high-contrast "test" interfaces. The soft coral for danger states is less alarming than traditional red.

**Learning Card Styling (lines 1019-1121):**
- Gradient background creates depth without distraction
- Section backgrounds use the coaching color system appropriately
- Primary color for "From your resume" section reinforces credibility
- Accent color for "Why this works" draws attention to coaching insights

---

## 4. Accessibility UX Assessment (PASS WITH NOTES)

### Skip Links (PASS)

Location: `/app/templates/index.html:11`
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

CSS support in components.css:1154-1170 correctly hides link until focused.

### Focus Indicators (PASS)

Location: components.css:1137-1151
```css
.ui-button:focus-visible,
.ui-icon-button:focus-visible,
/* ... comprehensive list ... */
{
  outline: 2px solid var(--ui-color-primary);
  outline-offset: 2px;
}
```

**Assessment:** Good contrast, visible offset, uses design system color.

### Status Announcements (PASS)

Multiple `aria-live="polite"` regions found:
- Status pill (ui.js:850)
- Turn help (ui.js:2328)

### Reduced Motion (PASS)

Location: components.css:1173-1181
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; /* ... */ }
}
```

### ARIA States (GOOD)

Toggle buttons correctly use `aria-pressed`:
- Mute button (ui.js:874, 969)
- Barge-in toggle (ui.js:887, 982)
- Learning mode toggle (ui.js:938, 2925)
- Pin buttons (ui.js:560)

---

## 5. Issues Found

### ISSUE 1: "Score Summary" Panel Title (HIGH)

**Location:** ui.js:2828-2829
```javascript
title: 'Score Summary',
subtitle: 'Full transcript and coaching highlights.'
```

**Problem:** "Score" is evaluative language that contradicts the coaching model. Users may feel judged.

**Recommendation:** Change to:
```javascript
title: 'Session Insights',
subtitle: 'Your progress and areas to explore further.'
```

### ISSUE 2: "Scoring" Status Pill (HIGH)

**Location:** ui.js:2261
```javascript
updateStatusPill(statusPill, { label: 'Scoring', tone: 'info' });
```

**Problem:** "Scoring" implies evaluation/judgment phase.

**Recommendation:** Change to "Preparing feedback" or "Generating insights"

### ISSUE 3: "Score Error" Status (MEDIUM)

**Location:** ui.js:2301
```javascript
updateStatusPill(statusPill, { label: 'Score Error', tone: 'danger' });
```

**Problem:** Reinforces "score" framing.

**Recommendation:** "Feedback unavailable" or "Insights error"

### ISSUE 4: HTML Page Title (MEDIUM)

**Location:** `/app/templates/index.html:6`
```html
<title>PrepTalk Interview Coach</title>
```

**Problem:** While "Coach" is good, the full title appears in browser tabs and bookmarks. Consider whether "Interview" adds value or anxiety.

**Recommendation:** Consider "PrepTalk - Practice Coach" or "PrepTalk - Your Practice Coach"

### ISSUE 5: "Unable to generate questions" Error (LOW)

**Location:** ui.js:788
```javascript
status.textContent = error.message || 'Unable to generate questions.';
```

**Problem:** Uses "questions" instead of "practice topics" (inconsistent with Practice Topics panel).

**Recommendation:** "Unable to prepare practice topics. Please try again."

### ISSUE 6: "Scoring failed" Error Message (LOW)

**Location:** ui.js:2303
```javascript
ui.scoreSummary.textContent = error?.message || 'Scoring failed.';
```

**Problem:** "Scoring failed" is both evaluative and negative.

**Recommendation:** "Feedback is temporarily unavailable. Your practice transcript is saved."

---

## 6. Validation Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| Messaging consistently uses coach framing | PARTIAL | 90% compliant; Score panel needs work |
| No anxiety-inducing language ("test", "fail") | PARTIAL | "Score" appears 30+ times, "failed" in errors |
| Clear next steps at each journey phase | PASS | Hero steps, button labels, help text all guide users |
| Learning Card reduces cognitive load | PASS | Sectioned, labeled, hierarchical |
| Color palette supports emotional goals | PASS | Nordic Warmth is warm, trustworthy, calming |
| Interactions feel supportive, not evaluative | PARTIAL | Session flow good; completion feedback needs work |

---

## 7. Recommendations Summary

### Must Fix (Before Launch)

1. Rename "Score Summary" panel to "Session Insights" or "Practice Feedback"
2. Change "Scoring" status to "Preparing feedback"
3. Update error messages to avoid "score" and "failed" language

### Should Fix (Next Sprint)

4. Consider updating page title to remove "Interview"
5. Align error messages with "practice topics" terminology
6. Review `overall_score` field name in API/UI (though this may be backend work)

### Consider (Future Enhancement)

- Add celebration/encouragement messaging after completing a practice session
- Consider renaming `scoreInterview` API endpoint to `getFeedback` or `getInsights`
- Add "What's Next" section in Session Insights panel with growth-oriented suggestions

---

## 8. Conclusion

PrepTalk has successfully implemented the teach-first coaching model in its core components. The Learning Card is well-designed and directly addresses the user problem of "I don't know which story to tell." The Nordic Warmth color palette creates an appropriately supportive atmosphere.

The primary remaining issue is the "Score Summary" terminology, which creates a jarring evaluative moment at the end of an otherwise supportive journey. Fixing this inconsistency will complete the transition from "interview simulator" to "confidence-building practice coach."

**Final Verdict: CONDITIONAL PASS**

The UX delivers on the coaching promise for ~90% of the user journey. The 6 identified issues are addressable with terminology changes and do not require architectural modifications.

---

*Audit completed by UX Specialist - Independent Review*
