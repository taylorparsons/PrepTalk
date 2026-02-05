# APP_CONFIG Reference

Quick reference for all configuration values used in Prototype C.

## Structure

```
window.APP_CONFIG
├── pdf
│   ├── filename_pattern
│   ├── colors
│   └── sections
├── business
│   ├── readiness
│   │   ├── thresholds
│   │   ├── calculation
│   │   └── tiers
│   ├── practice_improvement
│   │   ├── practice_bonus
│   │   ├── duration_sweet_spot
│   │   └── readiness_modifiers
│   ├── timings
│   └── limits
├── tokens
│   └── colors
│       └── tags
└── data
    └── stories
        └── stories
```

## Configuration Values

### PDF Export (`APP_CONFIG.pdf`)

#### Colors (`pdf.colors`)
```javascript
{
  primary_rgb: [45, 90, 71],      // Green
  secondary_rgb: [74, 106, 138],  // Blue
  dark_rgb: [30, 30, 30],         // Dark text
  gray_rgb: [120, 120, 120],      // Muted text
  light_rgb: [248, 248, 246],     // Light background
  white_rgb: [255, 255, 255],     // White
  border_rgb: [220, 220, 220]     // Border lines
}
```

#### Filename Pattern (`pdf.filename_pattern`)
```javascript
"PrepTalk_Report_{date}.pdf"  // {date} replaced with YYYY-MM-DD
```

#### Sections (`pdf.sections`)
Array of section objects:
```javascript
[
  {
    title: "Continue",           // Section heading
    subtitle: "These are...",    // Section description
    color_key: "secondary_rgb",  // References pdf.colors
    items: [...]                 // Array of bullet points
  }
]
```

---

### Business Logic (`APP_CONFIG.business`)

#### Readiness Thresholds (`business.readiness.thresholds`)
```javascript
{
  ready: 80,        // Score >= 80 is "Interview-ready"
  practicing: 40    // Score >= 40 is "Practicing", else "Needs work"
}
```

#### Readiness Calculation (`business.readiness.calculation`)
```javascript
{
  filler_penalty_multiplier: 15,  // Penalty per filler word/minute
  min_score: 20,                  // Minimum readiness score
  max_score: 100,                 // Maximum readiness score
  base_bonus: 20                  // Base score before penalties
}
```

**Formula:**
```javascript
readiness = min(max_score, max(min_score,
  100 - (fillersPerMinute * filler_penalty_multiplier) + base_bonus
))
```

**Examples:**
- 0 fillers/min → 120 → clamped to 100
- 2 fillers/min → 90
- 5 fillers/min → 45
- 10+ fillers/min → 20 (clamped to min)

#### Readiness Tiers (`business.readiness.tiers`)
```javascript
{
  excellent: {
    threshold: 90,
    message: "Interview-ready. You own this story."
  },
  good: {
    threshold: 75,
    message: "Getting sharp. A bit more practice and you're there."
  },
  fair: {
    threshold: 50,
    message: "Good progress. The structure is solid."
  },
  default: {
    message: "Keep practicing. Each time gets easier."
  }
}
```

#### Practice Improvement (`business.practice_improvement`)

##### Practice Bonus (`practice_improvement.practice_bonus`)
```javascript
{
  base: 12,              // Base improvement points
  min: 2,                // Minimum improvement (high practice count)
  diminishing_factor: 1.5 // How fast returns diminish
}
```

**Formula:**
```javascript
practiceBonus = max(min, base - (practiceCount * diminishing_factor))
```

**Examples:**
- 1st practice: max(2, 12 - 1.5) = 10.5 points
- 3rd practice: max(2, 12 - 4.5) = 7.5 points
- 7th practice: max(2, 12 - 10.5) = 2 points (clamped)

##### Duration Sweet Spot (`practice_improvement.duration_sweet_spot`)
```javascript
{
  optimal_min: 60,        // Optimal: 60-240 seconds (1-4 minutes)
  optimal_max: 240,
  acceptable_min: 30,     // Acceptable: 30-300 seconds
  acceptable_max: 300,
  optimal_bonus: 3,       // Bonus for optimal duration
  acceptable_bonus: 1     // Bonus for acceptable duration
}
```

**Logic:**
- Duration 60-240s: +3 points
- Duration 30-60s or 240-300s: +1 point
- Duration <30s or >300s: +0 points

##### Readiness Modifiers (`practice_improvement.readiness_modifiers`)
```javascript
{
  high_threshold: 80,   // High readiness (>80)
  high_modifier: 0.3,   // Multiply improvement by 0.3
  medium_threshold: 60, // Medium readiness (60-80)
  medium_modifier: 0.6  // Multiply improvement by 0.6
}
```

**Logic:**
- Readiness > 80: improvement × 0.3 (harder to improve)
- Readiness 60-80: improvement × 0.6
- Readiness < 60: improvement × 1.0 (normal)

**Example Rescoring:**
```javascript
// Story: readiness=70, practices=2, duration=120s
practiceBonus = max(2, 12 - 3) = 9
durationBonus = 3 (optimal range)
improvement = 9 + 3 = 12
// readiness 70 is in medium range (60-80)
improvement = 12 * 0.6 = 7.2 → 7
newReadiness = min(100, 70 + 7) = 77
```

#### Timings (`business.timings`)
```javascript
{
  story_capture_autohide_ms: 8000,    // Auto-hide capture card after 8s
  processing_delay_ms: 800,           // Simulated processing delay
  ring_animation_duration_ms: 800     // Ring animation duration
}
```

#### Limits (`business.limits`)
```javascript
{
  max_stories_for_full_ring: 10,  // 10 stories = 100% ring progress
  demo_stories_count: 7           // Number of demo stories to seed
}
```

---

### Design Tokens (`APP_CONFIG.tokens`)

#### Tag Colors (`tokens.colors.tags`)
```javascript
{
  "leadership": "#2D8A5A",      // Green
  "technical": "#4A7A9A",       // Blue
  "conflict": "#9A4A4A",        // Red
  "collaboration": "#7A5A9A",   // Purple
  "results-driven": "#5A8A7A",  // Teal
  "problem-solving": "#8A7A4A", // Olive
  "mentorship": "#4A9A8A",      // Cyan
  "communication": "#9A6A4A",   // Brown
  "innovation": "#6A4A9A",      // Violet
  "growth": "#4A8A6A",          // Forest
  "negotiation": "#8A4A6A",     // Mauve
  "pressure": "#6A8A4A"         // Lime
}
```

---

### Data (`APP_CONFIG.data`)

#### Demo Stories (`data.stories.stories`)
Array of story objects:
```javascript
[
  {
    id: "demo_1",
    name: "Payment Integration Launch",
    tags: ["leadership", "technical", "results-driven"],
    readiness: 92,
    fillersPerMinute: 1.2,
    fillerCounts: { um: 1, like: 1 },
    insight: "Strong story with clear metrics. Interview-ready.",
    questionType: "Leadership",
    created: "2026-01-28T12:00:00.000Z",
    practices: 4
  }
]
```

---

## File Locations

To override defaults, create JSON files at:

```
/app/static/
├── config/
│   ├── business-rules.json      → business.*
│   ├── pdf-template.json        → pdf.*
│   └── design-tokens.json       → tokens.*
└── data/
    └── demo-stories.json        → data.stories.*
```

---

## Usage in Code

### Safe Access Pattern
Always use fallback for safety:
```javascript
const value = (window.APP_CONFIG &&
               window.APP_CONFIG.section &&
               window.APP_CONFIG.section.key) || defaultValue;
```

### Helper Functions
```javascript
// Get a config value by path
const value = window.getConfigValue('business.readiness.thresholds.ready');

// Check if a feature is enabled
if (window.isFeatureEnabled('debug_telemetry')) {
  // ...
}
```

---

## Testing

Open `/app/static/js/prototype-c/test-config-migration.html` in browser to verify:
- All config values are loaded correctly
- Fallbacks work when configs are missing
- Calculations produce expected results
