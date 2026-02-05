# PrepTalk UI Customization Guide

This guide covers the main PrepTalk UI on `main` (vanilla JS + Tailwind + DaisyUI). The current baseline uses the `lemonade` DaisyUI theme and a text-only header (no logo).

## File map

| File | What to edit |
| --- | --- |
| `app/templates/index.html` | Page shell, `data-theme`, script and CSS includes |
| `app/static/js/ui.js` | Main layout and copy for header, panels, and controls |
| `app/static/js/components/` | Button, panel, and status pill components (DaisyUI classes) |
| `app/static/css/components.css` | Design tokens, layout styles, and UI component styling |
| `tailwind.config.js` | DaisyUI theme configuration for the compiled bundle |

## 1. DaisyUI theme

Theme selection is controlled at the HTML root. Current setting:

```html
<html lang="en" data-theme="lemonade">
```

To change the theme, edit `app/templates/index.html` and use another DaisyUI theme name. If you want a custom theme, add it to `tailwind.config.js` and keep the `data-theme` value in sync.

## 2. Design tokens (colors, typography, spacing)

The main design system lives in `app/static/css/components.css` under `:root`. Update these tokens to rebrand without changing JS or templates.

Example:

```css
:root {
  --ui-color-primary: #6B7B8A;
  --ui-color-ink: #3D3A36;
  --ui-font-sans: "Space Grotesk", "Sora", "Segoe UI", sans-serif;
}
```

Fonts are imported at the top of `components.css`. Update that `@import` line if you change typefaces.

## 3. Header and guide copy (no logo)

The header is created in `buildAppHeader` inside `app/static/js/ui.js`.

You can edit:
- Eyebrow text
- Title and subtitle
- Guide steps
- Note and callout text

There is no logo by default. To add one, insert an `<img>` or icon element in `buildAppHeader` next to the title block.

## 4. Panels and layout

The main layout is assembled in `mountVoiceApp` in `app/static/js/ui.js`.

Panels include:
- Candidate Setup panel: `buildSetupPanel`
- Session Controls panel: `buildControlsPanel`
- Questions panel: `buildQuestionsPanel`
- Insights panel: `buildQuestionInsightsPanel`
- Transcript panel: `buildTranscriptPanel`
- Score panel: `buildScorePanel`

Layout classes like `layout-split`, `layout-stack`, and `ui-panel` are styled in `app/static/css/components.css`.

## 5. Session controls and labels

The control labels and ordering are defined in `buildControlsPanel` in `app/static/js/ui.js`. This includes:
- Begin Practice / End Practice (single toggled button)
- Mute
- Interrupt
- Request Help
- Submit Answer
- Extras (opens the session tools drawer)
- Restart Practice (results)
- Export PDF / TXT (results)
- Candidate Setup (results)

The top Status/CTA panel is the Session Controls panel inserted under the header in `buildVoiceLayout`. Status pill text + substatus lines are updated via `updateStatusPill` and `ui.setStatusDetail` inside the same file.

## 6. Extras drawer

The Extras drawer is built in `buildSessionToolsDrawer` in `app/static/js/ui.js`. The toggle button label "Extras" is created in `buildControlsPanel`.

## 7. Overflow menu (hidden panels)

The overflow menu button (three-line menu) is rendered in `buildAppHeader` and populated by `updateOverflowMenu` inside `buildVoiceLayout`. The menu only appears when active panels are off-screen or collapsed, and it lists only those active items (Guide, Candidate Setup, Questions, Insights, Transcript, Session Insights).

## 8. Generated CSS

`app/static/css/dist.css` is the compiled Tailwind output. Do not edit it manually. Change `tailwind.config.js` and rebuild if needed.
