import base64

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


def test_generate_tts_audio_logs_peas_eval(monkeypatch):
    messages = []

    class _DummyLogger:
        def info(self, msg, *args):
            messages.append(msg % args if args else msg)

        def exception(self, msg, *args):
            messages.append(msg % args if args else msg)

    class _FakeResponse:
        def __init__(self, model):
            self.model = model
            self.candidates = [
                {
                    "content": {
                        "parts": [
                            {
                                "inline_data": {
                                    "data": base64.b64encode(b"audio").decode("ascii"),
                                    "mime_type": "audio/wav"
                                }
                            }
                        ]
                    }
                }
            ]

    class _FakeModels:
        def generate_content(self, model, contents, config=None):
            return _FakeResponse(model)

    class _FakeClient:
        def __init__(self, **kwargs):
            self.models = _FakeModels()

    class _FakeGenAI:
        def Client(self, **kwargs):
            return _FakeClient(**kwargs)

    monkeypatch.setattr(gemini_tts, "genai", _FakeGenAI())
    monkeypatch.setattr(gemini_tts, "types", None)
    monkeypatch.setattr(gemini_tts, "logger", _DummyLogger())

    audio, mime = gemini_tts.generate_tts_audio(
        api_key="key",
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        text="Hello",
        voice_name=None,
        language_code=None
    )

    assert audio == b"audio"
    assert mime == "audio/wav"
    assert any(
        "event=peas_eval" in message
        and "category=gemini_tts" in message
        and "status=complete" in message
        for message in messages
    )
