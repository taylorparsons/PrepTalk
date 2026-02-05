# Feature Spec: 20260203-teach-first

Status: In Progress
Created: 2026-02-03 21:00
Inputs: CR-20260203-2100
Decisions: D-20260203-2100

## Summary
Transform PrepTalk from interview simulator to confidence builder by implementing teach-first coaching: show resume-grounded examples BEFORE presenting questions, enabling users to know which story to tell before being asked.

## User Stories & Acceptance

### US1: Learning Mode (Priority: P1)
Narrative:
- As a candidate, I want to see a resume-grounded example answer BEFORE the interview question, so I know which story to tell and don't freeze.

Acceptance scenarios:
1. Given a question is about to be presented, When "Show Example First" is ON, Then a Learning Card displays first with: resume fact, example answer based on that fact, and "why this works" explanation. (Verifies: FR-001)
2. Given the Learning Card is visible, When the user clicks "I'm Ready to Practice", Then the actual question is presented. (Verifies: FR-002)
3. Given Learning Mode is ON, When the user completes the learning phase, Then they transition to practice with confidence. (Verifies: FR-001, FR-002)

### US2: Learning Mode Toggle (Priority: P1)
Narrative:
- As a candidate, I want to toggle Learning Mode on or off, so I can choose my preferred learning style.

Acceptance scenarios:
1. Given a new user arrives, When settings are loaded, Then "Show Example First" defaults to ON. (Verifies: FR-003)
2. Given the toggle is changed, When the user refreshes, Then the preference persists via localStorage. (Verifies: FR-003)
3. Given "Show Example First" is OFF, When a question is presented, Then the question appears directly without the Learning Card. (Verifies: FR-003)

### US3: Resume Context During Practice (Priority: P1)
Narrative:
- As a candidate, I want to see relevant resume cues while answering, so I can reference my experiences.

Acceptance scenarios:
1. Given the practice phase is active, When the user is answering, Then a split panel shows relevant resume excerpts. (Verifies: FR-004)
2. Given no relevant resume excerpts exist, When the panel would be empty, Then a helpful message appears. (Verifies: FR-004)

### US4: Journey Reframing (Priority: P2)
Narrative:
- As a candidate, I want the app to feel like a supportive coach, not a judge, so I feel confident practicing.

Acceptance scenarios:
1. Given the Arrival phase, When the user sees the main CTA, Then it reads "Let's prepare together" not "Generate Questions". (Verifies: FR-005)
2. Given the Setup phase, When the user uploads documents, Then copy reads "Share your background". (Verifies: FR-005)
3. Given the Questions phase, When questions are displayed, Then the heading reads "Practice Topics". (Verifies: FR-005)
4. Given feedback is provided, When the user views results, Then "What you did well" appears before areas to improve. (Verifies: FR-005)
5. Given session completion, When the summary appears, Then copy reads "Here's how you've grown". (Verifies: FR-005)

### US5: Nordic Warmth Design System (Priority: P3)
Narrative:
- As a user, I want a warm, welcoming visual design that feels like a supportive coach, not a clinical tool.

Acceptance scenarios:
1. Given the app loads, When CSS is applied, Then Tailwind + DaisyUI with Nordic Warmth palette is used throughout. (Verifies: FR-006)
2. Given the user prefers dark mode, When the app loads, Then dark mode colors are applied. (Verifies: FR-007)

Design Direction: Nordic Warmth (Scandinavian hygge)
- Light wood tones (birch, oak)
- Soft cream backgrounds
- Muted blue-gray accents
- Clean, minimalist typography
- Generous whitespace
- Steve Jobs would approve: simple, elegant, purposeful

### US6: Accessibility Foundation (Priority: P0)
Narrative:
- As a user with accessibility needs, I want the app to be navigable via keyboard and screen reader, so I can use it effectively.

Acceptance scenarios:
1. Given any interactive element, When it receives focus, Then a visible focus indicator appears. (Verifies: FR-008)
2. Given status changes occur, When content updates, Then screen readers announce the change. (Verifies: FR-009)
3. Given the page loads, When the user presses Tab, Then a skip-to-main link appears. (Verifies: FR-010)
4. Given the user prefers reduced motion, When animations would play, Then they are minimized or disabled. (Verifies: FR-011)

## Requirements

Functional requirements:
- FR-001: Learning Card displays resume fact + example answer + "why this works" before each question when "Show Example First" is ON. (Sources: CR-20260203-2100, D-20260203-2100)
- FR-002: "I'm Ready to Practice" CTA transitions from Learning Card to practice phase. (Sources: CR-20260203-2100, D-20260203-2100)
- FR-003: "Show Example First" toggle defaults ON for new users, persists in localStorage. (Sources: CR-20260203-2100, D-20260203-2100)
- FR-004: Split panel shows relevant resume cues during answer phase. (Sources: CR-20260203-2100, D-20260203-2100)
- FR-005: Journey messaging reflects coach (not judge) positioning across all 5 phases. (Sources: CR-20260203-2100, D-20260203-2100)
- FR-006: Tailwind CSS + DaisyUI with Nordic Warmth palette (light wood, soft cream, muted blue-gray). (Sources: CR-20260203-2100)
- FR-007: Dark mode support via DaisyUI theme switching. (Sources: CR-20260203-2100)
- FR-008: `:focus-visible` outline on all interactive elements. (Sources: CR-20260203-2100)
- FR-009: `aria-live="polite"` on status regions for screen reader announcements. (Sources: CR-20260203-2100)
- FR-010: Skip-to-main link for keyboard navigation. (Sources: CR-20260203-2100)
- FR-011: `@media (prefers-reduced-motion)` support for motion-sensitive users. (Sources: CR-20260203-2100)

## Edge cases
- If no resume evidence matches a question, Learning Card shows generic coaching guidance. (Verifies: FR-001)
- If localStorage is unavailable, toggle preference resets to default ON on each visit. (Verifies: FR-003)
- If resume excerpts are empty, split panel shows "Your resume will be analyzed for relevant experiences." (Verifies: FR-004)

## Technical Notes
- Learning Card component: factory function in ui.js
- Toggle state: localStorage key `preptalk_show_example_first`
- Split panel: CSS grid layout with resume cues on left/right depending on viewport
- Color tokens: CSS custom properties in components.css
- Backend dependency: Example generation API may need to be mocked initially
