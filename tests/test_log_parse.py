from app.services.log_parse import parse_log_line


def test_parse_log_line_extracts_fields():
    line = "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed user_id=abc"
    parsed = parse_log_line(line)
    assert parsed["level"] == "INFO"
    assert parsed["event"] == "ws_disconnect"
    assert parsed["status"] == "closed"
    assert parsed["user_id"] == "abc"
