import pytest

from app.services import pdf_service
from app.services.store import InterviewRecord


def test_build_study_guide_pdf_falls_back_without_enums(monkeypatch):
    if pdf_service.FPDF is None:
        pytest.skip('fpdf not installed')

    monkeypatch.setattr(pdf_service, 'XPos', None)
    monkeypatch.setattr(pdf_service, 'YPos', None)

    record = InterviewRecord(
        interview_id='int-123',
        user_id='user-123',
        adapter='mock',
        role_title='Role',
        questions=['Q1'],
        focus_areas=['Focus'],
        transcript=[{'role': 'coach', 'text': 'Hello', 'timestamp': '00:01'}],
        score={'overall_score': 85, 'summary': 'Solid', 'strengths': ['A'], 'improvements': ['B']}
    )

    data = pdf_service.build_study_guide_pdf(record)
    assert isinstance(data, (bytes, bytearray))
    assert len(data) > 50
