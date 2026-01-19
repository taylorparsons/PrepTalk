# Plan

Research Google AI Studio and Gemini API documentation for Live audio models, then document model options and update the repo defaults to use a more stable choice with validation and tests.

## Scope
- In: web research for Gemini Live audio model options and stability labels, updating config/docs/tests to reflect the chosen default and allowed options.
- Out: redesigning the Live audio pipeline or adding new audio features beyond model selection.

## Action items
[ ] Review Gemini API Live docs and changelog for Live audio model options and stability status.
[ ] Verify which models appear in Google AI Studio Stream mode for this account/region.
[ ] Compile the model options list with source links and notes on stability/availability.
[ ] Choose a stable default model and a fallback option.
[ ] Update `GEMINI_LIVE_MODEL` documentation and any validation in `app/services/gemini_live.py` if needed.
[ ] Add/update a test covering the new default or allowed options list.

## Open questions
- Should "stable" mean GA-only, or is an older preview acceptable if no GA Live audio model exists?
