from fastapi.testclient import TestClient

from app.main import app


def _pdf_bytes(label: str) -> bytes:
    return (
        f"%PDF-1.4\n"
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n"
        "4 0 obj\n<< /Length 44 >>\nstream\n"
        f"BT /F1 12 Tf 72 720 Td ({label}) Tj ET\n"
        "endstream\nendobj\n"
        "xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \n"
        "trailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n"
    ).encode("utf-8")


def _create_interview(client: TestClient) -> str:
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }
    response = client.post("/api/interviews", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["questions"]
    return payload["interview_id"]


def test_create_interview_returns_questions():
    client = TestClient(app)
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }
    response = client.post("/api/interviews", files=files)

    assert response.status_code == 200
    payload = response.json()
    assert payload["interview_id"]
    assert len(payload["questions"]) >= 3
    assert payload["adapter"] == "mock"


def test_live_session_returns_mock_transcript():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post("/api/live/session", json={"interview_id": interview_id})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert payload["mock_transcript"]


def test_score_returns_summary_and_transcript():
    client = TestClient(app)
    interview_id = _create_interview(client)

    transcript = [
        {"role": "coach", "text": "Welcome", "timestamp": "00:00"},
        {"role": "candidate", "text": "Hello", "timestamp": "00:04"}
    ]

    response = client.post(
        f"/api/interviews/{interview_id}/score",
        json={"transcript": transcript}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["overall_score"]
    assert payload["summary"]
    assert payload["transcript"] == transcript
