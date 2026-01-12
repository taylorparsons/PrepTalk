# Plan

We’ll add session rehydration and export options while improving transcript rendering. The approach is to add `updated_at` ordering in storage, list/load sessions from the Session Tools drawer, and update transcript/markdown rendering with tests.

## Scope
- In: newest-first transcript display, markdown rendering in transcript + score summary, PDF/TXT export (PDF default, TXT includes score+rubric+transcript), session list + load/resume ordered by `updated_at` with rehydrate-only behavior.
- Out: auto-start on session select, auth/permissions, full asked-question progress UI.

## Action items
[ ] Add `updated_at` to session records and update on create/update in `app/services/store.py`; adjust session persistence tests.
[ ] Add a session list endpoint ordered by `updated_at` and confirm summary payload supports rehydration (`app/api.py`, `app/services/interview_service.py`).
[ ] Add Session Tools dropdown to load a previous session by id, rehydrate state (questions, transcript, score, session name), and allow rename without auto-start (`app/static/js/ui.js`).
[ ] Update transcript rendering to newest-first with top pinning; add unit tests for ordering (`app/static/js/ui.js`, `tests/components`).
[ ] Add safe markdown rendering for transcript + score summary; add tests for markdown formatting (`app/static/js/components/transcript-row.js`, `app/static/js/ui.js`).
[ ] Add export format selector (PDF default) and TXT export containing full content; update help text and tests.
[ ] Run `./run.sh test` and `./.venv/bin/python -m pytest`.

## Open questions
- Should TXT export be plain text or markdown-formatted text?
- Should the session dropdown show only the session name or include a timestamp in the option label?
