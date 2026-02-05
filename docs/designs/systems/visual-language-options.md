# PrepTalk Visual Language Options

Three distinct design system directions for transforming PrepTalk from "software dashboard" to "calming coach."

---

## Direction 1: Serene Coach

**Mood:** Peaceful, trustworthy, grounded
**Inspiration:** Calm app meets professional coaching
**Tagline:** "One breath at a time"

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#2D5A47` | Primary actions, links, focus states |
| `--color-primary-hover` | `#234839` | Button hover states |
| `--color-primary-light` | `#E8F2ED` | Primary subtle backgrounds |
| `--color-secondary` | `#6B8A7A` | Secondary buttons, supporting UI |
| `--color-secondary-hover` | `#5A7668` | Secondary hover states |
| `--color-background` | `#FAFBFA` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-raised` | `#F5F7F6` | Elevated surfaces, hover states |
| `--color-ink` | `#1A2B23` | Primary text |
| `--color-muted` | `#5C6B63` | Secondary text, captions |
| `--color-border` | `#E2E8E4` | Dividers, input borders |
| `--color-success` | `#3D8B6A` | Celebration, completion |
| `--color-success-light` | `#E5F4EC` | Success backgrounds |
| `--color-accent` | `#B8956B` | Warm highlights, progress |
| `--color-accent-light` | `#FBF6F0` | Accent backgrounds |
| `--color-danger` | `#C75D5D` | Errors, destructive actions |
| `--color-danger-light` | `#FCEAEA` | Error backgrounds |

### Typography

**Heading Font:** [Fraunces](https://fonts.google.com/specimen/Fraunces)
- Variable font with optical sizing
- Warm, friendly serifs suggest trust and expertise
- Use "Soft" axis for gentler curves

**Body Font:** [Inter](https://fonts.google.com/specimen/Inter)
- Highly legible at all sizes
- Professional without being cold
- Excellent for UI text

**Monospace:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- Timestamps, technical details

#### Type Scale

| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Display | Fraunces | 48px | 500 | 1.1 | -0.02em |
| H1 | Fraunces | 36px | 500 | 1.2 | -0.015em |
| H2 | Fraunces | 28px | 500 | 1.25 | -0.01em |
| H3 | Inter | 20px | 600 | 1.3 | -0.005em |
| Body Large | Inter | 18px | 400 | 1.6 | 0 |
| Body | Inter | 16px | 400 | 1.6 | 0 |
| Body Small | Inter | 14px | 400 | 1.5 | 0 |
| Caption | Inter | 12px | 500 | 1.4 | 0.02em |
| Label | Inter | 11px | 600 | 1.3 | 0.08em |

### Spacing System

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Icon gaps, tight spacing |
| `--space-sm` | 8px | Button icon gap, list item gaps |
| `--space-md` | 16px | Component padding, element gaps |
| `--space-lg` | 24px | Section padding, card padding |
| `--space-xl` | 32px | Major section breaks |
| `--space-2xl` | 48px | Page sections, hero spacing |
| `--space-3xl` | 64px | Major layout divisions |

**Component padding:**
- Button: 14px 24px (default), 10px 18px (small), 18px 32px (large)
- Card: 24px
- Input: 12px 16px
- Modal: 32px

**Section margins:**
- Between related items: 16px
- Between sections: 32px
- Between major sections: 48px

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Pills, tags, small elements |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 16px | Cards, panels |
| `--radius-xl` | 24px | Modal, large containers |
| `--radius-full` | 9999px | Avatars, circular buttons |

### Shadows

```css
/* Subtle, naturalistic shadows */
--shadow-sm: 0 1px 2px rgba(26, 43, 35, 0.04),
             0 2px 4px rgba(26, 43, 35, 0.02);

--shadow-md: 0 2px 4px rgba(26, 43, 35, 0.04),
             0 4px 12px rgba(26, 43, 35, 0.06);

--shadow-lg: 0 4px 8px rgba(26, 43, 35, 0.04),
             0 8px 24px rgba(26, 43, 35, 0.08),
             0 16px 48px rgba(26, 43, 35, 0.06);

--shadow-focus: 0 0 0 3px rgba(45, 90, 71, 0.2);
```

### Micro-interactions

**Button Hover:**
```css
.btn-primary:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Card Hover:**
```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-light);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Success Animation:**
- Gentle checkmark draw (300ms ease-out)
- Soft green background pulse (400ms)
- Text fades in from below (200ms delay, 300ms duration)
- Concept: Like a plant sprouting - organic, unhurried growth

**Loading State:**
- Three dots breathing (scale 1.0 to 1.2)
- Staggered timing (100ms offset each)
- Opacity pulse 0.5 to 1.0
- Duration: 1200ms loop
- Concept: Gentle breathing rhythm, calming

### Visual Identity Elements

- **Illustrations:** Soft, organic line drawings with subtle gradients
- **Icons:** Rounded stroke icons (2px), slightly soft corners
- **Imagery:** Nature-inspired textures, soft light photography
- **Patterns:** Subtle topographic or wave patterns as backgrounds

---

## Direction 2: Warm Encourager

**Mood:** Friendly, playful, celebrating
**Inspiration:** Headspace meets Duolingo
**Tagline:** "You've got this!"

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#E86F5C` | Primary actions, celebration |
| `--color-primary-hover` | `#D45A48` | Button hover states |
| `--color-primary-light` | `#FDF0EE` | Primary subtle backgrounds |
| `--color-secondary` | `#5B9AA0` | Secondary buttons, supporting UI |
| `--color-secondary-hover` | `#4A858A` | Secondary hover states |
| `--color-background` | `#FFFBF8` | Page background (warm cream) |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-raised` | `#FFF7F2` | Elevated surfaces |
| `--color-ink` | `#2D2926` | Primary text (warm black) |
| `--color-muted` | `#6B6560` | Secondary text |
| `--color-border` | `#EDE6E0` | Dividers, input borders |
| `--color-success` | `#5DAE8B` | Completion, green checkmarks |
| `--color-success-light` | `#E8F6F0` | Success backgrounds |
| `--color-accent` | `#F4B860` | Badges, rewards, highlights |
| `--color-accent-light` | `#FEF9EE` | Accent backgrounds |
| `--color-tertiary` | `#8B7EC8` | Purple for variety, special moments |
| `--color-tertiary-light` | `#F5F3FB` | Tertiary backgrounds |
| `--color-danger` | `#E05252` | Errors only |
| `--color-danger-light` | `#FEF0F0` | Error backgrounds |

### Typography

**Heading Font:** [Nunito](https://fonts.google.com/specimen/Nunito)
- Rounded terminals feel friendly and approachable
- Maintains professionalism while being warm
- Excellent for display and UI text

**Body Font:** [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans)
- Pairs perfectly with Nunito
- Clean and highly readable
- Slightly warmer than neutral sans-serifs

**Monospace:** [Source Code Pro](https://fonts.google.com/specimen/Source+Code+Pro)
- Friendly but professional monospace

#### Type Scale

| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Display | Nunito | 52px | 700 | 1.15 | -0.02em |
| H1 | Nunito | 40px | 700 | 1.2 | -0.015em |
| H2 | Nunito | 30px | 700 | 1.25 | -0.01em |
| H3 | Nunito | 22px | 600 | 1.3 | 0 |
| Body Large | Nunito Sans | 18px | 400 | 1.65 | 0.005em |
| Body | Nunito Sans | 16px | 400 | 1.65 | 0.005em |
| Body Small | Nunito Sans | 14px | 400 | 1.55 | 0.005em |
| Caption | Nunito Sans | 12px | 600 | 1.4 | 0.03em |
| Label | Nunito | 11px | 700 | 1.3 | 0.1em |

### Spacing System

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Compact spacing |
| `--space-md` | 16px | Standard gaps |
| `--space-lg` | 24px | Component padding |
| `--space-xl` | 36px | Section breaks |
| `--space-2xl` | 56px | Major sections |
| `--space-3xl` | 80px | Page-level spacing |

**Component padding:**
- Button: 16px 28px (default), 12px 20px (small), 20px 36px (large)
- Card: 28px
- Input: 14px 18px
- Modal: 36px

**Section margins:**
- Between related items: 16px
- Between sections: 36px
- Between major sections: 56px

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 12px | Pills, tags |
| `--radius-md` | 16px | Buttons, inputs |
| `--radius-lg` | 24px | Cards, panels |
| `--radius-xl` | 32px | Modal, hero sections |
| `--radius-full` | 9999px | Avatars, badges |

### Shadows

```css
/* Warm, friendly shadows with subtle color */
--shadow-sm: 0 2px 4px rgba(45, 41, 38, 0.06),
             0 1px 2px rgba(232, 111, 92, 0.04);

--shadow-md: 0 4px 8px rgba(45, 41, 38, 0.06),
             0 8px 16px rgba(232, 111, 92, 0.06);

--shadow-lg: 0 8px 16px rgba(45, 41, 38, 0.08),
             0 16px 32px rgba(232, 111, 92, 0.08),
             0 24px 48px rgba(45, 41, 38, 0.04);

--shadow-focus: 0 0 0 4px rgba(232, 111, 92, 0.25);
```

### Micro-interactions

**Button Hover:**
```css
.btn-primary:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.02);
  box-shadow: var(--shadow-md);
  transition: all 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Card Hover:**
```css
.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: var(--shadow-lg);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Success Animation:**
- Celebratory confetti burst (8-12 particles)
- Badge/star scales up with bounce (400ms, overshoot easing)
- Background ripple effect in success color
- Sound: Optional soft "ding" chime
- Concept: Mini celebration - you earned something!

**Loading State:**
- Bouncing dot animation (slight vertical movement)
- Colors cycle through palette (primary, secondary, accent)
- Each dot offset by 120ms
- Duration: 800ms loop
- Concept: Playful anticipation

### Visual Identity Elements

- **Illustrations:** Flat, geometric characters with warm expressions
- **Icons:** Filled icons with rounded corners, 2px stroke option
- **Imagery:** Bright, optimistic photography with warm tones
- **Patterns:** Playful geometric shapes, dots, soft blobs as accents

---

## Direction 3: Confident Minimalist

**Mood:** Clean, confident, premium
**Inspiration:** Linear meets Apple
**Tagline:** "Prepared. Polished. Professional."

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#1A1A1A` | Primary actions, strong emphasis |
| `--color-primary-hover` | `#333333` | Button hover states |
| `--color-primary-light` | `#F5F5F5` | Subtle backgrounds |
| `--color-secondary` | `#666666` | Secondary buttons |
| `--color-secondary-hover` | `#555555` | Secondary hover |
| `--color-background` | `#FFFFFF` | Page background |
| `--color-surface` | `#FAFAFA` | Cards, panels |
| `--color-surface-raised` | `#F5F5F5` | Elevated surfaces |
| `--color-ink` | `#111111` | Primary text |
| `--color-muted` | `#737373` | Secondary text |
| `--color-border` | `#E5E5E5` | Dividers, subtle borders |
| `--color-border-strong` | `#D4D4D4` | Input borders, emphasized dividers |
| `--color-success` | `#10B981` | Completion states |
| `--color-success-light` | `#ECFDF5` | Success backgrounds |
| `--color-accent` | `#6366F1` | Interactive highlights, links |
| `--color-accent-hover` | `#4F46E5` | Accent hover |
| `--color-accent-light` | `#EEF2FF` | Accent backgrounds |
| `--color-danger` | `#EF4444` | Errors |
| `--color-danger-light` | `#FEF2F2` | Error backgrounds |

### Typography

**Heading Font:** [Inter](https://fonts.google.com/specimen/Inter)
- Clean, modern, highly versatile
- Excellent for all sizes
- Variable font with optical sizing

**Body Font:** [Inter](https://fonts.google.com/specimen/Inter)
- Same family for cohesion
- Adjust weights for hierarchy
- System font stack as fallback

**Monospace:** [SF Mono](https://developer.apple.com/fonts/) or [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- Clean, technical feel

#### Type Scale

| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Display | Inter | 56px | 600 | 1.05 | -0.025em |
| H1 | Inter | 40px | 600 | 1.1 | -0.02em |
| H2 | Inter | 28px | 600 | 1.15 | -0.015em |
| H3 | Inter | 20px | 600 | 1.2 | -0.01em |
| Body Large | Inter | 17px | 400 | 1.6 | -0.005em |
| Body | Inter | 15px | 400 | 1.6 | -0.005em |
| Body Small | Inter | 13px | 400 | 1.55 | 0 |
| Caption | Inter | 12px | 500 | 1.4 | 0.01em |
| Label | Inter | 11px | 500 | 1.3 | 0.05em |

### Spacing System

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Minimal gaps |
| `--space-sm` | 8px | Tight spacing |
| `--space-md` | 12px | Compact gaps |
| `--space-lg` | 20px | Standard padding |
| `--space-xl` | 32px | Section breaks |
| `--space-2xl` | 48px | Major sections |
| `--space-3xl` | 72px | Page divisions |

**Component padding:**
- Button: 10px 20px (default), 8px 14px (small), 14px 28px (large)
- Card: 20px
- Input: 10px 14px
- Modal: 28px

**Section margins:**
- Between related items: 12px
- Between sections: 32px
- Between major sections: 48px

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Subtle rounding |
| `--radius-md` | 8px | Buttons, inputs, tags |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Modal, containers |
| `--radius-full` | 9999px | Avatars only |

### Shadows

```css
/* Crisp, precise shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);

--shadow-md: 0 1px 3px rgba(0, 0, 0, 0.06),
             0 4px 8px rgba(0, 0, 0, 0.04);

--shadow-lg: 0 2px 4px rgba(0, 0, 0, 0.04),
             0 8px 16px rgba(0, 0, 0, 0.06),
             0 16px 32px rgba(0, 0, 0, 0.04);

--shadow-focus: 0 0 0 2px #FFFFFF, 0 0 0 4px var(--color-accent);
```

### Micro-interactions

**Button Hover:**
```css
.btn-primary:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-sm);
  transition: all 150ms ease-out;
}
/* Subtle opacity change rather than movement */
.btn-secondary:hover {
  opacity: 0.8;
  transition: opacity 150ms ease-out;
}
```

**Card Hover:**
```css
.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transition: all 200ms ease-out;
}
/* No transform - stays grounded */
```

**Success Animation:**
- Clean checkmark appears (instant, no draw)
- Border flashes accent color (200ms)
- Text simply appears (fade 150ms)
- Concept: Instant acknowledgment - efficient, confident

**Loading State:**
- Single thin line sweeping (linear gradient)
- Monochrome (dark gray)
- Duration: 1000ms loop
- Concept: Progress bar feel - professional, predictable

### Visual Identity Elements

- **Illustrations:** Minimal line art or abstract geometric shapes
- **Icons:** Stroke icons (1.5px), consistent weight, no fills
- **Imagery:** Monochrome or limited palette photography
- **Patterns:** None or extremely subtle grid patterns

---

## Comparison Matrix

| Aspect | Serene Coach | Warm Encourager | Confident Minimalist |
|--------|--------------|-----------------|---------------------|
| **Emotional tone** | Peaceful, grounded | Friendly, celebratory | Professional, clean |
| **Color warmth** | Cool-warm (sage) | Warm (coral/cream) | Neutral (grayscale + indigo) |
| **Border radius** | Medium (12-16px) | Large (16-24px) | Small (4-12px) |
| **Shadows** | Soft, diffused | Warm, colored | Crisp, minimal |
| **Typography** | Serif + sans | Rounded sans | Modern sans only |
| **Animations** | Organic, slow | Bouncy, playful | Subtle, fast |
| **Best for** | Users seeking calm | Users seeking encouragement | Users seeking efficiency |
| **Risk** | Too medical/therapy | Too casual | Too corporate |
| **Inspiration** | Calm, Headspace | Duolingo, Notion | Linear, Stripe, Apple |

---

## Implementation Notes

### CSS Custom Properties Template

```css
:root {
  /* Copy color values from chosen direction */

  /* Typography */
  --font-heading: /* heading font stack */;
  --font-body: /* body font stack */;
  --font-mono: /* monospace font stack */;

  /* Spacing */
  --space-unit: 4px;
  --space-xs: calc(var(--space-unit) * 1);
  --space-sm: calc(var(--space-unit) * 2);
  --space-md: calc(var(--space-unit) * 4);
  --space-lg: calc(var(--space-unit) * 6);
  --space-xl: calc(var(--space-unit) * 8);
  --space-2xl: calc(var(--space-unit) * 12);
  --space-3xl: calc(var(--space-unit) * 16);

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
  --transition-slow: 300ms ease-out;
  --transition-bounce: 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Google Fonts Import

```html
<!-- Direction 1: Serene Coach -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">

<!-- Direction 2: Warm Encourager -->
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700&family=Nunito+Sans:wght@400;600&family=Source+Code+Pro&display=swap" rel="stylesheet">

<!-- Direction 3: Confident Minimalist -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
```

---

## Recommendation

Based on PrepTalk's strategic positioning as a "confidence builder" that acts as a "coach, not judge":

**Primary Recommendation: Direction 1 (Serene Coach)** with selective elements from Direction 2.

**Rationale:**
1. Sage green palette aligns with "calm coach" positioning without feeling medical
2. Fraunces headings add warmth and trustworthiness
3. Organic animations reduce anxiety
4. Professional enough for job preparation context
5. Differentiates from typical productivity tools

**Consider adding from Direction 2:**
- Success celebration animations (confetti on session complete)
- Warmer accent color for progress indicators
- Slightly more rounded border radius on buttons

**Avoid from Direction 3:**
- Grayscale palette (too cold for confidence-building)
- Minimal animations (users need emotional feedback)
- Ultra-small radius (feels corporate, not coaching)

---

*Document created: 2026-02-03*
*For: PrepTalk Visual Language System*
