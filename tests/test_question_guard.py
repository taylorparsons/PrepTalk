from app.services.gemini_live import _match_repeat_question


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
