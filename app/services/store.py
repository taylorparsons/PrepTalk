from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Optional

from ..settings import load_settings


_SAFE_USER_ID = re.compile(r"[^a-zA-Z0-9_-]+")


@dataclass
class InterviewRecord:
    interview_id: str
    user_id: str
    adapter: str
    role_title: str | None
    questions: list[str]
    focus_areas: list[str]
    resume_text: str = ""
    job_text: str = ""
    transcript: list[dict] = field(default_factory=list)
    score: Optional[dict] = None
    session_name_history: list[dict] = field(default_factory=list)
    custom_questions: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "interview_id": self.interview_id,
            "user_id": self.user_id,
            "adapter": self.adapter,
            "role_title": self.role_title,
            "questions": list(self.questions),
            "focus_areas": list(self.focus_areas),
            "resume_text": self.resume_text,
            "job_text": self.job_text,
            "transcript": list(self.transcript),
            "score": dict(self.score) if self.score else None,
            "session_name_history": list(self.session_name_history),
            "custom_questions": list(self.custom_questions)
        }

    def current_session_name(self) -> str | None:
        if not self.session_name_history:
            return None
        return self.session_name_history[-1].get('name')

    @classmethod
    def from_dict(cls, payload: dict) -> "InterviewRecord":
        return cls(
            interview_id=payload.get("interview_id", ""),
            user_id=payload.get("user_id", "local"),
            adapter=payload.get("adapter", "mock"),
            role_title=payload.get("role_title"),
            questions=list(payload.get("questions", [])),
            focus_areas=list(payload.get("focus_areas", [])),
            resume_text=payload.get("resume_text", ""),
            job_text=payload.get("job_text", ""),
            transcript=list(payload.get("transcript", [])),
            score=payload.get("score"),
            session_name_history=list(payload.get("session_name_history", [])),
            custom_questions=list(payload.get("custom_questions", []))
        )


def _merge_transcript_text(previous: str, incoming: str) -> str:
    prev = previous or ''
    next_text = (incoming or '').strip()
    if not prev:
        return next_text
    if not next_text:
        return prev
    last_char = prev[-1]
    starts_with_punct = next_text[0] in ',.;:!?)'
    starts_with_quote = next_text[0] in "'’"
    is_single_char = len(next_text) == 1 and last_char.isalnum()
    if last_char == '-' or starts_with_punct or starts_with_quote or is_single_char:
        return f"{prev}{next_text}"
    if prev.endswith(' '):
        return f"{prev}{next_text}"
    return f"{prev} {next_text}"



class InterviewStore:
    def __init__(self, base_dir: Path | None = None, default_user_id: str = "local") -> None:
        self._records: dict[tuple[str, str], InterviewRecord] = {}
        self._base_dir = Path(base_dir) if base_dir else None
        self._default_user_id = default_user_id
        if self._base_dir is not None:
            self._base_dir.mkdir(parents=True, exist_ok=True)

    def _normalize_user_id(self, user_id: str | None) -> str:
        value = (user_id or self._default_user_id or "local").strip() or "local"
        return _SAFE_USER_ID.sub("_", value)

    def _record_key(self, interview_id: str, user_id: str | None) -> tuple[str, str]:
        normalized = self._normalize_user_id(user_id)
        return normalized, interview_id

    def _record_path(self, interview_id: str, user_id: str | None) -> Path | None:
        if self._base_dir is None:
            return None
        normalized = self._normalize_user_id(user_id)
        return self._base_dir / normalized / f"{interview_id}.json"

    def _persist(self, record: InterviewRecord) -> None:
        path = self._record_path(record.interview_id, record.user_id)
        if path is None:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix('.json.tmp')
        tmp_path.write_text(json.dumps(record.to_dict(), indent=2))
        tmp_path.replace(path)

    def create(
        self,
        interview_id: str,
        adapter: str,
        role_title: str | None,
        questions: list[str],
        focus_areas: list[str],
        resume_text: str | None = None,
        job_text: str | None = None,
        user_id: str | None = None
    ) -> InterviewRecord:
        normalized = self._normalize_user_id(user_id)
        record = InterviewRecord(
            interview_id=interview_id,
            user_id=normalized,
            adapter=adapter,
            role_title=role_title,
            questions=questions,
            focus_areas=focus_areas,
            resume_text=resume_text or "",
            job_text=job_text or ""
        )
        self._records[(normalized, interview_id)] = record
        self._persist(record)
        return record

    def get(self, interview_id: str, user_id: str | None = None) -> Optional[InterviewRecord]:
        key = self._record_key(interview_id, user_id)
        record = self._records.get(key)
        if record:
            return record
        path = self._record_path(interview_id, user_id)
        if path and path.exists():
            payload = json.loads(path.read_text())
            record = InterviewRecord.from_dict(payload)
            self._records[key] = record
            return record
        return None

    def update_transcript(
        self,
        interview_id: str,
        transcript: list[dict],
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.transcript = list(transcript)
            self._persist(record)

    def append_transcript_entry(
        self,
        interview_id: str,
        entry: dict,
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            return
        payload = dict(entry)
        text_value = str(payload.get("text") or "").strip()
        if not text_value:
            return
        payload["text"] = text_value
        last = record.transcript[-1] if record.transcript else None
        if last and last.get("role") == payload.get("role"):
            last["text"] = _merge_transcript_text(last.get("text", ""), text_value)
            if not last.get("timestamp") and payload.get("timestamp"):
                last["timestamp"] = payload.get("timestamp")
            self._persist(record)
            return
        record.transcript.append(payload)
        self._persist(record)

    def set_score(self, interview_id: str, score: dict, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.score = dict(score)
            self._persist(record)

    def set_session_name(self, interview_id: str, name: str, user_id: str | None = None) -> dict | None:
        record = self.get(interview_id, user_id)
        if not record:
            return None
        cleaned = name.strip()
        entry = {
            "name": cleaned,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": len(record.session_name_history) + 1
        }
        record.session_name_history.append(entry)
        self._persist(record)
        return entry

    def add_custom_question(
        self,
        interview_id: str,
        question: str,
        position: int,
        user_id: str | None = None
    ) -> dict | None:
        record = self.get(interview_id, user_id)
        if not record:
            return None
        cleaned = question.strip()
        safe_position = max(1, int(position)) if position is not None else len(record.questions) + 1
        index = min(safe_position - 1, len(record.questions))
        record.questions.insert(index, cleaned)
        entry = {"question": cleaned, "position": safe_position, "index": index}
        record.custom_questions.append(entry)
        self._persist(record)
        return {"record": record, "entry": entry, "index": index}

    def reset_session(self, interview_id: str, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.transcript = []
            record.score = None
            self._persist(record)


settings = load_settings()
store = InterviewStore(base_dir=Path(settings.session_store_dir), default_user_id=settings.user_id)
