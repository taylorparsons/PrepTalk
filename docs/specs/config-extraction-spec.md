# Technical Specification: Configuration Externalization

**Spec ID**: SPEC-2026-001
**Date**: 2026-02-04
**Status**: APPROVED
**Related CR**: CR-2026-001
**Related AD**: AD-2026-001

## Overview

This specification details the implementation of configuration externalization for PrepTalk, extracting hardcoded values into JSON files and implementing a config loader.

## Architecture

### Config File Locations

```
/app/
├── app/
│   ├── config/
│   │   ├── ui-strings.json
│   │   ├── business-rules.json
│   │   ├── features.json
│   │   ├── pdf-template.json
│   │   └── design-tokens.json
│   ├── data/
│   │   ├── demo-stories.json
│   │   ├── topics.json
│   │   └── questions.json
│   └── static/
│       ├── js/
│       │   ├── config-loader.js (NEW)
│       │   └── prototype-c/
│       │       ├── core.js (MODIFY)
│       │       ├── stories.js (MODIFY)
│       │       └── practice.js (MODIFY)
│       └── css/
│           └── prototype-c-base.css (MODIFY - add tokens)
```

### Load Sequence

1. Browser loads HTML
2. `config-loader.js` executes (blocking)
3. Fetch all JSON configs
4. Populate `window.APP_CONFIG`
5. Load application JS (core.js, stories.js, practice.js)
6. Application uses `APP_CONFIG` instead of hardcoded values

## File Specifications

### 1. config-loader.js (NEW)

**Path**: `/app/static/js/config-loader.js`

**Purpose**: Central config fetcher with fallback defaults

**Interface**:
```javascript
window.APP_CONFIG = {
  ui: { /* from ui-strings.json */ },
  business: { /* from business-rules.json */ },
  features: { /* from features.json */ },
  pdf: { /* from pdf-template.json */ },
  tokens: { /* from design-tokens.json */ },
  data: {
    stories: { /* from demo-stories.json */ },
    topics: { /* from topics.json */ },
    questions: { /* from questions.json */ }
  }
};

window.isFeatureEnabled = function(featureName) { /* ... */ };
window.getConfigValue = function(path) { /* ... */ };
```

**Exports**:
- `APP_CONFIG` (global object)
- `isFeatureEnabled(featureName)` (boolean)
- `getConfigValue(dotPath)` (any) - e.g., `getConfigValue('business.readiness.thresholds.ready')` returns 80

**Error Handling**:
- Failed fetch → use hardcoded defaults
- Malformed JSON → log error, use defaults
- Missing keys → return undefined (caller handles)

**Implementation Notes**:
- Use `async`/`await` with `Promise.all()` for parallel loading
- Console log load status for debugging
- Must complete before DOM ready event

---

### 2. ui-strings.json

**Path**: `/app/config/ui-strings.json`

**Schema**:
```json
{
  "welcome": {
    "title": "Let's talk through your experience",
    "subtitle": "I'm here to help you see what's already there...",
    "cta_primary": "Get started →",
    "cta_secondary": "How this works"
  },
  "setup": {
    "title": "Share your background",
    "resume_label": "Resume or CV",
    "resume_hint": "PDF, DOCX, or TXT (Max 5MB)",
    "job_label": "Job description",
    "job_hint": "Paste URL or upload file",
    "role_label": "Role title (optional)",
    "cta": "Continue →"
  },
  "topics": {
    "title": "Choose where to start",
    "subtitle": "6 topics, about 20 minutes. Go at your own pace."
  },
  "learn": {
    "title": "Before you answer...",
    "subtitle": "Here's an example from your experience you can use.",
    "resume_section_title": "From your resume",
    "star_section_title": "How to structure your answer",
    "cta": "I'm ready to answer →"
  },
  "practice": {
    "recording_hint": "Click again to stop",
    "help_prompt": "Need a hand?",
    "help_cta": "Show me how to approach this",
    "submit_cta": "Submit answer",
    "next_cta": "Next question →"
  },
  "progress": {
    "title": "Your Progress",
    "export_cta": "Export study guide",
    "explore_more_cta": "Explore more topics"
  },
  "stories": {
    "title": "My Stories",
    "empty_state": "No stories yet. Practice answering questions to build your library.",
    "filter_label": "Filter by tag:",
    "filter_clear": "Clear filter",
    "progress_title": "Your Progress"
  },
  "errors": {
    "resume_required": "Please upload a resume to continue.",
    "resume_unsupported": "Resume must be a PDF, DOCX, or TXT file.",
    "resume_too_large": "Resume file is too large. Max 5MB.",
    "job_required": "Provide a job description file or URL.",
    "job_url_invalid": "Unable to fetch job description URL.",
    "processing_failed": "Something went wrong. Please try again."
  },
  "sidebar_tips": {
    "what_we_look_for": {
      "title": "What we look for",
      "text": "Specifics. Numbers. Context about the stakes..."
    },
    "best_results": {
      "title": "Best results",
      "text": "Voice input works best. Typing is fine too..."
    },
    "your_data": {
      "title": "Your data stays private",
      "text": "Everything is stored locally in your browser..."
    },
    "trust_pause": {
      "title": "Trust the pause",
      "text": "Pausing more deliberately isn't hesitation—it's confidence..."
    }
  },
  "pdf": {
    "title": "PrepTalk",
    "subtitle": "Interview Practice Report",
    "footer": "You already have the stories. Now go tell them. — Prep"
  }
}
```

**Extraction Source**:
- `prototype-c.html` (all inline text)
- `core.js` (PDF export strings)
- `stories.js` (empty states, filter labels)
- `practice.js` (button labels, hints)

---

### 3. business-rules.json

**Path**: `/app/config/business-rules.json`

**Schema**:
```json
{
  "readiness": {
    "thresholds": {
      "ready": 80,
      "practicing": 40
    },
    "calculation": {
      "filler_penalty_multiplier": 15,
      "min_score": 20,
      "max_score": 100,
      "base_bonus": 20
    },
    "tiers": [
      {
        "min": 90,
        "label": "Interview-ready. You own this story.",
        "class": "ready"
      },
      {
        "min": 75,
        "label": "Getting sharp. A bit more practice...",
        "class": "strong"
      },
      {
        "min": 50,
        "label": "Good progress. The structure is solid.",
        "class": "developing"
      },
      {
        "min": 0,
        "label": "Keep practicing. Each time gets easier.",
        "class": "new"
      }
    ]
  },
  "filler_words": {
    "words": ["um", "uh", "like", "you know", "so", "basically", "actually", "right", "i mean"],
    "thresholds": {
      "excellent": {
        "max": 2.0,
        "insight": "Smooth delivery! This story is getting interview-ready."
      },
      "acceptable": {
        "max": 5.0,
        "insight": "Keep practicing to polish this story."
      },
      "needs_work": {
        "min": 5.0,
        "insight": "Try taking a breath between thoughts to reduce filler words."
      }
    }
  },
  "practice_improvement": {
    "practice_bonus": {
      "base": 12,
      "diminishing_returns_multiplier": 1.5,
      "minimum": 2
    },
    "duration_sweet_spot": {
      "optimal_min_seconds": 60,
      "optimal_max_seconds": 240,
      "optimal_bonus": 3,
      "acceptable_min_seconds": 30,
      "acceptable_max_seconds": 300,
      "acceptable_bonus": 1
    },
    "readiness_modifiers": [
      {
        "threshold": 80,
        "multiplier": 0.3
      },
      {
        "threshold": 60,
        "multiplier": 0.6
      }
    ],
    "filler_improvement_range": [0.1, 0.3]
  },
  "timings": {
    "story_capture_autohide_ms": 8000,
    "processing_delay_ms": 800,
    "ring_animation_duration_ms": 800
  },
  "limits": {
    "max_stories_for_full_ring": 10,
    "demo_stories_count": 7,
    "top_suggestions_to_show": 2,
    "max_tags_per_card": 3,
    "max_tags_in_filter": 6,
    "filter_cutoff_stories": 80,
    "story_name_max_chars": 50,
    "resume_max_mb": 5,
    "job_max_mb": 5
  }
}
```

**Extraction Source**:
- `stories.js` lines 497-505 (readiness calculation)
- `stories.js` lines 209-217 (status thresholds)
- `practice.js` lines 275-330 (rescoring logic)
- `stories.js` line 547 (auto-hide timing)
- `stories.js` line 291 (ring max)

---

### 4. features.json

**Path**: `/app/config/features.json`

**Schema**:
```json
{
  "features": {
    "debug_telemetry": {
      "enabled": false,
      "environments": ["development"],
      "override_url_param": "debug",
      "description": "Show audio quality telemetry in sidebar"
    },
    "story_suggestions": {
      "enabled": true,
      "environments": ["all"],
      "description": "Suggest relevant stories during practice"
    },
    "demo_seeding": {
      "enabled": true,
      "environments": ["development", "staging"],
      "description": "Auto-populate demo stories on first load"
    },
    "pdf_export": {
      "enabled": true,
      "environments": ["all"],
      "description": "Export practice summary as PDF"
    },
    "story_practice_modal": {
      "enabled": true,
      "environments": ["all"],
      "description": "Practice modal for rescoring stories"
    }
  },
  "environment": "development"
}
```

**Extraction Source**:
- `prototype-c.html` line 377-412 (debug card)
- `practice.js` line 421 (suggestions toggle)
- `stories.js` line 103-109 (demo seeding)

---

### 5. pdf-template.json

**Path**: `/app/config/pdf-template.json`

**Schema**:
```json
{
  "pdf": {
    "filename_pattern": "PrepTalk_Report_{date}.pdf",
    "colors": {
      "primary_rgb": [45, 90, 71],
      "secondary_rgb": [74, 106, 138],
      "dark_rgb": [30, 30, 30],
      "gray_rgb": [120, 120, 120],
      "light_rgb": [248, 248, 246],
      "white_rgb": [255, 255, 255],
      "border_rgb": [220, 220, 220]
    },
    "layout": {
      "margin": 20,
      "line_height": 5,
      "section_gap": 12,
      "item_gap": 5
    },
    "header": {
      "title": "PrepTalk",
      "tagline": "Interview Practice Report",
      "logo_size": 8
    },
    "footer": {
      "tagline": "You already have the stories. Now go tell them. — Prep",
      "show_page_numbers": true
    },
    "sections": [
      {
        "title": "Continue",
        "subtitle": "These are working beautifully. Keep doing exactly this.",
        "color_key": "secondary_rgb",
        "items": [
          "Your stories flow naturally and are easy to follow. You use clear, confident language that makes your experience vivid.",
          "Using specific numbers like \"23% improvement\" or \"8-person team\" grounds your stories in reality. Keep that up.",
          "Your pace is steady and grounded. You sound like someone who knows what they're talking about."
        ]
      },
      {
        "title": "Lean Into",
        "subtitle": "These moments are strong. Use them more deliberately.",
        "color_key": "primary_rgb",
        "items": [
          "When you describe results, you light up. Lean into that energy—it's authentic and engaging.",
          "The way you structure with \"situation, action, result\" is working. Make it even clearer by pausing between sections.",
          "Your best stories show what you learned. Make that the climax, not an afterthought."
        ]
      },
      {
        "title": "Try Adding",
        "subtitle": "Small additions that will make your answers sharper.",
        "color_key": "secondary_rgb",
        "items": [
          "Name the stakes. Why did this project matter? What would have happened if you'd failed?",
          "Show your thinking. Before you describe what you did, say why you chose that path.",
          "End with reflection. \"What I'd do differently\" or \"What this taught me\" closes the loop."
        ]
      },
      {
        "title": "Refine",
        "subtitle": "Patterns to smooth out with a bit more practice.",
        "color_key": "gray_rgb",
        "items": [
          "Watch for filler words like \"um,\" \"like,\" and \"you know.\" You're doing better, but a few still slip through.",
          "Some answers wander before they land. Aim to hit your point in the first 30 seconds.",
          "Vary your pacing. Speed up for action, slow down for impact. Monotone feels rehearsed."
        ]
      }
    ]
  }
}
```

**Extraction Source**:
- `core.js` lines 263-409 (exportPDF function)

---

### 6. design-tokens.json

**Path**: `/app/config/design-tokens.json`

**Purpose**: Extended CSS variables accessible to JS (not a replacement for CSS, but supplement)

**Schema**:
```json
{
  "colors": {
    "tags": {
      "leadership": "#2D8A5A",
      "technical": "#4A7A9A",
      "conflict": "#9A4A4A",
      "communication": "#7A5A9A",
      "results_driven": "#8A6A4A",
      "problem_solving": "#4A7A8A",
      "innovation": "#6A4A9A",
      "collaboration": "#5A8A7A",
      "mentorship": "#9A7A5A",
      "negotiation": "#8A5A7A",
      "customer_focus": "#6A8A5A",
      "data_driven": "#5A7A8A"
    },
    "status": {
      "ready": "#2D8A5A",
      "practicing": "#4A7A9A",
      "new": "#9A7A4A"
    }
  },
  "animations": {
    "breathe_duration_ms": 4000,
    "pulse_mic_duration_ms": 1500,
    "ring_progress_duration_ms": 800,
    "transition_default_ms": 200,
    "transition_slow_ms": 300
  }
}
```

**Extraction Source**:
- `stories.js` lines 135-148 (TAG_COLORS)

**Usage in JS**:
```javascript
const tagColor = APP_CONFIG.tokens.colors.tags[tagName];
```

**Sync with CSS**:
These should ALSO be added to `prototype-c-base.css` as CSS variables. JS reads from CSS via `getComputedStyle()` OR directly from JSON. Choose one:
- Option A: JS reads from `design-tokens.json` (simpler, no CSS parsing)
- Option B: CSS variables mirror JSON, JS reads via `getComputedStyle()` (single source, more complex)

**Decision**: Use Option A (JS reads JSON directly). Add CSS variables to base.css for markup use only.

---

### 7. demo-stories.json

**Path**: `/app/data/demo-stories.json`

**Schema**:
```json
{
  "stories": [
    {
      "id": "demo_1",
      "name": "Payment Integration Launch",
      "tags": ["leadership", "technical", "results_driven"],
      "readiness": 92,
      "fillersPerMinute": 1.2,
      "practices": 3,
      "lastPracticed": "2024-01-15T10:30:00Z",
      "created": "2024-01-10T09:00:00Z"
    },
    {
      "id": "demo_2",
      "name": "Conflict Resolution with Engineering",
      "tags": ["conflict", "communication", "collaboration"],
      "readiness": 78,
      "fillersPerMinute": 2.8,
      "practices": 2,
      "lastPracticed": "2024-01-14T14:20:00Z",
      "created": "2024-01-12T11:00:00Z"
    },
    {
      "id": "demo_3",
      "name": "Customer Retention Strategy",
      "tags": ["customer_focus", "data_driven", "results_driven"],
      "readiness": 65,
      "fillersPerMinute": 3.5,
      "practices": 1,
      "lastPracticed": "2024-01-13T16:45:00Z",
      "created": "2024-01-13T16:00:00Z"
    },
    {
      "id": "demo_4",
      "name": "Migrating Legacy System",
      "tags": ["technical", "problem_solving", "leadership"],
      "readiness": 45,
      "fillersPerMinute": 5.1,
      "practices": 1,
      "lastPracticed": "2024-01-16T09:00:00Z",
      "created": "2024-01-16T08:30:00Z"
    },
    {
      "id": "demo_5",
      "name": "Mentoring Junior PM",
      "tags": ["mentorship", "leadership", "collaboration"],
      "readiness": 88,
      "fillersPerMinute": 1.8,
      "practices": 4,
      "lastPracticed": "2024-01-17T13:00:00Z",
      "created": "2024-01-11T10:00:00Z"
    },
    {
      "id": "demo_6",
      "name": "Budget Negotiation with Stakeholders",
      "tags": ["negotiation", "communication", "results_driven"],
      "readiness": 55,
      "fillersPerMinute": 4.2,
      "practices": 1,
      "lastPracticed": "2024-01-15T15:30:00Z",
      "created": "2024-01-15T15:00:00Z"
    },
    {
      "id": "demo_7",
      "name": "Product Feature Pivot",
      "tags": ["innovation", "data_driven", "customer_focus"],
      "readiness": 32,
      "fillersPerMinute": 6.5,
      "practices": 0,
      "lastPracticed": null,
      "created": "2024-01-18T12:00:00Z"
    }
  ]
}
```

**Extraction Source**:
- `stories.js` lines 9-101 (DEMO_STORIES constant)

---

### 8. topics.json

**Path**: `/app/data/topics.json`

**Schema**:
```json
{
  "topics": [
    {
      "id": "leadership",
      "name": "Leadership & Team Management",
      "description": "Share your experience leading teams through challenges",
      "question_count": 3,
      "estimated_duration_minutes": 10,
      "enabled": true,
      "order": 1,
      "icon": "👥"
    },
    {
      "id": "technical",
      "name": "Technical Problem Solving",
      "description": "Show how you approach technical challenges",
      "question_count": 2,
      "estimated_duration_minutes": 8,
      "enabled": false,
      "order": 2,
      "icon": "⚙️"
    },
    {
      "id": "why_role",
      "name": "Why This Role",
      "description": "Connect your background to this opportunity",
      "question_count": 1,
      "estimated_duration_minutes": 3,
      "enabled": false,
      "order": 3,
      "icon": "🎯"
    }
  ]
}
```

**Extraction Source**:
- `prototype-c.html` lines 223-242 (topic cards)

---

### 9. questions.json

**Path**: `/app/data/questions.json`

**Schema**:
```json
{
  "questions": [
    {
      "id": "q1_leadership",
      "topic_id": "leadership",
      "text": "Tell me about a time you led a team through a challenging project. What was your approach?",
      "order": 1,
      "tags": ["leadership", "team_management"],
      "expected_duration_seconds": 180,
      "star_example": {
        "snippet": "Led cross-functional team of 8 engineers to deliver payment integration, reducing checkout abandonment by 23%",
        "situation": "Payment checkout had high abandonment",
        "task": "You led the team to fix it",
        "action": "Integrated new payment provider",
        "result": "23% reduction in abandonment"
      }
    }
  ]
}
```

**Extraction Source**:
- `prototype-c.html` line 335 (question text)
- `prototype-c.html` lines 283-295 (STAR example)

---

## Modified File Specifications

### core.js (MODIFY)

**Changes**:
1. Remove hardcoded PDF sections (lines 275-355)
2. Replace with `APP_CONFIG.pdf.sections`
3. Remove hardcoded colors (lines 263-271)
4. Replace with `APP_CONFIG.pdf.colors`
5. Update `exportPDF()` to consume config
6. Remove hardcoded filename pattern (line 477)
7. Replace with `APP_CONFIG.pdf.filename_pattern`

**Function Signature Changes**:
```javascript
// Before
function exportPDF() {
  const sections = [ /* hardcoded */ ];
  const colors = { /* hardcoded */ };
  // ...
}

// After
function exportPDF() {
  const sections = APP_CONFIG.pdf.sections;
  const colors = APP_CONFIG.pdf.colors;
  // ...
}
```

---

### stories.js (MODIFY)

**Changes**:
1. Remove `DEMO_STORIES` constant (lines 9-101)
2. Replace with `APP_CONFIG.data.stories.stories`
3. Remove `TAG_COLORS` constant (lines 135-148)
4. Replace with `APP_CONFIG.tokens.colors.tags`
5. Update `calculateReadiness()` to use config thresholds (line 497)
6. Update `getStoryStatus()` to use config thresholds (line 209)
7. Update auto-hide timing (line 547) to use `APP_CONFIG.business.timings.story_capture_autohide_ms`

**Function Signature Changes**:
```javascript
// Before
const DEMO_STORIES = [ /* 7 stories */ ];
const TAG_COLORS = { 'leadership': '#2D8A5A', /* ... */ };

function calculateReadiness(fillersPerMinute) {
  return Math.min(100, Math.max(20, 100 - (fillersPerMinute * 15) + 20));
}

// After
function calculateReadiness(fillersPerMinute) {
  const { filler_penalty_multiplier, min_score, max_score, base_bonus } =
    APP_CONFIG.business.readiness.calculation;
  return Math.min(max_score, Math.max(min_score,
    100 - (fillersPerMinute * filler_penalty_multiplier) + base_bonus));
}
```

---

### practice.js (MODIFY)

**Changes**:
1. Remove `QUESTION_TAG_MAP` constant (lines 6-11)
2. Replace with `APP_CONFIG.data.questions` lookup logic
3. Update rescoring logic (lines 275-330) to use `APP_CONFIG.business.practice_improvement`
4. Update processing delay (line 242) to use `APP_CONFIG.business.timings.processing_delay_ms`
5. Update readiness tiers (lines 315-327) to use `APP_CONFIG.business.readiness.tiers`

**Function Signature Changes**:
```javascript
// Before
const practiceBonus = Math.max(2, 12 - (story.practices * 1.5));

// After
const { base, diminishing_returns_multiplier, minimum } =
  APP_CONFIG.business.practice_improvement.practice_bonus;
const practiceBonus = Math.max(minimum, base - (story.practices * diminishing_returns_multiplier));
```

---

### prototype-c-base.css (MODIFY)

**Changes**:
1. Add tag color variables (after line 33):
```css
/* Tag palette (synced with design-tokens.json) */
--tag-color-leadership: #2D8A5A;
--tag-color-technical: #4A7A9A;
--tag-color-conflict: #9A4A4A;
--tag-color-communication: #7A5A9A;
--tag-color-results-driven: #8A6A4A;
--tag-color-problem-solving: #4A7A8A;
--tag-color-innovation: #6A4A9A;
--tag-color-collaboration: #5A8A7A;
--tag-color-mentorship: #9A7A5A;
--tag-color-negotiation: #8A5A7A;
--tag-color-customer-focus: #6A8A5A;
--tag-color-data-driven: #5A7A8A;
```

2. Add status color variables (after line 66):
```css
/* Story status colors */
--status-ready: #2D8A5A;
--status-practicing: #4A7A9A;
--status-new: #9A7A4A;
```

3. Add animation timing variables (after line 90):
```css
/* Animation timings */
--animation-breathe: 4s;
--animation-pulse-mic: 1.5s;
--animation-ring-progress: 0.8s;
```

---

### prototype-c.html (MODIFY)

**Changes**:
1. Add script tag for `config-loader.js` BEFORE other scripts:
```html
<script src="/static/js/config-loader.js"></script>
```

2. Replace hardcoded topic cards (lines 223-242) with dynamic rendering target:
```html
<div id="topics-container"></div>
```

3. Replace hardcoded question text (line 335) with:
```html
<div class="question-display" id="question-text"></div>
```

4. Replace hardcoded STAR example (lines 283-295) with:
```html
<div id="star-example-container"></div>
```

5. Replace hardcoded sidebar tips with:
```html
<div id="sidebar-tips-container"></div>
```

**Script Order**:
```html
<!-- Config loader (blocking, must be first) -->
<script src="/static/js/config-loader.js"></script>

<!-- Preflight audio -->
<script src="/static/js/preflight-audio.js"></script>

<!-- Core app -->
<script src="/static/js/prototype-c/core.js"></script>
<script src="/static/js/prototype-c/stories.js"></script>
<script src="/static/js/prototype-c/practice.js"></script>
```

---

## Implementation Plan

### Phase 1: Config Loader Foundation
1. Create `config-loader.js` with fallback defaults
2. Create all 8 JSON files with extracted data
3. Update `prototype-c.html` to load config first
4. Test: Verify `window.APP_CONFIG` is populated

### Phase 2: Business Logic Migration
1. Update `core.js` to use `APP_CONFIG.pdf`
2. Update `stories.js` to use `APP_CONFIG.business` and `APP_CONFIG.data.stories`
3. Update `practice.js` to use `APP_CONFIG.business.practice_improvement`
4. Test: Verify readiness calculation matches old behavior

### Phase 3: UI String Externalization
1. Update `core.js`, `stories.js`, `practice.js` to use `APP_CONFIG.ui`
2. Update HTML to render dynamic content from config
3. Test: Verify all UI text displays correctly

### Phase 4: Design Token Consolidation
1. Add CSS variables to `prototype-c-base.css`
2. Update `stories.js` to read tag colors from `APP_CONFIG.tokens`
3. Test: Verify tag colors render correctly

### Phase 5: Feature Flags
1. Implement `isFeatureEnabled()` in config-loader
2. Update demo seeding logic to check feature flag
3. Update debug telemetry to check feature flag
4. Test: Verify `?debug=1` shows telemetry, default hides it

---

## Testing Requirements

### Unit Tests
- Config loader returns defaults on fetch failure
- Config loader parses JSON correctly
- `isFeatureEnabled()` respects environment and URL override
- Readiness calculation matches old hardcoded version

### Integration Tests
- All 64 existing tests still pass
- PDF export generates same output as before
- Demo stories populate correctly
- Tag colors match design system

### E2E Tests
- Full user flow with config loading
- Config load failure doesn't break app (fallback works)
- Feature flag toggle via URL param works

---

## Rollback Plan

If config loading breaks production:

1. **Quick Fix**: Revert `prototype-c.html` to remove `config-loader.js` script tag
2. **Fallback**: Config loader defaults to hardcoded values (zero breaking change)
3. **Full Rollback**: Git revert to pre-config-extraction commit

---

## Performance Impact

**Initial Load Time**:
- Baseline: ~200ms (HTML + CSS + JS)
- With config loading: ~250-300ms (+ 8 JSON files)
- Mitigation: Bundle configs into single JSON (future optimization)

**Runtime Performance**:
- Config lookups are O(1) object property access
- No performance degradation vs hardcoded values

---

## Security Considerations

- All config files are public (served from `/app/config/` and `/app/data/`)
- Do NOT include API keys, secrets, or PII
- Feature flag names are visible (acceptable)
- Demo stories are fake data (safe to expose)

---

## Deployment Notes

1. Deploy all JSON files to `/app/config/` and `/app/data/`
2. Deploy updated JS/CSS files
3. No database migrations required
4. No API changes required
5. Backward compatible (old clients with cached JS still work)

---

## Success Metrics

1. All 64 tests pass
2. Zero breaking changes to user experience
3. Content updates possible without code deployment
4. Config loading completes in <100ms
5. Fallback defaults work when config server is down

---

## Related Documents

- Request: [/docs/requests/config-extraction-request.md](../requests/config-extraction-request.md)
- Decisions: [/docs/decisions/config-extraction-decisions.md](../decisions/config-extraction-decisions.md)
