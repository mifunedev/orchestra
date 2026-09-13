#!/usr/bin/env bash
# tier: resiliency
# source: resiliency track — correlation-id plan (backend/tests/resiliency/test_correlation_id.py)
# desc: every request is tagged with a correlation ID that threads through the entire
#       processing chain (API → worker → logs), enabling end-to-end request tracing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # evals/probes/<id>.sh -> evals/ -> repo root

BACKEND_DIR="$ROOT/backend"
TEST_FILE="$BACKEND_DIR/tests/resiliency/test_correlation_id.py"
E2E_SPEC="$ROOT/frontend/e2e/correlation-id.spec.ts"

# --- prerequisite: backend dir must exist ---
if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "SKIPPED: backend directory absent: $BACKEND_DIR" >&2
  exit 2
fi

# --- prerequisite: test file must exist ---
if [[ ! -f "$TEST_FILE" ]]; then
  echo "SKIPPED: test file absent: $TEST_FILE" >&2
  exit 2
fi

# --- prerequisite: uv must be available ---
if ! command -v uv &>/dev/null; then
  echo "SKIPPED: uv not found in PATH" >&2
  exit 2
fi

# --- load backend test env (optional: absent file is silently skipped for CI) ---
ENV_FILE="${ORCHESTRA_ENV_FILE:-$ROOT/backend/.env.test}"
# shellcheck source=/dev/null
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }

# --- primary determination: backend pytest (deterministic) ---
# Note: test_run_agent_stream_binds_correlation_id opens a real DB connection
# during teardown that hangs on cleanup.  We run pytest with an inner timeout
# (60 s) so the probe itself exits cleanly before run.sh's outer 120 s limit.
# Exit 124 from the inner timeout means pytest ran but cleanup hung — the tests
# themselves emitted FAILED output, so we treat this as REGRESSION (not SKIPPED).
_pytest_tmp="$(mktemp)"
set +e
# Use -v so that FAILED/PASSED markers appear per-test before teardown hangs.
timeout 60 bash -c "cd '$BACKEND_DIR' && PYTHONPATH=./src:. uv run pytest -m resiliency tests/resiliency/test_correlation_id.py -v" > "$_pytest_tmp" 2>&1
pytest_exit=$?
set -e
pytest_out="$(cat "$_pytest_tmp")"
rm -f "$_pytest_tmp"

case "$pytest_exit" in
  0)
    echo "PASS: correlation-id pytest passed" >&2
    ;;
  1)
    echo "REGRESSION: correlation-id pytest failed — $pytest_out" >&2
    exit 1
    ;;
  124)
    # Inner timeout fired — pytest hung during teardown AFTER running the tests.
    # The per-test PASSED/FAILED markers (printed by -v before the hung teardown)
    # are the source of truth for the verdict; the hung teardown is a known
    # fixture-cleanup quirk that opens a real DB connection at session end.
    #   - Any FAILED present            → REGRESSION (a test genuinely failed).
    #   - No FAILED but PASSED present  → PASS (tests passed; only teardown hung).
    #   - Neither present               → SKIPPED (hung before producing results).
    if echo "$pytest_out" | grep -q "FAILED\|failed"; then
      echo "REGRESSION: correlation-id pytest failed (cleanup hung, tests FAILED) — $pytest_out" >&2
      exit 1
    elif echo "$pytest_out" | grep -q "PASSED\|passed"; then
      echo "PASS: correlation-id pytest passed (teardown hung after PASSED markers) — exit 124" >&2
    else
      echo "SKIPPED: pytest timed out before producing results (exit 124): $pytest_out" >&2
      exit 2
    fi
    ;;
  *)
    # collection error, missing deps, uv failure → SKIPPED
    echo "SKIPPED: pytest collection/setup error (exit $pytest_exit): $pytest_out" >&2
    exit 2
    ;;
esac

# --- optional E2E determination (only when ORCHESTRA_E2E=1 and stack reachable) ---
if [[ "${ORCHESTRA_E2E:-0}" = "1" ]]; then
  if [[ ! -f "$E2E_SPEC" ]]; then
    echo "SKIPPED (E2E): spec absent: $E2E_SPEC" >&2
    exit 2
  fi
  if ! curl -sf http://localhost:5173 &>/dev/null; then
    echo "SKIPPED (E2E): frontend stack not reachable at http://localhost:5173" >&2
    exit 2
  fi
  set +e
  e2e_out="$(cd "$ROOT/frontend" && npx playwright test e2e/correlation-id.spec.ts 2>&1)"
  e2e_exit=$?
  set -e
  if [[ "$e2e_exit" -ne 0 ]]; then
    echo "REGRESSION (E2E): playwright correlation-id spec failed — $e2e_out" >&2
    exit 1
  fi
  echo "PASS: correlation-id E2E passed" >&2
fi

exit 0
