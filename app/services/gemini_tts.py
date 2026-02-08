from __future__ import annotations

import base64
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
import io
import time
import wave
import re

from ..logging_config import get_logger

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


logger = get_logger()
_HEDGE_TTS_EXECUTOR = ThreadPoolExecutor(max_workers=4)

_RETRYABLE_TTS_ERROR_MARKERS = (
    "500 internal",
    "503",
    "service unavailable",
    "temporarily unavailable",
    "deadline exceeded",
    "timeout",
)


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


def _merge_wav_chunks(chunks: list[bytes]) -> bytes | None:
    if not chunks:
        return None
    if len(chunks) == 1:
        return chunks[0]

    frames: list[bytes] = []
    params: tuple[int, int, int, str, str] | None = None

    for chunk in chunks:
        try:
            with wave.open(io.BytesIO(chunk), "rb") as wav_file:
                current_params = (
                    wav_file.getnchannels(),
                    wav_file.getsampwidth(),
                    wav_file.getframerate(),
                    wav_file.getcomptype(),
                    wav_file.getcompname()
                )
                chunk_frames = wav_file.readframes(wav_file.getnframes())
        except Exception:
            return None
        if params is None:
            params = current_params
        elif current_params != params:
            return None
        frames.append(chunk_frames)

    if params is None:
        return None

    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(params[0])
        wav_file.setsampwidth(params[1])
        wav_file.setframerate(params[2])
        wav_file.setcomptype(params[3], params[4])
        wav_file.writeframes(b"".join(frames))
    return output.getvalue()


def _extract_audio(response) -> tuple[bytes | None, str | None]:
    chunks: list[bytes] = []
    resolved_mime: str | None = None
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
        chunk: bytes | None = None
        if isinstance(data, (bytes, bytearray)):
            chunk = bytes(data)
        elif isinstance(data, str):
            try:
                chunk = base64.b64decode(data)
            except Exception:
                continue
        if not chunk:
            continue
        chunks.append(chunk)
        if not resolved_mime and mime_type:
            resolved_mime = mime_type
    if not chunks:
        return None, None
    if len(chunks) == 1:
        return chunks[0], resolved_mime

    normalized_mime = (resolved_mime or "").lower()
    if "wav" in normalized_mime:
        merged_wav = _merge_wav_chunks(chunks)
        if merged_wav:
            return merged_wav, resolved_mime
    return b"".join(chunks), resolved_mime


def _parse_pcm_rate(mime_type: str | None, fallback: int = 24000) -> int:
    if not mime_type:
        return fallback
    match = re.search(r"rate=(\d+)", mime_type)
    if not match:
        return fallback
    try:
        return int(match.group(1))
    except ValueError:
        return fallback


def _normalize_audio_for_browser(audio_bytes: bytes, mime_type: str | None) -> tuple[bytes, str]:
    normalized_mime = (mime_type or "").lower()
    if "audio/l16" not in normalized_mime and "audio/pcm" not in normalized_mime:
        return audio_bytes, (mime_type or "audio/wav")

    sample_rate = _parse_pcm_rate(mime_type, fallback=24000)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_bytes)
    return buffer.getvalue(), "audio/wav"


def _is_retryable_tts_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in _RETRYABLE_TTS_ERROR_MARKERS)


def _generate_tts_with_retry_budget(
    *,
    api_key: str,
    model: str,
    text: str,
    voice_name: str | None,
    language_code: str | None,
    timeout_ms: int | None,
    retry_count: int,
    retry_backoff_ms: int,
    first_error: Exception | None = None
) -> tuple[bytes, str]:
    if first_error is None:
        return generate_tts_audio(
            api_key=api_key,
            model=model,
            text=text,
            voice_name=voice_name,
            language_code=language_code,
            timeout_ms=timeout_ms
        )

    last_exc: Exception = first_error
    for attempt in range(retry_count):
        if retry_backoff_ms > 0:
            time.sleep(retry_backoff_ms / 1000)
        try:
            return generate_tts_audio(
                api_key=api_key,
                model=model,
                text=text,
                voice_name=voice_name,
                language_code=language_code,
                timeout_ms=timeout_ms
            )
        except Exception as exc:
            last_exc = exc
            if attempt < retry_count - 1:
                logger.warning(
                    "event=tts_model_call status=retry requested_model=%s attempt=%s/%s",
                    model,
                    attempt + 1,
                    retry_count
                )
    raise last_exc


def _run_retry_with_parallel_fallback(
    *,
    api_key: str,
    models: list[str],
    text: str,
    voice_name: str | None,
    language_code: str | None,
    timeout_ms: int | None,
    primary_retry_count: int,
    retry_backoff_ms: int,
    first_error: Exception
) -> tuple[bytes, str, str]:
    primary_model = models[0]
    fallback_models = models[1:]

    def _retry_primary() -> tuple[bytes, str, str]:
        audio_bytes, mime_type = _generate_tts_with_retry_budget(
            api_key=api_key,
            model=primary_model,
            text=text,
            voice_name=voice_name,
            language_code=language_code,
            timeout_ms=timeout_ms,
            retry_count=primary_retry_count,
            retry_backoff_ms=retry_backoff_ms,
            first_error=first_error
        )
        return audio_bytes, mime_type, primary_model

    def _fallback_chain() -> tuple[bytes, str, str]:
        return generate_tts_audio_with_fallbacks(
            api_key=api_key,
            models=fallback_models,
            text=text,
            voice_name=voice_name,
            language_code=language_code,
            timeout_ms=timeout_ms,
            primary_retry_count=0,
            retry_backoff_ms=retry_backoff_ms,
            parallel_fallback_on_retry=False
        )

    primary_future = _HEDGE_TTS_EXECUTOR.submit(_retry_primary)
    fallback_future = _HEDGE_TTS_EXECUTOR.submit(_fallback_chain)
    done, _ = wait({primary_future, fallback_future}, return_when=FIRST_COMPLETED)
    first = next(iter(done))
    second = fallback_future if first is primary_future else primary_future
    winner = "primary_retry" if first is primary_future else "fallback_chain"
    loser = "fallback_chain" if first is primary_future else "primary_retry"

    try:
        result = first.result()
        # Best effort: cancel the loser path so only one model result is used.
        second.cancel()
        logger.info("event=tts_model_call status=hedge_winner winner=%s loser=%s", winner, loser)
        return result
    except Exception as first_exc:
        try:
            result = second.result()
            logger.info(
                "event=tts_model_call status=hedge_winner winner=%s loser=%s first_error=%s",
                loser,
                winner,
                str(first_exc)
            )
            return result
        except Exception:
            raise first_exc


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
        audio_bytes, mime_type = _normalize_audio_for_browser(audio_bytes, mime_type)
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
    timeout_ms: int | None = None,
    primary_retry_count: int = 0,
    retry_backoff_ms: int = 0,
    parallel_fallback_on_retry: bool = False
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
            if (
                index == 0
                and parallel_fallback_on_retry
                and primary_retry_count > 0
                and len(models) > 1
                and _is_retryable_tts_error(exc)
            ):
                logger.warning(
                    "event=tts_model_call status=hedge requested_model=%s retries=%s fallback_models=%s",
                    model,
                    primary_retry_count,
                    len(models) - 1
                )
                return _run_retry_with_parallel_fallback(
                    api_key=api_key,
                    models=models,
                    text=text,
                    voice_name=voice_name,
                    language_code=language_code,
                    timeout_ms=timeout_ms,
                    primary_retry_count=primary_retry_count,
                    retry_backoff_ms=retry_backoff_ms,
                    first_error=exc
                )
            last_exc = exc
            if index < len(models) - 1:
                logger.warning("event=tts_model_call status=fallback requested_model=%s", model)
    raise last_exc or RuntimeError("No TTS models configured.")
