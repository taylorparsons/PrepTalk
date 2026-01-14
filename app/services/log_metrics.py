from __future__ import annotations

from collections import Counter, defaultdict
from typing import Dict, List

from .log_parse import parse_log_line


def build_log_summary(lines: List[str]) -> Dict[str, object]:
    event_counts = Counter()
    status_counts = defaultdict(Counter)
    disconnect_counts = Counter()
    client_disconnects = 0
    server_disconnects = 0
    gemini_disconnects = 0
    errors = []

    for line in lines:
        parsed = parse_log_line(line)
        event = parsed.get("event")
        status = parsed.get("status")
        level = parsed.get("level")
        if event:
            event_counts[event] += 1
        if event and status:
            status_counts[event][status] += 1
        if event in {"ws_disconnect", "gemini_live_receive", "client_event"}:
            disconnect_counts[event] += 1
        if event == "ws_disconnect":
            server_disconnects += 1
        if event == "gemini_live_receive" and status == "ended":
            gemini_disconnects += 1
        if event == "client_event":
            event_type = parsed.get("event_type")
            if event_type in {"ws_close", "ws_disconnected", "ws_error"}:
                client_disconnects += 1
        if level in {"ERROR", "CRITICAL"} or status == "error":
            errors.append(parsed)

    return {
        "event_counts": dict(event_counts),
        "status_counts": {key: dict(value) for key, value in status_counts.items()},
        "disconnect_counts": dict(disconnect_counts),
        "client_disconnects": client_disconnects,
        "server_disconnects": server_disconnects,
        "gemini_disconnects": gemini_disconnects,
        "error_count": len(errors),
        "recent_errors": errors[-10:]
    }
