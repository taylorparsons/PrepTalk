import json

import pytest

from app.services.agent_registry import load_registry


def test_default_registry_contains_expected_teams():
    registry = load_registry(None)
    team_ids = [team.team_id for team in registry.list_profiles()]
    assert "general-chat" in team_ids
    assert "voice-coach" in team_ids


def test_registry_loads_from_file(tmp_path):
    payload = [
        {
            "team_id": "custom-team",
            "display_name": "Custom Team",
            "description": "Custom parameters",
            "schema_version": 1,
            "parameters": {
                "model": "gemini-3-pro-preview",
                "temperature": 0.6,
                "max_tokens": 800,
                "tools": ["summarize"],
                "system_prompt": "Custom instructions"
            },
            "feature_flags": {"streaming": False}
        }
    ]
    registry_path = tmp_path / "registry.json"
    registry_path.write_text(json.dumps(payload))

    registry = load_registry(registry_path)
    profile = registry.get_profile("custom-team")

    assert profile is not None
    assert profile.parameters.model == "gemini-3-pro-preview"
    assert profile.feature_flags["streaming"] is False


def test_invalid_registry_raises_value_error(tmp_path):
    payload = [
        {
            "team_id": "broken-team",
            "display_name": "Broken Team",
            "description": "Missing parameters"
        }
    ]
    registry_path = tmp_path / "registry.json"
    registry_path.write_text(json.dumps(payload))

    with pytest.raises(ValueError):
        load_registry(registry_path)
