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
    assert "[redacted], [redacted]" in redacted
    assert "Built roadmap for AI products." in redacted
