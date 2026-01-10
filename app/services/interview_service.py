from __future__ import annotations

import uuid

from .adapters import get_adapter
from .store import store


def prepare_interview(
    resume_bytes: bytes,
    job_bytes: bytes,
    role_title: str | None
) -> dict:
    adapter = get_adapter()
    questions, focus_areas = adapter.generate_questions(resume_bytes, job_bytes, role_title)
    interview_id = str(uuid.uuid4())

    record = store.create(
        interview_id=interview_id,
        adapter=adapter.name,
        role_title=role_title,
        questions=questions,
        focus_areas=focus_areas
    )

    return {
        "interview_id": record.interview_id,
        "questions": record.questions,
        "focus_areas": record.focus_areas,
        "adapter": record.adapter
    }


def start_live_session(interview_id: str) -> dict:
    record = store.get(interview_id)
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


def score_interview(interview_id: str, transcript: list[dict]) -> dict:
    record = store.get(interview_id)
    if not record:
        raise KeyError("Interview not found")

    adapter = get_adapter()
    store.update_transcript(interview_id, transcript)

    score = adapter.score_interview(transcript)
    store.set_score(interview_id, score)

    return {
        "interview_id": interview_id,
        **score
    }
