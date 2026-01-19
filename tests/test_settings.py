from app.settings import load_settings


def test_default_models(monkeypatch):
    monkeypatch.delenv("GEMINI_TEXT_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_RESUME", raising=False)
    monkeypatch.delenv("VOICE_MODE", raising=False)
    monkeypatch.delenv("VOICE_TTS_ENABLED", raising=False)
    monkeypatch.delenv("GEMINI_TTS_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_TTS_MODEL_FALLBACKS", raising=False)
    monkeypatch.delenv("GEMINI_TTS_VOICE", raising=False)
    monkeypatch.delenv("GEMINI_TTS_LANGUAGE", raising=False)
    monkeypatch.delenv("VOICE_TTS_TIMEOUT_MS", raising=False)
    monkeypatch.delenv("VOICE_TTS_WAIT_MS", raising=False)
    monkeypatch.delenv("VOICE_TURN_END_DELAY_MS", raising=False)
    monkeypatch.delenv("VOICE_OUTPUT_MODE", raising=False)

    settings = load_settings()
    assert settings.text_model == "gemini-3-pro-preview"
    assert settings.live_model == "gemini-3-flash-preview"
    assert settings.voice_mode == "live"
    assert settings.live_resume_enabled is True
    assert settings.voice_tts_enabled is False
    assert settings.voice_tts_model == "gemini-2.5-flash-tts"
    assert settings.voice_tts_models == ("gemini-2.5-flash-tts", "gemini-2.5-flash-preview-tts")
    assert settings.voice_tts_voice == "Kore"
    assert settings.voice_tts_language == "en-US"
    assert settings.voice_tts_timeout_ms == 20000
    assert settings.voice_tts_wait_ms == 12000
    assert settings.voice_turn_end_delay_ms == 1500
    assert settings.voice_output_mode == "browser"
