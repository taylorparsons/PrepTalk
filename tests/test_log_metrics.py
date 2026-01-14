from app.services.log_metrics import build_log_summary


def test_build_log_summary_counts_events():
    lines = [
        "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed",
        "2026-01-13 15:06:23,095 INFO event=ws_disconnect status=closed",
        "2026-01-13 15:06:23,096 INFO event=gemini_live_receive status=ended",
        "2026-01-13 15:06:23,097 INFO event=client_event event_type=ws_close status=received",
    ]
    summary = build_log_summary(lines)
    assert summary["event_counts"]["ws_disconnect"] == 2
    assert summary["event_counts"]["gemini_live_receive"] == 1
    assert summary["client_disconnects"] == 1
    assert summary["server_disconnects"] == 2
    assert summary["gemini_disconnects"] == 1
