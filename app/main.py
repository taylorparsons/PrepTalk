from pathlib import Path
import json
import uuid

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

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


@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    settings = load_settings()
    cookie_user_id = request.cookies.get("preptalk_user_id")
    user_id = cookie_user_id or settings.user_id
    should_set_cookie = not cookie_user_id or cookie_user_id == "local"
    if should_set_cookie:
        user_id = str(uuid.uuid4())
    config = {
        "apiBase": settings.api_base,
        "adapter": settings.adapter,
        "liveModel": settings.live_model,
        "textModel": settings.text_model,
        "ttsModel": settings.voice_tts_model,
        "uiDevMode": settings.ui_dev_mode,
        "voiceMode": settings.voice_mode,
        "voiceOutputMode": settings.voice_output_mode,
        "voiceTtsLanguage": settings.voice_tts_language,
        "voiceTurnEndDelayMs": settings.voice_turn_end_delay_ms,
        "voiceTurnCompletionConfidence": settings.voice_turn_completion_confidence,
        "voiceTurnCompletionCooldownMs": settings.voice_turn_completion_cooldown_ms,
        "userId": user_id
    }
    response = templates.TemplateResponse(
        request,
        "index.html",
        {"app_config": json.dumps(config)}
    )
    if should_set_cookie:
        response.set_cookie(
            "preptalk_user_id",
            user_id,
            httponly=True,
            samesite="Lax",
            secure=request.url.scheme == "https"
        )
    return response


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await live_audio_websocket(websocket)


@app.get("/prototype", response_class=HTMLResponse)
def prototype(request: Request):
    return templates.TemplateResponse(request, "prototype.html", {})


@app.get("/prototype-c", response_class=HTMLResponse)
def prototype_c(request: Request):
    return templates.TemplateResponse(request, "prototype-c.html", {})


@app.get("/story-shelf", response_class=HTMLResponse)
def story_shelf(request: Request):
    return templates.TemplateResponse(request, "story-shelf.html", {})


@app.get("/health")
def health():
    return {"status": "ok"}
