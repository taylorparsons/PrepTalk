from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from ..logging_config import get_logger, short_id
from ..settings import load_settings
from .adapters import get_adapter
from .document_text import DocumentInput, extract_document_text
from .gemini_text import generate_coach_reply
from .gemini_tts import generate_tts_audio_with_fallbacks
from .live_context import build_live_system_prompt
from .mock_data import MOCK_VOICE_REPLY, build_mock_tts_audio
from .store import store
from .pdf_service import build_study_guide_pdf, build_study_guide_text as build_study_guide_text_output


logger = get_logger()
_TTS_EXECUTOR = ThreadPoolExecutor(max_workers=2)


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_voice_turn(
    interview_id: str,
    text: str,
    user_id: str | None = None,
    text_model: str | None = None,
    tts_model: str | None = None
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    text_model_override = (text_model or "").strip() or None
    tts_model_override = (tts_model or "").strip() or None

    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Text is required")

    candidate_entry = {
        "role": "candidate",
        "text": cleaned,
        "timestamp": _now_iso()
    }
    store.append_transcript_entry(interview_id, candidate_entry, user_id)

    adapter = get_adapter()
    if adapter.name == "gemini":
        if not getattr(adapter, "api_key", None):
            raise RuntimeError("GEMINI_API_KEY is required for the Gemini adapter.")
        system_prompt = build_live_system_prompt(record)
        coach_text = generate_coach_reply(
            api_key=adapter.api_key,
            model=text_model_override or adapter.settings.text_model,
            system_prompt=system_prompt,
            candidate_text=cleaned
        )
    else:
        coach_text = MOCK_VOICE_REPLY

    coach_cleaned = (coach_text or "").strip() or "Thanks. Let's continue."
    coach_entry = {
        "role": "coach",
        "text": coach_cleaned,
        "timestamp": _now_iso()
    }
    store.append_transcript_entry(interview_id, coach_entry, user_id)

    audio_payload = None
    audio_mime = None
    settings = getattr(adapter, "settings", None) or load_settings()
    if settings.voice_tts_enabled:
        try:
            if adapter.name == "gemini":
                if not getattr(adapter, "api_key", None):
                    raise RuntimeError("GEMINI_API_KEY is required for Gemini TTS.")
                models = list(getattr(settings, "voice_tts_models", ())) or [settings.voice_tts_model]
                if tts_model_override:
                    models = [tts_model_override, *[model for model in models if model != tts_model_override]]
                wait_ms = getattr(settings, "voice_tts_wait_ms", 0)
                audio_bytes = None
                if wait_ms > 0:
                    future = _TTS_EXECUTOR.submit(
                        generate_tts_audio_with_fallbacks,
                        api_key=adapter.api_key,
                        models=models,
                        text=coach_cleaned,
                        voice_name=settings.voice_tts_voice or None,
                        language_code=settings.voice_tts_language or None,
                        timeout_ms=getattr(settings, "voice_tts_timeout_ms", None)
                    )
                    try:
                        audio_bytes, audio_mime, _ = future.result(timeout=wait_ms / 1000)
                    except FutureTimeout:
                        future.cancel()
                        logger.warning(
                            "event=voice_tts status=timeout interview_id=%s user_id=%s wait_ms=%s",
                            short_id(interview_id),
                            short_id(user_id),
                            wait_ms
                        )
                else:
                    audio_bytes, audio_mime, _ = generate_tts_audio_with_fallbacks(
                        api_key=adapter.api_key,
                        models=models,
                        text=coach_cleaned,
                        voice_name=settings.voice_tts_voice or None,
                        language_code=settings.voice_tts_language or None,
                        timeout_ms=getattr(settings, "voice_tts_timeout_ms", None)
                    )
            else:
                audio_bytes, audio_mime = build_mock_tts_audio()
            if audio_bytes:
                audio_payload = base64.b64encode(audio_bytes).decode("ascii")
        except Exception:
            logger.exception(
                "event=voice_tts status=error interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(user_id)
            )

    return {
        "interview_id": interview_id,
        "candidate": candidate_entry,
        "coach": coach_entry,
        "coach_audio": audio_payload,
        "coach_audio_mime": audio_mime
    }


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
