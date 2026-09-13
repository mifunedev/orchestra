# evals/ — Resiliency fitness-function probe corpus

This directory is Orchestra's **fitness function**: a corpus of deterministic
**probes** that encode resiliency properties as runnable, exit-code-scored checks
against *real state*. A fix is provably "done" when its probe turns green; a
recurrence surfaces as a was-green-now-red regression.

**Baseline**: all rows start `REGRESSION` (RED). Implementing a resiliency property
flips its row to `PASS` (GREEN). `SKIPPED` means the verification stack (tests,
`uv`, the backend) is absent — correct behavior during parallel sibling-agent
development.

## Subfolders

| Path | Holds |
|------|-------|
| `probes/` | One `<id>.sh` per probe (`# tier: resiliency`). |
| `screenshots/` | Before/after determination images (manual reference). |
| `RESULTS.md` | The benchmark scoreboard — current status per probe id. |

## How to run

```bash
# Run all probes and update RESULTS.md:
bash evals/run.sh

# Run a single probe by id:
bash evals/run.sh --probe resiliency-idempotency

# Run with optional E2E UI probes (needs frontend stack at http://localhost:5173):
ORCHESTRA_E2E=1 bash evals/run.sh
```

## Probe contract

A probe is an executable shell script at `evals/probes/<id>.sh` with a
**3-state exit-code oracle**:

| Exit | Meaning | Counts toward benchmark? |
|------|---------|--------------------------|
| `0` | **PASS** — desired property holds | yes (pass) |
| `1` | **REGRESSION** — property violated or absent | yes (fail) |
| `2` | **SKIPPED** — cannot verify (stack/tools absent, test file not yet written) | no |
| `124` | **TIMEOUT** — probe exceeded `TIMEOUT_SECS` | yes (fail) |

Exit `0` when a probe *cannot verify anything* is **forbidden** — use `2`
so a silent green never masks an unverifiable check.

### Probe header (metadata)

Every probe declares three comment lines (the runner extracts them with
`grep -E '^# (tier|source|desc):'`):

```sh
#!/usr/bin/env bash
# tier: resiliency
# source: resiliency track — <track> plan (backend/tests/resiliency/test_<track>.py)
# desc: one-line description of the property being checked
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"  # evals/probes/<id>.sh -> repo root
```

Probes MUST inspect real state (pytest exit codes, file presence) — never mocks.
A probe that cannot determine the result MUST exit `2`, never `0`.

### Determination strategy

**Primary (deterministic, always runs)**:

```bash
cd backend && ENV_FILE=./.env.test \
  PYTHONPATH=./src:. uv run pytest -m resiliency \
  tests/resiliency/test_<track>.py -q
```

- pytest exit `0` → probe PASS (GREEN)
- pytest exit `1` (tests failed) → probe REGRESSION (RED)
- pytest collection error / file missing / `uv` absent → probe SKIPPED (`2`)

The `resiliency` marker (`-m resiliency`) must be declared in `pytest.ini` and
applied to every test in the resiliency suite for the `-m` flag to filter
correctly. Without the marker the collection will warn but not fail; adding the
marker is part of implementing each resiliency property.

**Optional UI determination** (only when `ORCHESTRA_E2E=1`):

```bash
cd frontend && npx playwright test e2e/<track>.spec.ts
```

This requires the full frontend+backend stack running at `http://localhost:5173`.
It is opt-in and **does not run by default** — the backend pytest is the headline
deterministic signal.

### Track → file mapping

| Probe id | Backend test | E2E spec |
|----------|-------------|----------|
| `resiliency-idempotency` | `tests/resiliency/test_idempotency.py` | `e2e/idempotency.spec.ts` |
| `resiliency-dlq` | `tests/resiliency/test_dlq_replay.py` | `e2e/dlq-replay.spec.ts` |
| `resiliency-correlation-id` | `tests/resiliency/test_correlation_id.py` | `e2e/correlation-id.spec.ts` |
| `resiliency-heartbeat-drain` | `tests/resiliency/test_heartbeat_drain.py` | `e2e/heartbeat-drain.spec.ts` |

## RESULTS.md schema

`RESULTS.md` is the benchmark scoreboard. Policy: **overwrite the current-status
row per probe id**; git history is the time series (no unbounded append). On the
first run (no prior rows) every probe emits `new-pass`/`new-fail` and NO
`REGRESSION` is raised — the baseline run always exits `0`.

| Column | Meaning |
|--------|---------|
| `probe` | probe id (`<id>` of `evals/probes/<id>.sh`) |
| `tier` | `resiliency` |
| `last-run (UTC)` | timestamp of the most recent `bash evals/run.sh` that ran it |
| `status` | `PASS` \| `REGRESSION` \| `SKIPPED` \| `TIMEOUT` |
| `source` | the resiliency property / test file this probe closes |

## Runner aggregate exit code

| Exit | Meaning |
|------|---------|
| `0` | No new GREEN→RED regressions this run. Pre-existing `REGRESSION` rows that are unchanged do **not** trigger non-zero exit. |
| `1` | One or more probes transitioned from a prior `PASS` to `REGRESSION` in this run. |

The scoreboard is built into a temp sibling file (`RESULTS.md.tmp.$$`) and
swapped in with a single atomic `mv -f` — never truncated-then-appended in place —
so a crash or concurrent run can never leave a partially-written scoreboard. A
filtered run (`--probe <id>`) carries forward untouched rows from a pre-write
snapshot of the original file; it cannot erase rows it did not run.

## RED → GREEN meaning

`REGRESSION` (RED) = the resiliency property is absent or broken. Implement
the property in `backend/` (and optionally `frontend/`) so the pytest suite
passes, then rerun `bash evals/run.sh` to confirm the row flips to `PASS`.

`SKIPPED` = the test file hasn't been written yet by the sibling agent, or
`uv` is unavailable. This is the correct and expected state during parallel
development. The row will automatically become `PASS` or `REGRESSION` once the
test file exists.
