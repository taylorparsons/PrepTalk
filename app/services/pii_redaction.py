from __future__ import annotations

import re


EMAIL_PATTERN = re.compile(r"\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
PHONE_PATTERN = re.compile(
    r"(?<!\w)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\w)"
)
LINKEDIN_PATTERN = re.compile(r"(linkedin\.com/in/)([A-Za-z0-9-_%]+)", re.IGNORECASE)
NAME_ROLE_KEYWORDS = {
    "manager",
    "program",
    "product",
    "technical",
    "technology",
    "engineer",
    "developer",
    "consultant",
    "director",
    "officer",
    "scientist",
    "architect",
    "analyst",
    "principal",
    "lead",
    "specialist",
    "operations",
    "strategy",
    "platform",
    "ai",
    "genai",
}
NAME_SUFFIXES = {"II", "III", "IV", "V", "VI", "JR", "SR"}


def _is_name_token(token: str) -> bool:
    raw = token.strip()
    if not raw:
        return False
    # Trailing commas are usually location/date separators, not names.
    if raw.endswith(","):
        return False
    if any(char in raw for char in "|@:/\\"):
        return False
    part = raw.strip(",")
    upper = part.upper().rstrip(".")
    if upper in NAME_SUFFIXES:
        return True
    if re.fullmatch(r"[A-Z]\.?", part):
        return True
    if re.fullmatch(r"[A-Z][a-z]+(?:['-][A-Z][a-z]+)*", part):
        return True
    if re.fullmatch(r"[A-Z]{2,}(?:['-][A-Z]{2,})*", part):
        return True
    return False


def _redact_name_prefix_in_line(line: str) -> str | None:
    stripped = line.strip()
    if not stripped:
        return False
    if len(stripped) > 160:
        return None

    token_matches = list(re.finditer(r"\S+", line))
    if len(token_matches) < 2:
        return None

    name_tokens: list[str] = []
    last_name_token_end: int | None = None
    for token_match in token_matches[:6]:
        token_text = token_match.group(0)
        if _is_name_token(token_text):
            name_tokens.append(token_text.strip(","))
            last_name_token_end = token_match.end()
            if len(name_tokens) >= 5:
                break
            continue
        break

    if len(name_tokens) < 2 or last_name_token_end is None:
        return None

    normalized_words = {token.lower().strip(".") for token in name_tokens}
    if normalized_words & NAME_ROLE_KEYWORDS:
        return None

    first_name = name_tokens[0]
    suffix = line[last_name_token_end:]
    return f"{first_name} [redacted]{suffix}"


def _redact_header_name(text: str) -> str:
    lines = text.splitlines()
    checked_non_empty = 0
    for index, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            continue
        checked_non_empty += 1
        redacted_line = _redact_name_prefix_in_line(raw_line)
        if redacted_line:
            lines[index] = redacted_line
            break
        if checked_non_empty >= 3:
            break
    return "\n".join(lines)


def redact_resume_pii(text: str) -> str:
    if not text:
        return ""

    redacted = _redact_header_name(text)
    redacted = EMAIL_PATTERN.sub(r"[redacted]@\2", redacted)
    redacted = PHONE_PATTERN.sub("[redacted]", redacted)
    redacted = LINKEDIN_PATTERN.sub(r"\1[redacted]", redacted)
    return redacted
