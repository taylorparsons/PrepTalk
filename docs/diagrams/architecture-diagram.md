# PrepTalk Architecture Diagram

## Before & After Architecture Comparison

### Before: Monolithic Architecture

```mermaid
graph TB
    subgraph "Before: Monolithic Structure"
        HTML[prototype-c.html<br/>Hardcoded Content]
        CSS[prototype-c.css<br/>2,529 lines]
        JS[ui.js<br/>1,552 lines]
        Voice[voice.js<br/>Fixed 24kHz]

        HTML --> CSS
        HTML --> JS
        HTML --> Voice

        CSS -.->|"All styles mixed"| CSS
        JS -.->|"All logic mixed"| JS
        Voice -.->|"No adaptation"| Voice
    end

    Issues["Issues:<br/>❌ Hard to navigate<br/>❌ All config hardcoded<br/>❌ No audio adaptation<br/>❌ Duplication risk"]

    style CSS fill:#ffcccc
    style JS fill:#ffcccc
    style Voice fill:#ffcccc
    style Issues fill:#ffeeee
```

### After: Modular & Config-Driven Architecture

```mermaid
graph TB
    subgraph "Configuration Layer [NEW]"
        UI[ui-strings.json<br/>3.0KB]
        BIZ[business-rules.json<br/>2.2KB]
        FEAT[features.json<br/>854B]
        PDF[pdf-template.json<br/>2.6KB]
        TOK[design-tokens.json<br/>716B]
        DATA[demo-stories.json<br/>topics.json<br/>questions.json]
    end

    subgraph "Application Layer"
        direction TB

        HTML2[prototype-c.html<br/>Dynamic Containers]

        subgraph "CSS Modules (all < 800 lines)"
            BASE[base.css<br/>321 lines]
            COMP[components.css<br/>708 lines]
            SCREEN[screens.css<br/>687 lines]
            SHELF[stories-shelf.css<br/>510 lines]
            MODAL[stories-modal.css<br/>480 lines]
        end

        subgraph "JavaScript Modules"
            LOADER[config-loader.js<br/>Loads all config]
            SCOUT[preflight-audio.js<br/>Adaptive Quality]
            CORE[core.js<br/>558 lines]
            STORIES[stories.js<br/>639 lines]
            PRACTICE[practice.js<br/>466 lines]
        end

        VOICE2[voice.js<br/>Uses Adaptive Config]
    end

    %% Load sequence
    HTML2 --> LOADER
    LOADER -.->|"Fetches"| UI
    LOADER -.->|"Fetches"| BIZ
    LOADER -.->|"Fetches"| FEAT
    LOADER -.->|"Fetches"| PDF
    LOADER -.->|"Fetches"| TOK
    LOADER -.->|"Fetches"| DATA

    LOADER -->|"window.APP_CONFIG"| CORE
    LOADER -->|"window.APP_CONFIG"| STORIES
    LOADER -->|"window.APP_CONFIG"| PRACTICE

    HTML2 --> SCOUT
    SCOUT -.->|"Measures Network"| SCOUT
    SCOUT -->|"Adaptive Config"| VOICE2

    HTML2 --> BASE
    HTML2 --> COMP
    HTML2 --> SCREEN
    HTML2 --> SHELF
    HTML2 --> MODAL

    CORE --> STORIES
    STORIES --> PRACTICE

    Benefits["Benefits:<br/>✅ Easy to navigate<br/>✅ Config-driven (no code changes)<br/>✅ Adaptive audio quality<br/>✅ Single source of truth<br/>✅ All files < 800 lines"]

    style LOADER fill:#90EE90
    style SCOUT fill:#90EE90
    style UI fill:#E8F2ED
    style BIZ fill:#E8F2ED
    style FEAT fill:#E8F2ED
    style PDF fill:#E8F2ED
    style TOK fill:#E8F2ED
    style DATA fill:#E8F2ED
    style Benefits fill:#E8F9ED
```

## Config Loading Sequence

```mermaid
sequenceDiagram
    participant Browser
    participant HTML as prototype-c.html
    participant Loader as config-loader.js
    participant Configs as Config Files
    participant Scout as preflight-audio.js
    participant App as Core App (core/stories/practice)

    Browser->>HTML: Load page
    HTML->>Loader: Execute (blocking)

    activate Loader
    Loader->>Configs: Fetch all 8 configs (parallel)
    Configs-->>Loader: Return JSON data
    Loader->>Loader: Populate window.APP_CONFIG
    Loader->>Browser: Log: "✓ Config loaded"
    deactivate Loader

    HTML->>Scout: Execute preflight
    activate Scout
    Scout->>Scout: Measure network (bandwidth, latency)
    Scout->>Scout: Measure device (CPU, memory, battery)
    Scout->>Scout: Calculate optimal audio profile
    Scout->>Browser: Set window.PREPTALK_AUDIO_CONFIG
    Scout->>Browser: Log: "✓ Audio Scout Complete"
    deactivate Scout

    HTML->>App: Load application JS
    App->>Loader: Read window.APP_CONFIG
    App->>Scout: Read window.PREPTALK_AUDIO_CONFIG
    App->>Browser: Initialize UI with config
    Browser->>Browser: App ready 🎉
```

## Adaptive Audio Decision Flow

```mermaid
flowchart TD
    Start([Preflight Audio Scout Runs])
    Start --> Measure[Measure Network & Device]

    Measure --> Check{Check Conditions}

    Check -->|"Bandwidth > 5 Mbps<br/>4G Connection<br/>CPU >= 4 cores<br/>Not low battery"| High[HIGH Profile<br/>48kHz, 20ms, 128kbps]

    Check -->|"Bandwidth > 2 Mbps<br/>RTT < 200ms"| Medium[MEDIUM Profile<br/>24kHz, 40ms, 64kbps]

    Check -->|"Slow connection OR<br/>Low battery OR<br/>Limited CPU"| Low[LOW Profile<br/>16kHz, 60ms, 32kbps]

    High --> Store[Store in window.PREPTALK_AUDIO_CONFIG]
    Medium --> Store
    Low --> Store

    Store --> Debug{Debug Mode?<br/>?debug=1}

    Debug -->|Yes| Show[Show Telemetry Card<br/>Display Quality Indicator]
    Debug -->|No| Hide[Hide Telemetry]

    Show --> Use[voice.js Uses Adaptive Config]
    Hide --> Use

    Use --> End([Optimal Audio Quality])

    style High fill:#90EE90
    style Medium fill:#FFD700
    style Low fill:#FFA07A
    style Store fill:#E8F2ED
    style Show fill:#E8F2ED
```

## Configuration Externalization Flow

```mermaid
flowchart LR
    subgraph "Before: Hardcoded"
        Code1[core.js<br/>Hardcoded PDF sections]
        Code2[stories.js<br/>Hardcoded thresholds]
        Code3[HTML<br/>Hardcoded UI strings]
        Code4[CSS & JS<br/>Duplicate colors]
    end

    subgraph "After: Config-Driven"
        Config1[pdf-template.json<br/>Sections, colors, layout]
        Config2[business-rules.json<br/>Thresholds, calculations]
        Config3[ui-strings.json<br/>All copy]
        Config4[design-tokens.json<br/>Single source of truth]
    end

    Code1 -.->|"Extracted"| Config1
    Code2 -.->|"Extracted"| Config2
    Code3 -.->|"Extracted"| Config3
    Code4 -.->|"Extracted"| Config4

    Config1 --> Benefit1[Update PDF without code]
    Config2 --> Benefit2[Tune coaching algorithm]
    Config3 --> Benefit3[Edit copy instantly]
    Config4 --> Benefit4[Rebrand in minutes]

    style Code1 fill:#ffcccc
    style Code2 fill:#ffcccc
    style Code3 fill:#ffcccc
    style Code4 fill:#ffcccc

    style Config1 fill:#90EE90
    style Config2 fill:#90EE90
    style Config3 fill:#90EE90
    style Config4 fill:#90EE90

    style Benefit1 fill:#E8F9ED
    style Benefit2 fill:#E8F9ED
    style Benefit3 fill:#E8F9ED
    style Benefit4 fill:#E8F9ED
```

## File Size Optimization

```mermaid
graph LR
    subgraph "Before"
        BigCSS[prototype-c.css<br/>2,529 lines<br/>❌ Too large]
        BigJS[ui.js<br/>1,552 lines<br/>❌ Too large]
    end

    subgraph "After: All < 800 Lines ✅"
        Base[base.css<br/>321 lines]
        Comp[components.css<br/>708 lines]
        Screen[screens.css<br/>687 lines]
        Shelf[stories-shelf.css<br/>510 lines]
        Modal[stories-modal.css<br/>480 lines]

        Core[core.js<br/>558 lines]
        Stories[stories.js<br/>639 lines]
        Practice[practice.js<br/>466 lines]
    end

    BigCSS -.->|"Split at logical boundaries"| Base
    BigCSS -.->|"Split at logical boundaries"| Comp
    BigCSS -.->|"Split at logical boundaries"| Screen
    BigCSS -.->|"Split at logical boundaries"| Shelf
    BigCSS -.->|"Split at logical boundaries"| Modal

    BigJS -.->|"Split at function boundaries"| Core
    BigJS -.->|"Split at function boundaries"| Stories
    BigJS -.->|"Split at function boundaries"| Practice

    style BigCSS fill:#ffcccc
    style BigJS fill:#ffcccc

    style Base fill:#90EE90
    style Comp fill:#90EE90
    style Screen fill:#90EE90
    style Shelf fill:#90EE90
    style Modal fill:#90EE90
    style Core fill:#90EE90
    style Stories fill:#90EE90
    style Practice fill:#90EE90
```

---

## Key Takeaways

1. **Modular Architecture**: Every file has a clear, single responsibility
2. **Config-Driven**: Content and rules separate from code logic
3. **Adaptive Performance**: Quality adjusts to real-world conditions
4. **Maintainable**: All files under 800 lines, easy to navigate
5. **Production-Ready**: Professional patterns worthy of serious evaluation

**Result**: A codebase that's faster to iterate, easier to maintain, and performs better under varying conditions.
