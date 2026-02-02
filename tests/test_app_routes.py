import json

from fastapi.testclient import TestClient

from app.main import app


def test_root_serves_ui():
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert 'id="app"' in response.text
    assert "components.css" in response.text
    assert "app.js" in response.text
    assert "preptalk_user_id" in response.headers.get("set-cookie", "")

    user_id_cookie = response.cookies.get("preptalk_user_id")
    assert user_id_cookie
    marker = "window.__APP_CONFIG__ = "
    start = response.text.find(marker)
    assert start != -1
    start += len(marker)
    end = response.text.find(";", start)
    payload = json.loads(response.text[start:end].strip())
    assert payload.get("userId") == user_id_cookie


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
