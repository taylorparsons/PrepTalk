from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime
from pathlib import Path


_LOGGER_NAME = "awesome_interview"
_CONFIGURED = False


def setup_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    base_dir = Path(__file__).resolve().parent.parent
    log_dir = Path(os.getenv("LOG_DIR", str(base_dir / "logs")))
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / "app.log"
    archive_dir = log_dir / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)

    if log_file.exists() and log_file.stat().st_size > 0:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        archive_file = archive_dir / f"app-{timestamp}.log"
        try:
            log_file.rename(archive_file)
        except OSError:
            pass

    logger = logging.getLogger(_LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)

    _CONFIGURED = True


def get_logger() -> logging.Logger:
    if not _CONFIGURED:
        setup_logging()
    return logging.getLogger(_LOGGER_NAME)


def short_id(value: str | None, length: int = 5) -> str:
    if not value:
        return "unknown"
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()
    return digest[:length]
