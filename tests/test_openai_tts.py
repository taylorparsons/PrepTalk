import types

from app.services import openai_tts


def test_audio_format_to_mime_defaults_to_wav():
    assert openai_tts._audio_format_to_mime("wav") == "audio/wav"
    assert openai_tts._audio_format_to_mime("mp3") == "audio/mpeg"
    assert openai_tts._audio_format_to_mime("unknown") == "audio/wav"


def test_generate_openai_tts_audio_reads_response(monkeypatch):
    captured_kwargs = {}

    class _FakeSpeechResponse:
        def read(self):
            return b"RIFFfakewav"

    class _FakeSpeech:
        def create(self, **kwargs):
            captured_kwargs.update(kwargs)
            return _FakeSpeechResponse()

    class _FakeAudio:
        speech = _FakeSpeech()

    class _FakeClient:
        def __init__(self, **kwargs):
            self.audio = _FakeAudio()

    monkeypatch.setattr(openai_tts, "OpenAI", _FakeClient)

    audio, mime = openai_tts.generate_openai_tts_audio(
        api_key="sk-test",
        model="gpt-4o-mini-tts",
        text="hello",
        voice="alloy",
        audio_format="wav",
        timeout_ms=1000
    )

    assert audio.startswith(b"RIFF")
    assert mime == "audio/wav"
    assert captured_kwargs["response_format"] == "wav"
    assert "format" not in captured_kwargs


def test_generate_openai_tts_audio_requires_package(monkeypatch):
    monkeypatch.setattr(openai_tts, "OpenAI", None)

    try:
        openai_tts.generate_openai_tts_audio(
            api_key="sk-test",
            model="gpt-4o-mini-tts",
            text="hello",
            voice="alloy",
            audio_format="wav",
            timeout_ms=1000
        )
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "openai package is required" in str(exc)
