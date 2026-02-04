# Architectural Decisions: Configuration Externalization

**Decision ID**: AD-2026-001
**Date**: 2026-02-04
**Status**: APPROVED
**Related CR**: CR-2026-001

## Context

PrepTalk needs to externalize hardcoded configuration to enable rapid iteration without code changes. Architecture review identified 8 areas for extraction across 2,700+ lines of code.

## Decision: Configuration File Structure

### File Organization

```
app/
├── config/
│   ├── ui-strings.json          (all UI text, labels, messages)
│   ├── business-rules.json      (thresholds, calculations, limits)
│   ├── features.json            (feature flags, environment toggles)
│   ├── pdf-template.json        (export templates, colors, sections)
│   └── design-tokens.json       (extended CSS variables for JS access)
├── data/
│   ├── demo-stories.json        (seed data for development)
│   ├── topics.json              (practice topics metadata)
│   └── questions.json           (question bank with examples)
└── static/
    └── js/
        └── config-loader.js     (centralized config fetcher)
```

**Rationale:**
- `config/` for policy and behavior (changes affect logic)
- `data/` for content (changes are additive/editorial)
- Separation makes it clear what's "code" vs "content"

### Alternatives Considered

1. **Single monolithic config.json**
   - Rejected: Too large, hard to maintain, slow to parse

2. **Environment variables**
   - Rejected: Not suitable for large content, no hot-reload

3. **Database-backed config**
   - Rejected: Overkill for current scale, adds deployment complexity

## Decision: Config Loading Strategy

### Approach: Eager Load at Init

```javascript
// Load all configs before app initialization
async function initApp() {
  await loadAllConfigs();  // Blocking
  initializeUI();
  startApplication();
}
```

**Rationale:**
- Prevents race conditions (config always available)
- Simpler error handling (fail fast)
- No partial states (app either works or doesn't load)

### Fallback Strategy

Each config file has hardcoded defaults in `config-loader.js`:

```javascript
const DEFAULTS = {
  'ui-strings': { /* minimal strings */ },
  'business-rules': { /* conservative thresholds */ },
  // ...
};

async function loadConfig(name) {
  try {
    const response = await fetch(`/config/${name}.json`);
    return await response.json();
  } catch (error) {
    console.warn(`Config ${name} failed to load, using defaults`);
    return DEFAULTS[name];
  }
}
```

**Rationale:**
- Graceful degradation (app works even if config server is down)
- Development resilience (missing files don't break app)
- Testability (can test with default config)

### Alternatives Considered

1. **Lazy load on demand**
   - Rejected: Race conditions, complex error handling, spinner hell

2. **Fail hard on missing config**
   - Rejected: Breaks developer experience, not resilient

## Decision: Design Token Duplication

### Approach: CSS as Single Source of Truth

1. Define all colors in CSS `:root`
2. JavaScript reads from computed styles
3. Remove hardcoded hex values in JS

```javascript
// Before
const TAG_COLORS = {
  'leadership': '#2D8A5A',  // Duplicates CSS
};

// After
const TAG_COLORS = {
  'leadership': 'var(--tag-color-leadership)',  // References CSS
};
```

**Rationale:**
- CSS variables cascade (theming, dark mode)
- One place to update colors
- Browser handles fallbacks

### Alternatives Considered

1. **JSON as source, generate CSS**
   - Rejected: Adds build step, breaks hot-reload

2. **Keep duplication**
   - Rejected: Maintenance nightmare, inconsistency risk

## Decision: Business Rules Format

### Approach: Nested JSON with Semantic Keys

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
      "max_score": 100
    }
  }
}
```

**Rationale:**
- Self-documenting (keys explain meaning)
- Easy to extend (add new rules without breaking existing)
- Type-safe with JSON Schema validation (future)

### Alternatives Considered

1. **Flat namespace**
   - Rejected: `readiness_threshold_ready` vs nested structure, harder to group

2. **YAML**
   - Rejected: Less browser-friendly, requires parser

## Decision: Topics & Questions Structure

### Approach: Separate Files with Foreign Keys

**topics.json:**
```json
{
  "topics": [
    {
      "id": "leadership",
      "name": "Leadership & Team Management",
      "enabled": true,
      "question_ids": ["q1_leadership", "q2_leadership"]
    }
  ]
}
```

**questions.json:**
```json
{
  "questions": [
    {
      "id": "q1_leadership",
      "topic_id": "leadership",
      "text": "Tell me about a time...",
      "star_example": { ... }
    }
  ]
}
```

**Rationale:**
- Topics can reference multiple questions
- Questions can be reused across topics
- Easier to manage large question banks

### Alternatives Considered

1. **Denormalized (questions embedded in topics)**
   - Rejected: Can't reuse questions, large file

2. **Single questions file with topic tag**
   - Rejected: Loses topic metadata (order, description)

## Decision: Feature Flags Implementation

### Approach: Environment-Based with Runtime Override

```json
{
  "features": {
    "debug_telemetry": {
      "enabled": false,
      "environments": ["development"],
      "override_url_param": "debug"
    }
  }
}
```

Check logic:
```javascript
function isFeatureEnabled(feature) {
  const config = FEATURES[feature];

  // URL override (e.g., ?debug=1)
  if (config.override_url_param) {
    const param = new URLSearchParams(window.location.search).get(config.override_url_param);
    if (param === '1') return true;
  }

  // Environment check
  const env = getEnvironment();  // 'development', 'staging', 'production'
  if (config.environments.includes(env)) return config.enabled;

  return false;
}
```

**Rationale:**
- URL override enables testing in production
- Environment-based prevents accidental prod exposure
- Simple boolean logic (no complex rules engine)

### Alternatives Considered

1. **Server-side feature flags (LaunchDarkly, etc.)**
   - Rejected: Adds external dependency, overkill for current scale

2. **Percentage-based rollout**
   - Rejected: Not needed yet, can add later

## Decision: PDF Template Structure

### Approach: Separate Layout from Content

```json
{
  "pdf": {
    "layout": {
      "margin": 20,
      "line_height": 5,
      "colors": { ... }
    },
    "sections": [
      {
        "title": "Continue",
        "items": [ "..." ]
      }
    ]
  }
}
```

**Rationale:**
- Layout changes don't affect content
- Content changes don't affect layout
- Easy to swap section order

## Decision: Backward Compatibility

### Approach: Zero Breaking Changes

1. Config loader provides same data structure as hardcoded values
2. If config fails, fallback to inline defaults
3. Existing code consumes config transparently

**Example:**
```javascript
// Before
const FILLER_WORDS = ['um', 'uh', 'like'];

// After
const FILLER_WORDS = APP_CONFIG.business_rules.filler_words.words;
// If config fails, config-loader returns ['um', 'uh', 'like']
```

**Rationale:**
- Minimizes refactoring risk
- Enables gradual migration (can extract one config at a time)
- Tests pass without modification

## Decision: Config Validation

### Approach: Runtime Schema Validation (Optional)

Use JSON Schema to validate configs at load time:

```javascript
async function loadConfig(name, schema) {
  const data = await fetch(`/config/${name}.json`).then(r => r.json());

  if (schema) {
    const valid = validateSchema(data, schema);
    if (!valid) {
      console.error(`Config ${name} failed validation, using defaults`);
      return DEFAULTS[name];
    }
  }

  return data;
}
```

**Rationale:**
- Catches malformed configs early
- Self-documenting (schema shows structure)
- Optional (doesn't block development)

### Alternatives Considered

1. **TypeScript for type safety**
   - Rejected: PrepTalk uses vanilla JS, adds build complexity

2. **No validation**
   - Rejected: Silent failures are worse than explicit errors

## Non-Functional Requirements

### Performance

- Config loading adds ~50-100ms to initial load
- Mitigate with:
  - Bundling configs into single request (future)
  - Service worker caching (future)
  - Preload hints

### Security

- Config files are public (served from `/config/`)
- Do NOT include API keys, secrets, or PII
- Feature flags reveal feature names (acceptable)

### Testing

- Unit tests: Mock config loader to return test data
- E2E tests: Use test config files (config/test/)
- Integration tests: Verify fallback behavior

## Related Documents

- Request: [/docs/requests/config-extraction-request.md](../requests/config-extraction-request.md)
- Spec: [/docs/specs/config-extraction-spec.md](../specs/config-extraction-spec.md)
