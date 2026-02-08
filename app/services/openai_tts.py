from __future__ import annotations

import io
import time
import wave

from ..logging_config import get_logger

logger = get_logger()

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


def _audio_format_to_mime(audio_format: str | None) -> str:
    normalized = (audio_format or "wav").strip().lower()
    if normalized in {"wav", "wave"}:
        return "audio/wav"
    if normalized == "mp3":
        return "audio/mpeg"
    if normalized == "aac":
        return "audio/aac"
    if normalized == "opus":
        return "audio/opus"
    if normalized == "flac":
        return "audio/flac"
    return "audio/wav"


def _normalize_openai_audio(audio_bytes: bytes, audio_format: str | None) -> tuple[bytes, str]:
    mime = _audio_format_to_mime(audio_format)
    if mime != "audio/wav":
        return audio_bytes, mime

    # Ensure browser-playable WAV container. If bytes are already WAV, keep as-is.
    if audio_bytes.startswith(b"RIFF"):
        return audio_bytes, mime

    # Best-effort: if raw PCM is returned for wav format, wrap in mono 24k WAV.
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(24000)
        wav_file.writeframes(audio_bytes)
    return buffer.getvalue(), mime


def generate_openai_tts_audio(
    *,
    api_key: str,
    model: str,
    text: str,
    voice: str,
    audio_format: str = "wav",
    timeout_ms: int | None = None
) -> tuple[bytes, str]:
    if OpenAI is None:
        raise RuntimeError("openai package is required for OpenAI TTS fallback.")

    timeout_s = None
    if timeout_ms and timeout_ms > 0:
        timeout_s = timeout_ms / 1000

    client = OpenAI(api_key=api_key, timeout=timeout_s)
    start = time.monotonic()
    logger.info("event=openai_tts status=start requested_model=%s", model)

    try:
        response = client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format=audio_format
        )
        audio_bytes = response.read()
        normalized, mime = _normalize_openai_audio(audio_bytes, audio_format)
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "event=openai_tts status=complete requested_model=%s duration_ms=%s bytes=%s",
            model,
            duration_ms,
            len(normalized)
        )
        return normalized, mime
    except Exception:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.exception(
            "event=openai_tts status=error requested_model=%s duration_ms=%s",
            model,
            duration_ms
        )
        raise
