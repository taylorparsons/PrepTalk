from __future__ import annotations

import uuid

from .adapters import get_adapter
from .document_text import DocumentInput
from .store import store
from .pdf_service import build_study_guide_pdf


def prepare_interview(
    resume: DocumentInput,
    job: DocumentInput,
    role_title: str | None,
    user_id: str | None = None
) -> dict:
    adapter = get_adapter()
    questions, focus_areas = adapter.generate_questions(resume, job, role_title)
    interview_id = str(uuid.uuid4())

    record = store.create(
        interview_id=interview_id,
        adapter=adapter.name,
        role_title=role_title,
        questions=questions,
        focus_areas=focus_areas,
        user_id=user_id
    )

    return {
        "interview_id": record.interview_id,
        "questions": record.questions,
        "focus_areas": record.focus_areas,
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



def get_interview_summary(interview_id: str, user_id: str | None = None) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    score = record.score or {}
    return {
        "interview_id": record.interview_id,
        "role_title": record.role_title,
        "questions": record.questions,
        "focus_areas": record.focus_areas,
        "overall_score": score.get("overall_score"),
        "summary": score.get("summary"),
        "strengths": score.get("strengths") or [],
        "improvements": score.get("improvements") or [],
        "transcript": list(record.transcript)
    }


def build_study_guide(interview_id: str, user_id: str | None = None) -> bytes:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")
    return build_study_guide_pdf(record)
