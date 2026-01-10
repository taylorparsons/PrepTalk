from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class InterviewRecord:
    interview_id: str
    adapter: str
    role_title: str | None
    questions: list[str]
    focus_areas: list[str]
    transcript: list[dict] = field(default_factory=list)
    score: Optional[dict] = None


class InterviewStore:
    def __init__(self) -> None:
        self._records: dict[str, InterviewRecord] = {}

    def create(
        self,
        interview_id: str,
        adapter: str,
        role_title: str | None,
        questions: list[str],
        focus_areas: list[str]
    ) -> InterviewRecord:
        record = InterviewRecord(
            interview_id=interview_id,
            adapter=adapter,
            role_title=role_title,
            questions=questions,
            focus_areas=focus_areas
        )
        self._records[interview_id] = record
        return record

    def get(self, interview_id: str) -> Optional[InterviewRecord]:
        return self._records.get(interview_id)

    def update_transcript(self, interview_id: str, transcript: list[dict]) -> None:
        record = self._records.get(interview_id)
        if record:
            record.transcript = list(transcript)

    def set_score(self, interview_id: str, score: dict) -> None:
        record = self._records.get(interview_id)
        if record:
            record.score = dict(score)


store = InterviewStore()
