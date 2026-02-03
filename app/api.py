from __future__ import annotations

import re
from pathlib import Path
import time

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from .logging_config import get_logger, short_id
from .schemas import (
    InterviewCreateResponse,
    InterviewSummaryResponse,
    LiveSessionRequest,
    LiveSessionResponse,
    VoiceIntroRequest,
    VoiceIntroResponse,
    VoiceFeedbackRequest,
    VoiceFeedbackResponse,
    VoiceHelpRequest,
    VoiceHelpResponse,
    VoiceTurnCompletionRequest,
    VoiceTurnCompletionResponse,
    VoiceTurnRequest,
    VoiceTurnResponse,
    ScoreRequest,
    ScoreResponse,
    SessionNameRequest,
    SessionNameResponse,
    CustomQuestionRequest,
    CustomQuestionResponse,
    QuestionStatusRequest,
    QuestionStatusResponse,
    RestartResponse,
    SessionListResponse,
    LogSummaryResponse,
    ClientEventRequest,
    ClientEventResponse
)
from .services import interview_service
from .services.log_metrics import build_log_summary
from .services.document_text import DocumentInput, is_supported_document
from .settings import load_settings

router = APIRouter(prefix="/api")
logger = get_logger()


def _model_dump(item):
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return item.dict()


def _is_supported(upload: UploadFile) -> bool:
    return is_supported_document(upload.filename, upload.content_type)


def _get_user_id(request: Request) -> str:
    settings = load_settings()
    header_user_id = request.headers.get("X-User-Id")
    if header_user_id and header_user_id != "local":
        return header_user_id
    cookie_user_id = request.cookies.get("preptalk_user_id")
    if cookie_user_id:
        return cookie_user_id
    return settings.user_id


def _duration_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def _safe_log_value(value: str | None, limit: int = 120) -> str:
    if not value:
        return "none"
    cleaned = re.sub(r"\s+", "_", value.strip())
    return cleaned[:limit]


@router.post("/interviews", response_model=InterviewCreateResponse)
async def create_interview(
    request: Request,
    resume: UploadFile = File(...),
    job_description: UploadFile = File(...),
    role_title: str | None = Form(default=None)
):
    if not _is_supported(resume) or not _is_supported(job_description):
        raise HTTPException(
            status_code=400,
            detail="Resume and job description must be PDF, DOCX, or TXT files."
        )

    resume_bytes = await resume.read()
    job_bytes = await job_description.read()
    resume_doc = DocumentInput(
        data=resume_bytes,
        filename=resume.filename,
        content_type=resume.content_type
    )
    job_doc = DocumentInput(
        data=job_bytes,
        filename=job_description.filename,
        content_type=job_description.content_type
    )
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    start = time.perf_counter()

    logger.info(
        "event=interview_create status=start user_id=%s resume_bytes=%s job_bytes=%s role_title_present=%s",
        log_user_id,
        len(resume_bytes),
        len(job_bytes),
        bool(role_title)
    )

    try:
        payload = interview_service.prepare_interview(resume_doc, job_doc, role_title, user_id)
    except RuntimeError as exc:
        logger.exception(
            "event=interview_create status=error user_id=%s duration_ms=%s",
            log_user_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    log_interview_id = short_id(payload.get("interview_id"))
    logger.info(
        "event=interview_create status=complete user_id=%s interview_id=%s questions=%s focus_areas=%s duration_ms=%s adapter=%s",
        log_user_id,
        log_interview_id,
        len(payload.get("questions", [])),
        len(payload.get("focus_areas", [])),
        _duration_ms(start),
        payload.get("adapter")
    )

    return payload


@router.post("/live/session", response_model=LiveSessionResponse)
async def create_live_session(request: Request, payload: LiveSessionRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=live_session_create status=start user_id=%s interview_id=%s",
        log_user_id,
        log_interview_id
    )

    try:
        response = interview_service.start_live_session(payload.interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=live_session_create status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=live_session_create status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    log_session_id = short_id(response.get("session_id"))
    logger.info(
        "event=live_session_create status=complete user_id=%s interview_id=%s session_id=%s mode=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        log_session_id,
        response.get("mode"),
        _duration_ms(start)
    )

    return response


@router.post("/voice/turn", response_model=VoiceTurnResponse)
async def voice_turn(request: Request, payload: VoiceTurnRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=voice_turn status=start user_id=%s interview_id=%s text_len=%s",
        log_user_id,
        log_interview_id,
        len(payload.text)
    )

    try:
        response = interview_service.run_voice_turn(
            payload.interview_id,
            payload.text,
            user_id,
            text_model=payload.text_model,
            tts_model=payload.tts_model
        )
    except KeyError as exc:
        logger.warning(
            "event=voice_turn status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        logger.exception(
            "event=voice_turn status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    coach_text = response.get("coach", {}).get("text", "")
    logger.info(
        "event=voice_turn status=complete user_id=%s interview_id=%s duration_ms=%s response_len=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start),
        len(coach_text)
    )

    return response


@router.post("/voice/intro", response_model=VoiceIntroResponse)
async def voice_intro(request: Request, payload: VoiceIntroRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=voice_intro status=start user_id=%s interview_id=%s",
        log_user_id,
        log_interview_id
    )

    try:
        response = interview_service.run_voice_intro(
            payload.interview_id,
            user_id,
            text_model=payload.text_model,
            tts_model=payload.tts_model
        )
    except KeyError as exc:
        logger.warning(
            "event=voice_intro status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        logger.exception(
            "event=voice_intro status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    coach_text = response.get("coach", {}).get("text", "")
    logger.info(
        "event=voice_intro status=complete user_id=%s interview_id=%s duration_ms=%s response_len=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start),
        len(coach_text)
    )

    return response


@router.post("/voice/feedback", response_model=VoiceFeedbackResponse)
async def voice_feedback(request: Request, payload: VoiceFeedbackRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=voice_feedback status=start user_id=%s interview_id=%s answer_len=%s",
        log_user_id,
        log_interview_id,
        len(payload.answer)
    )

    try:
        response = interview_service.run_voice_feedback(
            payload.interview_id,
            payload.answer,
            payload.question,
            user_id,
            text_model=payload.text_model
        )
    except KeyError as exc:
        logger.warning(
            "event=voice_feedback status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        logger.exception(
            "event=voice_feedback status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    feedback_text = response.get("feedback", {}).get("text", "")
    logger.info(
        "event=voice_feedback status=complete user_id=%s interview_id=%s duration_ms=%s response_len=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start),
        len(feedback_text)
    )

    return response


@router.post("/voice/help", response_model=VoiceHelpResponse)
async def voice_help(request: Request, payload: VoiceHelpRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=voice_help status=start user_id=%s interview_id=%s answer_len=%s",
        log_user_id,
        log_interview_id,
        len(payload.answer or "")
    )

    try:
        response = interview_service.run_voice_help(
            payload.interview_id,
            payload.question,
            payload.answer,
            user_id,
            text_model=payload.text_model,
            tts_model=payload.tts_model
        )
    except KeyError as exc:
        logger.warning(
            "event=voice_help status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        logger.exception(
            "event=voice_help status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    help_text = response.get("help", {}).get("text", "")
    logger.info(
        "event=voice_help status=complete user_id=%s interview_id=%s duration_ms=%s response_len=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start),
        len(help_text)
    )

    return response


@router.post("/voice/turn/completion", response_model=VoiceTurnCompletionResponse)
async def voice_turn_completion(request: Request, payload: VoiceTurnCompletionRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(payload.interview_id)
    start = time.perf_counter()

    logger.info(
        "event=voice_turn_completion status=start user_id=%s interview_id=%s answer_len=%s",
        log_user_id,
        log_interview_id,
        len(payload.answer)
    )

    try:
        response = interview_service.run_turn_completion_check(
            payload.interview_id,
            payload.question,
            payload.answer,
            user_id,
            text_model=payload.text_model
        )
    except KeyError as exc:
        logger.warning(
            "event=voice_turn_completion status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        logger.exception(
            "event=voice_turn_completion status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=voice_turn_completion status=complete user_id=%s interview_id=%s duration_ms=%s decision=%s confidence=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start),
        response.get("decision"),
        response.get("confidence")
    )

    return response


@router.post("/interviews/{interview_id}/score", response_model=ScoreResponse)
async def score_interview(interview_id: str, request: Request, payload: ScoreRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    transcript_entries = [_model_dump(item) for item in payload.transcript]
    start = time.perf_counter()

    logger.info(
        "event=score_interview status=start user_id=%s interview_id=%s transcript_entries=%s",
        log_user_id,
        log_interview_id,
        len(transcript_entries)
    )

    try:
        response = interview_service.score_interview(
            interview_id,
            transcript_entries,
            user_id
        )
    except KeyError as exc:
        logger.warning(
            "event=score_interview status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=score_interview status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=score_interview status=complete user_id=%s interview_id=%s overall_score=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        response.get("overall_score"),
        _duration_ms(start)
    )

    return response


@router.post("/interviews/{interview_id}/name", response_model=SessionNameResponse)
async def update_session_name(interview_id: str, request: Request, payload: SessionNameRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()

    logger.info(
        "event=session_name_update status=start user_id=%s interview_id=%s",
        log_user_id,
        log_interview_id
    )

    try:
        response = interview_service.set_session_name(interview_id, payload.name, user_id)
    except KeyError as exc:
        logger.warning(
            "event=session_name_update status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    logger.info(
        "event=session_name_update status=complete user_id=%s interview_id=%s version=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        response.get("version"),
        _duration_ms(start)
    )

    return response


@router.post("/interviews/{interview_id}/questions/custom", response_model=CustomQuestionResponse)
async def add_custom_question(interview_id: str, request: Request, payload: CustomQuestionRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()

    logger.info(
        "event=custom_question_add status=start user_id=%s interview_id=%s position=%s",
        log_user_id,
        log_interview_id,
        payload.position
    )

    try:
        response = interview_service.add_custom_question(
            interview_id,
            payload.question,
            payload.position,
            user_id
        )
    except KeyError as exc:
        logger.warning(
            "event=custom_question_add status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    logger.info(
        "event=custom_question_add status=complete user_id=%s interview_id=%s index=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        response.get("index"),
        _duration_ms(start)
    )

    return response


@router.post("/interviews/{interview_id}/questions/status", response_model=QuestionStatusResponse)
async def update_question_status(interview_id: str, request: Request, payload: QuestionStatusRequest):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()

    logger.info(
        "event=question_status_update status=start user_id=%s interview_id=%s index=%s",
        log_user_id,
        log_interview_id,
        payload.index
    )

    try:
        response = interview_service.set_question_status(
            interview_id,
            payload.index,
            payload.status,
            user_id,
            source=payload.source or "user"
        )
    except KeyError as exc:
        logger.warning(
            "event=question_status_update status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, IndexError) as exc:
        logger.warning(
            "event=question_status_update status=invalid user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    logger.info(
        "event=question_status_update status=complete user_id=%s interview_id=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start)
    )

    return response


@router.post("/interviews/{interview_id}/restart", response_model=RestartResponse)
async def restart_interview(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()

    logger.info(
        "event=interview_restart status=start user_id=%s interview_id=%s",
        log_user_id,
        log_interview_id
    )

    try:
        response = interview_service.reset_interview(interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=interview_restart status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    logger.info(
        "event=interview_restart status=complete user_id=%s interview_id=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start)
    )

    return response


@router.get("/logs/summary", response_model=LogSummaryResponse)
async def get_log_summary() -> LogSummaryResponse:
    log_dir = Path(load_settings().log_dir)
    log_path = log_dir / "app.log"
    if not log_path.exists():
        return LogSummaryResponse()
    lines = log_path.read_text().splitlines()[-2000:]
    summary = build_log_summary(lines)
    return LogSummaryResponse(**summary)


@router.post("/telemetry", response_model=ClientEventResponse)
async def log_client_event(request: Request, payload: ClientEventRequest):
    user_id = _get_user_id(request)
    logger.info(
        "event=client_event status=received user_id=%s interview_id=%s session_id=%s event_type=%s state=%s detail=%s",
        short_id(user_id),
        short_id(payload.interview_id),
        short_id(payload.session_id),
        _safe_log_value(payload.event),
        _safe_log_value(payload.state),
        _safe_log_value(payload.detail)
    )
    return {"status": "ok"}


@router.get("/interviews/{interview_id}", response_model=InterviewSummaryResponse)
async def get_interview_summary(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()

    logger.info(
        "event=summary_fetch status=start user_id=%s interview_id=%s",
        log_user_id,
        log_interview_id
    )

    try:
        response = interview_service.get_interview_summary(interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=summary_fetch status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    logger.info(
        "event=summary_fetch status=complete user_id=%s interview_id=%s duration_ms=%s",
        log_user_id,
        log_interview_id,
        _duration_ms(start)
    )

    return response


@router.get("/interviews", response_model=SessionListResponse)
async def list_interviews(request: Request):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    start = time.perf_counter()

    logger.info(
        "event=session_list status=start user_id=%s",
        log_user_id
    )

    response = interview_service.list_sessions(user_id)

    logger.info(
        "event=session_list status=complete user_id=%s sessions=%s duration_ms=%s",
        log_user_id,
        len(response),
        _duration_ms(start)
    )

    return {"sessions": response}


@router.get("/interviews/{interview_id}/study-guide")
async def get_study_guide(interview_id: str, request: Request, format: str = "pdf"):
    user_id = _get_user_id(request)
    log_user_id = short_id(user_id)
    log_interview_id = short_id(interview_id)
    start = time.perf_counter()
    output_format = (format or "pdf").lower()

    logger.info(
        "event=study_guide_export status=start user_id=%s interview_id=%s format=%s",
        log_user_id,
        log_interview_id,
        output_format
    )

    try:
        if output_format in {"txt", "text"}:
            text_payload = interview_service.build_study_guide_text(interview_id, user_id)
            payload_bytes = text_payload.encode("utf-8")
        elif output_format == "pdf":
            payload_bytes = interview_service.build_study_guide(interview_id, user_id)
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format.")
    except KeyError as exc:
        logger.warning(
            "event=study_guide_export status=not_found user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=study_guide_export status=error user_id=%s interview_id=%s duration_ms=%s",
            log_user_id,
            log_interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=study_guide_export status=complete user_id=%s interview_id=%s bytes=%s duration_ms=%s format=%s",
        log_user_id,
        log_interview_id,
        len(payload_bytes),
        _duration_ms(start),
        output_format
    )

    if output_format in {"txt", "text"}:
        headers = {
            "Content-Disposition": f"attachment; filename=interview-{interview_id}.txt"
        }
        return Response(content=payload_bytes, media_type="text/plain", headers=headers)

    headers = {
        "Content-Disposition": f"attachment; filename=interview-{interview_id}.pdf"
    }
    return Response(content=payload_bytes, media_type="application/pdf", headers=headers)
