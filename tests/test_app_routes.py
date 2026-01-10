from fastapi.testclient import TestClient

from app.main import app


def test_root_serves_ui():
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert 'id="app"' in response.text
    assert "components.css" in response.text
    assert "app.js" in response.text


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
