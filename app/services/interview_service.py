from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from ..logging_config import get_logger, short_id
from ..settings import load_settings
from .adapters import get_adapter
from .document_text import DocumentInput, extract_document_text
from .gemini_text import generate_coach_reply, generate_turn_feedback, generate_turn_help, evaluate_turn_completion
from .gemini_tts import generate_tts_audio_with_fallbacks
from .openai_tts import generate_openai_tts_audio
from .live_context import build_live_system_prompt
from .mock_data import MOCK_VOICE_REPLY, MOCK_VOICE_FEEDBACK, build_mock_tts_audio
from .pii_redaction import redact_resume_pii
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
    settings = load_settings()
    resume_text = extract_document_text(resume, max_chars=4000)
    if settings.redact_resume_pii:
        resume_text = redact_resume_pii(resume_text)
    job_text = extract_document_text(job, max_chars=4000)
    questions, focus_areas = adapter.generate_questions(
        resume,
        job,
        role_title,
        resume_text_override=resume_text,
        job_text_override=job_text
    )
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
        "adapter": record.adapter,
        "resume_excerpt": (resume_text or "")[:1200] or None,
        "job_excerpt": (job_text or "")[:1200] or None
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


def _build_intro_prompt(record) -> str:
    role_title = (record.role_title or "").strip()
    role_instruction = (
        f"The target role is {role_title}."
        if role_title
        else "The target role is not specified."
    )
    return (
        "The interview is about to begin. Introduce yourself as the interview coach and welcome the candidate. "
        "Use the candidate's name if you can infer it from the resume; otherwise use a generic greeting. "
        f"{role_instruction} "
        "Do not ask the candidate to confirm readiness or the role. "
        "If the company is unclear from the job description, ask for it. "
        "After the welcome, ask exactly one interview question from the provided list."
    )


def _latest_coach_prompt(record) -> str:
    transcript = list(getattr(record, "transcript", []) or [])
    for entry in reversed(transcript):
        if entry.get("role") == "coach":
            return (entry.get("text") or "").strip()
    return ""


def _limit_help_items(items: list[str], limit: int = 3, max_len: int = 140) -> list[str]:
    output: list[str] = []
    for item in items:
        cleaned = (item or "").strip()
        if not cleaned:
            continue
        if len(cleaned) > max_len:
            cleaned = f"{cleaned[:max_len].rstrip()}..."
        output.append(cleaned)
        if len(output) >= limit:
            break
    return output


def _format_help_text(payload: dict) -> str:
    draft = (payload.get("draft_answer") or "").strip()
    evidence = _limit_help_items(list(payload.get("evidence") or []))
    missing = _limit_help_items(list(payload.get("missing_info") or []), limit=2, max_len=160)

    if not draft:
        if not evidence:
            message = (
                "I couldn't find resume details to ground a draft answer. "
                "Share 2-3 relevant resume bullets and I'll help."
            )
            if missing:
                message = f"{message} Missing details: {'; '.join(missing)}"
            return message
        lines = "\n".join(f"- {item}" for item in evidence)
        message = f"Use these resume facts to answer in your own words:\n{lines}"
        if missing:
            missing_block = "\n".join(f"- {item}" for item in missing)
            message = f"{message}\n\nMissing details:\n{missing_block}"
        return message

    message = f"Resume-grounded draft:\n{draft}"
    if evidence:
        lines = "\n".join(f"- {item}" for item in evidence)
        message = f"{message}\n\nEvidence used:\n{lines}"
    if missing:
        missing_block = "\n".join(f"- {item}" for item in missing)
        message = f"{message}\n\nMissing details:\n{missing_block}"
    return f"{message}\n\nAnswer in your own words."


def _generate_tts_with_wait(
    *,
    event_name: str,
    interview_id: str,
    user_id: str | None,
    api_key: str,
    models: list[str],
    text: str,
    settings
) -> tuple[bytes | None, str | None]:
    kwargs = {
        "api_key": api_key,
        "models": models,
        "text": text,
        "voice_name": settings.voice_tts_voice or None,
        "language_code": settings.voice_tts_language or None,
        "timeout_ms": getattr(settings, "voice_tts_timeout_ms", None),
        "primary_retry_count": max(int(getattr(settings, "voice_tts_retry_count", 1) or 0), 0),
        "retry_backoff_ms": max(int(getattr(settings, "voice_tts_retry_backoff_ms", 250) or 0), 0),
        "parallel_fallback_on_retry": bool(getattr(settings, "voice_tts_parallel_fallback_on_retry", True))
    }
    wait_ms = max(int(getattr(settings, "voice_tts_wait_ms", 0) or 0), 0)
    timeout_ms = max(int(getattr(settings, "voice_tts_timeout_ms", 0) or 0), 0)
    if wait_ms <= 0:
        audio_bytes, audio_mime, _ = generate_tts_audio_with_fallbacks(**kwargs)
        return audio_bytes, audio_mime

    future = _TTS_EXECUTOR.submit(generate_tts_audio_with_fallbacks, **kwargs)
    try:
        audio_bytes, audio_mime, _ = future.result(timeout=wait_ms / 1000)
        return audio_bytes, audio_mime
    except FutureTimeout:
        remaining_ms = timeout_ms - wait_ms
        if remaining_ms <= 0:
            future.cancel()
            logger.warning(
                "event=%s status=timeout interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
                event_name,
                short_id(interview_id),
                short_id(user_id),
                wait_ms,
                timeout_ms
            )
            return None, None

        logger.warning(
            "event=%s status=slow interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
            event_name,
            short_id(interview_id),
            short_id(user_id),
            wait_ms,
            timeout_ms
        )
        try:
            audio_bytes, audio_mime, _ = future.result(timeout=remaining_ms / 1000)
            return audio_bytes, audio_mime
        except FutureTimeout:
            future.cancel()
            logger.warning(
                "event=%s status=timeout interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
                event_name,
                short_id(interview_id),
                short_id(user_id),
                wait_ms,
                timeout_ms
            )
            return None, None


def _generate_openai_tts_with_wait(
    *,
    event_name: str,
    interview_id: str,
    user_id: str | None,
    text: str,
    settings
) -> tuple[bytes | None, str | None]:
    api_key = getattr(settings, "openai_api_key", None)
    if not api_key:
        return None, None

    kwargs = {
        "api_key": api_key,
        "model": getattr(settings, "openai_tts_model", "gpt-4o-mini-tts"),
        "text": text,
        "voice": getattr(settings, "openai_tts_voice", "alloy"),
        "audio_format": getattr(settings, "openai_tts_format", "wav"),
        "timeout_ms": getattr(settings, "openai_tts_timeout_ms", None),
    }
    wait_ms = max(int(getattr(settings, "voice_tts_wait_ms", 0) or 0), 0)
    timeout_ms = max(int(getattr(settings, "openai_tts_timeout_ms", 0) or 0), 0)

    if wait_ms <= 0:
        return generate_openai_tts_audio(**kwargs)

    future = _TTS_EXECUTOR.submit(generate_openai_tts_audio, **kwargs)
    try:
        return future.result(timeout=wait_ms / 1000)
    except FutureTimeout:
        remaining_ms = timeout_ms - wait_ms
        if remaining_ms <= 0:
            future.cancel()
            logger.warning(
                "event=%s status=openai_timeout interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
                event_name,
                short_id(interview_id),
                short_id(user_id),
                wait_ms,
                timeout_ms
            )
            return None, None
        logger.warning(
            "event=%s status=openai_slow interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
            event_name,
            short_id(interview_id),
            short_id(user_id),
            wait_ms,
            timeout_ms
        )
        try:
            return future.result(timeout=remaining_ms / 1000)
        except FutureTimeout:
            future.cancel()
            logger.warning(
                "event=%s status=openai_timeout interview_id=%s user_id=%s wait_ms=%s timeout_ms=%s",
                event_name,
                short_id(interview_id),
                short_id(user_id),
                wait_ms,
                timeout_ms
            )
            return None, None


def _normalize_tts_provider(value: str | None, settings) -> str:
    cleaned = (value or "").strip().lower()
    if cleaned in {"openai", "gemini", "auto"}:
        return cleaned
    return (getattr(settings, "voice_tts_provider", "openai") or "openai").strip().lower()


def _resolve_tts_provider_order(provider: str, adapter, settings) -> tuple[str, ...]:
    if adapter.name != "gemini":
        return ("mock",)

    if provider == "openai":
        return ("openai", "gemini")
    if provider == "gemini":
        return ("gemini", "openai")

    # Auto mode: prefer OpenAI when configured, otherwise use Gemini first.
    if getattr(settings, "openai_api_key", None):
        return ("openai", "gemini")
    return ("gemini", "openai")


def _generate_tts_with_provider_fallback(
    *,
    event_name: str,
    interview_id: str,
    user_id: str | None,
    adapter,
    settings,
    text: str,
    tts_model_override: str | None,
    tts_provider_override: str | None = None
) -> tuple[bytes | None, str | None]:
    provider = _normalize_tts_provider(tts_provider_override, settings)
    provider_order = _resolve_tts_provider_order(provider, adapter, settings)

    for selected in provider_order:
        if selected == "mock":
            return build_mock_tts_audio()

        if selected == "openai":
            try:
                audio_bytes, audio_mime = _generate_openai_tts_with_wait(
                    event_name=event_name,
                    interview_id=interview_id,
                    user_id=user_id,
                    text=text,
                    settings=settings
                )
                if audio_bytes:
                    return audio_bytes, audio_mime
                logger.warning(
                    "event=%s status=openai_empty interview_id=%s user_id=%s provider=%s",
                    event_name,
                    short_id(interview_id),
                    short_id(user_id),
                    provider
                )
            except Exception:
                logger.exception(
                    "event=%s status=openai_error interview_id=%s user_id=%s provider=%s",
                    event_name,
                    short_id(interview_id),
                    short_id(user_id),
                    provider
                )
            continue

        if selected == "gemini":
            api_key = getattr(adapter, "api_key", None)
            if not api_key:
                logger.warning(
                    "event=%s status=gemini_missing_key interview_id=%s user_id=%s provider=%s",
                    event_name,
                    short_id(interview_id),
                    short_id(user_id),
                    provider
                )
                continue
            models = list(getattr(settings, "voice_tts_models", ())) or [settings.voice_tts_model]
            if tts_model_override:
                models = [tts_model_override, *[model for model in models if model != tts_model_override]]
            try:
                audio_bytes, audio_mime = _generate_tts_with_wait(
                    event_name=event_name,
                    interview_id=interview_id,
                    user_id=user_id,
                    api_key=api_key,
                    models=models,
                    text=text,
                    settings=settings
                )
                if audio_bytes:
                    return audio_bytes, audio_mime
                logger.warning(
                    "event=%s status=gemini_empty interview_id=%s user_id=%s provider=%s",
                    event_name,
                    short_id(interview_id),
                    short_id(user_id),
                    provider
                )
            except Exception:
                logger.exception(
                    "event=%s status=gemini_error interview_id=%s user_id=%s provider=%s",
                    event_name,
                    short_id(interview_id),
                    short_id(user_id),
                    provider
                )

    return None, None


def _prepare_tts_text(text: str, settings, *, min_sentence_ratio: float = 0.6) -> tuple[str, bool]:
    cleaned = (text or "").strip()
    if not cleaned:
        return "", False

    max_chars = max(int(getattr(settings, "voice_tts_max_chars", 1800) or 0), 0)
    if max_chars <= 0 or len(cleaned) <= max_chars:
        return cleaned, False

    truncated = cleaned[:max_chars].rstrip()
    sentence_end = max(truncated.rfind("."), truncated.rfind("!"), truncated.rfind("?"))
    if sentence_end >= int(max_chars * min_sentence_ratio):
        truncated = truncated[:sentence_end + 1].rstrip()
    if not truncated.endswith((".", "!", "?")):
        truncated = f"{truncated}..."
    return truncated, True


def _ensure_tts_footer(
    text: str,
    *,
    footer: str,
    max_chars: int
) -> tuple[str, bool]:
    cleaned = (text or "").strip()
    footer_clean = (footer or "").strip()
    if not cleaned or not footer_clean:
        return cleaned, False
    if footer_clean in cleaned:
        return cleaned, False

    available = max(max_chars - len(footer_clean) - 1, 0)
    if available <= 0:
        return footer_clean, True

    body = cleaned[:available].rstrip()
    if not body:
        return footer_clean, True
    if not body.endswith((".", "!", "?", "...")):
        body = f"{body}..."
    return f"{body}\n{footer_clean}", True


def run_voice_intro(
    interview_id: str,
    user_id: str | None = None,
    text_model: str | None = None,
    tts_model: str | None = None,
    tts_provider: str | None = None
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    text_model_override = (text_model or "").strip() or None
    tts_model_override = (tts_model or "").strip() or None

    adapter = get_adapter()
    if adapter.name == "gemini":
        if not getattr(adapter, "api_key", None):
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for the Gemini adapter.")
        system_prompt = build_live_system_prompt(record)
        coach_text = generate_coach_reply(
            api_key=adapter.api_key,
            model=text_model_override or adapter.settings.text_model,
            system_prompt=system_prompt,
            candidate_text=_build_intro_prompt(record)
        )
    else:
        coach_text = "Hi, I'm your interview coach. Let's get started. Tell me about yourself."

    coach_cleaned = (coach_text or "").strip() or "Welcome. Let's begin."
    coach_entry = {
        "role": "coach",
        "text": coach_cleaned,
        "timestamp": _now_iso()
    }
    store.append_transcript_entry(interview_id, coach_entry, user_id)

    audio_payload = None
    audio_mime = None
    settings = getattr(adapter, "settings", None) or load_settings()
    if settings.voice_tts_enabled and settings.voice_output_mode != "browser":
        try:
            tts_text, was_truncated = _prepare_tts_text(coach_cleaned, settings)
            if was_truncated:
                logger.warning(
                    "event=voice_intro_tts status=truncated interview_id=%s user_id=%s chars_in=%s chars_out=%s",
                    short_id(interview_id),
                    short_id(user_id),
                    len(coach_cleaned),
                    len(tts_text)
                )
            audio_bytes, audio_mime = _generate_tts_with_provider_fallback(
                event_name="voice_intro_tts",
                interview_id=interview_id,
                user_id=user_id,
                adapter=adapter,
                settings=settings,
                text=tts_text,
                tts_model_override=tts_model_override,
                tts_provider_override=tts_provider
            )
            if audio_bytes:
                audio_payload = base64.b64encode(audio_bytes).decode("ascii")
        except Exception:
            logger.exception(
                "event=voice_intro_tts status=error interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(user_id)
            )

    return {
        "interview_id": interview_id,
        "coach": coach_entry,
        "coach_audio": audio_payload,
        "coach_audio_mime": audio_mime
    }


def run_voice_turn(
    interview_id: str,
    text: str,
    user_id: str | None = None,
    text_model: str | None = None,
    tts_model: str | None = None,
    tts_provider: str | None = None
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
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for the Gemini adapter.")
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
    if settings.voice_tts_enabled and settings.voice_output_mode != "browser":
        try:
            tts_text, was_truncated = _prepare_tts_text(coach_cleaned, settings)
            if was_truncated:
                logger.warning(
                    "event=voice_tts status=truncated interview_id=%s user_id=%s chars_in=%s chars_out=%s",
                    short_id(interview_id),
                    short_id(user_id),
                    len(coach_cleaned),
                    len(tts_text)
                )
            audio_bytes, audio_mime = _generate_tts_with_provider_fallback(
                event_name="voice_tts",
                interview_id=interview_id,
                user_id=user_id,
                adapter=adapter,
                settings=settings,
                text=tts_text,
                tts_model_override=tts_model_override,
                tts_provider_override=tts_provider
            )
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


def run_voice_feedback(
    interview_id: str,
    answer_text: str,
    question_text: str | None = None,
    user_id: str | None = None,
    text_model: str | None = None
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    cleaned_answer = (answer_text or "").strip()
    if not cleaned_answer:
        raise ValueError("Answer text is required")

    cleaned_question = (question_text or "").strip() or _latest_coach_prompt(record)
    text_model_override = (text_model or "").strip() or None

    adapter = get_adapter()
    if adapter.name == "gemini":
        if not getattr(adapter, "api_key", None):
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for the Gemini adapter.")
        feedback_text = generate_turn_feedback(
            api_key=adapter.api_key,
            model=text_model_override or adapter.settings.text_model,
            role_title=record.role_title,
            focus_areas=list(record.focus_areas or []),
            resume_text=record.resume_text or "",
            job_text=record.job_text or "",
            question_text=cleaned_question,
            answer_text=cleaned_answer
        )
    else:
        feedback_text = MOCK_VOICE_FEEDBACK

    feedback_cleaned = (feedback_text or "").strip() or "Thanks for sharing that."
    feedback_entry = {
        "role": "coach_feedback",
        "text": feedback_cleaned,
        "timestamp": _now_iso()
    }
    store.append_transcript_entry(interview_id, feedback_entry, user_id)

    return {
        "interview_id": interview_id,
        "feedback": feedback_entry
    }


def run_voice_help(
    interview_id: str,
    question_text: str,
    answer_text: str | None = None,
    user_id: str | None = None,
    text_model: str | None = None,
    tts_model: str | None = None,
    tts_provider: str | None = None
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    cleaned_question = (question_text or "").strip()
    cleaned_answer = (answer_text or "").strip()
    if not cleaned_question:
        raise ValueError("Question text is required")

    text_model_override = (text_model or "").strip() or None
    tts_model_override = (tts_model or "").strip() or None

    adapter = get_adapter()
    if adapter.name == "gemini":
        if not getattr(adapter, "api_key", None):
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for the Gemini adapter.")
        help_payload = generate_turn_help(
            api_key=adapter.api_key,
            model=text_model_override or adapter.settings.text_model,
            role_title=record.role_title,
            focus_areas=list(record.focus_areas or []),
            resume_text=record.resume_text or "",
            job_text=record.job_text or "",
            question_text=cleaned_question,
            answer_text=cleaned_answer or None
        )
    else:
        help_payload = {
            "draft_answer": "",
            "evidence": [],
            "missing_info": ["Help is available when resume details are provided."]
        }

    help_text = _format_help_text(help_payload)
    help_cleaned = (help_text or "").strip() or "Share a resume detail and I'll help."
    help_entry = {
        "role": "coach_feedback",
        "text": help_cleaned,
        "timestamp": _now_iso()
    }
    store.append_transcript_entry(interview_id, help_entry, user_id)

    audio_payload = None
    audio_mime = None
    settings = getattr(adapter, "settings", None) or load_settings()
    if settings.voice_tts_enabled and settings.voice_output_mode != "browser":
        try:
            tts_text, was_truncated = _prepare_tts_text(help_cleaned, settings)
            footer = "Answer in your own words."
            footer_added = False
            if help_cleaned.endswith(footer):
                max_chars = max(int(getattr(settings, "voice_tts_max_chars", 1800) or 0), 0)
                if max_chars > 0:
                    tts_text, footer_added = _ensure_tts_footer(
                        tts_text,
                        footer=footer,
                        max_chars=max_chars
                    )
            if was_truncated:
                logger.warning(
                    "event=voice_help_tts status=truncated interview_id=%s user_id=%s chars_in=%s chars_out=%s",
                    short_id(interview_id),
                    short_id(user_id),
                    len(help_cleaned),
                    len(tts_text)
                )
            if footer_added:
                logger.info(
                    "event=voice_help_tts status=footer_restored interview_id=%s user_id=%s",
                    short_id(interview_id),
                    short_id(user_id)
                )
            audio_bytes, audio_mime = _generate_tts_with_provider_fallback(
                event_name="voice_help_tts",
                interview_id=interview_id,
                user_id=user_id,
                adapter=adapter,
                settings=settings,
                text=tts_text,
                tts_model_override=tts_model_override,
                tts_provider_override=tts_provider
            )
            if audio_bytes:
                audio_payload = base64.b64encode(audio_bytes).decode("ascii")
        except Exception:
            logger.exception(
                "event=voice_help_tts status=error interview_id=%s user_id=%s",
                short_id(interview_id),
                short_id(user_id)
            )

    return {
        "interview_id": interview_id,
        "help": help_entry,
        "help_audio": audio_payload,
        "help_audio_mime": audio_mime
    }


def run_turn_completion_check(
    interview_id: str,
    question_text: str,
    answer_text: str,
    user_id: str | None = None,
    text_model: str | None = None
) -> dict:
    record = store.get(interview_id, user_id)
    if not record:
        raise KeyError("Interview not found")

    cleaned_question = (question_text or "").strip()
    cleaned_answer = (answer_text or "").strip()
    if not cleaned_question:
        raise ValueError("Question text is required")
    if not cleaned_answer:
        raise ValueError("Answer text is required")

    text_model_override = (text_model or "").strip() or None
    adapter = get_adapter()
    if adapter.name == "gemini":
        if not getattr(adapter, "api_key", None):
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for the Gemini adapter.")
        result = evaluate_turn_completion(
            api_key=adapter.api_key,
            model=text_model_override or adapter.settings.text_model,
            question_text=cleaned_question,
            answer_text=cleaned_answer
        )
    else:
        result = {"decision": "partial", "confidence": 0.6, "reason": "mock"}

    decision = result.get("decision", "not_answered")
    confidence = float(result.get("confidence", 0.0) or 0.0)
    attempted = decision in {"partial", "complete"}

    return {
        "interview_id": interview_id,
        "decision": decision,
        "confidence": confidence,
        "attempted": attempted,
        "reason": result.get("reason") or ""
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
