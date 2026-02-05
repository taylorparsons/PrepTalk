# Change Manifest
## PrepTalk Frontend - Session 2026-02-03

**Purpose:** Stakeholder review artifact for Taylor
**Branch:** `feature/jennifer-dev`
**Total Changes:** 23 line items across 6 files

---

## Summary

Transformed user-facing messaging from "interview simulator" to "confidence-building practice coach" positioning.

---

## Change Log

### File: `app/static/js/ui.js`

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 415 | `'PrepTalk • Contextual Interview Coach'` | `'PrepTalk • Your Interview Practice Coach'` | Warmer, personal positioning |
| 423 | `'PrepTalk helps you practice with contextual interview questions built from your resume and job description, then coaches you through a focused, turn-based session.'` | `'Build confidence with personalized practice topics drawn from your experience. Your coach will guide you through each answer, one step at a time.'` | Focus on confidence, not testing |
| 439 | `'PrepTalk is turn-based (not live). Help/Submit become active once the coach finishes speaking.'` | `'Practice is turn-based. Help and Submit become active after the coach finishes speaking.'` | Simpler, less technical |
| 623 | `'Complete a session to view scoring insights.'` | `'Complete a practice session to see your coaching feedback.'` | Removes evaluative "scoring" language |
| 697 | `'Generate Questions'` | `'Prepare Practice'` | Action sounds collaborative, not test-like |
| 719 | `'Analyzing documents and generating questions...'` | `'Analyzing your background and preparing practice topics...'` | Personal ("your"), supportive |
| 721 | `'Generating...'` | `'Preparing...'` | Consistent with button label |
| 773 | `'Questions ready. Start the session when ready.'` | `'Practice topics ready. Begin when you feel comfortable.'` | Reduces pressure |
| 788 | `'Unable to generate questions.'` | `'Unable to prepare practice topics. Please try again.'` | Removes "questions", adds encouragement |
| 790 | `'Generate Questions'` | `'Prepare Practice'` | Reset state matches initial |
| 811 | `'Add resume + job details to personalize the interview.'` | `'Share your background to personalize the practice session.'` | "Share" is warmer than "Add" |
| 853 | `'Start Interview'` | `'Begin Practice'` | Not an interview, it's practice |
| 952 | `'Restart interview'` | `'Restart Practice'` | Consistent terminology |
| 2261 | `{ label: 'Scoring', tone: 'info' }` | `{ label: 'Preparing feedback', tone: 'info' }` | Removes evaluative "scoring" |
| 2264 | `'Scoring… This can take ~20 seconds.'` | `'Preparing your coaching feedback… This takes about 20 seconds.'` | Personal, supportive |
| 2301 | `{ label: 'Score Error', tone: 'danger' }` | `{ label: 'Feedback unavailable', tone: 'danger' }` | Less alarming |
| 2303 | `'Scoring failed.'` | `'Unable to prepare feedback. Your practice session was still valuable.'` | Validates effort even on error |
| 2592 | `'Restart interview'` | `'Restart Practice'` | Consistent (drawer version) |
| 2643 | `'Questions will appear after setup.'` | `'Practice topics will appear after sharing your background.'` | Warmer language |
| 2650 | `'Interview Questions'` | `'Practice Topics'` | Panel title - core reframe |
| 2651 | `'Generated from the resume and role. Hover to see insights.'` | `'Personalized from your background. Hover for coaching tips.'` | Personal, coaching-focused |
| 2667 | `'Hover a question to see insights.'` | `'Hover a topic to see coaching tips.'` | Consistent terminology |
| 2680 | `'Hover a question to see why it is asked and which resume cues to use.'` | `'Hover a topic to see coaching tips and which experiences to draw from.'` | Removes test framing |
| 2828 | `'Score Summary'` | `'Session Insights'` | Panel title - removes "score" |
| 2829 | `'Full transcript and coaching highlights.'` | `'Your coaching feedback and practice highlights.'` | Personal, consistent |
| 3358 | `'Session loaded. Start the session when ready.'` | `'Session loaded. Begin when you feel ready.'` | Reduces pressure |

### File: `app/templates/index.html`

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 6 | `<title>PrepTalk Interview Coach</title>` | `<title>PrepTalk Practice Coach</title>` | Browser tab reflects positioning |
| 12 | `aria-label="PrepTalk Interview Coach"` | `aria-label="PrepTalk Practice Coach"` | Screen reader announces correctly |

### File: `tests/components/voice-layout.test.js`

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 25 | `'Interview Questions'` | `'Practice Topics'` | Test expects new panel title |
| 28 | `'Score Summary'` | `'Session Insights'` | Test expects new panel title |

### File: `tests/components/scoring-ui.test.js`

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 65 | `toContain('Scoring')` | `toContain('Preparing your coaching feedback')` | Test expects new progress message |

### File: `tests/components/app-entry.test.js`

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 19 | `'<title>PrepTalk Interview Coach</title>'` | `'<title>PrepTalk Practice Coach</title>'` | Test expects new page title |

---

## Test Verification

| Suite | Result |
|-------|--------|
| Unit tests (Vitest) | 64/64 passed |
| E2E tests (Playwright) | 12/12 passed (relevant tests) |

---

## Specialist Sign-offs

| Specialist | Verdict | Report |
|------------|---------|--------|
| Frontend Development | PASS | `20260203-frontend-revalidation.md` |
| UX | PASS | `20260203-ux-revalidation.md` |

---

## Key Terminology Changes

| Old Term | New Term | Occurrences Changed |
|----------|----------|---------------------|
| Interview | Practice | 8 |
| Questions | Practice Topics | 6 |
| Generate | Prepare | 4 |
| Score/Scoring | Feedback/Insights | 6 |
| Start | Begin | 2 |

---

*Manifest generated: 2026-02-03*
*For questions: Review audit reports in `docs/audits/`*
