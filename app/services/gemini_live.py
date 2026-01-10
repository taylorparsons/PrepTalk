from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Awaitable, Callable

try:
    from google import genai
    from google.genai import types
except ImportError as exc:
    genai = None
    types = None
    _GENAI_IMPORT_ERROR = exc

from .store import store


DEFAULT_SYSTEM_PROMPT = (
    "You are an interview coach. Keep responses concise, friendly, and aligned "
    "to the candidate's target role. Ask one question at a time."
)


@dataclass(frozen=True)
class LiveAudioChunk:
    data: bytes
    mime_type: str


def _timestamp() -> str:
    return datetime.utcnow().strftime("%H:%M:%S")





def _friendly_error(exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "resource_exhausted" in lowered or "quota" in lowered or "429" in lowered:
        return "Gemini quota exceeded. Try again later."
    return message


def _parse_sample_rate(mime_type: str | None, fallback: int) -> int:
    if not mime_type:
        return fallback
    marker = "rate="
    if marker not in mime_type:
        return fallback
    try:
        return int(mime_type.split(marker, 1)[1].split(";", 1)[0])
    except ValueError:
        return fallback


class GeminiLiveBridge:
    def __init__(
        self,
        api_key: str,
        model: str,
        interview_id: str,
        user_id: str,
        send_json: Callable[[dict[str, Any]], Awaitable[None]],
        input_sample_rate: int = 24000,
        output_sample_rate: int = 24000,
        system_prompt: str | None = None
    ) -> None:
        if genai is None:
            raise RuntimeError("google-genai is required for Gemini Live.")
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._interview_id = interview_id
        self._send_json = send_json
        self._user_id = user_id
        self._input_sample_rate = input_sample_rate
        self._output_sample_rate = output_sample_rate
        self._system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

        self._session_cm = None
        self._session = None
        self._audio_queue: asyncio.Queue[LiveAudioChunk] = asyncio.Queue(maxsize=12)
        self._tasks: list[asyncio.Task] = []
        self._closed = False

    async def connect(self) -> None:
        config = {
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "system_instruction": self._system_prompt
        }
        self._session_cm = self._client.aio.live.connect(model=self._model, config=config)
        self._session = await self._session_cm.__aenter__()

        self._tasks.append(asyncio.create_task(self._send_loop()))
        self._tasks.append(asyncio.create_task(self._receive_loop()))

        await self._send_json({"type": "status", "state": "gemini-connected"})

    async def send_audio(self, audio_bytes: bytes) -> None:
        if self._closed:
            return
        try:
            chunk = LiveAudioChunk(
                data=audio_bytes,
                mime_type=f"audio/pcm;rate={self._input_sample_rate}"
            )
            self._audio_queue.put_nowait(chunk)
        except asyncio.QueueFull:
            # Drop frames if the queue is full to keep latency low.
            return

    async def stop(self) -> None:
        if self._closed:
            return
        self._closed = True

        if self._session:
            try:
                await self._session.send_realtime_input(audio_stream_end=True)
            except Exception:
                pass

        for task in self._tasks:
            task.cancel()
        self._tasks = []

        if self._session_cm is not None:
            try:
                await self._session_cm.__aexit__(None, None, None)
            except Exception:
                pass

    async def _send_loop(self) -> None:
        assert self._session is not None
        try:
            while not self._closed:
                chunk = await self._audio_queue.get()
                if types is None:
                    raise RuntimeError("google-genai types unavailable.")
                blob = types.Blob(data=chunk.data, mime_type=chunk.mime_type)
                await self._session.send_realtime_input(audio=blob)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            await self._send_json({"type": "error", "message": _friendly_error(exc)})

    async def _receive_loop(self) -> None:
        assert self._session is not None
        try:
            async for response in self._session.receive():
                await self._handle_response(response)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            await self._send_json({"type": "error", "message": _friendly_error(exc)})

    async def _handle_response(self, response: Any) -> None:
        server_content = getattr(response, "server_content", None)
        if not server_content:
            return

        output_transcription = getattr(server_content, "output_transcription", None)
        if output_transcription and getattr(output_transcription, "text", None):
            await self._emit_transcript("coach", output_transcription.text)

        input_transcription = getattr(server_content, "input_transcription", None)
        if input_transcription and getattr(input_transcription, "text", None):
            await self._emit_transcript("candidate", input_transcription.text)

        model_turn = getattr(server_content, "model_turn", None)
        if model_turn and getattr(model_turn, "parts", None):
            for part in model_turn.parts:
                if getattr(part, "text", None):
                    await self._emit_transcript("coach", part.text)
                inline_data = getattr(part, "inline_data", None)
                if not inline_data:
                    continue
                inline_payload = getattr(inline_data, "data", None)
                audio_bytes = None
                if isinstance(inline_payload, (bytes, bytearray)):
                    audio_bytes = bytes(inline_payload)
                elif isinstance(inline_payload, str):
                    try:
                        audio_bytes = base64.b64decode(inline_payload)
                    except Exception:
                        audio_bytes = None
                if audio_bytes:
                    await self._emit_audio(audio_bytes, getattr(inline_data, "mime_type", None))

    async def _emit_transcript(self, role: str, text: str) -> None:
        entry = {
            "role": role,
            "text": text,
            "timestamp": _timestamp()
        }
        store.append_transcript_entry(self._interview_id, entry, self._user_id)
        await self._send_json({"type": "transcript", **entry, "is_final": True})

    async def _emit_audio(self, audio_bytes: bytes, mime_type: str | None) -> None:
        sample_rate = _parse_sample_rate(mime_type, self._output_sample_rate)
        payload = {
            "type": "audio",
            "encoding": "pcm16",
            "sample_rate": sample_rate,
            "data": base64.b64encode(audio_bytes).decode("ascii")
        }
        await self._send_json(payload)
