from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass
from datetime import datetime
import re
from typing import Any, Awaitable, Callable

try:
    from google import genai
    from google.genai import types
except ImportError as exc:
    genai = None
    types = None
    _GENAI_IMPORT_ERROR = exc

from .store import store
from ..logging_config import get_logger, short_id


DEFAULT_SYSTEM_PROMPT = (
    "You are an interview coach. Keep responses concise, friendly, and aligned "
    "to the candidate's target role. Ask one question at a time."
)

logger = get_logger()


@dataclass(frozen=True)
class LiveAudioChunk:
    data: bytes
    mime_type: str


def _timestamp() -> str:
    return datetime.utcnow().strftime("%H:%M:%S")


QUESTION_WORDS = re.compile(
    r"\b(what|why|how|when|where|tell me|describe|walk me|can you|could you|share|give me|explain)\b",
    re.IGNORECASE
)

REHYDRATE_MAX_TURNS = 8
REHYDRATE_MAX_TEXT = 240


def _normalize_question(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


def _looks_like_question(text: str) -> bool:
    if not text:
        return False
    if "?" in text:
        return True
    return QUESTION_WORDS.search(text) is not None


def _match_repeat_question(text: str, questions: list[str], max_index: int | None) -> int | None:
    if max_index is None or max_index < 0:
        return None
    if not _looks_like_question(text):
        return None
    normalized_text = _normalize_question(text)
    if not normalized_text:
        return None
    for index, question in enumerate(questions):
        if index > max_index:
            break
        normalized_question = _normalize_question(question)
        if not normalized_question:
            continue
        if normalized_question in normalized_text:
            return index
    return None


def _truncate_text(value: str, limit: int) -> str:
    if not value:
        return ""
    cleaned = value.strip()
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


def _build_rehydrate_prompt(record, transcript_tail: list[dict]) -> str | None:
    if not record or not transcript_tail:
        return None
    lines = []
    for entry in transcript_tail:
        role = entry.get("role", "system")
        text = _truncate_text(entry.get("text", ""), REHYDRATE_MAX_TEXT)
        if not text:
            continue
        lines.append(f"{role}: {text}")
    if not lines:
        return None
    asked_index = record.asked_question_index
    current_question = ""
    next_question = ""
    if asked_index is not None and 0 <= asked_index < len(record.questions):
        current_question = record.questions[asked_index]
        next_index = asked_index + 1
        if 0 <= next_index < len(record.questions):
            next_question = record.questions[next_index]
    last_role = transcript_tail[-1].get("role", "system")
    return (
        "We got disconnected. Continue the conversation without repeating prior questions.\n"
        f"Last speaker: {last_role}\n"
        "Recent transcript:\n"
        f"{chr(10).join(lines)}\n\n"
        f"Current question index: {asked_index if asked_index is not None else 'none'}\n"
        f"Current question: {current_question or 'none'}\n"
        f"Next question: {next_question or 'none'}\n\n"
        "Rules:\n"
        "- If the candidate was mid-answer, let them finish.\n"
        "- If the candidate's answer was brief or unclear, ask one clarifying follow-up.\n"
        "- Do not repeat any questions already asked.\n"
        "- Keep responses concise and friendly."
    )



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
        self._rehydrating = False

    async def connect(self) -> None:
        logger.info(
            "event=gemini_live_call status=start requested_model=%s interview_id=%s user_id=%s",
            self._model,
            short_id(self._interview_id),
            short_id(self._user_id)
        )
        config = {
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "system_instruction": self._system_prompt,
            "realtime_input_config": {
                "automatic_activity_detection": {
                    "disabled": True
                }
            }
        }
        self._session_cm = self._client.aio.live.connect(model=self._model, config=config)
        self._session = await self._session_cm.__aenter__()

        self._tasks.append(asyncio.create_task(self._send_loop()))
        self._tasks.append(asyncio.create_task(self._receive_loop()))

        await self._send_json({"type": "status", "state": "gemini-connected"})
        self._rehydrating = await self._send_rehydrate_context()
        logger.info(
            "event=gemini_live_call status=complete requested_model=%s effective_model=%s interview_id=%s user_id=%s",
            self._model,
            getattr(self._session, "model", None) or self._model,
            short_id(self._interview_id),
            short_id(self._user_id)
        )

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

    async def send_activity(self, state: str | None) -> None:
        if self._closed or not self._session or not state:
            return
        lowered = state.lower()
        try:
            if lowered == "start":
                payload = types.ActivityStart() if types else {}
                await self._session.send_realtime_input(activity_start=payload)
            elif lowered == "end":
                payload = types.ActivityEnd() if types else {}
                await self._session.send_realtime_input(activity_end=payload)
        except Exception:
            logger.exception(
                "event=gemini_live_activity status=error interview_id=%s user_id=%s state=%s",
                short_id(self._interview_id),
                short_id(self._user_id),
                lowered
            )

    async def stop(self) -> None:
        if self._closed:
            return
        self._closed = True
        await self._close_session()

    async def _close_session(self, *, skip_task: asyncio.Task | None = None) -> None:
        if self._session:
            try:
                await self._session.send_realtime_input(audio_stream_end=True)
            except Exception:
                pass

        for task in self._tasks:
            if task is skip_task:
                continue
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
            if self._closed:
                return
            logger.exception(
                "event=gemini_live_send status=error interview_id=%s user_id=%s",
                short_id(self._interview_id),
                short_id(self._user_id)
            )
            await self._send_json({"type": "error", "message": _friendly_error(exc)})
            await self._send_json({"type": "status", "state": "gemini-error"})
            self._closed = True
            await self._close_session(skip_task=asyncio.current_task())

    async def _receive_loop(self) -> None:
        assert self._session is not None
        try:
            async for response in self._session.receive():
                await self._handle_response(response)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            if self._closed:
                return
            logger.exception(
                "event=gemini_live_receive status=error interview_id=%s user_id=%s",
                short_id(self._interview_id),
                short_id(self._user_id)
            )
            await self._send_json({"type": "error", "message": _friendly_error(exc)})
            await self._send_json({"type": "status", "state": "gemini-error"})
            self._closed = True
            await self._close_session(skip_task=asyncio.current_task())
        else:
            if self._closed:
                return
            logger.info(
                "event=gemini_live_receive status=ended interview_id=%s user_id=%s",
                short_id(self._interview_id),
                short_id(self._user_id)
            )
            await self._send_json({"type": "status", "state": "gemini-disconnected"})
            self._closed = True
            await self._close_session(skip_task=asyncio.current_task())

    async def _send_rehydrate_context(self) -> bool:
        record = store.get(self._interview_id, self._user_id)
        if not record or not record.transcript:
            return False
        transcript_tail = list(record.transcript[-REHYDRATE_MAX_TURNS:])
        prompt = _build_rehydrate_prompt(record, transcript_tail)
        if not prompt or self._session is None:
            return False
        await self._send_json({"type": "status", "state": "thinking"})
        try:
            await self._session.send(input=prompt)
        except Exception:
            logger.exception(
                "event=gemini_live_rehydrate status=error interview_id=%s user_id=%s",
                short_id(self._interview_id),
                short_id(self._user_id)
            )
            return False
        logger.info(
            "event=gemini_live_rehydrate status=complete interview_id=%s user_id=%s turns=%s",
            short_id(self._interview_id),
            short_id(self._user_id),
            len(transcript_tail)
        )
        return True

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
        if role == "coach":
            record = store.get(self._interview_id, self._user_id)
            if record:
                matched_index = _match_repeat_question(
                    text,
                    list(record.questions),
                    record.asked_question_index
                )
                if matched_index is not None:
                    logger.info(
                        "event=question_guard_repeat interview_id=%s user_id=%s index=%s asked_question_index=%s",
                        short_id(self._interview_id),
                        short_id(self._user_id),
                        matched_index,
                        record.asked_question_index
                    )
                    if self._session is not None:
                        try:
                            await self._session.send(
                                input=(
                                    "You already asked that question. Move to the next "
                                    "question in the list and do not repeat."
                                )
                            )
                        except Exception:
                            pass
        if role == "coach" and self._rehydrating:
            self._rehydrating = False
            await self._send_json({"type": "status", "state": "gemini-connected"})
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
