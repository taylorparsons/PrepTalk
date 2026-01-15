from app.services.log_metrics import build_log_summary


def test_build_log_summary_counts_events():
    lines = [
        "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed session_id=server-1",
        "2026-01-13 15:06:23,095 INFO event=ws_disconnect status=closed",
        "2026-01-13 15:06:23,096 INFO event=gemini_live_receive status=ended",
        "2026-01-13 15:06:23,097 INFO event=client_event event_type=ws_close status=received",
        "2026-01-13 15:06:23,098 INFO event=client_event event_type=gemini_disconnected status=received session_id=gemini-1",
        "2026-01-13 15:06:23,099 ERROR event=gemini_live_activity status=error session_id=error-1",
    ]
    summary = build_log_summary(lines)
    assert summary["event_counts"]["ws_disconnect"] == 2
    assert summary["event_counts"]["gemini_live_receive"] == 1
    assert summary["client_disconnects"] == 1
    assert summary["server_disconnects"] == 2
    assert summary["gemini_disconnects"] == 1
    assert summary["error_count"] == 1
    assert summary["error_event_count"] == 4
    assert summary["error_session_count"] == 3
