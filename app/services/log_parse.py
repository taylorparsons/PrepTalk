from __future__ import annotations

import re
from typing import Dict

LOG_RE = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (?P<level>[A-Z]+) (?P<msg>.*)$"
)
KV_RE = re.compile(r"(?P<key>[A-Za-z0-9_]+)=(?P<value>[^\s]+)")


def parse_log_line(line: str) -> Dict[str, str]:
    match = LOG_RE.match(line.strip())
    if not match:
        return {"raw": line.strip()}
    msg = match.group("msg")
    fields = {
        "timestamp": match.group("ts"),
        "level": match.group("level"),
        "message": msg
    }
    for kv in KV_RE.finditer(msg):
        fields[kv.group("key")] = kv.group("value")
    return fields
