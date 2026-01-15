# Live Log Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a live dashboard that surfaces log/connection stats while the app is running, using existing logfmt-style logs plus client-side disconnect telemetry.

**Architecture:** Build a small log parser + metrics aggregator in the backend that reads recent lines from `logs/app.log` (via `LOG_DIR`), expose a `/api/logs/summary` endpoint, and add a client telemetry endpoint for disconnects. The frontend polls the summary endpoint and renders a lightweight dashboard panel in the existing UI layout.

**Tech Stack:** FastAPI, Python log parsing, vanilla JS UI, fetch polling, pytest/Vitest.

---

### Task 1: Log Parser Utility

**Files:**
- Create: `app/services/log_parse.py`
- Test: `tests/test_log_parse.py`

**Step 1: Write the failing test**

```python
from app.services.log_parse import parse_log_line


def test_parse_log_line_extracts_fields():
    line = "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed user_id=abc"
    parsed = parse_log_line(line)
    assert parsed["level"] == "INFO"
    assert parsed["event"] == "ws_disconnect"
    assert parsed["status"] == "closed"
    assert parsed["user_id"] == "abc"
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_log_parse.py -v`
Expected: FAIL with "ModuleNotFoundError" or "parse_log_line not defined"

**Step 3: Write minimal implementation**

```python
# app/services/log_parse.py
from __future__ import annotations

import re
from typing import Dict

LOG_RE = re.compile(r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (?P<level>[A-Z]+) (?P<msg>.*)$")
KV_RE = re.compile(r"(?P<key>[A-Za-z0-9_]+)=(?P<value>[^\s]+)")


def parse_log_line(line: str) -> Dict[str, str]:
    match = LOG_RE.match(line.strip())
    if not match:
        return {"raw": line.strip()}
    msg = match.group("msg")
    fields = {"timestamp": match.group("ts"), "level": match.group("level"), "message": msg}
    for kv in KV_RE.finditer(msg):
        fields[kv.group("key")] = kv.group("value")
    return fields
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_log_parse.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add app/services/log_parse.py tests/test_log_parse.py
git commit -m "feat: add log parser utility"
```

---

### Task 2: Log Metrics Aggregator

**Files:**
- Create: `app/services/log_metrics.py`
- Test: `tests/test_log_metrics.py`

**Step 1: Write the failing test**

```python
from app.services.log_metrics import build_log_summary


def test_build_log_summary_counts_events():
    lines = [
        "2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed",
        "2026-01-13 15:06:23,095 INFO event=ws_disconnect status=closed",
        "2026-01-13 15:06:23,096 INFO event=gemini_live_receive status=ended",
    ]
    summary = build_log_summary(lines)
    assert summary["event_counts"]["ws_disconnect"] == 2
    assert summary["event_counts"]["gemini_live_receive"] == 1
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_log_metrics.py -v`
Expected: FAIL with "ModuleNotFoundError" or "build_log_summary not defined"

**Step 3: Write minimal implementation**

```python
# app/services/log_metrics.py
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Dict, List

from .log_parse import parse_log_line


def build_log_summary(lines: List[str]) -> Dict[str, object]:
    event_counts = Counter()
    status_counts = defaultdict(Counter)
    disconnect_counts = Counter()
    errors = []

    for line in lines:
        parsed = parse_log_line(line)
        event = parsed.get("event")
        status = parsed.get("status")
        level = parsed.get("level")
        if event:
            event_counts[event] += 1
        if event and status:
            status_counts[event][status] += 1
        if event in {"ws_disconnect", "gemini_live_receive", "client_event"}:
            disconnect_counts[event] += 1
        if level in {"ERROR", "CRITICAL"} or status == "error":
            errors.append(parsed)

    return {
        "event_counts": dict(event_counts),
        "status_counts": {k: dict(v) for k, v in status_counts.items()},
        "disconnect_counts": dict(disconnect_counts),
        "error_count": len(errors),
        "recent_errors": errors[-10:],
    }
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_log_metrics.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add app/services/log_metrics.py tests/test_log_metrics.py
git commit -m "feat: add log metrics summary"
```

---

### Task 3: Log Summary API Endpoint

**Files:**
- Modify: `app/schemas.py`
- Modify: `app/api.py`
- Test: `tests/test_log_api.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_log_summary_endpoint_returns_counts(tmp_path, monkeypatch):
    log_path = tmp_path / "app.log"
    log_path.write_text("2026-01-13 15:06:23,094 INFO event=ws_disconnect status=closed\n")

    monkeypatch.setenv("LOG_DIR", str(tmp_path))

    client = TestClient(app)
    response = client.get("/api/logs/summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["event_counts"]["ws_disconnect"] == 1
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_log_api.py -v`
Expected: FAIL with 404

**Step 3: Write minimal implementation**

```python
# app/schemas.py
class LogSummaryResponse(BaseModel):
    event_counts: dict = Field(default_factory=dict)
    status_counts: dict = Field(default_factory=dict)
    disconnect_counts: dict = Field(default_factory=dict)
    error_count: int = 0
    recent_errors: list = Field(default_factory=list)
```

```python
# app/api.py
from pathlib import Path
from .services.log_metrics import build_log_summary

@router.get("/logs/summary", response_model=LogSummaryResponse)
async def get_log_summary():
    log_dir = Path(load_settings().log_dir)
    log_path = log_dir / "app.log"
    if not log_path.exists():
        return LogSummaryResponse()
    lines = log_path.read_text().splitlines()[-2000:]
    summary = build_log_summary(lines)
    return LogSummaryResponse(**summary)
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_log_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add app/schemas.py app/api.py tests/test_log_api.py
git commit -m "feat: add log summary api"
```

---

### Task 4: Client Disconnect Telemetry

**Files:**
- Modify: `app/schemas.py`
- Modify: `app/api.py`
- Modify: `app/static/js/api/client.js`
- Modify: `app/static/js/ui.js`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_client_telemetry_endpoint():
    client = TestClient(app)
    response = client.post("/api/telemetry", json={"event": "ws_close"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

**Step 2: Run test to verify it fails**

Run: `./.venv/bin/python -m pytest tests/test_log_api.py::test_client_telemetry_endpoint -v`
Expected: FAIL with 404

**Step 3: Write minimal implementation**

```python
# app/schemas.py
class ClientEventRequest(BaseModel):
    event: str
    interview_id: str | None = None
    session_id: str | None = None
    state: str | None = None
    detail: str | None = None


class ClientEventResponse(BaseModel):
    status: str
```

```python
# app/api.py
@router.post("/telemetry", response_model=ClientEventResponse)
async def log_client_event(request: Request, payload: ClientEventRequest):
    user_id = _get_user_id(request)
    logger.info(
        "event=client_event status=received user_id=%s interview_id=%s session_id=%s event_type=%s state=%s detail=%s",
        short_id(user_id),
        short_id(payload.interview_id),
        short_id(payload.session_id),
        payload.event,
        payload.state,
        payload.detail
    )
    return {"status": "ok"}
```

```javascript
// app/static/js/api/client.js
export async function logClientEvent({ event, interviewId, sessionId, state, detail } = {}) {
  const response = await fetch(`${getApiBase()}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ event, interview_id: interviewId, session_id: sessionId, state, detail })
  });
  return handleResponse(response);
}
```

```javascript
// app/static/js/ui.js
function sendClientEvent(state, event, { detail, status } = {}) {
  if (!state?.interviewId) return;
  logClientEvent({ event, interviewId: state.interviewId, sessionId: state.sessionId, state: status, detail }).catch(() => {});
}
```

**Step 4: Run test to verify it passes**

Run: `./.venv/bin/python -m pytest tests/test_log_api.py::test_client_telemetry_endpoint -v`
Expected: PASS

**Step 5: Commit**

```bash
git add app/schemas.py app/api.py app/static/js/api/client.js app/static/js/ui.js
git commit -m "feat: add client disconnect telemetry"
```

---

### Task 5: Live Dashboard UI Panel

**Files:**
- Modify: `app/static/js/api/client.js`
- Modify: `app/static/js/ui.js`
- Modify: `app/static/css/components.css`

**Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { formatCount } from '../app/static/js/ui.js';

describe('formatCount', () => {
  it('formats undefined counts as 0', () => {
    expect(formatCount(undefined)).toBe('0');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `./run.sh test -- runTestsByPath tests/components/log-dashboard.test.js`
Expected: FAIL with "formatCount is not defined"

**Step 3: Write minimal implementation**

```javascript
// app/static/js/api/client.js
export async function getLogSummary() {
  const response = await fetch(`${getApiBase()}/logs/summary`, {
    headers: { 'X-User-Id': getUserId() }
  });
  return handleResponse(response);
}
```

```javascript
// app/static/js/ui.js
export function formatCount(value) {
  return typeof value === 'number' ? String(value) : '0';
}

function buildLogDashboardPanel(ui) {
  const panel = createPanel({ title: 'Live Stats' });
  const body = panel.querySelector('.ui-panel__body');

  const grid = document.createElement('div');
  grid.className = 'ui-metrics-grid';
  const cards = {
    disconnects: document.createElement('div'),
    errors: document.createElement('div')
  };
  Object.values(cards).forEach((card) => {
    card.className = 'ui-metric-card';
    grid.appendChild(card);
  });
  body.appendChild(grid);

  ui.metricsCards = cards;
  return panel;
}

async function refreshLogSummary(state, ui) {
  const summary = await getLogSummary();
  const disconnects = summary.disconnect_counts?.ws_disconnect || 0;
  const errors = summary.error_count || 0;
  ui.metricsCards.disconnects.textContent = `Disconnects: ${formatCount(disconnects)}`;
  ui.metricsCards.errors.textContent = `Errors: ${formatCount(errors)}`;
}
```

```css
/* app/static/css/components.css */
.ui-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.ui-metric-card {
  padding: 12px;
  border-radius: 10px;
  background: #f3f4f6;
  font-size: 14px;
}
```

**Step 4: Run test to verify it passes**

Run: `./run.sh test -- runTestsByPath tests/components/log-dashboard.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/static/js/api/client.js app/static/js/ui.js app/static/css/components.css tests/components/log-dashboard.test.js
git commit -m "feat: add live log dashboard ui"
```

---

### Task 6: Documentation + Manual Verification

**Files:**
- Modify: `README.md`
- Modify: `DEVELOPER_GUIDE.md`

**Step 1: Write docs updates**

```markdown
## Live Log Dashboard

The UI includes a Live Stats panel that polls `/api/logs/summary` every few seconds to show disconnects and error counts. Client-side disconnects are sent via `/api/telemetry`.
```

**Step 2: Manual verification checklist**

- Run `./run.sh ui`.
- Start a live session, then close the tab to trigger a disconnect.
- Confirm `logs/app.log` includes `event=client_event` and the UI updates the disconnect count.

**Step 3: Commit**

```bash
git add README.md DEVELOPER_GUIDE.md
git commit -m "docs: add live log dashboard info"
```
