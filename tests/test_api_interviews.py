import time

import pytest
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


@pytest.fixture(autouse=True)
def _force_mock_adapter(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "mock")


def _create_interview(client: TestClient, user_id: str | None = None) -> str:
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }
    headers = {"X-User-Id": user_id} if user_id else None
    response = client.post("/api/interviews", files=files, headers=headers)
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
    assert payload["question_statuses"]


def test_create_interview_requires_access_token_when_configured(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKENS", "token-1")
    client = TestClient(app)
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }

    response = client.post("/api/interviews", files=files)

    assert response.status_code == 401
    assert "access token" in response.json()["detail"].lower()


def test_create_interview_accepts_access_token_header(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKENS", "token-1:user-123")
    client = TestClient(app)
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }

    response = client.post(
        "/api/interviews",
        files=files,
        headers={"X-Access-Token": "token-1", "X-User-Id": "spoofed-user"}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["interview_id"]

    sessions = client.get(
        "/api/interviews",
        headers={"X-Access-Token": "token-1", "X-User-Id": "different-user"}
    )
    assert sessions.status_code == 200
    session_ids = {item["interview_id"] for item in sessions.json().get("sessions", [])}
    assert payload["interview_id"] in session_ids


def test_create_interview_warns_on_job_url_failure(monkeypatch):
    def _fail_fetch(*_args, **_kwargs):
        raise ValueError("Job description URL must start with http or https.")

    monkeypatch.setattr("app.api.fetch_url_text", _fail_fetch)

    client = TestClient(app)
    files = {
        "resume": ("resume.pdf", _pdf_bytes("Resume"), "application/pdf"),
        "job_description": ("job.pdf", _pdf_bytes("Job"), "application/pdf")
    }
    data = {"job_description_url": "https://example.com/job"}
    response = client.post("/api/interviews", files=files, data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["interview_id"]
    assert payload["job_url_warning"]


def test_live_session_returns_mock_transcript():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post("/api/live/session", json={"interview_id": interview_id})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert payload["mock_transcript"]


def test_voice_turn_appends_transcript_entries(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "mock")
    monkeypatch.setenv("VOICE_TTS_ENABLED", "1")
    monkeypatch.setenv("VOICE_OUTPUT_MODE", "server")

    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post(
        "/api/voice/turn",
        json={
            "interview_id": interview_id,
            "text": "Hello there",
            "text_model": "gemini-3-flash-preview",
            "tts_model": "gemini-3-flash-preview"
        }
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidate"]["role"] == "candidate"
    assert payload["candidate"]["text"] == "Hello there"
    assert payload["coach"]["role"] == "coach"
    assert payload["coach"]["text"]
    assert payload["coach_audio"]
    assert payload["coach_audio_mime"].startswith("audio/")

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    transcript = summary_response.json()["transcript"]
    assert len(transcript) == 2
    assert transcript[0]["role"] == "candidate"
    assert transcript[1]["role"] == "coach"


def test_voice_help_appends_transcript_entry():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post(
        "/api/voice/help",
        json={
            "interview_id": interview_id,
            "question": "Tell me about yourself"
        }
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["help"]["role"] == "coach_feedback"
    assert payload["help"]["text"]

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    transcript = summary_response.json()["transcript"]
    assert transcript[-1]["role"] == "coach_feedback"


def test_voice_help_not_found_returns_session_expired_hint():
    client = TestClient(app)

    response = client.post(
        "/api/voice/help",
        json={
            "interview_id": "missing-id",
            "question": "Tell me about yourself"
        }
    )

    assert response.status_code == 404
    detail = response.json().get("detail", "")
    assert "Interview not found" in detail
    assert "Generate questions" in detail


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



def test_summary_and_pdf_exports():
    client = TestClient(app)
    interview_id = _create_interview(client)

    transcript = [
        {"role": "coach", "text": "Welcome", "timestamp": "00:00"},
        {"role": "candidate", "text": "Hello", "timestamp": "00:04"}
    ]

    score_response = client.post(
        f"/api/interviews/{interview_id}/score",
        json={"transcript": transcript}
    )
    assert score_response.status_code == 200

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["interview_id"] == interview_id
    assert summary["transcript"] == transcript

    pdf_response = client.get(f"/api/interviews/{interview_id}/study-guide")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"].startswith("application/pdf")
    assert pdf_response.content.startswith(b"%PDF")

    text_response = client.get(f"/api/interviews/{interview_id}/study-guide?format=txt")
    assert text_response.status_code == 200
    assert text_response.headers["content-type"].startswith("text/plain")
    assert b"Interview Study Guide" in text_response.content


def test_summary_export_keeps_coach_feedback_role():
    client = TestClient(app)
    interview_id = _create_interview(client)

    transcript = [
        {"role": "coach", "text": "Welcome", "timestamp": "00:00"},
        {"role": "coach_feedback", "text": "Use STAR and quantify impact.", "timestamp": "00:02"},
        {"role": "candidate", "text": "I led a migration.", "timestamp": "00:04"}
    ]

    score_response = client.post(
        f"/api/interviews/{interview_id}/score",
        json={"transcript": transcript}
    )
    assert score_response.status_code == 200

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["transcript"] == transcript
    assert summary["transcript"][1]["role"] == "coach_feedback"

    text_response = client.get(f"/api/interviews/{interview_id}/study-guide?format=txt")
    assert text_response.status_code == 200
    text_output = text_response.text
    assert "coach_feedback: Use STAR and quantify impact." in text_output
    assert "candidate: I led a migration." in text_output


def test_create_interview_accepts_txt():
    client = TestClient(app)
    files = {
        "resume": ("resume.txt", b"Resume text", "text/plain"),
        "job_description": ("job.txt", b"Job text", "text/plain")
    }
    response = client.post("/api/interviews", files=files)

    assert response.status_code == 200
    payload = response.json()
    assert payload["interview_id"]


def test_create_interview_redacts_resume_pii(monkeypatch):
    monkeypatch.setenv("APP_REDACT_RESUME_PII", "1")
    client = TestClient(app)
    resume_text = (
        "Taylor Parsons\n"
        "Seattle, WA | 206-356-8736 | taylor.parsons@gmail.com | linkedin.com/in/taylorparsons\n"
        "Built roadmap for AI products."
    )
    files = {
        "resume": ("resume.txt", resume_text.encode("utf-8"), "text/plain"),
        "job_description": ("job.txt", b"Job text", "text/plain")
    }

    response = client.post("/api/interviews", files=files)

    assert response.status_code == 200
    excerpt = response.json()["resume_excerpt"]
    assert "Taylor [redacted]" in excerpt
    assert "206-356-8736" not in excerpt
    assert "[redacted]@gmail.com" in excerpt




def test_session_name_updates_and_versions():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post(
        f"/api/interviews/{interview_id}/name",
        json={"name": "Session One"}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_name"] == "Session One"

    response = client.post(
        f"/api/interviews/{interview_id}/name",
        json={"name": "Session Two"}
    )
    assert response.status_code == 200

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["session_name"] == "Session Two"


def test_custom_question_inserts_at_position():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post(
        f"/api/interviews/{interview_id}/questions/custom",
        json={"question": "Custom question", "position": 2}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["questions"][1] == "Custom question"

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["questions"][1] == "Custom question"
    assert summary["question_statuses"][1]["status"] == "not_started"


def test_restart_clears_transcript_and_score():
    client = TestClient(app)
    interview_id = _create_interview(client)

    transcript = [
        {"role": "coach", "text": "Welcome", "timestamp": "00:00"},
        {"role": "candidate", "text": "Hello", "timestamp": "00:04"}
    ]

    score_response = client.post(
        f"/api/interviews/{interview_id}/score",
        json={"transcript": transcript}
    )
    assert score_response.status_code == 200

    reset_response = client.post(f"/api/interviews/{interview_id}/restart")
    assert reset_response.status_code == 200

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["transcript"] == []
    assert summary["overall_score"] is None


def test_question_status_update_endpoint():
    client = TestClient(app)
    interview_id = _create_interview(client)

    response = client.post(
        f"/api/interviews/{interview_id}/questions/status",
        json={"index": 0, "status": "started", "source": "user"}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["question_statuses"][0]["status"] == "started"
    assert payload["asked_question_index"] == 0

    summary_response = client.get(f"/api/interviews/{interview_id}")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["question_statuses"][0]["status"] == "started"
    assert summary["asked_question_index"] == 0


def test_session_list_orders_by_updated_at():
    client = TestClient(app)
    user_id = "list-user"
    first_id = _create_interview(client, user_id=user_id)
    time.sleep(0.001)
    second_id = _create_interview(client, user_id=user_id)

    client.post(
        f"/api/interviews/{first_id}/name",
        json={"name": "Updated Session"},
        headers={"X-User-Id": user_id}
    )

    response = client.get("/api/interviews", headers={"X-User-Id": user_id})
    assert response.status_code == 200
    payload = response.json()
    ids = [entry["interview_id"] for entry in payload["sessions"]]
    assert ids[0] == first_id
    assert ids[1] == second_id
