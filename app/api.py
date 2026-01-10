from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from .schemas import (
    InterviewCreateResponse,
    LiveSessionRequest,
    LiveSessionResponse,
    ScoreRequest,
    ScoreResponse
)
from .services import interview_service

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


@router.post("/interviews", response_model=InterviewCreateResponse)
async def create_interview(
    resume: UploadFile = File(...),
    job_description: UploadFile = File(...),
    role_title: str | None = Form(default=None)
):
    if not _is_pdf(resume) or not _is_pdf(job_description):
        raise HTTPException(status_code=400, detail="Resume and job description must be PDFs.")

    resume_bytes = await resume.read()
    job_bytes = await job_description.read()

    try:
        payload = interview_service.prepare_interview(resume_bytes, job_bytes, role_title)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return payload


@router.post("/live/session", response_model=LiveSessionResponse)
async def create_live_session(request: LiveSessionRequest):
    try:
        payload = interview_service.start_live_session(request.interview_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return payload


@router.post("/interviews/{interview_id}/score", response_model=ScoreResponse)
async def score_interview(interview_id: str, request: ScoreRequest):
    try:
        payload = interview_service.score_interview(
            interview_id,
            [_model_dump(item) for item in request.transcript]
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return payload
