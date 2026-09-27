# Migration probe: Aegra 0.10.7

## Versions and source

On 2026-09-27, PyPI reported `aegra-api==0.10.7` with Python `>=3.12`: `https://pypi.org/pypi/aegra-api/0.10.7/json`. npm reported `@langchain/langgraph-sdk==1.12.0`: `https://registry.npmjs.org/@langchain%2flanggraph-sdk/1.12.0`. The SDK lists `@langchain/core ^1.1.48` as a peer dependency. Orchestra does not declare that peer. These metadata checks do not prove a combined runtime.

## Observed database result

The worker seeded an isolated PostgreSQL 16.15 container with Orchestra schema revision `0001` and a user record. Orchestra's `alembic upgrade head` exited 0. The worker then ran Aegra's migration entry point with `aegra-api==0.10.7`. It exited 1 with `Can't locate revision identified by '0001'`. The revision and seeded user fields matched the before snapshot. A direct cutover on this database is not supported.

The integrated task branch also ran the opt-in test on the disposable `pgvector/pgvector:pg17` fixture:

```bash
cd backend
AEGRA_PROBE_LIVE=1 uv run pytest -q tests/unit/utils/test_aegra_migration_probe.py tests/integration/test_aegra_compatibility.py tests/integration/test_distributed_stream.py
uv run ruff check tests/unit/utils/test_aegra_migration_probe.py tests/integration/test_aegra_compatibility.py
```

Observed: 17 tests passed. Ruff reported `All checks passed!`. Both commands exited 0. The live integration test expects the migration to reject `0001` and checks that the revision and user survive.

The worker could not pull the exact Compose image `pgvector/pgvector:pg16`: Docker returned `error getting credentials` with exit 255. PostgreSQL 16.15 ran with `postgres:16`, but the exact Compose image remains unverified.

## Cleanup

The worker removed the disposable pg16 container with `docker rm -f "$name"`. The pg17 fixture stopped at pytest session exit. The worker checked `docker ps -a` filters and found no probe or testcontainers containers. The worker used no operator database.
