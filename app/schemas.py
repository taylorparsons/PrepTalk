from __future__ import annotations

from pydantic import BaseModel


class TranscriptEntry(BaseModel):
    role: str
    text: str
    timestamp: str


class InterviewCreateResponse(BaseModel):
    interview_id: str
    questions: list[str]
    focus_areas: list[str]
    adapter: str


class LiveSessionRequest(BaseModel):
    interview_id: str


class LiveSessionResponse(BaseModel):
    interview_id: str
    session_id: str
    mode: str
    message: str
    mock_transcript: list[TranscriptEntry] | None = None


class ScoreRequest(BaseModel):
    transcript: list[TranscriptEntry]


class ScoreResponse(BaseModel):
    interview_id: str
    overall_score: int
    summary: str
    strengths: list[str]
    improvements: list[str]
    transcript: list[TranscriptEntry] | None = None
