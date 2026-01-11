from io import BytesIO

from app.services.document_text import DocumentInput, extract_document_text, is_supported_document


def _docx_bytes(lines):
    from docx import Document

    doc = Document()
    for line in lines:
        doc.add_paragraph(line)
    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def test_txt_extraction():
    doc = DocumentInput(
        data=b"Resume text here",
        filename="resume.txt",
        content_type="text/plain"
    )
    text = extract_document_text(doc, max_chars=1000)
    assert "Resume text here" in text


def test_docx_extraction():
    content = _docx_bytes(["Hello", "World"])
    doc = DocumentInput(
        data=content,
        filename="resume.docx",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    text = extract_document_text(doc, max_chars=1000)
    assert "Hello" in text
    assert "World" in text


def test_supported_document_detection():
    assert is_supported_document("resume.pdf", "application/pdf")
    assert is_supported_document("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert is_supported_document("resume.txt", "text/plain")
    assert not is_supported_document("resume.rtf", "application/rtf")
