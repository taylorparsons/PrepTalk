from __future__ import annotations

import re
import time
from typing import Any

import httpx

from ..logging_config import get_logger, short_id

logger = get_logger()

_GA4_COLLECT_URL = "https://www.google-analytics.com/mp/collect"
_NAME_PATTERN = re.compile(r"[^a-zA-Z0-9_]")


def _normalize_name(value: str, fallback: str, limit: int = 40) -> str:
    cleaned = _NAME_PATTERN.sub("_", (value or "").strip().lower())
    if not cleaned:
        cleaned = fallback
    if cleaned[0].isdigit():
        cleaned = f"evt_{cleaned}"
    return cleaned[:limit]


def _coerce_param(value: Any):
    if value is None:
        return None
    if isinstance(value, (str, bool, int, float)):
        return value
    return str(value)


async def send_ga4_event(
    *,
    measurement_id: str,
    api_secret: str,
    client_id: str,
    user_id: str | None,
    event_name: str,
    params: dict[str, Any] | None = None,
    timeout_s: float = 2.5
) -> None:
    if not measurement_id or not api_secret or not client_id or not event_name:
        return

    normalized_name = _normalize_name(event_name, fallback="client_event")
    payload_params = {"engagement_time_msec": 1, "session_id": int(time.time())}
    for key, value in (params or {}).items():
        if value is None:
            continue
        normalized_key = _normalize_name(key, fallback="param", limit=40)
        payload_params[normalized_key] = _coerce_param(value)

    payload: dict[str, Any] = {
        "client_id": client_id,
        "events": [{"name": normalized_name, "params": payload_params}],
    }
    if user_id:
        payload["user_id"] = user_id

    url = f"{_GA4_COLLECT_URL}?measurement_id={measurement_id}&api_secret={api_secret}"
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.post(url, json=payload)
        if response.status_code >= 400:
            logger.warning(
                "event=ga4_forward status=error code=%s event_type=%s user_id=%s",
                response.status_code,
                normalized_name,
                short_id(user_id)
            )
            return
        logger.info(
            "event=ga4_forward status=sent event_type=%s user_id=%s",
            normalized_name,
            short_id(user_id)
        )
    except Exception:
        logger.exception(
            "event=ga4_forward status=exception event_type=%s user_id=%s",
            normalized_name,
            short_id(user_id)
        )
