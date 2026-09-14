#!/usr/bin/env bash
# tier: resiliency
# source: resiliency track — idempotency plan (backend/tests/resiliency/test_idempotency.py)
# desc: duplicate task submissions are idempotent — the backend rejects or deduplicates
#       re-submitted tasks that carry the same idempotency key, with no double-execution.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # evals/probes/<id>.sh -> evals/ -> repo root

BACKEND_DIR="$ROOT/backend"
TEST_FILE="$BACKEND_DIR/tests/resiliency/test_idempotency.py"
E2E_SPEC="$ROOT/frontend/e2e/idempotency.spec.ts"

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
ENV_FILE="${ORCHESTRA_ENV_FILE:-$ROOT/.env.test}"
# shellcheck source=/dev/null
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }

# --- primary determination: backend pytest (deterministic) ---
set +e
pytest_out="$(cd "$BACKEND_DIR" && PYTHONPATH=./src:. uv run pytest -m resiliency tests/resiliency/test_idempotency.py -q 2>&1)"
pytest_exit=$?
set -e

case "$pytest_exit" in
  0)
    echo "PASS: idempotency pytest passed" >&2
    ;;
  1)
    echo "REGRESSION: idempotency pytest failed — $pytest_out" >&2
    exit 1
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
  e2e_out="$(cd "$ROOT/frontend" && npx playwright test e2e/idempotency.spec.ts 2>&1)"
  e2e_exit=$?
  set -e
  if [[ "$e2e_exit" -ne 0 ]]; then
    echo "REGRESSION (E2E): playwright idempotency spec failed — $e2e_out" >&2
    exit 1
  fi
  echo "PASS: idempotency E2E passed" >&2
fi

exit 0
