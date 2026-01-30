from __future__ import annotations

import base64
import time

from ..logging_config import get_logger

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


logger = get_logger()


def _friendly_tts_error(model: str, exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "not found" in lowered or "not supported" in lowered:
        return (
            f"TTS model '{model}' is not supported for generateContent. "
            "Set GEMINI_TTS_MODEL to a supported TTS model."
        )
    return message


def _build_speech_config(voice_name: str | None, language_code: str | None):
    if types is None:
        config: dict[str, object] = {}
        if voice_name:
            config["voice_config"] = {
                "prebuilt_voice_config": {"voice_name": voice_name}
            }
        if language_code:
            config["language_code"] = language_code
        return config or None

    voice_config = None
    if voice_name:
        voice_config = types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
        )
    if voice_config is None and not language_code:
        return None
    return types.SpeechConfig(
        voice_config=voice_config,
        language_code=language_code
    )


def _iter_parts(response):
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if content is None and isinstance(candidate, dict):
            content = candidate.get("content")
        if content is None:
            continue
        parts = getattr(content, "parts", None)
        if parts is None and isinstance(content, dict):
            parts = content.get("parts")
        if not parts:
            continue
        for part in parts:
            yield part


def _get_inline_data(part):
    if isinstance(part, dict):
        return part.get("inline_data") or part.get("inlineData")
    return getattr(part, "inline_data", None) or getattr(part, "inlineData", None)


def _extract_audio(response) -> tuple[bytes | None, str | None]:
    for part in _iter_parts(response):
        inline_data = _get_inline_data(part)
        if inline_data is None:
            continue
        if isinstance(inline_data, dict):
            data = inline_data.get("data")
            mime_type = inline_data.get("mime_type") or inline_data.get("mimeType")
        else:
            data = getattr(inline_data, "data", None)
            mime_type = (
                getattr(inline_data, "mime_type", None)
                or getattr(inline_data, "mimeType", None)
            )
        if isinstance(data, (bytes, bytearray)):
            return bytes(data), mime_type
        if isinstance(data, str):
            try:
                return base64.b64decode(data), mime_type
            except Exception:
                continue
    return None, None


def generate_tts_audio(
    *,
    api_key: str,
    model: str,
    text: str,
    voice_name: str | None = None,
    language_code: str | None = None,
    timeout_ms: int | None = None
) -> tuple[bytes, str]:
    if genai is None:
        raise RuntimeError("google-genai is required for Gemini TTS.")

    client_kwargs = {"api_key": api_key}
    if timeout_ms:
        http_options = (
            types.HttpOptions(timeout=timeout_ms)
            if types is not None
            else {"timeout": timeout_ms}
        )
        client_kwargs["http_options"] = http_options
    client = genai.Client(**client_kwargs)
    config_payload: dict[str, object] = {"response_modalities": ["AUDIO"]}
    speech_config = _build_speech_config(voice_name, language_code)
    if speech_config is not None:
        config_payload["speech_config"] = speech_config

    config = (
        types.GenerateContentConfig(**config_payload)
        if types is not None
        else config_payload
    )

    start_time = time.monotonic()
    logger.info("event=tts_model_call status=start requested_model=%s", model)
    try:
        response = client.models.generate_content(
            model=model,
            contents=text,
            config=config
        )
        effective_model = (
            getattr(response, "model", None)
            or getattr(response, "model_version", None)
            or model
        )
        audio_bytes, mime_type = _extract_audio(response)
        if not audio_bytes:
            raise RuntimeError("No audio returned from the TTS model.")
        duration_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "event=peas_eval status=complete category=gemini_tts requested_model=%s effective_model=%s duration_ms=%s",
            model,
            effective_model,
            duration_ms
        )
        logger.info(
            "event=tts_model_call status=complete requested_model=%s effective_model=%s bytes=%s",
            model,
            effective_model,
            len(audio_bytes)
        )
        return audio_bytes, mime_type or "audio/wav"
    except Exception as exc:
        duration_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "event=peas_eval status=error category=gemini_tts requested_model=%s duration_ms=%s error=%s",
            model,
            duration_ms,
            str(exc)
        )
        logger.exception("event=tts_model_call status=error requested_model=%s", model)
        raise RuntimeError(_friendly_tts_error(model, exc)) from exc


def generate_tts_audio_with_fallbacks(
    *,
    api_key: str,
    models: list[str],
    text: str,
    voice_name: str | None = None,
    language_code: str | None = None,
    timeout_ms: int | None = None
) -> tuple[bytes, str, str]:
    if not models:
        raise RuntimeError("No TTS models configured.")
    last_exc: Exception | None = None
    for index, model in enumerate(models):
        try:
            audio_bytes, mime_type = generate_tts_audio(
                api_key=api_key,
                model=model,
                text=text,
                voice_name=voice_name,
                language_code=language_code,
                timeout_ms=timeout_ms
            )
            return audio_bytes, mime_type, model
        except Exception as exc:
            last_exc = exc
            if index < len(models) - 1:
                logger.warning("event=tts_model_call status=fallback requested_model=%s", model)
    raise last_exc or RuntimeError("No TTS models configured.")
