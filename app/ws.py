from __future__ import annotations

import asyncio
import base64
import json
import math
import time
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from .services import interview_service
from .services.adapters import get_adapter
from .services.gemini_live import GeminiLiveBridge
from .services.store import store
from .settings import load_settings
from .logging_config import get_logger

logger = get_logger()


MOCK_AUDIO_SAMPLE_RATE = 24000
MOCK_AUDIO_BASE64 = None


def _mock_audio_base64(duration_ms: int = 180, frequency: float = 440.0) -> str:
    global MOCK_AUDIO_BASE64
    if MOCK_AUDIO_BASE64 is not None:
        return MOCK_AUDIO_BASE64
    sample_count = int(MOCK_AUDIO_SAMPLE_RATE * duration_ms / 1000)
    amplitude = 0.2
    pcm = bytearray()
    for i in range(sample_count):
        value = int(amplitude * 32767 * math.sin(2 * math.pi * frequency * i / MOCK_AUDIO_SAMPLE_RATE))
        pcm.extend(int(value).to_bytes(2, byteorder='little', signed=True))
    MOCK_AUDIO_BASE64 = base64.b64encode(pcm).decode('ascii')
    return MOCK_AUDIO_BASE64

class LiveWebSocketSession:
    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.adapter = get_adapter()
        self.settings = load_settings()
        self._send_lock = asyncio.Lock()
        self._stream_task: asyncio.Task | None = None
        self._gemini_bridge: GeminiLiveBridge | None = None
        self._active = True
        self._user_id = self.settings.user_id
        self._interview_id: str | None = None
        self._session_id: str | None = None
        self._session_started_at: float | None = None
        self._audio_frames = 0
        self._audio_bytes = 0

    async def run(self) -> None:
        await self.websocket.accept()
        await self._send({"type": "status", "state": "connected"})

        client = self.websocket.client
        client_host = getattr(client, "host", "unknown")
        client_port = getattr(client, "port", "unknown")
        logger.info("event=ws_connect status=accepted client=%s:%s", client_host, client_port)

        try:
            while self._active:
                try:
                    message = await self.websocket.receive()
                except WebSocketDisconnect:
                    break

                if message.get("type") == "websocket.disconnect":
                    break

                if message.get("bytes") is not None:
                    chunk = message["bytes"]
                    self._audio_frames += 1
                    self._audio_bytes += len(chunk)
                    if self._gemini_bridge:
                        await self._gemini_bridge.send_audio(chunk)
                    continue

                if not message.get("text"):
                    continue

                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    logger.warning("event=ws_message status=invalid_json user_id=%s", self._user_id)
                    await self._send({"type": "error", "message": "Invalid JSON payload."})
                    continue

                await self._handle_payload(payload)
        finally:
            await self._shutdown()

    async def _handle_payload(self, payload: dict[str, Any]) -> None:
        message_type = payload.get("type")
        if message_type == "start":
            await self._handle_start(payload)
        elif message_type == "stop":
            await self._handle_stop()
        elif message_type == "audio":
            if self._gemini_bridge and payload.get("data"):
                try:
                    audio_bytes = base64.b64decode(payload["data"])
                except (ValueError, TypeError):
                    await self._send({"type": "error", "message": "Invalid audio payload."})
                    return
                self._audio_frames += 1
                self._audio_bytes += len(audio_bytes)
                await self._gemini_bridge.send_audio(audio_bytes)
            return
        else:
            logger.warning("event=ws_message status=unknown_type user_id=%s message_type=%s", self._user_id, message_type)
            await self._send({"type": "error", "message": "Unknown message type."})

    async def _handle_start(self, payload: dict[str, Any]) -> None:
        interview_id = payload.get("interview_id")
        user_id = payload.get("user_id") or self.settings.user_id
        self._user_id = user_id
        if not interview_id:
            await self._send({"type": "error", "message": "interview_id is required."})
            return

        if not store.get(interview_id, self._user_id):
            logger.warning("event=ws_start status=not_found user_id=%s interview_id=%s", self._user_id, interview_id)
            await self._send({"type": "error", "message": "Interview not found."})
            return

        try:
            live_payload = interview_service.start_live_session(interview_id, self._user_id)
        except RuntimeError as exc:
            await self._send({"type": "error", "message": str(exc)})
            return

        await self._send(
            {
                "type": "session",
                "interview_id": interview_id,
                "session_id": live_payload["session_id"],
                "adapter": self.adapter.name,
                "live_model": self.settings.live_model,
                "mode": live_payload["mode"]
            }
        )

        self._interview_id = interview_id
        self._session_id = live_payload.get("session_id")
        self._session_started_at = time.perf_counter()
        self._audio_frames = 0
        self._audio_bytes = 0

        logger.info(
            "event=ws_start status=complete user_id=%s interview_id=%s session_id=%s adapter=%s mode=%s",
            self._user_id,
            interview_id,
            self._session_id,
            self.adapter.name,
            live_payload.get("mode")
        )

        if self.adapter.name == "gemini":
            await self._start_gemini_session(interview_id)

        mock_transcript = live_payload.get("mock_transcript")
        if mock_transcript:
            if self._stream_task and not self._stream_task.done():
                self._stream_task.cancel()
            self._stream_task = asyncio.create_task(
                self._stream_mock_transcript(interview_id, self._user_id, mock_transcript)
            )

    async def _start_gemini_session(self, interview_id: str) -> None:
        if self._gemini_bridge is not None:
            await self._stop_gemini_session()

        api_key = getattr(self.adapter, "api_key", None)
        if not api_key:
            logger.warning("event=gemini_live_connect status=missing_key user_id=%s interview_id=%s", self._user_id, interview_id)
            await self._send({"type": "error", "message": "GEMINI_API_KEY is required."})
            return

        logger.info(
            "event=gemini_live_connect status=start user_id=%s interview_id=%s model=%s",
            self._user_id,
            interview_id,
            self.settings.live_model
        )

        self._gemini_bridge = GeminiLiveBridge(
            api_key=api_key,
            model=self.settings.live_model,
            interview_id=interview_id,
            user_id=self._user_id,
            send_json=self._send
        )
        try:
            await self._gemini_bridge.connect()
            logger.info(
                "event=gemini_live_connect status=complete user_id=%s interview_id=%s model=%s",
                self._user_id,
                interview_id,
                self.settings.live_model
            )
        except Exception as exc:
            logger.exception(
                "event=gemini_live_connect status=error user_id=%s interview_id=%s",
                self._user_id,
                interview_id
            )
            await self._send({"type": "error", "message": str(exc)})
            await self._stop_gemini_session()

    async def _stop_gemini_session(self) -> None:
        if self._gemini_bridge is None:
            return
        await self._gemini_bridge.stop()
        self._gemini_bridge = None

    async def _stream_mock_transcript(self, interview_id: str, user_id: str, transcript: list[dict]) -> None:
        try:
            for entry in transcript:
                if not self._active:
                    break
                await asyncio.sleep(0.12)
                store.append_transcript_entry(interview_id, entry, user_id)
                await self._send(
                    {
                        "type": "transcript",
                        "role": entry.get("role", "system"),
                        "text": entry.get("text", ""),
                        "timestamp": entry.get("timestamp", ""),
                        "is_final": True
                    }
                )

                await self._send(
                    {
                        "type": "audio",
                        "encoding": "pcm16",
                        "sample_rate": MOCK_AUDIO_SAMPLE_RATE,
                        "data": _mock_audio_base64()
                    }
                )

            await self._send({"type": "status", "state": "stream-complete"})
        except asyncio.CancelledError:
            return

    async def _handle_stop(self) -> None:
        self._active = False
        duration_ms = None
        if self._session_started_at is not None:
            duration_ms = int((time.perf_counter() - self._session_started_at) * 1000)
        logger.info(
            "event=ws_stop status=received user_id=%s interview_id=%s session_id=%s duration_ms=%s audio_frames=%s audio_bytes=%s",
            self._user_id,
            self._interview_id,
            self._session_id,
            duration_ms if duration_ms is not None else 0,
            self._audio_frames,
            self._audio_bytes
        )
        if self._stream_task and not self._stream_task.done():
            self._stream_task.cancel()
        await self._stop_gemini_session()
        await self._send({"type": "status", "state": "stopped"})

    async def _send(self, payload: dict[str, Any]) -> None:
        async with self._send_lock:
            try:
                await self.websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                self._active = False

    async def _shutdown(self) -> None:
        self._active = False
        logger.info(
            "event=ws_disconnect status=closed user_id=%s interview_id=%s session_id=%s",
            self._user_id,
            self._interview_id,
            self._session_id
        )
        if self._stream_task and not self._stream_task.done():
            self._stream_task.cancel()
        await self._stop_gemini_session()
        try:
            await self.websocket.close()
        except RuntimeError:
            pass


async def live_audio_websocket(websocket: WebSocket) -> None:
    session = LiveWebSocketSession(websocket)
    await session.run()
