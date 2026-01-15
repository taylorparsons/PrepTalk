from app.services.gemini_live import _build_rehydrate_prompt
from app.services.store import InterviewRecord


def test_build_rehydrate_prompt_includes_context():
    record = InterviewRecord(
        interview_id="abc",
        user_id="user",
        adapter="gemini",
        role_title="Role",
        questions=["Question 1?", "Question 2?"],
        focus_areas=[],
        asked_question_index=0
    )
    transcript = [
        {"role": "coach", "text": "Welcome."},
        {"role": "candidate", "text": "My answer."}
    ]

    prompt = _build_rehydrate_prompt(record, transcript)

    assert prompt is not None
    assert "Recent transcript:" in prompt
    assert "coach: Welcome." in prompt
    assert "candidate: My answer." in prompt
    assert "Current question index: 0" in prompt
    assert "Current question: Question 1?" in prompt
    assert "Next question: Question 2?" in prompt
