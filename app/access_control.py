from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, Request
from fastapi import status as http_status
from fastapi.websockets import WebSocket

from .settings import AppSettings, load_settings


ACCESS_TOKEN_COOKIE = "preptalk_access_token"
ACCESS_TOKEN_QUERY_PARAM = "access_token"
ACCESS_TOKEN_HEADER = "X-Access-Token"


@dataclass(frozen=True)
class AccessResolution:
    required: bool
    authorized: bool
    token: str | None
    user_id: str | None
    source: str | None
    reason: str | None


def _normalize_token(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    return cleaned or None


def _parse_token_pairs(settings: AppSettings) -> dict[str, str | None]:
    pairs: dict[str, str | None] = {}
    for entry in settings.access_tokens:
        cleaned = (entry or "").strip()
        if not cleaned:
            continue
        token, separator, mapped_user = cleaned.partition(":")
        token = token.strip()
        if not token:
            continue
        user_id = mapped_user.strip() if separator else ""
        pairs[token] = user_id or None
    return pairs


def is_access_control_enabled(settings: AppSettings) -> bool:
    return bool(_parse_token_pairs(settings))


def _resolve_from_value(token_value: str | None, settings: AppSettings, source: str) -> AccessResolution:
    token_map = _parse_token_pairs(settings)
    if not token_map:
        return AccessResolution(
            required=False,
            authorized=True,
            token=None,
            user_id=None,
            source=None,
            reason="not_required",
        )

    token = _normalize_token(token_value)
    if not token:
        return AccessResolution(
            required=True,
            authorized=False,
            token=None,
            user_id=None,
            source=source,
            reason="missing",
        )

    if token not in token_map:
        return AccessResolution(
            required=True,
            authorized=False,
            token=token,
            user_id=None,
            source=source,
            reason="invalid",
        )

    return AccessResolution(
        required=True,
        authorized=True,
        token=token,
        user_id=token_map[token],
        source=source,
        reason="ok",
    )


def validate_access_token(token_value: str | None, settings: AppSettings, source: str = "provided") -> AccessResolution:
    return _resolve_from_value(token_value, settings, source)


def resolve_request_access(request: Request, settings: AppSettings) -> AccessResolution:
    candidates = (
        ("query", request.query_params.get(ACCESS_TOKEN_QUERY_PARAM)),
        ("header", request.headers.get(ACCESS_TOKEN_HEADER)),
        ("cookie", request.cookies.get(ACCESS_TOKEN_COOKIE)),
    )
    for source, value in candidates:
        if _normalize_token(value):
            return _resolve_from_value(value, settings, source)
    return _resolve_from_value(None, settings, "none")


def resolve_websocket_access(websocket: WebSocket, settings: AppSettings) -> AccessResolution:
    candidates = (
        ("query", websocket.query_params.get(ACCESS_TOKEN_QUERY_PARAM)),
        ("header", websocket.headers.get(ACCESS_TOKEN_HEADER)),
        ("cookie", websocket.cookies.get(ACCESS_TOKEN_COOKIE)),
    )
    for source, value in candidates:
        if _normalize_token(value):
            return _resolve_from_value(value, settings, source)
    return _resolve_from_value(None, settings, "none")


def require_api_access(request: Request) -> AccessResolution:
    settings = load_settings()
    access = resolve_request_access(request, settings)
    if not access.authorized:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="A valid access token is required.",
        )
    request.state.access_user_id = access.user_id
    request.state.access_token = access.token
    return access
