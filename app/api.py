from __future__ import annotations

import time

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from .logging_config import get_logger
from .schemas import (
    InterviewCreateResponse,
    InterviewSummaryResponse,
    LiveSessionRequest,
    LiveSessionResponse,
    ScoreRequest,
    ScoreResponse
)
from .services import interview_service
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
    return request.headers.get("X-User-Id") or settings.user_id


def _duration_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


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
    start = time.perf_counter()

    logger.info(
        "event=interview_create status=start user_id=%s resume_bytes=%s job_bytes=%s role_title_present=%s",
        user_id,
        len(resume_bytes),
        len(job_bytes),
        bool(role_title)
    )

    try:
        payload = interview_service.prepare_interview(resume_doc, job_doc, role_title, user_id)
    except RuntimeError as exc:
        logger.exception(
            "event=interview_create status=error user_id=%s duration_ms=%s",
            user_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=interview_create status=complete user_id=%s interview_id=%s questions=%s focus_areas=%s duration_ms=%s adapter=%s",
        user_id,
        payload.get("interview_id"),
        len(payload.get("questions", [])),
        len(payload.get("focus_areas", [])),
        _duration_ms(start),
        payload.get("adapter")
    )

    return payload


@router.post("/live/session", response_model=LiveSessionResponse)
async def create_live_session(request: Request, payload: LiveSessionRequest):
    user_id = _get_user_id(request)
    start = time.perf_counter()

    logger.info(
        "event=live_session_create status=start user_id=%s interview_id=%s",
        user_id,
        payload.interview_id
    )

    try:
        response = interview_service.start_live_session(payload.interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=live_session_create status=not_found user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            payload.interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=live_session_create status=error user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            payload.interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=live_session_create status=complete user_id=%s interview_id=%s session_id=%s mode=%s duration_ms=%s",
        user_id,
        payload.interview_id,
        response.get("session_id"),
        response.get("mode"),
        _duration_ms(start)
    )

    return response


@router.post("/interviews/{interview_id}/score", response_model=ScoreResponse)
async def score_interview(interview_id: str, request: Request, payload: ScoreRequest):
    user_id = _get_user_id(request)
    transcript_entries = [_model_dump(item) for item in payload.transcript]
    start = time.perf_counter()

    logger.info(
        "event=score_interview status=start user_id=%s interview_id=%s transcript_entries=%s",
        user_id,
        interview_id,
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
            user_id,
            interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=score_interview status=error user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=score_interview status=complete user_id=%s interview_id=%s overall_score=%s duration_ms=%s",
        user_id,
        interview_id,
        response.get("overall_score"),
        _duration_ms(start)
    )

    return response


@router.get("/interviews/{interview_id}", response_model=InterviewSummaryResponse)
async def get_interview_summary(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    start = time.perf_counter()

    logger.info(
        "event=summary_fetch status=start user_id=%s interview_id=%s",
        user_id,
        interview_id
    )

    try:
        response = interview_service.get_interview_summary(interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=summary_fetch status=not_found user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    logger.info(
        "event=summary_fetch status=complete user_id=%s interview_id=%s duration_ms=%s",
        user_id,
        interview_id,
        _duration_ms(start)
    )

    return response


@router.get("/interviews/{interview_id}/study-guide")
async def get_study_guide(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    start = time.perf_counter()

    logger.info(
        "event=study_guide_export status=start user_id=%s interview_id=%s",
        user_id,
        interview_id
    )

    try:
        pdf_bytes = interview_service.build_study_guide(interview_id, user_id)
    except KeyError as exc:
        logger.warning(
            "event=study_guide_export status=not_found user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception(
            "event=study_guide_export status=error user_id=%s interview_id=%s duration_ms=%s",
            user_id,
            interview_id,
            _duration_ms(start)
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info(
        "event=study_guide_export status=complete user_id=%s interview_id=%s bytes=%s duration_ms=%s",
        user_id,
        interview_id,
        len(pdf_bytes),
        _duration_ms(start)
    )

    headers = {
        "Content-Disposition": f"attachment; filename=interview-{interview_id}.pdf"
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
