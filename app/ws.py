from __future__ import annotations

import asyncio
import base64
import json
import math
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from .services import interview_service
from .services.adapters import get_adapter
from .services.store import store
from .settings import load_settings




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
        self._active = True

    async def run(self) -> None:
        await self.websocket.accept()
        await self._send({"type": "status", "state": "connected"})

        try:
            while self._active:
                try:
                    message = await self.websocket.receive()
                except WebSocketDisconnect:
                    break

                if message.get("type") == "websocket.disconnect":
                    break

                if message.get("bytes") is not None:
                    # Binary audio frames can be handled here in the future.
                    continue

                if not message.get("text"):
                    continue

                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
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
            # Audio frames are accepted for future Gemini Live handling.
            return
        else:
            await self._send({"type": "error", "message": "Unknown message type."})

    async def _handle_start(self, payload: dict[str, Any]) -> None:
        interview_id = payload.get("interview_id")
        if not interview_id:
            await self._send({"type": "error", "message": "interview_id is required."})
            return

        if not store.get(interview_id):
            await self._send({"type": "error", "message": "Interview not found."})
            return

        try:
            live_payload = interview_service.start_live_session(interview_id)
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

        mock_transcript = live_payload.get("mock_transcript")
        if mock_transcript:
            if self._stream_task and not self._stream_task.done():
                self._stream_task.cancel()
            self._stream_task = asyncio.create_task(
                self._stream_mock_transcript(interview_id, mock_transcript)
            )

    async def _stream_mock_transcript(self, interview_id: str, transcript: list[dict]) -> None:
        try:
            for entry in transcript:
                if not self._active:
                    break
                await asyncio.sleep(0.12)
                store.append_transcript_entry(interview_id, entry)
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
        if self._stream_task and not self._stream_task.done():
            self._stream_task.cancel()
        await self._send({"type": "status", "state": "stopped"})

    async def _send(self, payload: dict[str, Any]) -> None:
        async with self._send_lock:
            try:
                await self.websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                self._active = False

    async def _shutdown(self) -> None:
        self._active = False
        if self._stream_task and not self._stream_task.done():
            self._stream_task.cancel()
        try:
            await self.websocket.close()
        except RuntimeError:
            pass


async def live_audio_websocket(websocket: WebSocket) -> None:
    session = LiveWebSocketSession(websocket)
    await session.run()
