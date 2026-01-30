from __future__ import annotations

import json
from typing import Any
import time

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
    start_time = time.monotonic()
    logger.info("event=text_model_call status=start requested_model=%s", model)
    try:
        response = client.models.generate_content(model=model, contents=prompt)
        effective_model = (
            getattr(response, "model", None)
            or getattr(response, "model_version", None)
            or model
        )
        duration_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "event=peas_eval status=complete category=gemini_text requested_model=%s effective_model=%s duration_ms=%s",
            model,
            effective_model,
            duration_ms
        )
        logger.info(
            "event=text_model_call status=complete requested_model=%s effective_model=%s",
            model,
            effective_model
        )
        return getattr(response, "text", "") or ""
    except Exception as exc:
        duration_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "event=peas_eval status=error category=gemini_text requested_model=%s duration_ms=%s error=%s",
            model,
            duration_ms,
            str(exc)
        )
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


def evaluate_turn_completion(
    *,
    api_key: str,
    model: str,
    question_text: str,
    answer_text: str
) -> dict:
    prompt = f"""You are an interview coach. Decide if the candidate has attempted to answer the question based on the answer so far. Return JSON only.

Question:
{question_text or 'No question provided.'}

Answer:
{answer_text or 'No answer provided.'}

Return JSON with keys:
- decision: one of "not_answered", "partial", "complete"
- confidence: number between 0 and 1
- reason: short explanation
"""

    text = _call_gemini(api_key, model, prompt)
    payload = _extract_json(text) or {}
    decision = str(payload.get("decision") or "").strip().lower()
    if decision not in {"not_answered", "partial", "complete"}:
        decision = "not_answered"
    try:
        confidence = float(payload.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    reason = str(payload.get("reason") or "").strip()
    return {
        "decision": decision,
        "confidence": confidence,
        "reason": reason
    }


def generate_turn_feedback(
    *,
    api_key: str,
    model: str,
    role_title: str | None,
    focus_areas: list[str] | None,
    resume_text: str,
    job_text: str,
    question_text: str,
    answer_text: str
) -> str:
    title = role_title or "the target role"
    focus = ", ".join(focus_areas or []) or "clarity, relevance, impact"
    prompt = f"""You are a supportive interview coach. Provide 1-2 sentences that encourage what is working well in the candidate's answer. Do not ask questions. Do not critique. Keep it concise.

Role: {title}
Focus areas: {focus}

Job description (excerpt):
{job_text or 'No job description available.'}

Resume (excerpt):
{resume_text or 'No resume available.'}

Question:
{question_text or 'No question provided.'}

Answer:
{answer_text or 'No answer provided.'}

Encouragement:"""
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


def _coerce_questions(value: Any) -> list[str]:
    if not value:
        return []
    if not isinstance(value, list):
        value = [value]
    output: list[str] = []
    for item in value:
        if not item:
            continue
        if isinstance(item, dict):
            text = item.get("text") or item.get("question") or item.get("prompt")
            if text:
                output.append(str(text))
            continue
        output.append(str(item))
    return output


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
    questions = _coerce_questions(payload.get("questions"))
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
