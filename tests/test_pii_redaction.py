from app.services.pii_redaction import redact_resume_pii


def test_redact_resume_pii_keeps_first_name_and_redacts_contact_fields():
    text = (
        "Taylor Parsons\n"
        "Seattle, WA | 206-356-8736 | taylor.parsons@gmail.com | linkedin.com/in/taylorparsons\n"
        "Built roadmap for AI products.\n"
    )

    redacted = redact_resume_pii(text)

    assert "Taylor [redacted]" in redacted
    assert "206-356-8736" not in redacted
    assert "[redacted]@gmail.com" in redacted
    assert "linkedin.com/in/[redacted]" in redacted
    assert "Seattle, WA" in redacted
    assert "Built roadmap for AI products." in redacted


def test_redaction_does_not_mask_non_location_comma_phrases():
    text = (
        "Taylor Parsons\n"
        "Seattle, WA | 206-356-8736 | taylor.parsons@gmail.com | linkedin.com/in/taylorparsons\n"
        "Led routing, and performance modernization across critical workflows.\n"
    )

    redacted = redact_resume_pii(text)

    assert "Led routing, and performance modernization across critical workflows." in redacted
    assert "routing, and" in redacted
    assert "[redacted], [redacted] performance modernization" not in redacted


def test_redaction_does_not_mask_common_lowercase_transition_words():
    text = (
        "Strong record defining safety, or reliability controls.\n"
        "Focus on execution, in complex organizations.\n"
        "Built trust, me and my team delivered.\n"
    )

    redacted = redact_resume_pii(text)

    assert "safety, or reliability controls." in redacted
    assert "execution, in complex organizations." in redacted
    assert "trust, me and my team delivered." in redacted


def test_redaction_preserves_city_state_name_locations():
    text = "Candidate based in Seattle, Washington with distributed team experience."
    redacted = redact_resume_pii(text)
    assert "Seattle, Washington" in redacted
