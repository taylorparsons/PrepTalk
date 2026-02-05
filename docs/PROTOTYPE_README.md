# PrepTalk UI/UX Prototype - Summary for Taylor

**Date:** 2026-02-04
**Branch:** `feature/jennifer-dev`
**Prototype:** Option C - "Confident Pro"

---

## Overview

This prototype transforms PrepTalk from an "interview simulator" (test-first) to a "confidence-building practice coach" (teach-first). The design uses Linear/Notion-inspired aesthetics with typography-first approach and margin tooltips.

**Access the prototype:** `/prototype-c`

---

## Key Features Implemented

### 1. Brand Identity
- **Pulsing logo ring** - A breathing animation that feels "caring, grounded" (not a solid fill, but a ring)
- **Serene coach green palette** - `#2D5A47` as primary with full gradient scale
- **Clean typography** - Inter font family, crisp shadows, minimal decorations

### 2. User Journey (5 Screens)
| Screen | Purpose |
|--------|---------|
| Welcome | Warm intro with "Hey, I'm Prep" personality |
| Setup - Resume | Upload resume with sidebar tips |
| Setup - Role | Job URL or paste with context tips |
| Practice | Voice recording with live transcript |
| Insights | Session summary with Starfish feedback |

### 3. Apple Watch-Style Progress Rings
- Three concentric rings: Topics (outer), Questions (middle), Time (inner)
- Each ring has distinct brand color
- **Hover tooltips** show completion percentage

### 4. Starfish Retro Framework
Feedback organized as actionable insights:
| Category | Purpose |
|----------|---------|
| Continue | What's working beautifully |
| Lean into | Strengths to develop further |
| Add | New techniques to try |
| Refine | Areas for subtle improvement |

### 5. Session Persistence
- **LocalStorage** saves session state (`preptalk_session` key)
- **End Session** page explains data storage transparently
- User can keep data for future sessions or delete

### 6. Dark Mode Support
- Full `@media (prefers-color-scheme: dark)` implementation
- Automatically adapts to Mac/iOS night mode settings
- All brand colors have dark-mode variants

### 7. Psychology-Driven Copy
- Warm, coaching tone throughout
- "You already have the stories. Let's find them together."
- Feedback uses growth mindset language
- Time estimates are gentle ("About 15 minutes. Pause anytime.")

---

## Files Created/Modified

### Primary Files
| File | Purpose |
|------|---------|
| `app/templates/prototype-c.html` | Main prototype HTML (788 lines) |
| `app/static/css/prototype-c.css` | Styles with brand tokens (1150+ lines) |
| `app/main.py` | Route `/prototype-c` added |

### Supporting Documentation
| File | Purpose |
|------|---------|
| `docs/UI_CUSTOMIZATION_GUIDE.md` | How to modify branding |
| `docs/PrepTalk_UI_UX_Proposal.docx` | Stakeholder presentation |
| `docs/diagrams/wireframes/*.png` | Journey and option wireframes |

---

## Design Philosophy

### Strategic Positioning (Locked)
| Aspect | Current App | This Prototype |
|--------|-------------|----------------|
| Model | Interview simulator | Confidence builder |
| User problem | "Test me on interview skills" | "I freeze - don't know what story to tell" |
| Differentiator | Practice questions | Resume-grounded coaching |
| Help feature | Emergency rescue | Primary teaching mechanism |

### Core Principles
1. **Coach, Not Judge** - Feedback is guidance, not grades
2. **Teach Before Test** - Show examples before asking questions
3. **Their Story, Not Ours** - Draw from resume, never fabricate
4. **Reduce Anxiety** - Simplify, clear next steps, celebrate progress
5. **Voice-First** - Optimize for speaking, support reading

---

## Testing

The prototype is a static clickable prototype. Core app functionality remains tested:

```bash
# Run unit tests
./run.sh test

# Run E2E tests
./run.sh e2e
```

---

## Next Steps

If implementing beyond prototype:

1. **Phase 1: Learning Mode Core** - Wire up example generation API
2. **Phase 2: Journey Reframing** - Update production app copy
3. **Phase 3: Design System** - Migrate garnet tokens to main CSS
4. **Phase 4: A11y Fixes** - Focus indicators, ARIA, skip links
5. **Phase 5: Polish** - Cross-browser testing, screen reader verification

See `docs/plans/steady-launching-bee.md` for full execution plan.

---

## Quick Reference

| Action | How |
|--------|-----|
| View prototype | Navigate to `/prototype-c` |
| Change brand colors | Edit `:root` variables in `prototype-c.css` |
| Modify copy | Edit text in `prototype-c.html` |
| Add images | See `docs/UI_CUSTOMIZATION_GUIDE.md` |

---

*Generated 2026-02-04 for Taylor's review.*
