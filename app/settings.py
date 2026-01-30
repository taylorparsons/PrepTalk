from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppSettings:
    adapter: str
    live_model: str
    live_model_fallbacks: tuple[str, ...]
    interview_text_model: str
    text_model: str
    ui_dev_mode: bool
    voice_mode: str
    voice_tts_enabled: bool
    voice_tts_model: str
    voice_tts_models: tuple[str, ...]
    voice_tts_voice: str
    voice_tts_language: str
    voice_tts_timeout_ms: int
    voice_tts_wait_ms: int
    voice_turn_end_delay_ms: int
    voice_turn_completion_confidence: float
    voice_turn_completion_cooldown_ms: int
    voice_output_mode: str
    api_base: str
    session_store_dir: str
    log_dir: str
    user_id: str
    live_resume_enabled: bool


def _env_flag(name: str, default: str = "0") -> bool:
    value = os.getenv(name, default)
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str) -> list[str]:
    value = os.getenv(name, "")
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def load_settings() -> AppSettings:
    base_dir = Path(__file__).resolve().parent
    repo_root = base_dir.parent
    session_store = base_dir / "session_store"
    adapter = os.getenv("INTERVIEW_ADAPTER", "mock")
    ui_dev_mode = _env_flag("UI_DEV_MODE", "0")

    interview_text_model = os.getenv("GEMINI_INTERVIEW_TEXT_MODEL", "gemini-3-pro-preview")
    text_model = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
    dev_live_model = "gemini-2.5-flash-native-audio-preview-12-2025"
    live_model = dev_live_model if ui_dev_mode else os.getenv("GEMINI_LIVE_MODEL", dev_live_model)
    live_fallbacks = [
        model for model in _env_list("GEMINI_LIVE_MODEL_FALLBACKS") if model != live_model
    ]
    default_live_fallback = "gemini-2.5-flash-native-audio-preview-12-2025"
    if "GEMINI_LIVE_MODEL_FALLBACKS" not in os.environ and live_model != default_live_fallback:
        live_fallbacks = [default_live_fallback]

    default_tts_model = "gemini-2.5-flash-native-audio-preview-12-2025"
    default_tts_fallback = "gemini-2.5-pro-preview-tts"
    tts_model = os.getenv("GEMINI_TTS_MODEL", default_tts_model)
    tts_fallbacks = [
        model for model in _env_list("GEMINI_TTS_MODEL_FALLBACKS") if model != tts_model
    ]
    if "GEMINI_TTS_MODEL_FALLBACKS" not in os.environ:
        if tts_model == default_tts_model:
            tts_fallbacks = [default_tts_fallback]
        elif tts_model != default_tts_model:
            tts_fallbacks = [default_tts_model]

    voice_tts_timeout_ms = _env_int("VOICE_TTS_TIMEOUT_MS", 20000)
    voice_tts_wait_ms = _env_int("VOICE_TTS_WAIT_MS", 2500)
    voice_turn_end_delay_ms = _env_int("VOICE_TURN_END_DELAY_MS", 10000)
    voice_turn_completion_confidence = _env_float("VOICE_TURN_COMPLETION_CONFIDENCE", 0.9)
    voice_turn_completion_cooldown_ms = _env_int("VOICE_TURN_COMPLETION_COOLDOWN_MS", 0)
    return AppSettings(
        adapter=adapter,
        live_model=live_model,
        live_model_fallbacks=tuple(live_fallbacks),
        interview_text_model=interview_text_model,
        text_model=text_model,
        ui_dev_mode=ui_dev_mode,
        voice_mode=os.getenv("VOICE_MODE", "live"),
        voice_tts_enabled=_env_flag("VOICE_TTS_ENABLED", "1" if adapter == "gemini" else "0"),
        voice_tts_model=tts_model,
        voice_tts_models=tuple(dict.fromkeys([tts_model, *tts_fallbacks])),
        voice_tts_voice=os.getenv("GEMINI_TTS_VOICE", "Kore"),
        voice_tts_language=os.getenv("GEMINI_TTS_LANGUAGE", "en-US"),
        voice_tts_timeout_ms=voice_tts_timeout_ms,
        voice_tts_wait_ms=voice_tts_wait_ms,
        voice_turn_end_delay_ms=voice_turn_end_delay_ms,
        voice_turn_completion_confidence=voice_turn_completion_confidence,
        voice_turn_completion_cooldown_ms=voice_turn_completion_cooldown_ms,
        voice_output_mode=os.getenv("VOICE_OUTPUT_MODE", "auto" if adapter == "gemini" else "browser"),
        api_base=os.getenv("APP_API_BASE", "/api"),
        session_store_dir=os.getenv("SESSION_STORE_DIR", str(session_store)),
        log_dir=os.getenv("LOG_DIR", str(repo_root / "logs")),
        user_id=os.getenv("APP_USER_ID", "local"),
        live_resume_enabled=_env_flag("GEMINI_LIVE_RESUME", "1")
    )
