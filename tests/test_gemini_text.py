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


def test_generate_questions_coerces_question_objects_to_text(monkeypatch):
    calls = []
    behavior = {
        "gemini-3": (
            '{"questions": [{"id": "q1", "text": "Tell me about yourself."}],'
            ' "focus_areas": ["Clarity"]}'
        )
    }

    monkeypatch.setattr(gemini_text, "genai", _FakeGenAI(calls, behavior))

    questions, focus_areas = gemini_text.generate_interview_questions(
        api_key="test",
        model="gemini-3",
        resume_text="resume",
        job_text="job",
        role_title="Role"
    )

    assert questions == ["Tell me about yourself."]
    assert focus_areas == ["Clarity"]
    assert calls == ["gemini-3"]


def test_gemini_text_logs_peas_eval(monkeypatch):
    calls = []
    behavior = {
        "gemini-3": '{"questions": ["Question?"], "focus_areas": ["Focus"]}'
    }
    messages = []

    class _DummyLogger:
        def info(self, msg, *args):
            messages.append(msg % args if args else msg)

        def exception(self, msg, *args):
            messages.append(msg % args if args else msg)

    monkeypatch.setattr(gemini_text, "genai", _FakeGenAI(calls, behavior))
    monkeypatch.setattr(gemini_text, "logger", _DummyLogger())

    gemini_text.generate_interview_questions(
        api_key="test",
        model="gemini-3",
        resume_text="resume",
        job_text="job",
        role_title="Role"
    )

    assert any(
        "event=peas_eval" in message
        and "category=gemini_text" in message
        and "status=complete" in message
        for message in messages
    )
