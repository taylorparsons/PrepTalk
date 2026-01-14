# Live Stats Lifecycle

This sequence diagram shows when each Live Stats metric is produced in the
interview lifecycle and which log events drive the counters.

```mermaid
sequenceDiagram
    participant User as User/Browser
    participant WS as WS Server
    participant Gemini as Gemini Live
    participant Log as Log File
    participant UI as Live Stats UI

    User->>WS: WS connect
    WS->>Log: event=ws_connect status=accepted
    UI->>WS: GET /api/logs/summary (poll)
    WS-->>UI: log summary payload

    User->>WS: start session
    WS->>Log: event=ws_start status=complete
    WS->>Gemini: gemini_live_connect/start + gemini_live_call/start
    WS->>Log: event=gemini_live_connect status=start
    WS->>Log: event=gemini_live_call status=start
    Gemini-->>WS: connected
    WS->>Log: event=gemini_live_call status=complete
    WS->>Log: event=gemini_live_connect status=complete

    Note right of Log: event_counts + status_counts increment\non every event

    loop During conversation
        Gemini-->>WS: transcripts/audio
        WS->>Log: event=store_append_transcript status=merged/complete
    end

    alt Gemini disconnects
        Gemini-->>WS: stream ends
        WS->>Log: event=gemini_live_receive status=ended
        Note right of Log: gemini_disconnects++\n disconnect_counts[gemini_live_receive]++
    end

    alt Client disconnects
        User-->>WS: websocket close
        WS->>Log: event=ws_disconnect status=closed
        Note right of Log: server_disconnects++\n disconnect_counts[ws_disconnect]++
        User->>WS: POST /api/telemetry (client_event)
        WS->>Log: event=client_event status=received event_type=ws_close/ws_disconnected/ws_error
        Note right of Log: client_disconnects++\n disconnect_counts[client_event]++
    end

    alt Errors
        WS->>Log: event=... status=error OR level=ERROR
        Note right of Log: error_count++
    end
```

Metric mapping reference (see `app/services/log_metrics.py`):
- `client_disconnects`: `event=client_event` with `event_type` in `ws_close`, `ws_disconnected`, `ws_error`
- `server_disconnects`: `event=ws_disconnect`
- `gemini_disconnects`: `event=gemini_live_receive status=ended`
- `error_count`: any log with `status=error` or log level `ERROR`/`CRITICAL`
