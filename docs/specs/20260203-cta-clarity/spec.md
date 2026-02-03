# Feature Spec: 20260203-cta-clarity

Status: Draft
Created: 2026-02-03 10:01
Inputs: CR-20260203-0949
Decisions: D-20260203-1001

## Summary
Define a stage-gated CTA hierarchy across Setup, Live, and Results so each screen has a single primary action, and hide/collapse panels until they contain relevant content.

## User Stories & Acceptance

### US1: Stage 1 CTA progression (Priority: P1)
Narrative:
- As a user, I want the setup CTAs to guide me from inputs to question generation to starting the interview, so I always know the next step.

Acceptance scenarios:
1. Given resume + job inputs are complete and questions are not generated, When the setup screen is shown, Then “Generate Questions” is the primary CTA and “Start Interview” is disabled. (Verifies: FR-001, FR-004)
2. Given questions are generated, When the setup screen is shown, Then “Start Interview” is the primary CTA and generation is no longer the primary action. (Verifies: FR-001, FR-004)
3. Given E2E tests are run in mock and live modes, When the CTA UI renders, Then tests assert primary/secondary CTA labels and states for each stage. (Verifies: FR-013)
4. Given a session is started, When Stage 2 loads, Then Candidate Setup is collapsed by default and transcript/controls are visible. (Verifies: FR-014, FR-015)
5. Given Stage 1 and no active session, When the app loads, Then transcript and score panels are hidden. (Verifies: FR-014)

### US2: Stage 2 CTA focus (Priority: P1)
Narrative:
- As a user in a live interview, I want a single dominant submit action and an easy help action, so I can focus on answering without UI clutter.

Acceptance scenarios:
1. Given the coach finishes speaking and the user has entered any answer text, When Stage 2 is active, Then “Submit Answer” is the primary CTA and “Request Help” is a secondary action. (Verifies: FR-002, FR-004)
2. Given the user is inactive for a short period, When Stage 2 is active, Then a non-blocking hint points to the help action without changing the primary CTA. (Verifies: FR-002, FR-004, FR-017)
3. Given the user clicks “Request Help,” When Stage 2 is active, Then a compact rubric card appears with 2–3 bullets based on the current question. (Verifies: FR-017)

### US3: Stage 3 results emphasis (Priority: P1)
Narrative:
- As a user who finished the interview, I want to restart easily and export my study guide, so I can iterate quickly and keep artifacts.

Acceptance scenarios:
1. Given scoring is complete, When Stage 3 is shown, Then “Restart Interview” is the primary CTA and export actions are secondary. (Verifies: FR-003, FR-004)
2. Given the score is ready, When Stage 3 is shown, Then the UI explicitly indicates that export options are available. (Verifies: FR-003)

### US4: Stage-gated panel visibility (Priority: P1)
Narrative:
- As a user, I only want to see panels when they have content, so the interface stays focused on the current task.

Acceptance scenarios:
1. Given no questions are generated, When Stage 1 loads, Then the questions list, insights panel, and session controls are hidden. (Verifies: FR-016)
2. Given no transcript entries exist, When Stage 1/2 loads, Then the transcript panel stays hidden until the first transcript entry arrives. (Verifies: FR-016)
3. Given a session is active, When Stage 2 loads, Then Candidate Setup is collapsed by default and the collapse toggle expands/re-collapses it on demand with the resume/job inputs hidden while collapsed. (Verifies: FR-014, FR-015)
4. Given scoring has started or completed, When Stage 3 loads, Then the score panel and export actions are visible; before scoring, the score panel remains hidden. (Verifies: FR-016)

## Requirements

Functional requirements:
- FR-001: Stage 1 uses a staged CTA hierarchy: inputs → “Generate Questions” (primary) → “Start Interview” (primary once questions are ready). (Sources: CR-20260203-0949; D-20260203-1001)
- FR-002: Stage 2 uses a single primary CTA (“Submit Answer”) when the coach finishes speaking; “Request Help” is secondary and a brief inactivity hint may surface without displacing the primary CTA. (Sources: CR-20260203-0949; D-20260203-1001)
- FR-003: Stage 3 makes “Restart Interview” the primary CTA and keeps export options (PDF/TXT) as secondary actions with a clear scoring-complete notice. (Sources: CR-20260203-0949; D-20260203-1001)
- FR-004: Exactly one primary CTA is visually dominant per stage, with disabled actions showing a short reason. (Sources: CR-20260203-0949; D-20260203-1001)
- FR-005: Documentation includes a Mermaid flow diagram that describes CTA gating across all three stages. (Sources: CR-20260203-0949)
- FR-006: Documentation includes an ASCII CTA summary per stage (primary + secondary actions). (Sources: CR-20260203-1017)
- FR-007: Documentation includes ASCII wireframes in code blocks for Stages 1–3. (Sources: CR-20260203-1022)
- FR-008: Documentation includes ASCII wireframes for mobile and web views of Stages 1–3, highlighting CTA placement. (Sources: CR-20260203-1024)
- FR-009: Documentation includes web-view wireframe images for Stages 1–3. (Sources: CR-20260203-1030)
- FR-010: Documentation includes mobile-view wireframe images for Stages 1–3. (Sources: CR-20260203-1034)
- FR-011: Wireframe images are embedded inline in the spec for quick review. (Sources: CR-20260203-1038)
- FR-012: Replace the “Advanced Setup” label with “Extras” wherever it appears in the CTA UI. (Sources: CR-20260203-1044)
- FR-013: Playwright E2E tests are updated to validate CTA changes in both mock and live runs. (Sources: CR-20260203-1050)
- FR-014: Stage gating hides or collapses containers without relevant content (setup, transcript, score, controls) to reduce CTA noise. (Sources: CR-20260203-1138; D-20260203-1138)
- FR-015: Candidate Setup collapses by default after a session starts and can be re-opened via the toggle. (Sources: CR-20260203-1138; D-20260203-1138)
- FR-016: Panels remain hidden until they have content (questions, insights, transcript, score/report, session controls). (Sources: CR-20260203-1146; D-20260203-1138)
- FR-017: Stage 2 shows a non-blocking help hint after brief inactivity and surfaces a compact rubric card when help is requested. (Sources: CR-20260203-1328; D-20260203-1328)

## Edge cases
- Missing inputs: “Start Interview” remains disabled and the reason is shown. (Verifies: FR-001, FR-004)
- Inactivity during Stage 2: help hint appears without interrupting transcript or submit flow. (Verifies: FR-002)

## CTA Summary (ASCII)
Stage 1 (Setup)
- Primary: Generate Questions → Start Interview (after questions ready)
- Secondary: Continue Session (if resumable)
- Tertiary: Extras (drawer)

Stage 2 (Turn-based)
- Primary: Submit Answer (after coach finishes + answer text exists)
- Secondary: Request Help, End Interview
- Tertiary: Questions (modal), Pin/Unpin, More (rubric)

Stage 3 (Results)
- Primary: Restart Interview
- Secondary: Export PDF, Export TXT
- Tertiary: View Transcript, Extras

## Wireframes (ASCII, Mobile + Web — CTA placement)
Key: (P = Primary, S = Secondary, T = Tertiary)
Stage 1 — Setup / Generate (Mobile)
```txt
+----------------------------+
| PrepTalk                   |
| 2-line intro               |
| [Inputs ready]             |
| [Questions ready]          |
|                            |
| Candidate Setup            |
| [Resume file]              |
| [Job file]                 |
| [Job URL]                  |
| [Generate Questions] (P)   |
|                            |
| Questions (hidden until    |
| generated)                 |
|                            |
| Session Controls (hidden   |
| until questions ready)     |
+----------------------------+
```

Stage 1 — Setup / Generate (Web)
```txt
+---------------------------------------------------------------+
| PrepTalk                                                      |
| 2-line intro text                                             |
| [Inputs ready] [Questions ready]                              |
|                                                               |
| Candidate Setup                   | Questions (hidden until   |
| [Resume file] [Job file] [URL]    | generated)                |
| [Generate Questions] (Primary)    |                           |
|                                                               |
| Session Controls (hidden until questions ready)               |
| (Start/Continue/Extras appear after questions)                |
+---------------------------------------------------------------+
```

Stage 2 — Live (Turn-based) (Mobile)
```txt
+----------------------------+
| Current Question           |
| [Pinned Insight] (opt)     |
|                            |
| Transcript (primary)       |
| coach: ...                 |
| user: ...                  |
|                            |
| [Submit Answer] (Primary)  |
| [Request Help] (Secondary) |
| [End Interview] (Secondary)|
| [Questions] (T) [More] (T) |
+----------------------------+
```

Stage 2 — Live (Turn-based) (Web)
```txt
+---------------------------------------------------------------+
| Current Question                                              |
| [Pinned Insight Card] (optional, collapsible)                 |
|                                                               |
| Transcript (primary surface)                                  |
| coach: ...                                                    |
| user: ...                                                     |
|                                                               |
| Controls                                                      |
| [Submit Answer] (Primary)                                     |
| [Request Help] (Secondary) [End Interview] (Secondary)        |
| [Questions] (Tertiary modal) [More] (Tertiary modal)           |
+---------------------------------------------------------------+
```

Stage 3 — Results / Export (Mobile)
```txt
+----------------------------+
| Score Summary              |
| [Score ready]              |
|                            |
| [Restart Interview] (P)    |
| [Export PDF] (S)           |
| [Export TXT] (S)           |
|                            |
| [View Transcript] (T)      |
| [Extras] (T)               |
+----------------------------+
```

Stage 3 — Results / Export (Web)
```txt
+---------------------------------------------------------------+
| Score Summary                                                  |
| [Score ready]                                                  |
|                                                               |
| [Restart Interview] (Primary)                                 |
| [Export PDF] (Secondary) [Export TXT] (Secondary)             |
|                                                               |
| Transcript (collapsed) [View Transcript] (Tertiary)           |
| Extras (Tertiary)                                             |
+---------------------------------------------------------------+
```

## Wireframes (SVG, Inline)
Stage 1 — Setup / Generate
Web
![Stage 1 Web Wireframe](assets/web-stage1.svg)
Mobile
![Stage 1 Mobile Wireframe](assets/mobile-stage1.svg)

Stage 2 — Live (Turn-based)
Web
![Stage 2 Web Wireframe](assets/web-stage2.svg)
Mobile
![Stage 2 Mobile Wireframe](assets/mobile-stage2.svg)

Stage 3 — Results / Export
Web
![Stage 3 Web Wireframe](assets/web-stage3.svg)
Mobile
![Stage 3 Mobile Wireframe](assets/mobile-stage3.svg)

Wireframe file paths (for direct access):
- `docs/specs/20260203-cta-clarity/assets/web-stage1.svg`
- `docs/specs/20260203-cta-clarity/assets/web-stage2.svg`
- `docs/specs/20260203-cta-clarity/assets/web-stage3.svg`
- `docs/specs/20260203-cta-clarity/assets/mobile-stage1.svg`
- `docs/specs/20260203-cta-clarity/assets/mobile-stage2.svg`
- `docs/specs/20260203-cta-clarity/assets/mobile-stage3.svg`

## Flow Diagram (Mermaid)
```mermaid
flowchart TD
  subgraph S1[Stage 1: Setup]
    A["Resume + Job inputs complete"]
    B["Generate Questions (Primary)"]
    C["Questions ready"]
    D["Start Interview (Primary)"]
    A --> B --> C --> D
  end

  subgraph S2[Stage 2: Turn-based]
    E["Coach finished speaking"]
    F["Submit Answer (Primary)"]
    G["Request Help (Secondary)"]
    H["Inactivity > short window"]
    I["Show help hint (non-blocking)"]
    E --> F
    E --> G
    E --> H --> I
    I -.-> G
  end

  subgraph S3[Stage 3: Results]
    J["Score complete notice"]
    K["Restart Interview (Primary)"]
    L["Export PDF (Secondary)"]
    M["Export TXT (Secondary)"]
    J --> K
    J --> L
    J --> M
  end

  D --> E
  F --> J
```
