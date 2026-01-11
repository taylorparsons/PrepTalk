import os

from fastapi.testclient import TestClient

from app.main import app


def _pdf_bytes(label: str) -> bytes:
    return (
        f"%PDF-1.4\n"
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n"
        "4 0 obj\n<< /Length 44 >>\nstream\n"
        f"BT /F1 12 Tf 72 720 Td ({label}) Tj ET\n"
        "endstream\nendobj\n"
        "xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \n"
        "trailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n"
    ).encode("utf-8")


def _create_interview(client: TestClient) -> str:
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }
    response = client.post("/api/interviews", files=files)
    assert response.status_code == 200
    payload = response.json()
    return payload["interview_id"]


def _receive_until(websocket, expected_type: str, limit: int = 6) -> dict:
    messages = []
    for _ in range(limit):
        msg = websocket.receive_json()
        messages.append(msg)
        if msg.get("type") == expected_type:
            return msg
    raise AssertionError(f"Expected {expected_type}, got {messages}")


def test_websocket_streams_mock_transcript(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "mock")
    os.environ.pop("GEMINI_API_KEY", None)

    client = TestClient(app)
    interview_id = _create_interview(client)

    with client.websocket_connect("/ws/live") as websocket:
        status = websocket.receive_json()
        assert status["type"] == "status"
        assert status["state"] == "connected"

        websocket.send_json({"type": "start", "interview_id": interview_id})

        session = _receive_until(websocket, "session")
        assert session["interview_id"] == interview_id
        assert session["mode"] == "mock"

        messages = []
        for _ in range(4):
            messages.append(websocket.receive_json())

        types = {msg.get("type") for msg in messages}
        assert "transcript" in types
        assert "audio" in types

        transcript = next(msg for msg in messages if msg.get("type") == "transcript")
        assert transcript["role"] in {"coach", "candidate"}
        assert transcript["text"]

        websocket.send_json({"type": "stop"})
        stopped = _receive_until(websocket, "status")
        assert stopped["state"] in {"stopped", "stream-complete"}


def test_websocket_ping_returns_alive(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "mock")
    os.environ.pop("GEMINI_API_KEY", None)

    client = TestClient(app)

    with client.websocket_connect("/ws/live") as websocket:
        status = websocket.receive_json()
        assert status["type"] == "status"
        assert status["state"] == "connected"

        websocket.send_json({"type": "ping"})

        alive = _receive_until(websocket, "status")
        assert alive["state"] == "alive"

