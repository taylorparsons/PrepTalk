from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Optional

from ..logging_config import get_logger, short_id
from ..settings import load_settings


_SAFE_USER_ID = re.compile(r"[^a-zA-Z0-9_-]+")
logger = get_logger()


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
    live_memory: str = ""
    live_model: str | None = None
    live_resume_token: str | None = None
    live_resume_handle: str | None = None
    live_resume_resumable: bool | None = None
    live_resume_updated_at: str | None = None
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
            "live_memory": self.live_memory,
            "live_model": self.live_model,
            "live_resume_token": self.live_resume_token,
            "live_resume_handle": self.live_resume_handle,
            "live_resume_resumable": self.live_resume_resumable,
            "live_resume_updated_at": self.live_resume_updated_at,
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
            live_memory=payload.get("live_memory", ""),
            live_model=payload.get("live_model"),
            live_resume_token=payload.get("live_resume_token"),
            live_resume_handle=payload.get("live_resume_handle"),
            live_resume_resumable=payload.get("live_resume_resumable"),
            live_resume_updated_at=payload.get("live_resume_updated_at"),
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


def _label_role(role: str) -> str:
    if role == "coach":
        return "Coach"
    if role == "candidate":
        return "Candidate"
    if not role:
        return "Unknown"
    return role.capitalize()


def _truncate_text(value: str, limit: int) -> str:
    if not value:
        return ""
    cleaned = value.strip()
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


def _last_role_text(transcript: list[dict], role: str) -> str:
    for entry in reversed(transcript or []):
        if entry.get("role") == role and entry.get("text"):
            return str(entry.get("text") or "").strip()
    return ""


def _build_live_memory(
    transcript: list[dict],
    max_entries: int | None = None,
    max_chars: int | None = None
) -> str:
    if not transcript:
        return ""
    header_lines: list[str] = []
    last_coach = _truncate_text(_last_role_text(transcript, "coach"), 240)
    last_candidate = _truncate_text(_last_role_text(transcript, "candidate"), 240)
    if last_coach:
        header_lines.append(f"Last coach prompt: {last_coach}")
    if last_candidate:
        header_lines.append(f"Last candidate response: {last_candidate}")
    entries = transcript if max_entries is None else transcript[-max_entries:]
    lines: list[str] = []
    for entry in entries:
        text_value = str(entry.get("text") or "").strip()
        if not text_value:
            continue
        role = _label_role(str(entry.get("role") or "system"))
        lines.append(f"{role}: {text_value}")
    memory = "\n".join(lines)
    if header_lines:
        memory = f"{chr(10).join(header_lines)}\n\nTranscript:\n{memory}"
    if max_chars is not None and len(memory) > max_chars:
        memory = memory[-max_chars:]
        newline = memory.find("\n")
        if newline != -1:
            memory = memory[newline + 1:].lstrip()
    return memory


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
            logger.info(
                "event=store_persist status=skipped reason=disabled interview_id=%s user_id=%s",
                short_id(record.interview_id),
                short_id(record.user_id)
            )
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix('.json.tmp')
        payload = json.dumps(record.to_dict(), indent=2)
        tmp_path.write_text(payload)
        tmp_path.replace(path)
        logger.info(
            "event=store_persist status=complete interview_id=%s user_id=%s bytes=%s",
            short_id(record.interview_id),
            short_id(record.user_id),
            len(payload)
        )

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

    def _refresh_live_memory(self, record: InterviewRecord) -> None:
        memory = _build_live_memory(record.transcript)
        if memory != record.live_memory:
            record.live_memory = memory

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
        logger.info(
            "event=store_create status=complete interview_id=%s user_id=%s adapter=%s questions=%s focus_areas=%s",
            short_id(interview_id),
            short_id(normalized),
            adapter,
            len(questions),
            len(focus_areas)
        )
        return record

    def get(self, interview_id: str, user_id: str | None = None) -> Optional[InterviewRecord]:
        key = self._record_key(interview_id, user_id)
        record = self._records.get(key)
        if record:
            logger.info(
                "event=store_get status=hit source=memory interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(record.user_id)
            )
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
            logger.info(
                "event=store_get status=hit source=disk interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(record.user_id)
            )
            return record
        logger.info(
            "event=store_get status=miss interview_id=%s user_id=%s",
            short_id(interview_id),
            short_id(self._normalize_user_id(user_id))
        )
        return None

    def update_transcript(
        self,
        interview_id: str,
        transcript: list[dict],
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_update_transcript status=not_found interview_id=%s user_id=%s entries=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id)),
                len(transcript)
            )
            return
        record.transcript = list(transcript)
        self._refresh_live_memory(record)
        _touch(record)
        self._persist(record)
        logger.info(
            "event=store_update_transcript status=complete interview_id=%s user_id=%s entries=%s",
            short_id(interview_id),
            short_id(record.user_id),
            len(record.transcript)
        )

    def set_live_resume_token(
        self,
        interview_id: str,
        token: str | None,
        model: str | None,
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_live_resume_token status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
            return
        changed = False
        if token and token != record.live_resume_token:
            record.live_resume_token = token
            changed = True
        if model and model != record.live_model:
            record.live_model = model
            changed = True
        if not changed:
            return
        record.live_resume_updated_at = _now_iso()
        _touch(record)
        self._persist(record)
        logger.info(
            "event=store_live_resume_token status=complete interview_id=%s user_id=%s model=%s token_present=%s",
            short_id(interview_id),
            short_id(record.user_id),
            record.live_model or "none",
            bool(record.live_resume_token)
        )

    def set_live_resume_handle(
        self,
        interview_id: str,
        handle: str | None,
        resumable: bool | None,
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_live_resume_handle status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
            return
        changed = False
        if handle and handle != record.live_resume_handle:
            record.live_resume_handle = handle
            changed = True
        if resumable is not None and resumable != record.live_resume_resumable:
            record.live_resume_resumable = resumable
            changed = True
        if not changed:
            return
        record.live_resume_updated_at = _now_iso()
        _touch(record)
        self._persist(record)
        logger.info(
            "event=store_live_resume_handle status=complete interview_id=%s user_id=%s resumable=%s handle_present=%s",
            short_id(interview_id),
            short_id(record.user_id),
            record.live_resume_resumable,
            bool(record.live_resume_handle)
        )

    def clear_live_resume(self, interview_id: str, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_live_resume_clear status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
            return
        if (
            record.live_model is None
            and record.live_resume_token is None
            and record.live_resume_handle is None
            and record.live_resume_resumable is None
            and record.live_resume_updated_at is None
        ):
            return
        record.live_model = None
        record.live_resume_token = None
        record.live_resume_handle = None
        record.live_resume_resumable = None
        record.live_resume_updated_at = None
        _touch(record)
        self._persist(record)
        logger.info(
            "event=store_live_resume_clear status=complete interview_id=%s user_id=%s",
            short_id(interview_id),
            short_id(record.user_id)
        )

    def append_transcript_entry(
        self,
        interview_id: str,
        entry: dict,
        user_id: str | None = None
    ) -> None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_append_transcript status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
            return
        payload = dict(entry)
        text_value = str(payload.get("text") or "").strip()
        if not text_value:
            logger.info(
                "event=store_append_transcript status=skipped reason=empty_text interview_id=%s user_id=%s role=%s",
                short_id(interview_id),
                short_id(record.user_id),
                payload.get("role")
            )
            return
        payload["text"] = text_value
        last = record.transcript[-1] if record.transcript else None
        if last and last.get("role") == payload.get("role"):
            last["text"] = _merge_transcript_text(last.get("text", ""), text_value)
            if not last.get("timestamp") and payload.get("timestamp"):
                last["timestamp"] = payload.get("timestamp")
            self._refresh_live_memory(record)
            _touch(record)
            self._persist(record)
            logger.info(
                "event=store_append_transcript status=merged interview_id=%s user_id=%s role=%s text_len=%s",
                short_id(interview_id),
                short_id(record.user_id),
                payload.get("role"),
                len(text_value)
            )
            return
        record.transcript.append(payload)
        self._refresh_live_memory(record)
        _touch(record)
        self._persist(record)
        logger.info(
            "event=store_append_transcript status=complete interview_id=%s user_id=%s role=%s text_len=%s",
            short_id(interview_id),
            short_id(record.user_id),
            payload.get("role"),
            len(text_value)
        )

    def set_score(self, interview_id: str, score: dict, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.score = dict(score)
            _touch(record)
            self._persist(record)
            logger.info(
                "event=store_set_score status=complete interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(record.user_id)
            )
        else:
            logger.info(
                "event=store_set_score status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )

    def set_session_name(self, interview_id: str, name: str, user_id: str | None = None) -> dict | None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_set_session_name status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
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
        logger.info(
            "event=store_set_session_name status=complete interview_id=%s user_id=%s version=%s name_len=%s",
            short_id(interview_id),
            short_id(record.user_id),
            entry["version"],
            len(cleaned)
        )
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
            logger.info(
                "event=store_add_custom_question status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )
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
        logger.info(
            "event=store_add_custom_question status=complete interview_id=%s user_id=%s index=%s position=%s text_len=%s",
            short_id(interview_id),
            short_id(record.user_id),
            index,
            safe_position,
            len(cleaned)
        )
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
            logger.info(
                "event=store_update_question_status status=not_found interview_id=%s user_id=%s index=%s status=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id)),
                index,
                status
            )
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
        logger.info(
            "event=store_update_question_status status=complete interview_id=%s user_id=%s index=%s status=%s source=%s",
            short_id(interview_id),
            short_id(record.user_id),
            index,
            status,
            source
        )
        return updated

    def reset_session(self, interview_id: str, user_id: str | None = None) -> None:
        record = self.get(interview_id, user_id)
        if record:
            record.transcript = []
            record.live_memory = ""
            record.score = None
            record.asked_question_index = None
            record.asked_question_history = []
            record.live_model = None
            record.live_resume_token = None
            record.live_resume_handle = None
            record.live_resume_resumable = None
            record.live_resume_updated_at = None
            _touch(record)
            self._persist(record)
            logger.info(
                "event=store_reset_session status=complete interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(record.user_id)
            )
        else:
            logger.info(
                "event=store_reset_session status=not_found interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id))
            )

    def update_asked_question_index(
        self,
        interview_id: str,
        index: int,
        user_id: str | None = None,
        source: str = "ui"
    ) -> int | None:
        record = self.get(interview_id, user_id)
        if not record:
            logger.info(
                "event=store_update_asked_question_index status=not_found interview_id=%s user_id=%s index=%s source=%s",
                short_id(interview_id),
                short_id(self._normalize_user_id(user_id)),
                index,
                source
            )
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
            logger.info(
                "event=store_update_asked_question_index status=complete interview_id=%s user_id=%s index=%s source=%s",
                short_id(interview_id),
                short_id(record.user_id),
                index,
                source
            )
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
