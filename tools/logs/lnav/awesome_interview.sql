-- Helper view for querying logfmt fields in the app log.
DROP VIEW IF EXISTS awesome_log;
CREATE TEMP VIEW awesome_log AS
SELECT
  log_time,
  log_level,
  log_body AS message,
  json_extract(logfmt2json(log_body), '$.event') AS event,
  json_extract(logfmt2json(log_body), '$.status') AS status,
  json_extract(logfmt2json(log_body), '$.interview_id') AS interview_id,
  json_extract(logfmt2json(log_body), '$.session_id') AS session_id,
  json_extract(logfmt2json(log_body), '$.user_id') AS user_id,
  CAST(NULLIF(json_extract(logfmt2json(log_body), '$.duration_ms'), '') AS INTEGER) AS duration_ms
FROM awesome_interview_log;
