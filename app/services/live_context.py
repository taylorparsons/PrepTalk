from __future__ import annotations

from .store import InterviewRecord


def _bullet_list(items: list[str]) -> str:
    if not items:
        return "- None"
    return "\n".join(f"- {item}" for item in items if item)


def _question_list(items: list[str]) -> str:
    if not items:
        return "1. Ask one targeted question based on the resume and job description."
    return "\n".join(f"{index}. {item}" for index, item in enumerate(items, start=1))


def _clean_text(text: str) -> str:
    return (text or "").strip() or "No content available."


def build_live_system_prompt(record: InterviewRecord) -> str:
    role = record.role_title or "the role described in the job description"
    resume_text = _clean_text(record.resume_text)
    job_text = _clean_text(record.job_text)
    questions = _question_list(list(record.questions or []))
    focus = _bullet_list(list(record.focus_areas or []))

    return (
        "You are an interview coach. Keep responses concise, friendly, and aligned "
        "to the candidate's target role. Ask one question at a time.\n\n"
        f"Role: {role}\n\n"
        "Job description (excerpt):\n"
        f"{job_text}\n\n"
        "Resume (excerpt):\n"
        f"{resume_text}\n\n"
        "Interview questions (ask in order and do not ask for the role again):\n"
        f"{questions}\n\n"
        "Focus areas (use for feedback and follow-ups):\n"
        f"{focus}\n\n"
        "Start with question 1. Track which questions have been asked and proceed in order. "
        "If you must improvise, keep it brief and return to the list."
    )
