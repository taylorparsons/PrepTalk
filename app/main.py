from pathlib import Path
import json

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
    config = {
        "apiBase": settings.api_base,
        "adapter": settings.adapter,
        "liveModel": settings.live_model,
        "textModel": settings.text_model,
        "ttsModel": settings.voice_tts_model,
        "voiceMode": settings.voice_mode,
        "voiceOutputMode": settings.voice_output_mode,
        "voiceTtsLanguage": settings.voice_tts_language,
        "voiceTurnEndDelayMs": settings.voice_turn_end_delay_ms,
        "userId": settings.user_id
    }
    return templates.TemplateResponse(
        request,
        "index.html",
        {"app_config": json.dumps(config)}
    )


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await live_audio_websocket(websocket)


@app.get("/health")
def health():
    return {"status": "ok"}
