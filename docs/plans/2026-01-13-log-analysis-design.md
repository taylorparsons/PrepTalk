# Log Analysis Design (Terminal-first)

## Goals

- Provide repeatable stats for `app.log` without changing log emission.
- Support counts by event/status, latency percentiles, per-session timelines, and error hotspots.
- Keep logs plain text while enabling interactive exploration in the terminal.

## Recommended approach

Use `lnav` with a custom format definition for the Python log line plus a query pack. The format extracts timestamp, level, and message, then promotes `key=value` pairs to fields. Queries run in `lnav`'s SQL mode to compute counts, percentiles, and per-session rollups. This is a local workflow that stays outside the app runtime and requires no code changes.

## Components

- `~/.lnav/formats/installed/awesome_interview.json`: log format definition for lines like `YYYY-MM-DD HH:MM:SS,mmm LEVEL key=value ...` with a regex that captures timestamp, level, and message, then tokenizes `key=value` pairs.
- `~/.lnav/defaults.json`: saved queries for common stats.
- Optional repo helper: `tools/logs/lnav/setup.sh` to copy format/query files into `~/.lnav/`.

## Data flow

1. `app.log` is written by the app as logfmt-style lines.
2. `lnav` reads `logs/app.log` and parses the base fields (timestamp, level, message).
3. A key/value parser promotes `event`, `status`, `duration_ms`, `session_id`, and other fields into queryable columns.
4. Queries aggregate by event/status, compute p50/p95 of `duration_ms`, and group by `interview_id`/`session_id` to show session timelines.

## Query pack (examples)

- Counts by event/status:
  - `select event, status, count(*) from logline group by event, status order by count(*) desc;`
- Latency percentiles:
  - `select event, percentile(duration_ms, 50), percentile(duration_ms, 95) from logline where duration_ms is not null group by event;`
- Session activity:
  - `select interview_id, count(*) from logline group by interview_id order by count(*) desc;`
- Error hotspots:
  - `select event, count(*) from logline where level = 'ERROR' or status = 'error' group by event;`

## Error handling and limits

- If a line lacks `key=value` pairs, it remains searchable by raw message.
- If numeric fields are missing or malformed, percentile queries filter them out.
- The format file should avoid overly strict regex to handle minor log variance.

## Testing and validation

- Open `lnav logs/app.log` and confirm fields populate via `:fields`.
- Run each saved query and verify reasonable output on a sample log.
- Validate time filters (last 5 minutes) with `lnav`'s time window.

## Next steps

- Decide if the helper files should live in-repo under `tools/logs/lnav/`.
- If yes, add `setup.sh` and document usage in `AGENTS.md` or `README.md`.
