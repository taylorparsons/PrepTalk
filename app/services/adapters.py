from __future__ import annotations

from dataclasses import dataclass
import os
from typing import TYPE_CHECKING
import uuid

from .gemini_text import generate_interview_questions, score_interview_transcript
from .mock_data import MOCK_FOCUS_AREAS, MOCK_QUESTIONS, MOCK_SCORE, MOCK_TRANSCRIPT
from .pdf_text import extract_pdf_text
from ..settings import load_settings

if TYPE_CHECKING:
    from .store import InterviewRecord


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

    def score_interview(self, transcript: list[dict], record: "InterviewRecord" | None = None) -> dict:
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

    def score_interview(self, transcript: list[dict], record: "InterviewRecord" | None = None) -> dict:
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
        resume_text = extract_pdf_text(resume_bytes)
        job_text = extract_pdf_text(job_bytes)
        return generate_interview_questions(
            api_key=self.api_key,
            model=self.settings.text_model,
            resume_text=resume_text,
            job_text=job_text,
            role_title=role_title
        )

    def start_live_session(self, interview_id: str) -> LiveSession:
        self._ensure_configured()
        return LiveSession(
            session_id=f"gemini-{uuid.uuid4()}",
            mode="gemini",
            message="Gemini Live session active."
        )

    def score_interview(self, transcript: list[dict], record: "InterviewRecord" | None = None) -> dict:
        self._ensure_configured()
        return score_interview_transcript(
            api_key=self.api_key,
            model=self.settings.text_model,
            transcript=transcript,
            role_title=getattr(record, "role_title", None),
            focus_areas=getattr(record, "focus_areas", None)
        )


def get_adapter() -> InterviewAdapter:
    settings = load_settings()
    adapter_name = settings.adapter.lower().strip()
    if adapter_name == "gemini":
        return GeminiInterviewAdapter()
    return MockInterviewAdapter()
