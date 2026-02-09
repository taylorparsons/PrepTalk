# PrepTalk KPI Tracking (Logs + BigQuery + GA4)

PrepTalk now emits user-journey telemetry from the UI to `POST /api/telemetry`.

## 1) Instrumentation status

Telemetry is already wired in the app. No additional client code is required.

Journey events captured:
- `journey_app_open`
- `journey_resume_loaded`
- `journey_job_loaded`
- `journey_questions_requested`
- `journey_questions_generated`
- `journey_session_started`
- `journey_candidate_spoke`
- `journey_answer_submitted`
- `journey_help_requested`
- `journey_score_generated`
- `journey_export_requested`
- `journey_export_completed`

Each journey event now includes normalized voice context properties:
- `adapter`
- `voice_mode`
- `voice_output_mode`
- `voice_agent` (`gemini_live`, `openai_tts`, `gemini_tts`, or `auto_tts`)
- `tts_provider`
- `text_model`
- `tts_model`
- `live_model`

## 2) Where to see the data

### Option A: App logs (fastest)

Query `logs/app.log` (or Cloud Run logs) for `event=journey_kpi`.

Example fields:
- `event_type`
- `step`
- `status`
- `user_id`
- `interview_id`
- `session_id`
- `value`
- `new_user`
- `adapter`
- `voice_mode`
- `voice_output_mode`
- `voice_agent`
- `tts_provider`
- `text_model`
- `tts_model`
- `live_model`

### Option B: BigQuery (recommended for SQL dashboards)

BigQuery export is wired for Cloud Run journey logs:
- Project: `gen-lang-client-0573849892`
- Dataset: `preptalk_analytics` (region `us-west1`)
- Logging sink: `preptalk-journey-kpi-sink`
- Export table: `run_googleapis_com_stderr` (partitioned by `timestamp`)

Verify wiring:
```bash
gcloud logging sinks list --project=gen-lang-client-0573849892
bq --location=us-west1 ls gen-lang-client-0573849892:preptalk_analytics
```

Run a smoke event (test service):
```bash
curl -sS -X POST 'https://preptalk-west-test-961394368413.us-west1.run.app/api/telemetry' \
  -H 'Content-Type: application/json' \
  -H 'X-Access-Token: preptalk-test' \
  -H 'X-User-Id: analytics-smoke' \
  --data '{"event":"journey_score_generated","category":"journey","step":"score_generated","state":"complete","anonymous_id":"manual-kpi-smoke","new_user":false,"value":88}'
```

### Option C: Google Analytics 4 (optional)

Set both env vars:

```bash
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_measurement_protocol_secret
```

Then deploy/restart the service. The backend forwards telemetry to GA4 Measurement Protocol.

In GA4, build funnel/exploration reports from the journey event names above.

Before production rollout:
- Complete GA4 **User Data Collection Acknowledgement** in GA Admin for the property.
- Confirm the in-app disclosure is visible to end users in Candidate Setup (`data-testid="analytics-disclosure"`).

## 3) KPI examples

- New users: count of `journey_app_open` where `new_user=true`
- Setup completion: `journey_questions_generated` / `journey_app_open`
- Voice engagement: `journey_session_started` and `journey_candidate_spoke`
- Completion rate: `journey_score_generated` / `journey_session_started`
- Export rate: `journey_export_completed` / `journey_score_generated`

## 4) BigQuery SQL starter queries

Base query pattern:
```sql
WITH journey AS (
  SELECT
    timestamp,
    REGEXP_EXTRACT(textPayload, r'event_type=([^ ]+)') AS event_type,
    REGEXP_EXTRACT(textPayload, r'status=([^ ]+)') AS status,
    REGEXP_EXTRACT(textPayload, r'user_id=([^ ]+)') AS user_id,
    REGEXP_EXTRACT(textPayload, r'interview_id=([^ ]+)') AS interview_id,
    REGEXP_EXTRACT(textPayload, r'session_id=([^ ]+)') AS session_id,
    SAFE_CAST(REGEXP_EXTRACT(textPayload, r'value=([0-9.]+)') AS FLOAT64) AS value,
    REGEXP_EXTRACT(textPayload, r'new_user=([^ ]+)') AS new_user,
    REGEXP_EXTRACT(textPayload, r'voice_agent=([^ ]+)') AS voice_agent,
    REGEXP_EXTRACT(textPayload, r'tts_provider=([^ ]+)') AS tts_provider,
    REGEXP_EXTRACT(textPayload, r'text_model=([^ ]+)') AS text_model
  FROM `gen-lang-client-0573849892.preptalk_analytics.run_googleapis_com_stderr`
  WHERE textPayload LIKE '%event=journey_kpi%'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT * FROM journey;
```

Event volume by type/status:
```sql
WITH journey AS (
  SELECT
    REGEXP_EXTRACT(textPayload, r'event_type=([^ ]+)') AS event_type,
    REGEXP_EXTRACT(textPayload, r'status=([^ ]+)') AS status
  FROM `gen-lang-client-0573849892.preptalk_analytics.run_googleapis_com_stderr`
  WHERE textPayload LIKE '%event=journey_kpi%'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT event_type, status, COUNT(*) AS events
FROM journey
GROUP BY event_type, status
ORDER BY events DESC;
```

Daily funnel counts:
```sql
WITH journey AS (
  SELECT
    DATE(timestamp) AS day,
    REGEXP_EXTRACT(textPayload, r'event_type=([^ ]+)') AS event_type
  FROM `gen-lang-client-0573849892.preptalk_analytics.run_googleapis_com_stderr`
  WHERE textPayload LIKE '%event=journey_kpi%'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT
  day,
  COUNTIF(event_type='journey_app_open') AS app_open,
  COUNTIF(event_type='journey_questions_generated') AS setup_complete,
  COUNTIF(event_type='journey_session_started') AS session_started,
  COUNTIF(event_type='journey_score_generated') AS score_generated,
  COUNTIF(event_type='journey_export_completed') AS export_completed
FROM journey
GROUP BY day
ORDER BY day DESC;
```

## 5) Suggested funnel

1. `journey_app_open`
2. `journey_resume_loaded` + `journey_job_loaded`
3. `journey_questions_generated`
4. `journey_session_started`
5. `journey_answer_submitted` or `journey_candidate_spoke`
6. `journey_score_generated`
7. `journey_export_completed`
