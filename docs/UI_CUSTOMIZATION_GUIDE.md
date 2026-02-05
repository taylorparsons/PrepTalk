# PrepTalk UI Customization Guide

This guide explains how to customize the PrepTalk prototype without touching application code. All customizations are made in two files:

| File | What to Customize |
|------|-------------------|
| `app/static/css/prototype-c.css` | Colors, fonts, spacing, animations |
| `app/templates/prototype-c.html` | Text content, links, images |

---

## 1. Brand Colors

All brand colors are defined as CSS custom properties at the top of `prototype-c.css`:

```css
:root {
  /* PRIMARY BRAND COLORS - Change these 5 values to rebrand */
  --brand-primary: #2D5A47;       /* Main action color */
  --brand-primary-dark: #234839;  /* Hover/active state */
  --brand-primary-light: #E8F2ED; /* Light backgrounds */
  --brand-accent: #4A7A65;        /* Secondary green */
}
```

### Location in File
Lines 6-20 of `prototype-c.css`

### Example: Change to Blue Brand
```css
--brand-primary: #2D4A5A;       /* Navy blue */
--brand-primary-dark: #1E3A48;  /* Darker navy */
--brand-primary-light: #E8EDF2; /* Light blue-gray */
--brand-accent: #4A6A7A;        /* Muted blue */
```

---

## 2. Progress Ring Colors

The Apple Watch-style rings use three distinct colors:

```css
/* Lines 21-24 */
--brand-ring-topics: #2D5A47;      /* Outer ring - darkest */
--brand-ring-questions: #5B8A7A;   /* Middle ring - medium */
--brand-ring-time: #8FB5A5;        /* Inner ring - lightest */
```

### Where They Appear
- Session summary on Insights page
- Small ring indicators in sidebar

---

## 3. Starfish Feedback Colors

Each feedback category has its own accent color:

```css
/* Lines 27-31 */
--brand-continue: var(--brand-ring-topics);     /* "Continue" cards */
--brand-lean-into: var(--brand-ring-questions); /* "Lean into" cards */
--brand-try-adding: var(--brand-ring-time);     /* "Add" cards */
--brand-refine: #7A9A8A;                        /* "Refine" cards */
--brand-stop: #A85A5A;                          /* "Stop" cards (warning) */
```

---

## 4. Typography

### Font Families
```css
/* Lines 67-68 */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

To change fonts:
1. Update the Google Fonts link in `prototype-c.html` (lines 7-9)
2. Update the CSS variables above

### Font Sizes
```css
/* Lines 33-39 */
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 13px;
--font-size-base: 14px;
--font-size-lg: 15px;
--font-size-xl: 16px;
```

---

## 5. Logo and Header

### Pulsing Logo Animation
The logo uses a breathing animation at 4-second intervals:

```css
/* Lines 145-148 */
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.08); opacity: 1; }
}
```

To adjust:
- Change `4s` to speed up/slow down
- Change `scale(1.08)` for more/less expansion

### Logo as Image (Instead of Ring)
To replace the pulsing ring with an image logo:

1. In `prototype-c.html`, find line 18:
```html
<div class="logo-pulse" title="PrepTalk is ready to help"></div>
```

2. Replace with:
```html
<img src="/static/images/logo.png" alt="PrepTalk" class="header-logo-img" />
```

3. Add to CSS:
```css
.header-logo-img {
  width: 32px;
  height: 32px;
}
```

### App Name
In `prototype-c.html`, line 19:
```html
<span>PrepTalk</span>
```

---

## 6. Navigation Links

### Header Navigation
In `prototype-c.html`, lines 21-25:
```html
<nav class="header-nav">
  <a href="#" onclick="goToScreen('screen-welcome'); return false;">Home</a>
  <a href="#" onclick="goToScreen('screen-complete'); return false;">Progress</a>
  <a href="#" onclick="showEndSession(); return false;">End Session</a>
</nav>
```

To add external links:
```html
<a href="https://example.com/help" target="_blank">Help</a>
```

---

## 7. Welcome Page Copy

### Main Heading
Line 34:
```html
<h1 class="page-title" style="font-size: 32px;">Hey, I'm Prep</h1>
```

### Tagline
Lines 35-37:
```html
<p class="page-subtitle">
  I'm here to help you see what's already there—practice saying it out loud,
  build confidence in your delivery, and walk in knowing exactly what you'll share.
</p>
```

### Sub-tagline
Lines 39-41:
```html
<p>
  You already have the stories. Let's find them together.
</p>
```

### CTA Button
Lines 43-45:
```html
<button class="btn btn-primary" onclick="goToScreen('screen-setup')">
  Let's get started →
</button>
```

### Footnote
Lines 47-49:
```html
<p class="footnote">
  About 15 minutes. Pause anytime.
</p>
```

---

## 8. Sidebar Tips

Tips appear in the right sidebar during setup. Example from lines 98-115:

```html
<aside class="sidebar">
  <div class="tip-card">
    <p class="tip-title">What we look for</p>
    <ul class="tip-list">
      <li>Job titles and progression</li>
      <li>Projects and achievements</li>
      <li>Skills and technologies</li>
      <li>Education and certifications</li>
    </ul>
  </div>
</aside>
```

### Tip Card Variants
| Class | Purpose |
|-------|---------|
| `.tip-card` | Standard tip (neutral) |
| `.tip-card-accent` | Highlighted tip (green tint) |
| `.tip-card-highlight` | Warm tip (amber tint) |

---

## 9. Feedback Card Content

### Starfish Categories
Each feedback card follows this structure (lines 450-470):

```html
<div class="card starfish-continue">
  <div class="starfish-header">
    <p class="section-title">Continue</p>
    <p class="starfish-explain">These are working beautifully. Keep doing exactly this.</p>
  </div>
  <ul class="feedback-list">
    <li><span class="icon-success">✓</span> Your feedback item here</li>
  </ul>
</div>
```

### Card Classes by Category
| Category | CSS Class |
|----------|-----------|
| Continue | `.starfish-continue` |
| Lean into | `.starfish-lean-into` |
| Add | `.starfish-try-adding` |
| Refine | `.starfish-refine` |

---

## 10. Dark Mode

Dark mode is automatic via CSS media query. To customize dark mode colors:

```css
/* Lines 979-1001 in prototype-c.css */
@media (prefers-color-scheme: dark) {
  :root {
    --brand-primary: #4A9A7A;       /* Lighter for dark bg */
    --brand-primary-dark: #3D8068;
    --brand-primary-light: #1A2A24;
    --color-background: #0D0D0D;
    --color-surface: #1A1A1A;
    --color-ink: #F0F0F0;
    /* ... etc */
  }
}
```

---

## 11. Spacing and Layout

### Spacing Scale
```css
/* Lines 71-77 */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 20px;
--space-xl: 32px;
--space-2xl: 48px;
```

### Main Layout Grid
```css
/* Line 169 */
.main-layout {
  grid-template-columns: 1fr 320px;  /* Content | Sidebar */
}
```

To change sidebar width, modify `320px`.

---

## 12. Shadows and Borders

```css
/* Lines 84-88 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 1px 3px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04);
--shadow-lg: 0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06);

/* Lines 79-81 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

---

## 13. Images and Icons

### Adding Images

1. Place image files in `app/static/images/`
2. Reference in HTML:
```html
<img src="/static/images/your-image.png" alt="Description" />
```

### Icon Usage
The prototype uses text-based icons. To add SVG icons:

1. Create `app/static/icons/` directory
2. Add SVG files
3. Reference in HTML:
```html
<img src="/static/icons/icon-name.svg" alt="" class="icon" />
```

Or embed inline:
```html
<svg class="icon" viewBox="0 0 24 24">
  <path d="..." />
</svg>
```

---

## 14. Session Storage

### Storage Key
The prototype uses `preptalk_session` as the localStorage key.

To change this, edit in `prototype-c.html` JavaScript section:
```javascript
const STORAGE_KEY = 'preptalk_session';  // Change this value
```

---

## 15. Quick Reference Table

| Item | File | Line(s) |
|------|------|---------|
| Brand primary color | CSS | 17 |
| Logo animation | CSS | 145-148 |
| App name | HTML | 19 |
| Welcome heading | HTML | 34 |
| Welcome tagline | HTML | 35-37 |
| CTA button text | HTML | 43-45 |
| Sidebar width | CSS | 169 |
| Font family | CSS | 67-68 |
| Dark mode colors | CSS | 979-1001 |
| Progress ring colors | CSS | 21-24 |
| Starfish feedback colors | CSS | 27-31 |

---

## Need More Help?

For structural changes or adding new features, see:
- `docs/PROTOTYPE_README.md` - Overview of what's built
- `docs/plans/steady-launching-bee.md` - Implementation roadmap
- `.claude/CLAUDE.md` - Development guidelines

---

*Last updated: 2026-02-04*
