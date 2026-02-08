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


def test_health_post_returns_ok():
    client = TestClient(app)
    response = client.post("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_head_returns_ok():
    client = TestClient(app)
    response = client.head("/health")

    assert response.status_code == 200


def test_favicon_route_returns_no_content():
    client = TestClient(app)
    response = client.get("/favicon.ico")

    assert response.status_code == 204


def test_root_does_not_reference_legacy_dist_css():
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert "/static/css/dist.css" not in response.text


def test_root_requires_access_token_when_configured(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKENS", "token-1")
    client = TestClient(app)

    response = client.get("/")

    assert response.status_code == 401
    assert "Access Required" in response.text


def test_root_accepts_query_access_token_and_sets_cookies(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKENS", "token-1:user-123")
    client = TestClient(app)

    response = client.get("/?access_token=token-1")

    assert response.status_code == 200
    assert response.cookies.get("preptalk_access_token") == "token-1"
    assert response.cookies.get("preptalk_user_id") == "user-123"
