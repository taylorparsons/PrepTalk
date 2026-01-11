from __future__ import annotations

from dataclasses import dataclass
import io
from typing import Optional

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
