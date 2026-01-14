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


def _next_question_index(record: InterviewRecord) -> int | None:
    statuses = list(record.question_statuses or [])
    if statuses:
        for index, entry in enumerate(statuses):
            if entry.get("status") != "answered":
                return index
        return None
    if record.questions:
        return 0
    return None


def _progress_instruction(record: InterviewRecord) -> str:
    asked_index = record.asked_question_index
    next_index = _next_question_index(record)
    if asked_index is None:
        return "Start with question 1."
    if next_index is None:
        return "All questions appear answered. Offer a brief closing and ask if they want to continue."
    return (
        f"Continue from question {next_index + 1}. "
        "If the candidate was mid-answer, let them finish. "
        "Do not repeat earlier questions."
    )


def build_live_system_prompt(record: InterviewRecord) -> str:
    role = record.role_title or "the role described in the job description"
    resume_text = _clean_text(record.resume_text)
    job_text = _clean_text(record.job_text)
    questions = _question_list(list(record.questions or []))
    focus = _bullet_list(list(record.focus_areas or []))
    progress = _progress_instruction(record)

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
        "Coach help mode:\n"
        "- If the candidate asks for help (e.g., \"answer for me\", \"give me a draft\", "
        "\"what's a good response\"), provide a concise sample answer.\n"
        "- If the candidate's answer is brief or unclear, ask one clarifying follow-up before moving on.\n"
        "- Behavioral questions: respond in STAR format.\n"
        "- Situational questions: respond as a 60-90 second answer.\n"
        "- After the draft, ask the candidate to answer in their own words.\n"
        "- Offer one or two frameworks to help structure their response.\n\n"
        f"Interview progress:\n{progress}\n\n"
        "Track which questions have been asked and proceed in order. "
        "If you must improvise, keep it brief and return to the list."
    )
