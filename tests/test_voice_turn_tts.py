import uuid

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
