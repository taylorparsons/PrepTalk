from fastapi.testclient import TestClient

from app.main import app


def test_log_summary_endpoint_returns_counts(tmp_path, monkeypatch):
    log_path = tmp_path / "app.log"
    log_path.write_text("2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed\n")

    monkeypatch.setenv("LOG_DIR", str(tmp_path))

    client = TestClient(app)
    response = client.get("/api/logs/summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["event_counts"]["ws_disconnect"] == 1
