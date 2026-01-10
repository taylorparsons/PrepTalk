from pathlib import Path
import json

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .api import router as api_router
from .settings import load_settings

BASE_DIR = Path(__file__).resolve().parent

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
        "textModel": settings.text_model
    }
    return templates.TemplateResponse(
        request,
        "index.html",
        {"app_config": json.dumps(config)}
    )


@app.get("/health")
def health():
    return {"status": "ok"}
