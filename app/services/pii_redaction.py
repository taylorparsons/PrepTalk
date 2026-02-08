from __future__ import annotations

import re


EMAIL_PATTERN = re.compile(r"\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
PHONE_PATTERN = re.compile(
    r"(?<!\w)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\w)"
)
LINKEDIN_PATTERN = re.compile(r"(linkedin\.com/in/)([A-Za-z0-9-_%]+)", re.IGNORECASE)
LOCATION_PATTERN = re.compile(r"\b[A-Za-z][A-Za-z .'-]+,\s*[A-Za-z]{2,}\b")
STREET_PATTERN = re.compile(
    r"\b\d{1,6}\s+[A-Za-z0-9 .,'#-]{3,}\s(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Way|Dr|Drive)\b\.?",
    re.IGNORECASE,
)


def _redact_header_name(text: str) -> str:
    lines = text.splitlines()
    for index, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            continue
        if "@" in line or "|" in line or re.search(r"\d", line):
            break
        parts = [part for part in line.split() if part]
        if len(parts) <= 1:
            break
        first_name = parts[0]
        lines[index] = f"{first_name} [redacted]"
        break
    return "\n".join(lines)


def redact_resume_pii(text: str) -> str:
    if not text:
        return ""

    redacted = _redact_header_name(text)
    redacted = EMAIL_PATTERN.sub(r"[redacted]@\2", redacted)
    redacted = PHONE_PATTERN.sub("[redacted]", redacted)
    redacted = LINKEDIN_PATTERN.sub(r"\1[redacted]", redacted)
    redacted = STREET_PATTERN.sub("[redacted]", redacted)
    redacted = LOCATION_PATTERN.sub("[redacted], [redacted]", redacted)
    return redacted
