# Change Request: Configuration Externalization

**Request ID**: CR-2026-001
**Date**: 2026-02-04
**Requester**: Jennifer McKinney
**Priority**: HIGH
**Status**: APPROVED

## Problem Statement

PrepTalk currently has hardcoded configuration scattered across HTML, JavaScript, and CSS files. Every content change, business rule adjustment, or design token update requires code modifications. This slows iteration speed and increases risk of inconsistency.

## Requested Change

Extract all configuration, content, and business rules into external JSON files that can be updated independently of code. Enable configuration-driven architecture where:

1. UI copy and messaging can be updated without touching HTML/JS
2. Business rules (readiness thresholds, filler word limits) can be tuned without code changes
3. Design tokens (colors, animations) are single-source-of-truth
4. Topics, questions, and examples are data-driven
5. Feature flags enable runtime toggles
6. PDF export templates are externalized

## Business Justification

**For Google Hackathon Demo:**
- Rapid iteration on coaching messages and feedback templates
- A/B test different business rules without rebuilds
- Demonstrate production-quality architecture

**Long-term Benefits:**
- Non-technical team members can update content
- Reduced QA burden (no code changes = lower risk)
- Foundation for localization and multi-language support
- Enables CMS integration in future

## Success Criteria

1. All UI strings moved to `config/ui-strings.json`
2. All business rules extracted to `config/business-rules.json`
3. Topics and questions data-driven from `data/topics.json`
4. Design tokens consolidated (no color duplication in CSS/JS)
5. Feature flags in `config/features.json`
6. Demo stories in `data/demo-stories.json`
7. PDF template in `config/pdf-template.json`
8. Config loader implemented with graceful fallbacks
9. Zero breaking changes to existing functionality
10. All 64 tests still passing

## Out of Scope

- Multi-language translation (foundation only)
- CMS integration (future work)
- Database-backed configuration

## Timeline

- Phase 1 (UI Copy, Business Rules, Demo Data): Immediate
- Phase 2 (Design System): Immediate
- Phase 3 (Topics/Questions, Feature Flags): Immediate
- All phases to be completed in single session

## Dependencies

- Existing localStorage state management (preserve)
- Current API endpoints (no backend changes required)
- Test suite (must pass after changes)

## Risks

- Config loading failures (mitigate with fallbacks)
- Race conditions (load config before app init)
- Increased initial load time (mitigate with bundling)

## Related Documents

- Decision: [/docs/decisions/config-extraction-decisions.md](../decisions/config-extraction-decisions.md)
- Spec: [/docs/specs/config-extraction-spec.md](../specs/config-extraction-spec.md)
