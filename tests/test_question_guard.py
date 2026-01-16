import asyncio

from app.services import gemini_live
from app.services.gemini_live import _match_repeat_question
from app.services.store import InterviewStore


def test_match_repeat_question_detects_repeat():
    text = "Can you describe a time you handled conflict with a stakeholder?"
    questions = [
        "Describe a time you handled conflict with a stakeholder.",
        "How do you prioritize competing requests?"
    ]
    assert _match_repeat_question(text, questions, max_index=0) == 0


def test_match_repeat_question_ignores_unasked():
    text = "How do you prioritize competing requests?"
    questions = [
        "Describe a time you handled conflict with a stakeholder.",
        "How do you prioritize competing requests?"
    ]
    assert _match_repeat_question(text, questions, max_index=0) is None


def test_match_repeat_question_requires_question_form():
    text = "We should prioritize competing requests by using a scoring rubric."
    questions = ["How do you prioritize competing requests?"]
    assert _match_repeat_question(text, questions, max_index=0) is None


def test_repeat_question_preserves_coach_text(tmp_path, monkeypatch):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='repeat123',
        adapter='gemini',
        role_title='Engineer',
        questions=['Tell me about yourself.'],
        focus_areas=['Communication'],
        user_id='candidate-1'
    )
    store.update_question_status(
        record.interview_id,
        0,
        'started',
        user_id='candidate-1',
        source='auto'
    )

    monkeypatch.setattr(gemini_live, 'store', store)

    events = []

    async def send_json(payload):
        events.append(payload)

    sent = []

    class DummySession:
        async def send(self, input=None, **kwargs):
            sent.append(input)

    bridge = gemini_live.GeminiLiveBridge.__new__(gemini_live.GeminiLiveBridge)
    bridge._interview_id = record.interview_id
    bridge._user_id = record.user_id
    bridge._session = DummySession()
    bridge._rehydrating = False
    bridge._send_json = send_json

    question = record.questions[0]
    asyncio.run(
        gemini_live.GeminiLiveBridge._emit_transcript_final(bridge, 'coach', question)
    )

    updated = store.get(record.interview_id, user_id=record.user_id)
    assert updated is not None
    assert updated.transcript[-1]['text'] == question
    transcripts = [payload for payload in events if payload.get('type') == 'transcript']
    assert transcripts
    assert transcripts[-1]['text'] == question
    assert sent
