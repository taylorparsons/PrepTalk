from __future__ import annotations

import uuid

from .adapters import get_adapter
from .document_text import DocumentInput, extract_document_text
from .store import store
from .pdf_service import build_study_guide_pdf, build_study_guide_text as build_study_guide_text_output


def prepare_interview(
    resume: DocumentInput,
    job: DocumentInput,
    role_title: str | None,
    user_id: str | None = None
) -> dict:
    adapter = get_adapter()
    resume_text = extract_document_text(resume, max_chars=4000)
    job_text = extract_document_text(job, max_chars=4000)
    questions, focus_areas = adapter.generate_questions(resume, job, role_title)
    interview_id = str(uuid.uuid4())

    record = store.create(
        interview_id=interview_id,
        adapter=adapter.name,
        role_title=role_title,
        questions=questions,
        focus_areas=focus_areas,
        resume_text=resume_text,
        job_text=job_text,
        user_id=user_id
    )

    return {
        "interview_id": record.interview_id,
        "questions": record.questions,
        "focus_areas": record.focus_areas,
        "question_statuses": list(record.question_statuses),
        "adapter": record.adapter
    }


def start_live_session(interview_id: str, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    adapter = get_adapter()
    live_session = adapter.start_live_session(interview_id)

    payload = {
        "interview_id": interview_id,
        "session_id": live_session.session_id,
        "mode": live_session.mode,
        "message": live_session.message
    }

    if live_session.mock_transcript is not None:
        payload["mock_transcript"] = live_session.mock_transcript

    return payload


def score_interview(interview_id: str, transcript: list[dict], user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    adapter = get_adapter()
    store.update_transcript(interview_id, transcript, user_id)

    score = adapter.score_interview(transcript, record)
    store.set_score(interview_id, score, user_id)

    return {
        "interview_id": interview_id,
        **score
    }


def set_session_name(interview_id: str, name: str, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    entry = store.set_session_name(interview_id, name, user_id)
    if not entry:
        raise KeyError("Interview not found")
    return {
        "interview_id": record.interview_id,
        "session_name": entry.get("name", ""),
        "version": entry.get("version", 1)
    }



def add_custom_question(interview_id: str, question: str, position: int, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    result = store.add_custom_question(interview_id, question, position, user_id)
    if not result:
        raise KeyError("Interview not found")
    entry = result["entry"]
    return {
        "interview_id": record.interview_id,
        "questions": list(record.questions),
        "question_statuses": list(record.question_statuses),
        "position": entry.get("position", position),
        "index": result.get("index", 0)
    }



def reset_interview(interview_id: str, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    store.reset_session(interview_id, user_id)
    return {
        "interview_id": record.interview_id,
        "status": "reset"
    }




def get_interview_summary(interview_id: str, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    score = record.score or {}
    return {
        "interview_id": record.interview_id,
        "role_title": record.role_title,
        "session_name": record.current_session_name(),
        "adapter": record.adapter,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "asked_question_index": record.asked_question_index,
        "questions": record.questions,
        "focus_areas": record.focus_areas,
        "question_statuses": list(record.question_statuses),
        "overall_score": score.get("overall_score"),
        "summary": score.get("summary"),
        "strengths": score.get("strengths") or [],
        "improvements": score.get("improvements") or [],
        "transcript": list(record.transcript)
    }


def list_sessions(user_id: str | None = None) -> list[dict]:
    records = store.list_sessions(user_id)
    return [
        {
            "interview_id": record.interview_id,
            "session_name": record.current_session_name(),
            "role_title": record.role_title,
            "adapter": record.adapter,
            "created_at": record.created_at,
            "updated_at": record.updated_at
        }
        for record in records
    ]


def set_question_status(
    interview_id: str,
    index: int,
    status: str,
    user_id: str | None = None,
    source: str = "user"
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    entry = store.update_question_status(interview_id, index, status, user_id, source=source)
    if entry is None:
        raise KeyError("Interview not found")
    return {
        "interview_id": record.interview_id,
        "question_statuses": list(record.question_statuses),
        "index": index,
        "status": entry.get("status"),
        "updated_at": entry.get("updated_at"),
        "asked_question_index": record.asked_question_index
    }


def build_study_guide(interview_id: str, user_id: str | None = None) -> bytes:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    return build_study_guide_pdf(record)


def build_study_guide_text(interview_id: str, user_id: str | None = None) -> str:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    return build_study_guide_text_output(record)
