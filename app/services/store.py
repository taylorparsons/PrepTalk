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
    created_at: str = ""
    updated_at: str = ""
    asked_question_index: int | None = None
    asked_question_history: list[dict] = field(default_factory=list)
    resume_text: str = ""
    job_text: str = ""
    question_statuses: list[dict] = field(default_factory=list)
    question_status_history: list[dict] = field(default_factory=list)
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
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "asked_question_index": self.asked_question_index,
            "asked_question_history": list(self.asked_question_history),
            "questions": list(self.questions),
            "focus_areas": list(self.focus_areas),
            "resume_text": self.resume_text,
            "job_text": self.job_text,
            "question_statuses": list(self.question_statuses),
            "question_status_history": list(self.question_status_history),
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
            created_at=payload.get("created_at", ""),
            updated_at=payload.get("updated_at", ""),
            asked_question_index=payload.get("asked_question_index"),
            asked_question_history=list(payload.get("asked_question_history", [])),
            questions=list(payload.get("questions", [])),
            focus_areas=list(payload.get("focus_areas", [])),
            resume_text=payload.get("resume_text", ""),
            job_text=payload.get("job_text", ""),
            question_statuses=list(payload.get("question_statuses", [])),
            question_status_history=list(payload.get("question_status_history", [])),
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


QUESTION_STATUS_DEFAULT = "not_started"
QUESTION_STATUS_VALUES = {"not_started", "started", "answered"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _status_entry(status: str) -> dict:
    return {"status": status, "updated_at": _now_iso()}


def _default_statuses(questions: list[str]) -> list[dict]:
    return [_status_entry(QUESTION_STATUS_DEFAULT) for _ in questions]


def _touch(record: InterviewRecord) -> None:
    now = _now_iso()
    if not record.created_at:
        record.created_at = now
    record.updated_at = now


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

    def _ensure_question_statuses(self, record: InterviewRecord) -> bool:
        changed = False
        if not record.question_statuses:
            record.question_statuses = _default_statuses(record.questions)
            changed = True
        if len(record.question_statuses) < len(record.questions):
            record.question_statuses.extend(
                _default_statuses(record.questions[len(record.question_statuses):])
            )
            changed = True
        if len(record.question_statuses) > len(record.questions):
            record.question_statuses = record.question_statuses[:len(record.questions)]
            changed = True
        return changed

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
        now = _now_iso()
        record = InterviewRecord(
            interview_id=interview_id,
            user_id=normalized,
            adapter=adapter,
            role_title=role_title,
            created_at=now,
            updated_at=now,
            questions=questions,
            focus_areas=focus_areas,
            resume_text=resume_text or "",
            job_text=job_text or ""
        )
        self._ensure_question_statuses(record)
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
            changed = self._ensure_question_statuses(record)
            if not record.created_at:
                record.created_at = _now_iso()
                changed = True
            if not record.updated_at:
                record.updated_at = record.created_at or _now_iso()
                changed = True
            if changed:
                self._persist(record)
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
            _touch(record)
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
            _touch(record)
            self._persist(record)
            return
        record.transcript.append(payload)
        _touch(record)
        self._persist(record)

    def set_score(self, interview_id: str, score: dict, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.score = dict(score)
            _touch(record)
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
        _touch(record)
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
        self._ensure_question_statuses(record)
        record.question_statuses.insert(index, _status_entry(QUESTION_STATUS_DEFAULT))
        entry = {"question": cleaned, "position": safe_position, "index": index}
        record.custom_questions.append(entry)
        _touch(record)
        self._persist(record)
        return {"record": record, "entry": entry, "index": index}

    def update_question_status(
        self,
        interview_id: str,
        index: int,
        status: str,
        user_id: str | None = None,
        source: str = "user"
    ) -> dict | None:
        record = self.get(interview_id, user_id)
        if not record:
            return None
        if status not in QUESTION_STATUS_VALUES:
            raise ValueError("Invalid question status.")
        if self._ensure_question_statuses(record):
            self._persist(record)
        if index < 0 or index >= len(record.question_statuses):
            raise IndexError("Question index out of range.")
        current = record.question_statuses[index]
        if source != "user" and current.get("status") == "answered" and status != "answered":
            return current
        if current.get("status") == status and source != "user":
            return current
        updated = _status_entry(status)
        record.question_statuses[index] = updated
        if status in {"started", "answered"}:
            current_index = record.asked_question_index
            if current_index is None or index > current_index:
                record.asked_question_index = index
                record.asked_question_history.append(
                    {
                        "index": index,
                        "question": record.questions[index],
                        "status": status,
                        "timestamp": updated["updated_at"],
                        "source": source
                    }
                )
        record.question_status_history.append(
            {
                "index": index,
                "question": record.questions[index],
                "status": status,
                "timestamp": updated["updated_at"],
                "source": source
            }
        )
        _touch(record)
        self._persist(record)
        return updated

    def reset_session(self, interview_id: str, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.transcript = []
            record.score = None
            record.asked_question_index = None
            record.asked_question_history = []
            _touch(record)
            self._persist(record)

    def update_asked_question_index(
        self,
        interview_id: str,
        index: int,
        user_id: str | None = None,
        source: str = "ui"
    ) -> int | None:
        record = self.get(interview_id, user_id)
        if not record:
            return None
        if index < 0 or index >= len(record.questions):
            raise IndexError("Question index out of range.")
        current_index = record.asked_question_index
        if current_index is None or index > current_index:
            timestamp = _now_iso()
            record.asked_question_index = index
            record.asked_question_history.append(
                {
                    "index": index,
                    "question": record.questions[index],
                    "status": "progressed",
                    "timestamp": timestamp,
                    "source": source
                }
            )
            _touch(record)
            self._persist(record)
        return record.asked_question_index

    def list_sessions(self, user_id: str | None = None) -> list[InterviewRecord]:
        normalized = self._normalize_user_id(user_id)
        records: dict[str, InterviewRecord] = {}

        if self._base_dir is not None:
            dir_path = self._base_dir / normalized
            if dir_path.exists():
                for path in dir_path.glob("*.json"):
                    payload = json.loads(path.read_text())
                    record = InterviewRecord.from_dict(payload)
                    if not record.created_at:
                        record.created_at = _now_iso()
                    if not record.updated_at:
                        record.updated_at = record.created_at or _now_iso()
                    records[record.interview_id] = record

        for (user_key, interview_id), record in self._records.items():
            if user_key == normalized:
                records[interview_id] = record

        output = list(records.values())
        output.sort(
            key=lambda record: record.updated_at or record.created_at or "",
            reverse=True
        )
        return output


settings = load_settings()
store = InterviewStore(base_dir=Path(settings.session_store_dir), default_user_id=settings.user_id)
