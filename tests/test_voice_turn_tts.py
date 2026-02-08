import uuid
from concurrent.futures import TimeoutError as FutureTimeout

from app.services import interview_service
from app.services.store import store


def test_turn_mode_skips_tts_when_browser_output(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "mock")
    monkeypatch.setenv("VOICE_TTS_ENABLED", "1")
    monkeypatch.setenv("VOICE_OUTPUT_MODE", "browser")

    called = {"tts": False}

    def fake_build_mock_tts_audio():
        called["tts"] = True
        return b"audio", "audio/wav"

    monkeypatch.setattr(interview_service, "build_mock_tts_audio", fake_build_mock_tts_audio)

    interview_id = f"turn-tts-{uuid.uuid4()}"
    store.create(
        interview_id=interview_id,
        adapter="mock",
        role_title=None,
        questions=["Tell me about a challenge you solved."],
        focus_areas=[],
        user_id="user"
    )

    response = interview_service.run_voice_turn(
        interview_id=interview_id,
        text="Hello",
        user_id="user"
    )

    assert response["coach_audio"] is None
    assert called["tts"] is False


def test_generate_tts_with_wait_extends_to_timeout_budget(monkeypatch):
    class _Settings:
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_wait_ms = 10
        voice_tts_timeout_ms = 50

    class _Future:
        def __init__(self):
            self.calls = 0

        def result(self, timeout=None):
            self.calls += 1
            if self.calls == 1:
                raise FutureTimeout()
            return b"audio", "audio/wav", "gemini-2.5-pro-preview-tts"

        def cancel(self):
            return None

    class _Executor:
        def submit(self, _fn, **_kwargs):
            return _Future()

    monkeypatch.setattr(interview_service, "_TTS_EXECUTOR", _Executor())

    audio, mime = interview_service._generate_tts_with_wait(
        event_name="voice_intro_tts",
        interview_id="interview",
        user_id="user",
        api_key="key",
        models=["gemini-2.5-pro-preview-tts"],
        text="hello",
        settings=_Settings()
    )

    assert audio == b"audio"
    assert mime == "audio/wav"


def test_generate_tts_with_wait_returns_none_after_final_timeout(monkeypatch):
    class _Settings:
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_wait_ms = 10
        voice_tts_timeout_ms = 20

    class _Future:
        def result(self, timeout=None):
            raise FutureTimeout()

        def cancel(self):
            return None

    class _Executor:
        def submit(self, _fn, **_kwargs):
            return _Future()

    monkeypatch.setattr(interview_service, "_TTS_EXECUTOR", _Executor())

    audio, mime = interview_service._generate_tts_with_wait(
        event_name="voice_intro_tts",
        interview_id="interview",
        user_id="user",
        api_key="key",
        models=["gemini-2.5-pro-preview-tts"],
        text="hello",
        settings=_Settings()
    )

    assert audio is None
    assert mime is None


def test_generate_tts_with_provider_fallback_uses_openai_on_gemini_error(monkeypatch):
    class _Adapter:
        name = "gemini"
        api_key = "gemini-key"

    class _Settings:
        voice_tts_models = ("gemini-2.5-pro-preview-tts",)
        voice_tts_model = "gemini-2.5-pro-preview-tts"
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_timeout_ms = 20000
        voice_tts_wait_ms = 2500
        openai_api_key = "openai-key"
        openai_tts_model = "gpt-4o-mini-tts"
        openai_tts_voice = "alloy"
        openai_tts_format = "wav"
        openai_tts_timeout_ms = 20000

    def fake_generate_tts_with_wait(**_kwargs):
        raise RuntimeError("gemini quota")

    def fake_openai_with_wait(**_kwargs):
        return b"openai-audio", "audio/wav"

    monkeypatch.setattr(interview_service, "_generate_tts_with_wait", fake_generate_tts_with_wait)
    monkeypatch.setattr(interview_service, "_generate_openai_tts_with_wait", fake_openai_with_wait)

    audio, mime = interview_service._generate_tts_with_provider_fallback(
        event_name="voice_help_tts",
        interview_id="interview",
        user_id="user",
        adapter=_Adapter(),
        settings=_Settings(),
        text="hello",
        tts_model_override=None
    )

    assert audio == b"openai-audio"
    assert mime == "audio/wav"


def test_generate_tts_with_provider_fallback_uses_openai_on_gemini_empty_audio(monkeypatch):
    class _Adapter:
        name = "gemini"
        api_key = "gemini-key"

    class _Settings:
        voice_tts_models = ("gemini-2.5-pro-preview-tts",)
        voice_tts_model = "gemini-2.5-pro-preview-tts"
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_timeout_ms = 20000
        voice_tts_wait_ms = 2500
        openai_api_key = "openai-key"
        openai_tts_model = "gpt-4o-mini-tts"
        openai_tts_voice = "alloy"
        openai_tts_format = "wav"
        openai_tts_timeout_ms = 20000

    def fake_generate_tts_with_wait(**_kwargs):
        return None, None

    def fake_openai_with_wait(**_kwargs):
        return b"openai-audio", "audio/wav"

    monkeypatch.setattr(interview_service, "_generate_tts_with_wait", fake_generate_tts_with_wait)
    monkeypatch.setattr(interview_service, "_generate_openai_tts_with_wait", fake_openai_with_wait)

    audio, mime = interview_service._generate_tts_with_provider_fallback(
        event_name="voice_help_tts",
        interview_id="interview",
        user_id="user",
        adapter=_Adapter(),
        settings=_Settings(),
        text="hello",
        tts_model_override=None
    )

    assert audio == b"openai-audio"
    assert mime == "audio/wav"


def test_generate_tts_with_provider_openai_first(monkeypatch):
    class _Adapter:
        name = "gemini"
        api_key = "gemini-key"

    class _Settings:
        voice_tts_provider = "openai"
        voice_tts_models = ("gemini-2.5-pro-preview-tts",)
        voice_tts_model = "gemini-2.5-pro-preview-tts"
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_timeout_ms = 20000
        voice_tts_wait_ms = 2500
        openai_api_key = "openai-key"
        openai_tts_model = "gpt-4o-mini-tts"
        openai_tts_voice = "alloy"
        openai_tts_format = "wav"
        openai_tts_timeout_ms = 20000

    called = {"gemini": 0}

    def fake_generate_tts_with_wait(**_kwargs):
        called["gemini"] += 1
        return b"gemini-audio", "audio/wav"

    def fake_openai_with_wait(**_kwargs):
        return b"openai-audio", "audio/wav"

    monkeypatch.setattr(interview_service, "_generate_tts_with_wait", fake_generate_tts_with_wait)
    monkeypatch.setattr(interview_service, "_generate_openai_tts_with_wait", fake_openai_with_wait)

    audio, mime = interview_service._generate_tts_with_provider_fallback(
        event_name="voice_tts",
        interview_id="interview",
        user_id="user",
        adapter=_Adapter(),
        settings=_Settings(),
        text="hello",
        tts_model_override=None
    )

    assert audio == b"openai-audio"
    assert mime == "audio/wav"
    assert called["gemini"] == 0


def test_generate_tts_with_provider_gemini_first(monkeypatch):
    class _Adapter:
        name = "gemini"
        api_key = "gemini-key"

    class _Settings:
        voice_tts_provider = "gemini"
        voice_tts_models = ("gemini-2.5-pro-preview-tts",)
        voice_tts_model = "gemini-2.5-pro-preview-tts"
        voice_tts_voice = "Kore"
        voice_tts_language = "en-US"
        voice_tts_timeout_ms = 20000
        voice_tts_wait_ms = 2500
        openai_api_key = "openai-key"
        openai_tts_model = "gpt-4o-mini-tts"
        openai_tts_voice = "alloy"
        openai_tts_format = "wav"
        openai_tts_timeout_ms = 20000

    called = {"openai": 0}

    def fake_generate_tts_with_wait(**_kwargs):
        return b"gemini-audio", "audio/wav"

    def fake_openai_with_wait(**_kwargs):
        called["openai"] += 1
        return b"openai-audio", "audio/wav"

    monkeypatch.setattr(interview_service, "_generate_tts_with_wait", fake_generate_tts_with_wait)
    monkeypatch.setattr(interview_service, "_generate_openai_tts_with_wait", fake_openai_with_wait)

    audio, mime = interview_service._generate_tts_with_provider_fallback(
        event_name="voice_tts",
        interview_id="interview",
        user_id="user",
        adapter=_Adapter(),
        settings=_Settings(),
        text="hello",
        tts_model_override=None
    )

    assert audio == b"gemini-audio"
    assert mime == "audio/wav"
    assert called["openai"] == 0


def test_prepare_tts_text_truncates_long_content():
    class _Settings:
        voice_tts_max_chars = 120

    long_text = (
        "This is a long coach response that should be shortened for speech synthesis to avoid long waits. "
        "It includes extra details that can still remain in transcript text."
    )
    trimmed, was_truncated = interview_service._prepare_tts_text(long_text, _Settings())

    assert was_truncated is True
    assert len(trimmed) <= 123
    assert trimmed.endswith((".", "!", "?", "..."))


def test_prepare_tts_text_keeps_short_content():
    class _Settings:
        voice_tts_max_chars = 200

    text = "Short response."
    trimmed, was_truncated = interview_service._prepare_tts_text(text, _Settings())
    assert was_truncated is False
    assert trimmed == text


def test_ensure_tts_footer_restores_missing_footer_within_budget():
    text = "Resume-grounded draft: Strong answer with evidence and missing details."
    footer = "Answer in your own words."

    adjusted, changed = interview_service._ensure_tts_footer(
        text,
        footer=footer,
        max_chars=120
    )

    assert changed is True
    assert adjusted.endswith(footer)
    assert len(adjusted) <= 120


def test_ensure_tts_footer_noop_when_footer_already_present():
    footer = "Answer in your own words."
    text = f"Resume-grounded draft: concise help.\n{footer}"

    adjusted, changed = interview_service._ensure_tts_footer(
        text,
        footer=footer,
        max_chars=200
    )

    assert changed is False
    assert adjusted == text
