# Tasks: 20260203-teach-first

## Phase 0: Foundation (A11y Blockers) - COMPLETE
- [x] Add `:focus-visible` to all interactive elements (components.css)
- [x] Add `aria-live="polite"` to status regions (ui.js) - statusPill, turnHelp
- [x] Add skip-to-main link (index.html)
- [x] Add `@media (prefers-reduced-motion)` (components.css)
- [x] All 57 unit tests passing

## Phase 1: Learning Mode Core
- [ ] Create Learning Card component (ui.js)
  - Resume fact section
  - Example answer section
  - "Why this works" explanation
- [ ] Add "Show Example First" toggle (ui.js)
  - Default ON for new users
  - Persist in localStorage
- [ ] Build example generation API call (api/client.js)
  - Or mock with static examples initially
- [ ] Add "I'm Ready to Practice" CTA (ui.js)
- [ ] Implement split panel layout for resume cues (components.css)

## Phase 2: Journey Reframing
- [ ] Update Arrival copy: "Let's prepare together"
- [ ] Update Setup copy: "Share your background"
- [ ] Update Questions heading: "Practice Topics"
- [ ] Update Feedback order: "What you did well" first
- [ ] Update Completion copy: "Here's how you've grown"

## Phase 3: Design System (Tailwind + DaisyUI)
- [ ] Install Tailwind CSS and DaisyUI
- [ ] Configure Nordic Warmth custom theme
  - Light wood tones (birch: #F5F0E8, oak: #E8DFD0)
  - Soft cream backgrounds (#FEFDFB, #FAF8F5)
  - Muted blue-gray accents (#6B7B8A, #8A9BA8)
  - Warm text (#3D3A36)
- [ ] Migrate components from custom CSS to Tailwind/DaisyUI
- [ ] Add dark mode theme variant
- [ ] Remove legacy components.css (or keep as fallback)

## Phase 4: Remaining A11y
- [ ] Add `aria-describedby` to form inputs (ui.js)
- [ ] Implement modal focus trap (ui.js)
- [ ] Add Escape handler for drawer (ui.js)
- [ ] Fix event listener cleanup (ui.js)
- [ ] Add AudioContext mutex (ui.js)

## Phase 5: Testing & Polish
- [ ] Unit tests for Learning Card (Vitest)
- [ ] E2E tests for teach-first flow (Playwright)
- [ ] Manual keyboard navigation test
- [ ] Screen reader testing (VoiceOver/NVDA)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

## Verification Commands
```bash
# Unit tests
./run.sh test

# E2E tests
./run.sh e2e

# Manual verification checklist
# 1. Tab through all elements - focus visible?
# 2. VoiceOver on, trigger status change - announced?
# 3. Toggle learning mode - example shows first?
# 4. Check dark mode preference
# 5. Check reduced motion preference
```
