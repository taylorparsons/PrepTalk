MOCK_QUESTIONS = [
    "Walk me through a project where you improved the candidate experience.",
    "How do you prioritize when multiple hiring managers need updates?",
    "Describe a time you used data to influence a hiring decision.",
    "What would your 30-60-90 day plan look like for this role?"
]

MOCK_FOCUS_AREAS = [
    "Structured storytelling",
    "Stakeholder alignment",
    "Metrics-driven impact"
]

MOCK_TRANSCRIPT = [
    {
        "role": "coach",
        "text": "Welcome. Let's warm up with your career summary.",
        "timestamp": "00:00"
    },
    {
        "role": "candidate",
        "text": "I lead interview practice sessions focused on data-driven hiring.",
        "timestamp": "00:08"
    },
    {
        "role": "coach",
        "text": "Great. Tell me about a measurable win from your last role.",
        "timestamp": "00:18"
    },
    {
        "role": "candidate",
        "text": "I reduced time-to-fill by 18% through structured calibration.",
        "timestamp": "00:26"
    }
]

MOCK_SCORE = {
    "overall_score": 84,
    "summary": "Clear structure and concise metrics. Add a sharper closing that ties to the role.",
    "strengths": [
        "Uses quantified impact",
        "Keeps answers focused",
        "Shows stakeholder awareness"
    ],
    "improvements": [
        "Expand on technical depth",
        "Close with role alignment"
    ]
}

MOCK_VOICE_REPLY = "Thanks for that. Let's move to the next question."
MOCK_VOICE_FEEDBACK = "Nice structure there. Your answer stayed focused on impact and clarity."


def build_mock_tts_audio() -> tuple[bytes, str]:
    import io
    import wave

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(8000)
        wav_file.writeframes(b"\x00" * 800)
    return buffer.getvalue(), "audio/wav"
