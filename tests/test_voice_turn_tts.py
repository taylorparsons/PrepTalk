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
