import pytest

from app.services import gemini_tts


def test_generate_tts_audio_with_fallbacks_uses_first_success(monkeypatch):
    calls = []

    def fake_generate_tts_audio(*, model, **kwargs):
        calls.append(model)
        if model == "primary":
            raise RuntimeError("boom")
        return b"audio", "audio/wav"

    monkeypatch.setattr(gemini_tts, "generate_tts_audio", fake_generate_tts_audio)

    audio, mime, used_model = gemini_tts.generate_tts_audio_with_fallbacks(
        api_key="key",
        models=["primary", "fallback"],
        text="hello",
        voice_name=None,
        language_code=None
    )

    assert calls == ["primary", "fallback"]
    assert used_model == "fallback"
    assert audio == b"audio"
    assert mime == "audio/wav"


def test_generate_tts_audio_with_fallbacks_requires_models():
    with pytest.raises(RuntimeError):
        gemini_tts.generate_tts_audio_with_fallbacks(
            api_key="key",
            models=[],
            text="hello",
            voice_name=None,
            language_code=None
        )
