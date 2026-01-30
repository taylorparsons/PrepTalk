from app.services.live_context import build_live_system_prompt, MAX_LIVE_CONTEXT_CHARS
from app.services.store import InterviewRecord


def test_build_live_system_prompt_includes_context():
    record = InterviewRecord(
        interview_id="abc123",
        user_id="user",
        adapter="gemini",
        role_title="Product Manager",
        questions=["Q1", "Q2"],
        focus_areas=["Focus A"],
        resume_text="Resume line",
        job_text="Job line",
        live_memory="Coach: Welcome back."
    )

    prompt = build_live_system_prompt(record)

    assert "Role: Product Manager" in prompt
    assert "Resume line" in prompt
    assert "Job line" in prompt
    assert "1. Q1" in prompt
    assert "2. Q2" in prompt
    assert "- Focus A" in prompt
    assert "Recent conversation memory:" in prompt
    assert "Coach: Welcome back." in prompt
    assert "answer for me" in prompt
    assert "STAR" in prompt
    assert "60-90 second" in prompt
    assert "own words" in prompt
    assert "Never reveal internal reasoning" in prompt


def test_build_live_system_prompt_defaults_when_missing():
    record = InterviewRecord(
        interview_id="abc123",
        user_id="user",
        adapter="gemini",
        role_title=None,
        questions=[],
        focus_areas=[],
        resume_text="",
        job_text=""
    )

    prompt = build_live_system_prompt(record)

    assert "Role: the role described in the job description" in prompt
    assert "No content available." in prompt
    assert "Ask one targeted question" in prompt


def test_build_live_system_prompt_truncates_large_context():
    long_text = "A" * (MAX_LIVE_CONTEXT_CHARS + 200)
    record = InterviewRecord(
        interview_id="abc123",
        user_id="user",
        adapter="gemini",
        role_title="Product Manager",
        questions=["Q1"],
        focus_areas=["Focus A"],
        resume_text=long_text,
        job_text=long_text
    )

    prompt = build_live_system_prompt(record)

    assert ("A" * (MAX_LIVE_CONTEXT_CHARS + 10)) not in prompt
    assert ("A" * MAX_LIVE_CONTEXT_CHARS) in prompt
    assert "..." in prompt
