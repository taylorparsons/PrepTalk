from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class AppSettings:
    adapter: str
    live_model: str
    text_model: str
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


def load_settings() -> AppSettings:
    base_dir = Path(__file__).resolve().parent
    repo_root = base_dir.parent
    session_store = base_dir / "session_store"
    return AppSettings(
        adapter=os.getenv("INTERVIEW_ADAPTER", "mock"),
        live_model=os.getenv(
            "GEMINI_LIVE_MODEL",
            "gemini-2.5-flash-native-audio-preview-12-2025",
        ),
        text_model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3-pro-preview"),
        api_base=os.getenv("APP_API_BASE", "/api"),
        session_store_dir=os.getenv("SESSION_STORE_DIR", str(session_store)),
        log_dir=os.getenv("LOG_DIR", str(repo_root / "logs")),
        user_id=os.getenv("APP_USER_ID", "local"),
        live_resume_enabled=_env_flag("GEMINI_LIVE_RESUME", "1")
    )
