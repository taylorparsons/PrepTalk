from __future__ import annotations

from dataclasses import dataclass
import io
from html.parser import HTMLParser
from urllib.parse import urlparse
from typing import Optional

import httpx

from .pdf_text import extract_pdf_text


SUPPORTED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt"
}

SUPPORTED_EXTENSIONS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".txt": "txt"
}


@dataclass(frozen=True)
class DocumentInput:
    data: bytes
    filename: str | None = None
    content_type: str | None = None


def _extension(filename: str | None) -> str | None:
    if not filename:
        return None
    lowered = filename.lower().strip()
    if "." not in lowered:
        return None
    return "." + lowered.rsplit(".", 1)[1]


def detect_document_kind(filename: str | None, content_type: str | None) -> str | None:
    if content_type:
        kind = SUPPORTED_CONTENT_TYPES.get(content_type.lower().strip())
        if kind:
            return kind
    ext = _extension(filename)
    if ext:
        return SUPPORTED_EXTENSIONS.get(ext)
    return None


def is_supported_document(filename: str | None, content_type: str | None) -> bool:
    return detect_document_kind(filename, content_type) is not None


def _extract_txt(data: bytes, max_chars: int) -> str:
    if not data:
        return ""
    text = data.decode("utf-8", errors="replace")
    if len(text) > max_chars:
        return text[:max_chars]
    return text


def _extract_docx(data: bytes, max_chars: int) -> str:
    if not data:
        return ""
    try:
        from docx import Document
    except ImportError:
        return ""
    try:
        doc = Document(io.BytesIO(data))
    except Exception:
        return ""

    parts = []
    total = 0
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        parts.append(text)
        total += len(text)
        if total >= max_chars:
            break

    joined = "\n".join(parts)
    if len(joined) > max_chars:
        return joined[:max_chars]
    return joined


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        cleaned = data.strip()
        if cleaned:
            self._parts.append(cleaned)

    def text(self) -> str:
        return " ".join(self._parts)


def _extract_html_text(html_text: str, max_chars: int) -> str:
    if not html_text:
        return ""
    extractor = _HTMLTextExtractor()
    extractor.feed(html_text)
    joined = extractor.text()
    normalized = " ".join(joined.split())
    if len(normalized) > max_chars:
        return normalized[:max_chars]
    return normalized


def extract_document_text(
    document: DocumentInput,
    max_chars: int = 8000
) -> str:
    if not document.data:
        return ""
    kind = detect_document_kind(document.filename, document.content_type)
    if kind == "pdf":
        return extract_pdf_text(document.data, max_chars=max_chars)
    if kind == "txt":
        return _extract_txt(document.data, max_chars)
    if kind == "docx":
        return _extract_docx(document.data, max_chars)
    return ""


def fetch_url_text(url: str, max_chars: int = 8000) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Job description URL must start with http or https.")

    with httpx.Client(follow_redirects=True, timeout=20.0) as client:
        response = client.get(url)
    response.raise_for_status()

    content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
    filename = parsed.path.rsplit("/", 1)[-1] if parsed.path else None
    kind = detect_document_kind(filename, content_type)
    if kind in {"pdf", "docx", "txt"}:
        return extract_document_text(
            DocumentInput(data=response.content, filename=filename, content_type=content_type),
            max_chars=max_chars
        )

    raw_text = response.text or response.content.decode("utf-8", errors="replace")
    if "html" in content_type or "<html" in raw_text.lower():
        return _extract_html_text(raw_text, max_chars=max_chars)
    return _extract_txt(response.content, max_chars=max_chars)
