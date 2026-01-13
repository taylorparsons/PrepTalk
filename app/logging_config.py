from __future__ import annotations

import hashlib
import logging
import os
import re
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
_KEY_COLOR = "\x1b[38;5;244m"
_VALUE_PALETTE = [
    33,
    69,
    75,
    81,
    99,
    112,
    141,
    149,
    160,
    166,
    172,
    178,
    184,
    190,
    196,
    203,
    208,
    214,
]
_KV_PATTERN = re.compile(r"(?P<key>[A-Za-z0-9_]+)=(?P<value>[^\s]+)")


def _color_enabled() -> bool:
    if os.getenv("NO_COLOR"):
        return False
    return sys.stderr.isatty()


def _env_truthy(name: str) -> bool:
    value = os.getenv(name, "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _stable_value_color(value: str, *, salt: str) -> str:
    digest = hashlib.sha1(f"{salt}:{value}".encode("utf-8")).digest()
    color_code = _VALUE_PALETTE[digest[0] % len(_VALUE_PALETTE)]
    return f"\x1b[38;5;{color_code}m"


def _colorize_kv_pairs(message: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        key = match.group("key")
        value = match.group("value")
        if key == "event":
            value_color = _stable_value_color(value, salt="event")
        else:
            value_color = _stable_value_color(value, salt=key)
        return f"{_KEY_COLOR}{key}{_COLOR_RESET}={value_color}{value}{_COLOR_RESET}"

    return _KV_PATTERN.sub(_replace, message)


class _ColorFormatter(logging.Formatter):
    def __init__(self, fmt: str, use_color: bool) -> None:
        super().__init__(fmt)
        self._use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()
        message = record.message
        levelname = record.levelname
        if self._use_color:
            message = _colorize_kv_pairs(message)
            color = _LEVEL_COLORS.get(levelname, "")
            if color:
                levelname = f"{color}{levelname}{_COLOR_RESET}"
        output = f"{self.formatTime(record, self.datefmt)} {levelname} {message}"
        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
            output = f"{output}\n{record.exc_text}"
        if record.stack_info:
            output = f"{output}\n{self.formatStack(record.stack_info)}"
        return output


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
        file_formatter = (
            _ColorFormatter("%(asctime)s %(levelname)s %(message)s", use_color=True)
            if _env_truthy("LOG_COLOR_FILE")
            else formatter
        )
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(file_formatter)
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
