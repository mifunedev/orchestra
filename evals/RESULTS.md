# Probe results — benchmark scoreboard

Current status per probe id, written by `bash evals/run.sh`. Policy: **overwrite the
row per probe id; git history is the time series.** Schema and exit-code semantics are
in [`evals/README.md`](README.md). `SKIPPED` does not count toward pass-rate.

| probe | tier | last-run (UTC) | status | source |
|-------|------|----------------|--------|--------|
| docs-agents-md-claims | docs | 2026-09-14 02:35 | PASS | AGENTS.md claim table |
| resiliency-correlation-id | resiliency | 2026-09-14 02:35 | SKIPPED | resiliency track — correlation-id plan (backend/tests/resiliency/test_correlation_id.py) |
| resiliency-dlq | resiliency | 2026-09-14 02:35 | SKIPPED | resiliency track — DLQ replay plan (backend/tests/resiliency/test_dlq_replay.py) |
| resiliency-heartbeat-drain | resiliency | 2026-09-14 02:35 | SKIPPED | resiliency track — heartbeat-drain plan (backend/tests/resiliency/test_heartbeat_drain.py) |
| resiliency-idempotency | resiliency | 2026-09-14 02:35 | SKIPPED | resiliency track — idempotency plan (backend/tests/resiliency/test_idempotency.py) |

<!-- benchmark: pass-rate = PASS / (PASS + REGRESSION + TIMEOUT); SKIPPED excluded -->
