#!/usr/bin/env bash
# Refuses the backend test hook when its environment file is absent, with the
# remedy. Never exits 0 on a missing file: a hook that reports success without
# running the suite is worse than one that does not run.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/.env.test"
TEMPLATE=".example.env.test"
DEV_TEMPLATE=".example.env"

if [ -f "$ENV_FILE" ]; then
  exit 0
fi

cat >&2 <<MSG
Backend Test cannot run.

  reason  $ENV_FILE does not exist, so the suite has no database to talk to.
  remedy  run this from the repository root, then set the credentials:

            cp $TEMPLATE .env.test

  $TEMPLATE points at the orchestra_test database on purpose. Do not copy
  $DEV_TEMPLATE instead. That one names orchestra_dev, and make test truncates
  whatever database it is given.

  This hook is manual-stage. The gate that must pass is
  .github/workflows/test.yml, which runs pytest against live services on push.
MSG
exit 1
