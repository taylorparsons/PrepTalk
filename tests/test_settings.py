from app.settings import load_settings


def test_default_models(monkeypatch):
    monkeypatch.delenv("GEMINI_TEXT_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_LIVE_RESUME", raising=False)

    settings = load_settings()
    assert settings.text_model == "gemini-3-pro-preview"
    assert settings.live_model == "gemini-2.5-flash-native-audio-preview-12-2025"
    assert settings.live_resume_enabled is True
