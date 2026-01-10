from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class AppSettings:
    adapter: str
    live_model: str
    text_model: str
    api_base: str


def load_settings() -> AppSettings:
    return AppSettings(
        adapter=os.getenv("INTERVIEW_ADAPTER", "mock"),
        live_model=os.getenv(
            "GEMINI_LIVE_MODEL",
            "gemini-2.5-flash-native-audio-preview-12-2025",
        ),
        text_model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3"),
        api_base=os.getenv("APP_API_BASE", "/api"),
    )
