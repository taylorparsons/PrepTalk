from __future__ import annotations

from dataclasses import dataclass
import os
import uuid

from .mock_data import MOCK_FOCUS_AREAS, MOCK_QUESTIONS, MOCK_SCORE, MOCK_TRANSCRIPT
from ..settings import load_settings


@dataclass(frozen=True)
class LiveSession:
    session_id: str
    mode: str
    message: str
    mock_transcript: list[dict] | None = None


class InterviewAdapter:
    name = "base"

    def generate_questions(
        self,
        resume_bytes: bytes,
        job_bytes: bytes,
        role_title: str | None
    ) -> tuple[list[str], list[str]]:
        raise NotImplementedError

    def start_live_session(self, interview_id: str) -> LiveSession:
        raise NotImplementedError

    def score_interview(self, transcript: list[dict]) -> dict:
        raise NotImplementedError


class MockInterviewAdapter(InterviewAdapter):
    name = "mock"

    def generate_questions(
        self,
        resume_bytes: bytes,
        job_bytes: bytes,
        role_title: str | None
    ) -> tuple[list[str], list[str]]:
        return list(MOCK_QUESTIONS), list(MOCK_FOCUS_AREAS)

    def start_live_session(self, interview_id: str) -> LiveSession:
        return LiveSession(
            session_id=f"mock-{uuid.uuid4()}",
            mode="mock",
            message="Mock session active. Transcript will stream locally.",
            mock_transcript=list(MOCK_TRANSCRIPT)
        )

    def score_interview(self, transcript: list[dict]) -> dict:
        score = dict(MOCK_SCORE)
        score["transcript"] = list(transcript)
        return score


class GeminiInterviewAdapter(InterviewAdapter):
    name = "gemini"

    def __init__(self) -> None:
        self.settings = load_settings()
        self.api_key = os.getenv("GEMINI_API_KEY")

    def _ensure_configured(self) -> None:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is required for the Gemini adapter.")

    def generate_questions(
        self,
        resume_bytes: bytes,
        job_bytes: bytes,
        role_title: str | None
    ) -> tuple[list[str], list[str]]:
        self._ensure_configured()
        raise RuntimeError("Gemini question generation not wired yet.")

    def start_live_session(self, interview_id: str) -> LiveSession:
        self._ensure_configured()
        return LiveSession(
            session_id=f"gemini-{uuid.uuid4()}",
            mode="gemini",
            message="Gemini Live session active."
        )

    def score_interview(self, transcript: list[dict]) -> dict:
        self._ensure_configured()
        raise RuntimeError("Gemini scoring not wired yet.")


def get_adapter() -> InterviewAdapter:
    settings = load_settings()
    adapter_name = settings.adapter.lower().strip()
    if adapter_name == "gemini":
        return GeminiInterviewAdapter()
    return MockInterviewAdapter()
