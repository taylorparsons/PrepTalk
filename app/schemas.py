from __future__ import annotations

from pydantic import BaseModel, Field


class TranscriptEntry(BaseModel):
    role: str
    text: str
    timestamp: str


class QuestionStatusEntry(BaseModel):
    status: str
    updated_at: str


class InterviewCreateResponse(BaseModel):
    interview_id: str
    questions: list[str]
    focus_areas: list[str]
    question_statuses: list[QuestionStatusEntry] = Field(default_factory=list)
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
    session_name: str | None = None
    adapter: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    asked_question_index: int | None = None
    questions: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    question_statuses: list[QuestionStatusEntry] = Field(default_factory=list)
    overall_score: int | None = None
    summary: str | None = None
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    transcript: list[TranscriptEntry] = Field(default_factory=list)


class SessionNameRequest(BaseModel):
    name: str


class SessionNameResponse(BaseModel):
    interview_id: str
    session_name: str
    version: int


class CustomQuestionRequest(BaseModel):
    question: str
    position: int = Field(ge=1)


class CustomQuestionResponse(BaseModel):
    interview_id: str
    questions: list[str]
    question_statuses: list[QuestionStatusEntry] = Field(default_factory=list)
    position: int
    index: int


class RestartResponse(BaseModel):
    interview_id: str
    status: str


class ScoreRequest(BaseModel):
    transcript: list[TranscriptEntry]


class ScoreResponse(BaseModel):
    interview_id: str
    overall_score: int
    summary: str
    strengths: list[str]
    improvements: list[str]
    transcript: list[TranscriptEntry] | None = None


class QuestionStatusRequest(BaseModel):
    index: int = Field(ge=0)
    status: str
    source: str | None = None


class QuestionStatusResponse(BaseModel):
    interview_id: str
    question_statuses: list[QuestionStatusEntry] = Field(default_factory=list)
    index: int
    status: str
    updated_at: str
    asked_question_index: int | None = None


class SessionListEntry(BaseModel):
    interview_id: str
    session_name: str | None = None
    role_title: str | None = None
    adapter: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class SessionListResponse(BaseModel):
    sessions: list[SessionListEntry] = Field(default_factory=list)
