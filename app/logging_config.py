from __future__ import annotations

import hashlib
import logging
import os
import sys
from datetime import datetime
from pathlib import Path


_LOGGER_NAME = "awesome_interview"
_CONFIGURED = False


_LEVEL_COLORS = {
    "DEBUG": "\x1b[38;5;245m",
    "INFO": "\x1b[38;5;39m",
    "WARNING": "\x1b[38;5;214m",
    "ERROR": "\x1b[38;5;196m",
    "CRITICAL": "\x1b[1;38;5;196m",
}
_COLOR_RESET = "\x1b[0m"


def _color_enabled() -> bool:
    if os.getenv("NO_COLOR"):
        return False
    return sys.stderr.isatty()


class _ColorFormatter(logging.Formatter):
    def __init__(self, fmt: str, use_color: bool) -> None:
        super().__init__(fmt)
        self._use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        if not self._use_color:
            return super().format(record)
        original_levelname = record.levelname
        color = _LEVEL_COLORS.get(original_levelname, "")
        if color:
            record.levelname = f"{color}{original_levelname}{_COLOR_RESET}"
        try:
            return super().format(record)
        finally:
            record.levelname = original_levelname


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
        stream_formatter = _ColorFormatter(
            "%(asctime)s %(levelname)s %(message)s",
            use_color=_color_enabled()
        )
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(stream_formatter)
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
