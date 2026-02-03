from __future__ import annotations

from typing import Iterable

try:
    from fpdf import FPDF
except ImportError:
    FPDF = None

try:
    from fpdf.enums import XPos, YPos
except Exception:
    XPos = None
    YPos = None

from .store import InterviewRecord

def _cell_newline_kwargs() -> dict:
    if XPos is None or YPos is None:
        return {"ln": True}
    return {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}


class _StudyGuidePDF(FPDF):
    def header(self) -> None:
        self.set_font("Helvetica", style="B", size=14)
        self.cell(0, 8, "Interview Study Guide", **_cell_newline_kwargs())
        self.ln(2)
        self.set_x(self.l_margin)


def _write_section(pdf: FPDF, title: str, lines: Iterable[str]) -> None:
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(0, 8, title, **_cell_newline_kwargs())
    pdf.ln(1)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", size=11)
    for line in lines:
        pdf.multi_cell(0, 6, line)
        pdf.set_x(pdf.l_margin)
    pdf.ln(2)


def build_study_guide_pdf(record: InterviewRecord) -> bytes:
    if FPDF is None:
        raise RuntimeError("fpdf2 is required for study guide export.")

    pdf = _StudyGuidePDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 6, f"Interview ID: {record.interview_id}", **_cell_newline_kwargs())
    pdf.set_x(pdf.l_margin)
    if record.role_title:
        pdf.cell(0, 6, f"Role: {record.role_title}", **_cell_newline_kwargs())
        pdf.set_x(pdf.l_margin)
    pdf.cell(0, 6, f"Adapter: {record.adapter}", **_cell_newline_kwargs())
    pdf.set_x(pdf.l_margin)
    pdf.ln(4)

    score = record.score or {}
    overall = score.get("overall_score")
    summary = score.get("summary") or "Summary pending."

    if overall is not None:
        pdf.set_font("Helvetica", style="B", size=12)
        pdf.cell(0, 8, f"Overall Score: {overall}", **_cell_newline_kwargs())
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", size=11)
        pdf.ln(2)

    _write_section(pdf, "Summary", [summary])

    strengths = score.get("strengths") or []
    if strengths:
        _write_section(pdf, "Strengths", [f"- {item}" for item in strengths])

    improvements = score.get("improvements") or []
    if improvements:
        _write_section(pdf, "Focus Next", [f"- {item}" for item in improvements])

    if record.focus_areas:
        _write_section(pdf, "Rubric", [f"- {item}" for item in record.focus_areas])

    transcript_lines = []
    for entry in record.transcript:
        timestamp = entry.get("timestamp") or ""
        role = entry.get("role", "")
        text = entry.get("text", "")
        prefix = f"[{timestamp}] " if timestamp else ""
        transcript_lines.append(f"{prefix}{role}: {text}")

    if transcript_lines:
        _write_section(pdf, "Transcript", transcript_lines)

    data = pdf.output()
    if isinstance(data, bytes):
        return data
    if isinstance(data, bytearray):
        return bytes(data)
    return str(data).encode("latin-1")


def build_study_guide_text(record: InterviewRecord) -> str:
    lines: list[str] = []
    lines.append("Interview Study Guide")
    lines.append("")
    lines.append(f"Interview ID: {record.interview_id}")
    if record.role_title:
        lines.append(f"Role: {record.role_title}")
    lines.append(f"Adapter: {record.adapter}")
    lines.append("")

    score = record.score or {}
    overall = score.get("overall_score")
    summary = score.get("summary") or "Summary pending."

    if overall is not None:
        lines.append(f"Overall Score: {overall}")
        lines.append("")

    lines.append("Summary")
    lines.append(summary)
    lines.append("")

    strengths = score.get("strengths") or []
    if strengths:
        lines.append("Strengths")
        lines.extend([f"- {item}" for item in strengths])
        lines.append("")

    improvements = score.get("improvements") or []
    if improvements:
        lines.append("Focus Next")
        lines.extend([f"- {item}" for item in improvements])
        lines.append("")

    if record.focus_areas:
        lines.append("Rubric")
        lines.extend([f"- {item}" for item in record.focus_areas])
        lines.append("")

    if record.transcript:
        lines.append("Transcript")
        for entry in record.transcript:
            timestamp = entry.get("timestamp") or ""
            role = entry.get("role", "")
            text = entry.get("text", "")
            prefix = f"[{timestamp}] " if timestamp else ""
            lines.append(f"{prefix}{role}: {text}")
        lines.append("")

    return "\n".join(lines).strip() + "\n"
