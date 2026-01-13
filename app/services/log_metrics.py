from __future__ import annotations

from collections import Counter, defaultdict
from typing import Dict, List

from .log_parse import parse_log_line


def build_log_summary(lines: List[str]) -> Dict[str, object]:
    event_counts = Counter()
    status_counts = defaultdict(Counter)
    disconnect_counts = Counter()
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
        if level in {"ERROR", "CRITICAL"} or status == "error":
            errors.append(parsed)

    return {
        "event_counts": dict(event_counts),
        "status_counts": {key: dict(value) for key, value in status_counts.items()},
        "disconnect_counts": dict(disconnect_counts),
        "error_count": len(errors),
        "recent_errors": errors[-10:]
    }
