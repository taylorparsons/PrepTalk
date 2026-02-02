from app.services import adapters
from app.services.document_text import DocumentInput


def test_gemini_interview_adapter_uses_interview_text_model(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_INTERVIEW_TEXT_MODEL", "gemini-3-pro-preview")
    monkeypatch.setenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")

    captured = {"questions_model": None, "score_model": None}

    def fake_generate_interview_questions(*, api_key, model, **kwargs):
        captured["questions_model"] = model
        return ["Q1"], ["FA1"]

    def fake_score_interview_transcript(*, api_key, model, **kwargs):
        captured["score_model"] = model
        return {"overall_score": 80, "summary": "ok", "strengths": [], "improvements": [], "transcript": []}

    monkeypatch.setattr(adapters, "generate_interview_questions", fake_generate_interview_questions)
    monkeypatch.setattr(adapters, "score_interview_transcript", fake_score_interview_transcript)

    adapter = adapters.GeminiInterviewAdapter()
    resume = DocumentInput(data=b"resume", filename="resume.txt", content_type="text/plain")
    job = DocumentInput(data=b"job", filename="job.txt", content_type="text/plain")

    adapter.generate_questions(resume, job, role_title=None)
    adapter.score_interview([], record=None)

    assert captured["questions_model"] == "gemini-3-pro-preview"
    assert captured["score_model"] == "gemini-3-pro-preview"


def test_gemini_interview_adapter_accepts_google_api_key(monkeypatch):
    monkeypatch.setenv("INTERVIEW_ADAPTER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_API_KEY", "google-key")
    monkeypatch.setenv("GEMINI_INTERVIEW_TEXT_MODEL", "gemini-3-pro-preview")
    monkeypatch.setenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")

    def fake_generate_interview_questions(*, api_key, model, **kwargs):
        assert api_key == "google-key"
        return ["Q1"], ["FA1"]

    monkeypatch.setattr(adapters, "generate_interview_questions", fake_generate_interview_questions)

    adapter = adapters.GeminiInterviewAdapter()
    resume = DocumentInput(data=b"resume", filename="resume.txt", content_type="text/plain")
    job = DocumentInput(data=b"job", filename="job.txt", content_type="text/plain")

    adapter.generate_questions(resume, job, role_title=None)
    assert adapter.api_key == "google-key"
