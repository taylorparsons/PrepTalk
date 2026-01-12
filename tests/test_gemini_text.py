from app.services import gemini_text


class _FakeResponse:
    def __init__(self, text):
        self.text = text


class _FakeModels:
    def __init__(self, calls, behavior):
        self._calls = calls
        self._behavior = behavior

    def generate_content(self, model, contents):
        self._calls.append(model)
        action = self._behavior.get(model)
        if isinstance(action, Exception):
            raise action
        return _FakeResponse(action)


class _FakeClient:
    def __init__(self, api_key, calls, behavior):
        self.models = _FakeModels(calls, behavior)


class _FakeGenAI:
    def __init__(self, calls, behavior):
        self._calls = calls
        self._behavior = behavior

    def Client(self, api_key):
        return _FakeClient(api_key, self._calls, self._behavior)


def test_generate_questions_raises_on_unsupported_model(monkeypatch):
    calls = []
    behavior = {
        "gemini-3": Exception("models/gemini-3 is not supported for generateContent")
    }

    monkeypatch.setattr(gemini_text, "genai", _FakeGenAI(calls, behavior))

    try:
        gemini_text.generate_interview_questions(
            api_key="test",
            model="gemini-3",
            resume_text="resume",
            job_text="job",
            role_title="Role"
        )
        assert False, "Expected RuntimeError"
    except RuntimeError as exc:
        message = str(exc)
        assert "not supported" in message
        assert "GEMINI_TEXT_MODEL" in message

    assert calls == ["gemini-3"]


def test_score_uses_primary_model_when_supported(monkeypatch):
    calls = []
    behavior = {
        "gemini-2.5-flash": '{"overall_score": 90, "summary": "Good", "strengths": ["A"], "improvements": ["B"]}'
    }

    monkeypatch.setattr(gemini_text, "genai", _FakeGenAI(calls, behavior))

    result = gemini_text.score_interview_transcript(
        api_key="test",
        model="gemini-2.5-flash",
        transcript=[{"role": "coach", "text": "Hello", "timestamp": "00:00"}],
        role_title=None,
        focus_areas=None
    )

    assert result["overall_score"] == 90
    assert result["summary"] == "Good"
    assert calls == ["gemini-2.5-flash"]
