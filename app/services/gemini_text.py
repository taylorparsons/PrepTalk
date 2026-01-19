from __future__ import annotations

import json
from typing import Any

from ..logging_config import get_logger

try:
    from google import genai
except ImportError:
    genai = None


logger = get_logger()


def _is_model_unsupported(exc: Exception) -> bool:
    message = str(exc).lower()
    return "not found" in message or "not supported" in message


def _friendly_text_error(model: str, exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "not found" in lowered or "not supported" in lowered:
        return (
            f"Text model '{model}' is not supported for generateContent. "
            "Set GEMINI_TEXT_MODEL to a supported text model."
        )
    return message


def _call_gemini(api_key: str, model: str, prompt: str) -> str:
    if genai is None:
        raise RuntimeError("google-genai is required for Gemini text.")
    client = genai.Client(api_key=api_key)
    logger.info("event=text_model_call status=start requested_model=%s", model)
    try:
        response = client.models.generate_content(model=model, contents=prompt)
        effective_model = (
            getattr(response, "model", None)
            or getattr(response, "model_version", None)
            or model
        )
        logger.info(
            "event=text_model_call status=complete requested_model=%s effective_model=%s",
            model,
            effective_model
        )
        return getattr(response, "text", "") or ""
    except Exception as exc:
        logger.exception("event=text_model_call status=error requested_model=%s", model)
        raise RuntimeError(_friendly_text_error(model, exc)) from exc


def generate_coach_reply(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    candidate_text: str
) -> str:
    prompt = f"{system_prompt}\n\nCandidate: {candidate_text}\nCoach:"
    return _call_gemini(api_key, model, prompt)


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        return None
    candidate = cleaned[start:end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def _coerce_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item]
    return [str(value)]


def generate_interview_questions(
    *,
    api_key: str,
    model: str,
    resume_text: str,
    job_text: str,
    role_title: str | None
) -> tuple[list[str], list[str]]:
    title = role_title or "the target role"
    prompt = f"""You are an interview coach. Use the resume and job description to craft 4-6 interview questions and 3-5 focus areas (rubric). Return JSON only.

Role title: {title}

Resume:
{resume_text or 'No resume text available.'}

Job description:
{job_text or 'No job description text available.'}

Return JSON with keys questions (array) and focus_areas (array)."""

    text = _call_gemini(api_key, model, prompt)
    payload = _extract_json(text) or {}
    questions = _coerce_list(payload.get("questions"))
    focus_areas = _coerce_list(payload.get("focus_areas"))

    if not questions:
        questions = [
            "Walk me through a recent project that best reflects your strengths.",
            "How do you prioritize work when multiple stakeholders have competing needs?",
            "Describe a time you used data to influence a decision.",
            "What would your 30-60-90 day plan look like in this role?"
        ]
    if not focus_areas:
        focus_areas = [
            "Structured storytelling",
            "Impact metrics",
            "Role alignment"
        ]
    return questions, focus_areas


def score_interview_transcript(
    *,
    api_key: str,
    model: str,
    transcript: list[dict],
    role_title: str | None,
    focus_areas: list[str] | None
) -> dict:
    focus = ", ".join(focus_areas or []) or "clarity, confidence, relevance"
    title = role_title or "the target role"
    lines = []
    for entry in transcript:
        role = entry.get("role", "")
        text = entry.get("text", "")
        lines.append(f"{role}: {text}")
    transcript_text = "\n".join(lines) if lines else "No transcript provided."

    prompt = f"""You are an interview coach. Score the candidate interview on a 0-100 scale and provide concise feedback. Return JSON only.

Role title: {title}
Focus areas: {focus}

Transcript:
{transcript_text}

Return JSON with keys overall_score (0-100), summary (string), strengths (array), improvements (array)."""

    text = _call_gemini(api_key, model, prompt)
    payload = _extract_json(text) or {}

    overall_score = payload.get("overall_score")
    try:
        overall_score = int(overall_score)
    except (TypeError, ValueError):
        overall_score = 80

    summary = payload.get("summary") or "Solid responses. Focus on tighter outcomes and role alignment."
    strengths = _coerce_list(payload.get("strengths")) or [
        "Clear structure",
        "Role-relevant examples"
    ]
    improvements = _coerce_list(payload.get("improvements")) or [
        "Add more quantified impact",
        "Close with role alignment"
    ]

    return {
        "overall_score": overall_score,
        "summary": summary,
        "strengths": strengths,
        "improvements": improvements,
        "transcript": list(transcript)
    }
