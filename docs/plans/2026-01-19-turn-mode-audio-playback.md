# Turn-Mode Audio Playback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure turn-mode coach audio is reliably audible in Chrome, with browser TTS as the default and server TTS as best-effort only.

**Architecture:** Turn-mode responses should return immediately with text, while browser TTS speaks in Chrome by default. Server TTS remains optional for higher-quality audio, but failures/timeouts must not block playback. The UI should explicitly default to browser output in turn mode and set the speech language to en-US.

**Tech Stack:** FastAPI (Python), google-genai, vanilla JS UI, SpeechSynthesis (Chrome), Vitest, pytest.

---

### Task 1: Update default TTS settings and validate against docs

**Files:**
- Modify: `app/settings.py`
- Modify: `tests/test_settings.py`
- Modify: `README.md`
- Modify: `DEVELOPER_GUIDE.md`

**Step 1: Write the failing test** (@test-driven-development)

Update `tests/test_settings.py` to assert the new defaults:
```python
def test_default_models(monkeypatch):
    # ... existing env cleanup ...
    settings = load_settings()
    assert settings.voice_tts_model == "gemini-2.5-flash-tts"
    assert settings.voice_tts_models == ("gemini-2.5-flash-tts", "gemini-2.5-flash-preview-tts")
    assert settings.voice_output_mode == "browser"
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_settings.py::test_default_models -v`  
Expected: FAIL because defaults are still `gemini-2.5-flash-preview-tts` and `auto`.

**Step 3: Write minimal implementation**

In `app/settings.py`, update defaults to the stable model (verify in docs before editing):
```python
tts_model = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
tts_fallbacks = _env_list("GEMINI_TTS_MODEL_FALLBACKS")
if not tts_fallbacks:
    tts_fallbacks = ["gemini-2.5-flash-preview-tts"]
voice_output_mode=os.getenv("VOICE_OUTPUT_MODE", "browser"),
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_settings.py::test_default_models -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app/settings.py tests/test_settings.py README.md DEVELOPER_GUIDE.md
git commit -m "p0: default turn audio to browser and set stable TTS models"
```

---

### Task 2: Skip server TTS when browser output is default (turn mode)

**Files:**
- Modify: `app/services/interview_service.py`
- Create: `tests/test_voice_turn_tts.py`

**Step 1: Write the failing test** (@test-driven-development)

Create `tests/test_voice_turn_tts.py`:
```python
from app.services import interview_service

def test_turn_mode_skips_tts_when_browser_output(monkeypatch):
    monkeypatch.setenv("VOICE_OUTPUT_MODE", "browser")
    monkeypatch.setenv("VOICE_TTS_ENABLED", "1")

    called = {"tts": False}
    monkeypatch.setattr(
        interview_service,
        "generate_tts_audio_with_fallbacks",
        lambda *args, **kwargs: called.__setitem__("tts", True)
    )

    # Minimal adapter + store setup can reuse existing helpers; use mock adapter in tests
    # Expect: no TTS call when browser output is default
    interview_service.run_voice_turn(
        interview_id="test",
        text="hello",
        user_id="user",
        text_model="gemini-3-flash-preview",
        tts_model=None,
    )
    assert called["tts"] is False
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_voice_turn_tts.py -v`  
Expected: FAIL because TTS is still called.

**Step 3: Write minimal implementation**

In `app/services/interview_service.py`, skip TTS when output mode is browser:
```python
settings = getattr(adapter, "settings", None) or load_settings()
if settings.voice_tts_enabled and settings.voice_output_mode != "browser":
    # existing TTS generation logic
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_voice_turn_tts.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app/services/interview_service.py tests/test_voice_turn_tts.py
git commit -m "p0: skip server tts when browser output is default"
```

---

### Task 3: Default turn mode to browser output and set en-US speech language

**Files:**
- Modify: `app/main.py`
- Modify: `app/static/js/config.js`
- Modify: `app/static/js/ui.js`
- Modify: `tests/components/voice-output-mode.test.js`

**Step 1: Write the failing test** (@test-driven-development)

Extend `tests/components/voice-output-mode.test.js`:
```js
it('defaults to browser output in turn mode', () => {
  window.__APP_CONFIG__ = { voiceMode: 'turn', voiceOutputMode: 'auto' };
  const layout = buildVoiceLayout();
  document.body.appendChild(layout);
  const select = document.querySelector('[data-testid="voice-output-select"]');
  expect(select.value).toBe('browser');
});

it('sets SpeechSynthesis language to en-US', () => {
  window.__APP_CONFIG__ = { voiceMode: 'turn', voiceOutputMode: 'browser', voiceTtsLanguage: 'en-US' };
  const speak = vi.fn();
  window.speechSynthesis = { speak, cancel: vi.fn() };
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
    this.text = text;
  };
  const layout = buildVoiceLayout();
  document.body.appendChild(layout);
  window.__e2ePlayCoachReply({ text: 'Hello', audio: null });
  vi.advanceTimersByTime(1000);
  expect(speak.mock.calls[0][0].lang).toBe('en-US');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/voice-output-mode.test.js`  
Expected: FAIL (select not browser, no `lang` set, hook missing).

**Step 3: Write minimal implementation**

In `app/main.py`, include the language in config:
```python
"voiceTtsLanguage": settings.voice_tts_language,
```

In `app/static/js/config.js`, accept `voiceTtsLanguage`:
```js
voiceTtsLanguage: config.voiceTtsLanguage || 'en-US',
```

In `app/static/js/ui.js`:
```js
state.voiceTtsLanguage = config.voiceTtsLanguage || 'en-US';

function applyVoiceMode(value) {
  // ...
  if (nextMode === 'turn' && state.voiceOutputMode === 'auto') {
    applyVoiceOutputMode('browser');
    if (ui.voiceOutputSelect) ui.voiceOutputSelect.value = 'browser';
  }
  updateMeta();
}

function speakCoachReply(text) {
  // ...
  const utterance = new SpeechSynthesisUtterance(reply);
  utterance.lang = state.voiceTtsLanguage || 'en-US';
  // ...
}

if (typeof window !== 'undefined' && window.__E2E__) {
  window.__e2ePlayCoachReply = playCoachReply;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/voice-output-mode.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app/main.py app/static/js/config.js app/static/js/ui.js tests/components/voice-output-mode.test.js
git commit -m "p0: default turn output to browser and set en-us speech lang"
```

---

### Task 4: Validation + Chrome smoke test

**Files:** None

**Step 1: Run unit tests**

Run: `./.venv/bin/python -m pytest`  
Expected: PASS.

**Step 2: Run UI tests**

Run: `./run.sh test`  
Expected: PASS.

**Step 3: Chrome voice smoke test (manual)**

- `./run.sh ui`
- Open `http://localhost:8000` in Chrome.
- Set Voice mode = Turn-based (TTS).
- Confirm Coach audio output = Browser TTS (default).
- Generate questions, start session, answer a turn.
- Expected: coach audio is audible immediately.

**Step 4: Record go/no-go**

If Chrome is silent, stop and report P0 failure (project cancelled).

---

Plan complete and saved to `docs/plans/2026-01-19-turn-mode-audio-playback.md`.

Two execution options:
1) Subagent-Driven (this session) – I dispatch a fresh subagent per task with code review.  
2) Parallel Session (separate) – Use executing-plans in a new session.

Which approach?**
