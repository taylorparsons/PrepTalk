# PrepTalk Frontend Execution Plan

**Date:** 2026-02-03 | **Branch:** `feature/jennifer-dev` | **Approved Direction:** Option A (Learning Mode)

---

## RALPH Traceability

### Documents to Update
|Document|Action|
|--------|------|
|`docs/requests.md`|Append CR-20260203-2100 (teach-first coaching)|
|`docs/decisions.md`|Append D-20260203-2100 (Option A approval)|
|`docs/specs/20260203-teach-first/spec.md`|Create new spec|
|`docs/specs/20260203-teach-first/tasks.md`|Create task checklist|
|`docs/PRD.md`|Update requirements section|

### Decision Entry (to append to decisions.md)
```markdown
## D-20260203-2100
Date: 2026-02-03 21:00
Inputs: CR-20260203-2100
PRD: Core user flow, Next / backlog

Decision:
Implement Option A (Learning Mode) for teach-first coaching: show resume-grounded examples BEFORE presenting each question, enabling users to know which story to tell before being asked.

Rationale:
Target users freeze because they don't know which story to tell, not because they lack experience (ACCESS gap, not knowledge gap). Showing the example first prevents the freeze rather than rescuing from it. This aligns with proven pedagogy: "I do, we do, you do."

Alternatives considered:
- Option B: Proactive Guidance (rejected: requires hesitation detection tuning, still allows freeze to occur)
- Option C: Always-Visible Context (incorporated: split panel with resume cues will be part of practice phase)
- Keep current test-first model (rejected: positions PrepTalk as simulator, not coach)

Acceptance / test:
- Learning Card component shows resume fact + example answer + "why this works" before each question
- "Show Example First" toggle defaults ON for new users
- Split panel displays resume cues during answer phase
- Messaging across all 5 journey phases reflects teach-first positioning
```

### Spec Reference (20260203-teach-first)
```
Feature Spec: 20260203-teach-first
Status: Planning
Created: 2026-02-03 21:00
Inputs: CR-20260203-2100
Decisions: D-20260203-2100

Summary:
Transform practice phase from test-first to teach-first by showing resume-grounded examples before questions.

User Stories:
- US1: Learning Mode (P1) - See example before question
- US2: Resume Context (P1) - Always-visible cues during practice
- US3: Journey Reframing (P2) - Updated messaging across all phases
- US4: Garnet Design System (P3) - New color palette implementation

Functional Requirements:
- FR-001: Learning Card displays resume fact, example answer, and "why this works" (Sources: D-20260203-2100)
- FR-002: "Show Example First" toggle defaults ON, persists in localStorage (Sources: D-20260203-2100)
- FR-003: Split panel shows relevant resume cues during answer phase (Sources: D-20260203-2100)
- FR-004: Journey messaging reflects coach (not judge) positioning (Sources: D-20260203-2100)
```

---

## Executive Summary

Transform PrepTalk from interview simulator to confidence builder using the **teach-first** coaching model. Show users resume-grounded examples BEFORE asking questions, preventing the freeze that occurs when users don't know which story to tell.

---

## Decision Matrix

|Option|Description|Decision|
|------|-----------|--------|
|A|Learning Mode - Example before question|**APPROVED** (Taylor)|
|B|Proactive Guidance - Detect hesitation|Deferred|
|C|Always-Visible Context - Split panel|Incorporated into A|

---

## Execution Phases

### Phase 0: Foundation (Pre-requisite)
**Goal:** Fix critical blockers before new feature work

|Task|File|Issue #|Effort|
|----|-----|-------|------|
|Add `:focus-visible` to all interactive elements|components.css|#1|2 hrs|
|Add `aria-live="polite"` to status regions|ui.js|#3|2 hrs|
|Add skip-to-main link|index.html|#5|30 min|
|Add `@media (prefers-reduced-motion)`|components.css|#12|1 hr|

**Verification:** Keyboard nav test, VoiceOver announces status changes

---

### Phase 1: Learning Mode Core
**Goal:** Implement teach-first flow for practice phase

|Task|File|Description|
|----|-----|-----------|
|Create Learning Card component|ui.js|Shows resume fact + example answer + why it works|
|Add "Show Example First" toggle|ui.js|User preference, default ON for new users|
|Build example generation API call|api/client.js|Request resume-grounded example for question|
|Add "I'm Ready to Practice" CTA|ui.js|Transition from learning to practice|
|Implement split panel layout|components.css|Resume cues visible during answer|

**Storyboard Reference:** Screens 04-learning.png, 05-practice.png

---

### Phase 2: Journey Reframing
**Goal:** Update messaging across all phases

|Phase|Current Copy|New Copy|File|
|-----|------------|--------|-----|
|Arrival|"Generate Questions"|"Let's prepare together"|ui.js|
|Setup|"Upload resume"|"Share your background"|ui.js|
|Questions|"Interview Questions"|"Practice Topics"|ui.js|
|Feedback|Score display|"What you did well" first|ui.js|
|Complete|"Session complete"|"Here's how you've grown"|ui.js|

**Storyboard Reference:** All 7 screens in `docs/diagrams/storyboard/`

---

### Phase 3: Design System
**Goal:** Implement garnet palette + fix hardcoded colors

|Task|File|Description|
|----|-----|-----------|
|Add garnet color tokens|components.css|50/100/200/300/500/700/900 scale|
|Replace 28+ hardcoded colors|components.css|Use tokens throughout|
|Add semantic tokens|components.css|warning, success, info variants|
|Add dark mode support|components.css|`@media (prefers-color-scheme: dark)`|

**Palette:**
```css
--ui-color-garnet-50: #F5E5E4;
--ui-color-garnet-500: #9A2A2A;  /* Primary */
--ui-color-garnet-900: #3D1111;
```

---

### Phase 4: Accessibility Fixes
**Goal:** Resolve remaining audit issues

|Task|File|Issue #|
|----|-----|-------|
|Add `aria-describedby` to form inputs|ui.js|#7|
|Implement modal focus trap|ui.js|#8|
|Add Escape handler for drawer|ui.js|#9|
|Fix event listener cleanup|ui.js|#2|
|Add AudioContext mutex|ui.js|#4|

---

### Phase 5: Polish & Testing
**Goal:** QA and refinement

|Task|Description|
|----|-----------|
|Unit tests for Learning Card|Vitest component tests|
|E2E tests for teach-first flow|Playwright scenarios|
|Manual keyboard navigation|Full tab-through test|
|Screen reader testing|VoiceOver/NVDA verification|
|Cross-browser testing|Chrome, Safari, Firefox|

---

## Files to Modify

|File|Phases|Lines of Change (est)|
|----|------|---------------------|
|`app/static/css/components.css`|0,3,4|+200, -50|
|`app/static/js/ui.js`|0,1,2,4|+500, -100|
|`app/templates/index.html`|0|+10|
|`app/static/js/api/client.js`|1|+30|
|`tests/components/`|5|+150|
|`tests/e2e/`|5|+100|

---

## Dependencies

```
Phase 0 (Foundation)
    ↓
Phase 1 (Learning Mode) ←── Requires backend example generation API
    ↓
Phase 2 (Journey Reframing)
    ↓
Phase 3 (Design System)
    ↓
Phase 4 (A11y Fixes)
    ↓
Phase 5 (Polish)
```

**Backend Dependency:** Phase 1 requires an API endpoint to generate resume-grounded examples. If not available, can mock with static examples initially.

---

## Success Criteria

|Metric|Target|
|------|------|
|WCAG 2.1 AA compliance|Pass automated + manual audit|
|Keyboard navigation|All features accessible via keyboard|
|Screen reader|Status changes announced|
|Learning mode adoption|>70% of new users keep it ON|
|Session completion|Increase from baseline|

---

## Assets Ready

|Asset|Location|Status|
|-----|--------|------|
|Storyboard wireframes (7)|`docs/diagrams/storyboard/*.png`|Complete|
|Strategic proposal DOCX|`docs/PrepTalk_UI_UX_Proposal.docx`|Complete|
|UI audit report|This document (above)|Complete|
|Garnet palette|Defined above|Ready|
|Component mapping|Defined above|Ready|

---

## Risk Mitigation

|Risk|Mitigation|
|----|----------|
|Backend API not ready|Mock example generation, iterate when ready|
|Scope creep|Phase 0-1 are MVP, phases 2-5 can be trimmed|
|Regression bugs|Run full test suite after each phase|
|User confusion|A/B test learning mode vs current flow|

---

## Immediate Next Steps

### Step 0: RALPH Documentation (Required First)
1. Append CR-20260203-2100 to `docs/requests.md`
2. Append D-20260203-2100 to `docs/decisions.md`
3. Create `docs/specs/20260203-teach-first/spec.md`
4. Create `docs/specs/20260203-teach-first/tasks.md`

### Step 1: Phase 0 - Foundation
5. Fix critical a11y issues (4-6 hours)
6. Run tests to verify no regressions

### Step 2: Phase 1 - Learning Mode Core
7. Create Learning Card component
8. Add "Show Example First" toggle
9. Implement split panel layout

### Step 3: Phase 2 - Journey Reframing
10. Update copy across all 5 phases
11. Test messaging consistency

---

## Verification Commands

```bash
# Unit tests
./run.sh test

# E2E tests
./run.sh e2e

# Manual verification
# 1. Tab through all elements (focus visible?)
# 2. Open VoiceOver, trigger status change (announced?)
# 3. Toggle learning mode, verify example shows first
```

---

*Plan follows RALPH traceability: CR → D → Spec → Implementation*
*Option A (Learning Mode) approved by Taylor.*
