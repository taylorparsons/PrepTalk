from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppSettings:
    adapter: str
    live_model: str
    text_model: str
    voice_mode: str
    voice_tts_enabled: bool
    voice_tts_model: str
    voice_tts_models: tuple[str, ...]
    voice_tts_voice: str
    voice_tts_language: str
    voice_tts_timeout_ms: int
    voice_tts_wait_ms: int
    voice_turn_end_delay_ms: int
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


def load_settings() -> AppSettings:
    base_dir = Path(__file__).resolve().parent
    repo_root = base_dir.parent
    session_store = base_dir / "session_store"
    text_model = os.getenv("GEMINI_TEXT_MODEL", "gemini-3-pro-preview")
    tts_model = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
    tts_fallbacks = [model for model in _env_list("GEMINI_TTS_MODEL_FALLBACKS") if model != tts_model]
    if not tts_fallbacks:
        tts_fallbacks = ["gemini-2.5-flash-preview-tts"]
    voice_tts_timeout_ms = _env_int("VOICE_TTS_TIMEOUT_MS", 20000)
    voice_tts_wait_ms = _env_int("VOICE_TTS_WAIT_MS", 12000)
    voice_turn_end_delay_ms = _env_int("VOICE_TURN_END_DELAY_MS", 1500)
    return AppSettings(
        adapter=os.getenv("INTERVIEW_ADAPTER", "mock"),
        live_model=os.getenv(
            "GEMINI_LIVE_MODEL",
            "gemini-3-flash-preview",
        ),
        text_model=text_model,
        voice_mode=os.getenv("VOICE_MODE", "live"),
        voice_tts_enabled=_env_flag("VOICE_TTS_ENABLED", "0"),
        voice_tts_model=tts_model,
        voice_tts_models=tuple(dict.fromkeys([tts_model, *tts_fallbacks])),
        voice_tts_voice=os.getenv("GEMINI_TTS_VOICE", "Kore"),
        voice_tts_language=os.getenv("GEMINI_TTS_LANGUAGE", "en-US"),
        voice_tts_timeout_ms=voice_tts_timeout_ms,
        voice_tts_wait_ms=voice_tts_wait_ms,
        voice_turn_end_delay_ms=voice_turn_end_delay_ms,
        voice_output_mode=os.getenv("VOICE_OUTPUT_MODE", "browser"),
        api_base=os.getenv("APP_API_BASE", "/api"),
        session_store_dir=os.getenv("SESSION_STORE_DIR", str(session_store)),
        log_dir=os.getenv("LOG_DIR", str(repo_root / "logs")),
        user_id=os.getenv("APP_USER_ID", "local"),
        live_resume_enabled=_env_flag("GEMINI_LIVE_RESUME", "1")
    )
