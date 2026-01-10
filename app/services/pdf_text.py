from __future__ import annotations

import io


def extract_pdf_text(data: bytes, max_chars: int = 8000) -> str:
    if not data:
        return ""
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception:
        return ""

    parts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text:
            parts.append(text)
        if sum(len(p) for p in parts) >= max_chars:
            break

    joined = "\n".join(parts)
    if len(joined) > max_chars:
        return joined[:max_chars]
    return joined
