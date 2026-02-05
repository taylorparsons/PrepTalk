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


def test_build_study_guide_pdf_sanitizes_unicode():
    if pdf_service.FPDF is None:
        pytest.skip('fpdf not installed')

    record = InterviewRecord(
        interview_id='int-789',
        user_id='user-789',
        adapter='mock',
        role_title='Role',
        questions=['Q1'],
        focus_areas=['Focus'],
        transcript=[{'role': 'coach', 'text': 'It\u2019s great \u2014 really.', 'timestamp': '00:02'}],
        score={'overall_score': 85, 'summary': 'Solid \u2014 with notes'}
    )

    data = pdf_service.build_study_guide_pdf(record)
    assert isinstance(data, (bytes, bytearray))
    assert len(data) > 50


def test_build_study_guide_text_formats_focus_areas():
    record = InterviewRecord(
        interview_id='int-456',
        user_id='user-456',
        adapter='mock',
        role_title='Role',
        questions=['Q1'],
        focus_areas=[
            "{'area': 'Metrics-Driven Engineering Efficiency', 'description': \"Evaluate DORA metrics.\"}",
            'Plain focus area'
        ],
        transcript=[],
        score={'overall_score': 90, 'summary': 'Solid', 'strengths': [], 'improvements': []}
    )

    output = pdf_service.build_study_guide_text(record)

    assert 'Rubric' in output
    assert "- Metrics-Driven Engineering Efficiency" in output
    assert "Evaluate DORA metrics." in output
    assert "- Plain focus area" in output
    assert "{'area':" not in output
