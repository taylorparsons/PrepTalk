from app.settings import load_settings


def test_default_models(monkeypatch):
    monkeypatch.delenv("INTERVIEW_ADAPTER", raising=False)
    monkeypatch.delenv("GEMINI_TEXT_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_INTERVIEW_TEXT_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_MODEL_FALLBACKS", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_RESUME", raising=False)
    monkeypatch.delenv("VOICE_MODE", raising=False)
    monkeypatch.delenv("VOICE_TTS_ENABLED", raising=False)
    monkeypatch.delenv("GEMINI_TTS_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_TTS_MODEL_FALLBACKS", raising=False)
    monkeypatch.delenv("GEMINI_TTS_VOICE", raising=False)
    monkeypatch.delenv("GEMINI_TTS_LANGUAGE", raising=False)
    monkeypatch.delenv("VOICE_TTS_TIMEOUT_MS", raising=False)
    monkeypatch.delenv("VOICE_TTS_WAIT_MS", raising=False)
    monkeypatch.delenv("VOICE_TTS_MAX_CHARS", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_TTS_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_TTS_VOICE", raising=False)
    monkeypatch.delenv("OPENAI_TTS_FORMAT", raising=False)
    monkeypatch.delenv("OPENAI_TTS_TIMEOUT_MS", raising=False)
    monkeypatch.delenv("VOICE_TURN_END_DELAY_MS", raising=False)
    monkeypatch.delenv("VOICE_TURN_COMPLETION_CONFIDENCE", raising=False)
    monkeypatch.delenv("VOICE_TURN_COMPLETION_COOLDOWN_MS", raising=False)
    monkeypatch.delenv("VOICE_OUTPUT_MODE", raising=False)
    monkeypatch.delenv("UI_DEV_MODE", raising=False)
    monkeypatch.delenv("APP_ACCESS_TOKENS", raising=False)
    monkeypatch.delenv("APP_REDACT_RESUME_PII", raising=False)

    settings = load_settings()
    assert settings.interview_text_model == "gemini-3-pro-preview"
    assert settings.text_model == "gemini-2.5-flash"
    assert settings.live_model == "gemini-2.5-flash-native-audio-preview-12-2025"
    assert settings.live_model_fallbacks == ()
    assert settings.ui_dev_mode is False
    assert settings.voice_mode == "turn"
    assert settings.live_resume_enabled is True
    assert settings.voice_tts_enabled is False
    assert settings.voice_tts_model == "gemini-2.5-flash-native-audio-preview-12-2025"
    assert settings.voice_tts_models == (
        "gemini-2.5-flash-native-audio-preview-12-2025",
        "gemini-2.5-pro-preview-tts"
    )
    assert settings.voice_tts_voice == "Kore"
    assert settings.voice_tts_language == "en-US"
    assert settings.voice_tts_timeout_ms == 20000
    assert settings.voice_tts_wait_ms == 2500
    assert settings.voice_tts_max_chars == 1800
    assert settings.openai_api_key is None
    assert settings.openai_tts_model == "gpt-4o-mini-tts"
    assert settings.openai_tts_voice == "alloy"
    assert settings.openai_tts_format == "wav"
    assert settings.openai_tts_timeout_ms == 20000
    assert settings.voice_turn_end_delay_ms == 10000
    assert settings.voice_turn_completion_confidence == 0.9
    assert settings.voice_turn_completion_cooldown_ms == 0
    assert settings.voice_output_mode == "browser"
    assert settings.access_tokens == ()
    assert settings.redact_resume_pii is True


def test_live_model_fallbacks_default_when_overridden(monkeypatch):
    monkeypatch.setenv("GEMINI_LIVE_MODEL", "gemini-3-flash-preview")
    monkeypatch.delenv("GEMINI_LIVE_MODEL_FALLBACKS", raising=False)
    monkeypatch.delenv("UI_DEV_MODE", raising=False)

    settings = load_settings()

    assert settings.live_model == "gemini-3-flash-preview"
    assert settings.live_model_fallbacks == ("gemini-2.5-flash-native-audio-preview-12-2025",)


def test_dev_mode_forces_native_audio_live_model(monkeypatch):
    monkeypatch.setenv("UI_DEV_MODE", "1")
    monkeypatch.setenv("GEMINI_LIVE_MODEL", "gemini-3-flash-preview")
    monkeypatch.delenv("GEMINI_LIVE_MODEL_FALLBACKS", raising=False)

    settings = load_settings()

    assert settings.ui_dev_mode is True
    assert settings.live_model == "gemini-2.5-flash-native-audio-preview-12-2025"


def test_gemini_adapter_defaults_enable_tts_and_auto_output(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "gemini")
    monkeypatch.delenv("VOICE_TTS_ENABLED", raising=False)
    monkeypatch.delenv("VOICE_OUTPUT_MODE", raising=False)

    settings = load_settings()

    assert settings.voice_tts_enabled is True
    assert settings.voice_output_mode == "auto"


def test_access_tokens_and_redaction_flag(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKENS", "token-a, token-b:user-b")
    monkeypatch.setenv("APP_REDACT_RESUME_PII", "0")

    settings = load_settings()

    assert settings.access_tokens == ("token-a", "token-b:user-b")
    assert settings.redact_resume_pii is False


def test_voice_tts_max_chars_config(monkeypatch):
    monkeypatch.setenv("VOICE_TTS_MAX_CHARS", "420")
    settings = load_settings()
    assert settings.voice_tts_max_chars == 420


def test_openai_tts_settings(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    monkeypatch.setenv("OPENAI_TTS_VOICE", "alloy")
    monkeypatch.setenv("OPENAI_TTS_FORMAT", "mp3")
    monkeypatch.setenv("OPENAI_TTS_TIMEOUT_MS", "33333")

    settings = load_settings()

    assert settings.openai_api_key == "sk-test"
    assert settings.openai_tts_model == "gpt-4o-mini-tts"
    assert settings.openai_tts_voice == "alloy"
    assert settings.openai_tts_format == "mp3"
    assert settings.openai_tts_timeout_ms == 33333


def test_tts_fallback_defaults_when_env_is_blank(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "gemini")
    monkeypatch.setenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
    monkeypatch.setenv("GEMINI_TTS_MODEL_FALLBACKS", "   ")

    settings = load_settings()

    assert settings.voice_tts_models == (
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-flash-native-audio-preview-12-2025",
    )


def test_live_fallback_defaults_when_env_is_blank(monkeypatch):
    monkeypatch.setenv("GEMINI_LIVE_MODEL", "gemini-3-flash-preview")
    monkeypatch.setenv("GEMINI_LIVE_MODEL_FALLBACKS", " ")
    monkeypatch.delenv("UI_DEV_MODE", raising=False)

    settings = load_settings()

    assert settings.live_model_fallbacks == ("gemini-2.5-flash-native-audio-preview-12-2025",)


def test_voice_mode_live_config(monkeypatch):
    monkeypatch.setenv("VOICE_MODE", "live")
    settings = load_settings()
    assert settings.voice_mode == "live"


def test_voice_mode_invalid_defaults_to_turn(monkeypatch):
    monkeypatch.setenv("VOICE_MODE", "desktop")
    settings = load_settings()
    assert settings.voice_mode == "turn"
