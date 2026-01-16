from fastapi.testclient import TestClient

from app.main import app


def test_list_agent_teams():
    client = TestClient(app)

    response = client.get("/api/agent-teams")

    assert response.status_code == 200
    payload = response.json()
    team_ids = {team["team_id"] for team in payload["teams"]}
    assert "general-chat" in team_ids


def test_get_agent_team():
    client = TestClient(app)

    response = client.get("/api/agent-teams/voice-coach")

    assert response.status_code == 200
    payload = response.json()
    assert payload["team_id"] == "voice-coach"
    assert payload["parameters"]["model"]


def test_get_agent_team_not_found():
    client = TestClient(app)

    response = client.get("/api/agent-teams/unknown-team")

    assert response.status_code == 404
