from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Iterable

from pydantic import BaseModel, Field, ValidationError

from ..logging_config import get_logger
from ..settings import load_settings

logger = get_logger()


class AgentParameterSet(BaseModel):
    model: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)
    tools: list[str] = Field(default_factory=list)
    system_prompt: str | None = None


class AgentTeamProfile(BaseModel):
    team_id: str
    display_name: str
    description: str
    schema_version: int = Field(default=1, ge=1)
    parameters: AgentParameterSet
    feature_flags: dict[str, bool] = Field(default_factory=dict)


@dataclass
class AgentRegistry:
    teams: dict[str, AgentTeamProfile]

    def list_profiles(self) -> list[AgentTeamProfile]:
        return sorted(self.teams.values(), key=lambda item: item.team_id)

    def get_profile(self, team_id: str) -> AgentTeamProfile | None:
        return self.teams.get(team_id)


_DEFAULT_TEAM_CONFIGS: list[dict] = [
    {
        "team_id": "general-chat",
        "display_name": "General Chat",
        "description": "Default chat coach parameters.",
        "schema_version": 1,
        "parameters": {
            "model": "gemini-3-pro-preview",
            "temperature": 0.7,
            "max_tokens": 1024,
            "tools": ["knowledge", "summarize"],
            "system_prompt": "You are a helpful coaching assistant."
        },
        "feature_flags": {
            "streaming": True,
            "memory": True
        }
    },
    {
        "team_id": "voice-coach",
        "display_name": "Voice Coach",
        "description": "Voice-first coaching with faster turn-taking parameters.",
        "schema_version": 1,
        "parameters": {
            "model": "gemini-2.5-flash-native-audio-preview-12-2025",
            "temperature": 0.3,
            "max_tokens": 512,
            "top_p": 0.9,
            "tools": ["live_audio", "tone_check"],
            "system_prompt": "You are a concise, real-time voice coach."
        },
        "feature_flags": {
            "streaming": True,
            "barge_in": True
        }
    }
]


def _parse_profiles(raw_profiles: Iterable[dict]) -> list[AgentTeamProfile]:
    profiles: list[AgentTeamProfile] = []
    for raw in raw_profiles:
        profiles.append(AgentTeamProfile.model_validate(raw))
    return profiles


def _registry_from_profiles(profiles: Iterable[AgentTeamProfile]) -> AgentRegistry:
    teams: dict[str, AgentTeamProfile] = {}
    for profile in profiles:
        teams[profile.team_id] = profile
    return AgentRegistry(teams=teams)


def load_registry(registry_path: Path | None) -> AgentRegistry:
    raw_profiles: list[dict]
    if registry_path and registry_path.exists():
        raw_profiles = json.loads(registry_path.read_text())
        logger.info(
            "event=agent_registry_load status=complete source=file path=%s entries=%s",
            registry_path,
            len(raw_profiles)
        )
    else:
        raw_profiles = list(_DEFAULT_TEAM_CONFIGS)
        logger.info(
            "event=agent_registry_load status=complete source=defaults entries=%s",
            len(raw_profiles)
        )

    try:
        profiles = _parse_profiles(raw_profiles)
    except ValidationError as exc:
        raise ValueError("Invalid agent registry configuration.") from exc

    return _registry_from_profiles(profiles)


_REGISTRY: AgentRegistry | None = None


def get_agent_registry() -> AgentRegistry:
    global _REGISTRY
    if _REGISTRY is not None:
        return _REGISTRY
    settings = load_settings()
    registry_path = Path(settings.agent_registry_path) if settings.agent_registry_path else None
    _REGISTRY = load_registry(registry_path)
    return _REGISTRY
