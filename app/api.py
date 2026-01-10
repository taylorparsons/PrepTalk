from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from .schemas import (
    InterviewCreateResponse,
    InterviewSummaryResponse,
    LiveSessionRequest,
    LiveSessionResponse,
    ScoreRequest,
    ScoreResponse
)
from .services import interview_service
from .settings import load_settings

router = APIRouter(prefix="/api")


def _model_dump(item):
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return item.dict()


def _is_pdf(upload: UploadFile) -> bool:
    if upload.content_type == "application/pdf":
        return True
    if upload.filename and upload.filename.lower().endswith(".pdf"):
        return True
    return False


def _get_user_id(request: Request) -> str:
    settings = load_settings()
    return request.headers.get("X-User-Id") or settings.user_id


@router.post("/interviews", response_model=InterviewCreateResponse)
async def create_interview(
    request: Request,
    resume: UploadFile = File(...),
    job_description: UploadFile = File(...),
    role_title: str | None = Form(default=None)
):
    if not _is_pdf(resume) or not _is_pdf(job_description):
        raise HTTPException(status_code=400, detail="Resume and job description must be PDFs.")

    resume_bytes = await resume.read()
    job_bytes = await job_description.read()
    user_id = _get_user_id(request)

    try:
        payload = interview_service.prepare_interview(resume_bytes, job_bytes, role_title, user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return payload


@router.post("/live/session", response_model=LiveSessionResponse)
async def create_live_session(request: Request, payload: LiveSessionRequest):
    user_id = _get_user_id(request)
    try:
        response = interview_service.start_live_session(payload.interview_id, user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return response


@router.post("/interviews/{interview_id}/score", response_model=ScoreResponse)
async def score_interview(interview_id: str, request: Request, payload: ScoreRequest):
    user_id = _get_user_id(request)
    try:
        response = interview_service.score_interview(
            interview_id,
            [_model_dump(item) for item in payload.transcript],
            user_id
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return response


@router.get("/interviews/{interview_id}", response_model=InterviewSummaryResponse)
async def get_interview_summary(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    try:
        return interview_service.get_interview_summary(interview_id, user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/interviews/{interview_id}/study-guide")
async def get_study_guide(interview_id: str, request: Request):
    user_id = _get_user_id(request)
    try:
        pdf_bytes = interview_service.build_study_guide(interview_id, user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    headers = {
        "Content-Disposition": f"attachment; filename=interview-{interview_id}.pdf"
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
