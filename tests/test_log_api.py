from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

from app.main import app


def test_log_summary_endpoint_returns_counts(tmp_path, monkeypatch):
    log_path = tmp_path / "app.log"
    log_path.write_text(
        "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed\n"
        "2026-01-13 15:06:23,095 INFO event=client_event event_type=ws_close status=received\n"
        "2026-01-13 15:06:23,096 INFO event=gemini_live_receive status=ended\n"
    )

    monkeypatch.setenv("LOG_DIR", str(tmp_path))

    client = TestClient(app)
    response = client.get("/api/logs/summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["event_counts"]["ws_disconnect"] == 1
    assert payload["client_disconnects"] == 1
    assert payload["server_disconnects"] == 1
    assert payload["gemini_disconnects"] == 1


def test_client_telemetry_endpoint():
    client = TestClient(app)
    response = client.post("/api/telemetry", json={"event": "ws_close"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_client_telemetry_accepts_journey_fields():
    client = TestClient(app)
    response = client.post(
        "/api/telemetry",
        json={
            "event": "journey_questions_generated",
            "category": "journey",
            "step": "questions_generated",
            "interview_id": "abc123",
            "session_id": "sess-1",
            "state": "complete",
            "detail": "ok",
            "value": 4,
            "anonymous_id": "anon-1",
            "new_user": True,
            "properties": {"question_count": 4, "used_job_url": False}
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_client_telemetry_forwards_to_ga4_when_enabled(monkeypatch):
    monkeypatch.setenv("GA4_MEASUREMENT_ID", "G-TEST123")
    monkeypatch.setenv("GA4_API_SECRET", "secret")
    ga4_mock = AsyncMock(return_value=None)
    monkeypatch.setattr("app.api.send_ga4_event", ga4_mock)

    client = TestClient(app)
    response = client.post(
        "/api/telemetry",
        json={
            "event": "journey_session_started",
            "category": "journey",
            "step": "session_started",
            "anonymous_id": "anon-xyz",
            "properties": {
                "mode": "turn",
                "adapter": "gemini",
                "voice_mode": "turn",
                "voice_output_mode": "auto",
                "voice_agent": "openai_tts",
                "tts_provider": "openai",
                "text_model": "gemini-3-pro",
                "tts_model": "gpt-4o-mini-tts"
            }
        }
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    ga4_mock.assert_awaited_once()
    params = ga4_mock.await_args.kwargs["params"]
    assert params["prop_adapter"] == "gemini"
    assert params["prop_voice_mode"] == "turn"
    assert params["prop_voice_output_mode"] == "auto"
    assert params["prop_voice_agent"] == "openai_tts"
    assert params["prop_tts_provider"] == "openai"
    assert params["prop_text_model"] == "gemini-3-pro"
    assert params["prop_tts_model"] == "gpt-4o-mini-tts"
