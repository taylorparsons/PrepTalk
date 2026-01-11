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
    user_id: str


def load_settings() -> AppSettings:
    base_dir = Path(__file__).resolve().parent
    session_store = base_dir / "session_store"
    return AppSettings(
        adapter=os.getenv("INTERVIEW_ADAPTER", "mock"),
        live_model=os.getenv(
            "GEMINI_LIVE_MODEL",
            "gemini-2.5-flash-native-audio-preview-12-2025",
        ),
        text_model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3"),
        api_base=os.getenv("APP_API_BASE", "/api"),
        session_store_dir=os.getenv("SESSION_STORE_DIR", str(session_store)),
        user_id=os.getenv("APP_USER_ID", "local")
    )
