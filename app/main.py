from pathlib import Path
import json
import uuid

from fastapi import FastAPI, Form, Request, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .access_control import (
    ACCESS_TOKEN_COOKIE,
    is_access_control_enabled,
    resolve_request_access,
    validate_access_token,
)
from .api import router as api_router
from .logging_config import setup_logging
from .settings import load_settings
from .ws import live_audio_websocket

BASE_DIR = Path(__file__).resolve().parent

setup_logging()

app = FastAPI()
app.include_router(api_router)

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def _is_secure(request: Request) -> bool:
    return request.url.scheme == "https"


def _set_access_cookie(response, request: Request, token: str) -> None:
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        token,
        httponly=True,
        samesite="Lax",
        secure=_is_secure(request),
    )


def _set_user_cookie(response, request: Request, user_id: str) -> None:
    response.set_cookie(
        "preptalk_user_id",
        user_id,
        httponly=True,
        samesite="Lax",
        secure=_is_secure(request)
    )


def _render_access_gate(request: Request, error: str | None = None, next_path: str = "/") -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "access-token.html",
        {
            "error": error,
            "next_path": next_path,
            "access_token_query_param": "access_token",
        },
        status_code=401
    )


def _resolve_page_access(request: Request, settings):
    access = resolve_request_access(request, settings)
    if not is_access_control_enabled(settings):
        return access, None
    if not access.authorized:
        message = "Enter a valid access token to continue."
        if access.reason == "invalid":
            message = "Access token is invalid. Try again."
        return access, _render_access_gate(request, error=message, next_path=request.url.path)
    return access, None


@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    settings = load_settings()
    access, gate_response = _resolve_page_access(request, settings)
    if gate_response is not None:
        return gate_response

    cookie_user_id = request.cookies.get("preptalk_user_id")
    token_user_id = access.user_id if access.authorized else None

    user_id = token_user_id or cookie_user_id or settings.user_id
    should_set_user_cookie = False
    if token_user_id:
        should_set_user_cookie = cookie_user_id != token_user_id
    elif not cookie_user_id or cookie_user_id == "local":
        user_id = str(uuid.uuid4())
        should_set_user_cookie = True

    config = {
        "apiBase": settings.api_base,
        "adapter": settings.adapter,
        "liveModel": settings.live_model,
        "textModel": settings.text_model,
        "ttsModel": settings.voice_tts_model,
        "ttsProvider": settings.voice_tts_provider,
        "uiDevMode": settings.ui_dev_mode,
        "voiceMode": settings.voice_mode,
        "voiceOutputMode": settings.voice_output_mode,
        "voiceTtsLanguage": settings.voice_tts_language,
        "voiceTurnEndDelayMs": settings.voice_turn_end_delay_ms,
        "voiceTurnCompletionConfidence": settings.voice_turn_completion_confidence,
        "voiceTurnCompletionCooldownMs": settings.voice_turn_completion_cooldown_ms,
        "telemetryConsentRequired": settings.telemetry_consent_required,
        "userId": user_id
    }
    response = templates.TemplateResponse(
        request,
        "index.html",
        {"app_config": json.dumps(config)}
    )
    if should_set_user_cookie:
        _set_user_cookie(response, request, user_id)
    if access.authorized and access.token and request.cookies.get(ACCESS_TOKEN_COOKIE) != access.token:
        _set_access_cookie(response, request, access.token)
    return response


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await live_audio_websocket(websocket)


@app.get("/prototype", response_class=HTMLResponse)
def prototype(request: Request):
    settings = load_settings()
    _, gate_response = _resolve_page_access(request, settings)
    if gate_response is not None:
        return gate_response
    return templates.TemplateResponse(request, "prototype.html", {})


@app.get("/prototype-c", response_class=HTMLResponse)
def prototype_c(request: Request):
    settings = load_settings()
    _, gate_response = _resolve_page_access(request, settings)
    if gate_response is not None:
        return gate_response
    return templates.TemplateResponse(request, "prototype-c.html", {})


@app.get("/story-shelf", response_class=HTMLResponse)
def story_shelf(request: Request):
    settings = load_settings()
    _, gate_response = _resolve_page_access(request, settings)
    if gate_response is not None:
        return gate_response
    return templates.TemplateResponse(request, "story-shelf.html", {})


@app.post("/access-token")
def set_access_token(
    request: Request,
    access_token: str = Form(default=""),
    next_path: str = Form(default="/")
):
    settings = load_settings()
    if not is_access_control_enabled(settings):
        return RedirectResponse(url="/", status_code=303)

    access = validate_access_token(access_token, settings, source="form")
    if not access.authorized or not access.token:
        return _render_access_gate(
            request,
            error="Access token is invalid. Try again.",
            next_path=next_path if next_path.startswith("/") else "/",
        )

    target_path = next_path if next_path.startswith("/") else "/"
    response = RedirectResponse(url=target_path, status_code=303)
    _set_access_cookie(response, request, access.token)
    if access.user_id:
        _set_user_cookie(response, request, access.user_id)
    return response


@app.api_route("/health", methods=["GET", "POST", "HEAD"])
def health():
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
