from __future__ import annotations

from pydantic import BaseModel, Field


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


class InterviewSummaryResponse(BaseModel):
    interview_id: str
    role_title: str | None = None
    questions: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    overall_score: int | None = None
    summary: str | None = None
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    transcript: list[TranscriptEntry] = Field(default_factory=list)


class ScoreRequest(BaseModel):
    transcript: list[TranscriptEntry]


class ScoreResponse(BaseModel):
    interview_id: str
    overall_score: int
    summary: str
    strengths: list[str]
    improvements: list[str]
    transcript: list[TranscriptEntry] | None = None
