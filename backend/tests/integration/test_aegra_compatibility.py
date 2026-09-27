import os
import subprocess
from pathlib import Path

import conftest
import pytest
from sqlalchemy import create_engine, text

from tests.unit.utils.test_aegra_migration_probe import assert_preserved


@pytest.mark.skipif(os.environ.get("AEGRA_PROBE_LIVE") != "1", reason="Live Aegra probe is opt-in")
def test_aegra_migration_preserves_orchestra_revision_and_user():
    if os.environ.get("TEST_POSTGRES_CONNECTION_STRING") or conftest._test_postgres is None:
        pytest.fail("Live probe requires the disposable PostgreSQL container started by backend/conftest.py")

    container = conftest._test_postgres._container
    container.reload()
    assert container.image.tags == ["pgvector/pgvector:pg17"]
    assert container.status == "running"

    engine = create_engine(conftest._test_uri)
    revision_query = text("SELECT version_num FROM alembic_version ORDER BY version_num")
    try:
        with engine.connect() as connection:
            revision_before = tuple(connection.execute(revision_query))
            assert revision_before == (("0001",),)
            user_before = connection.execute(
                text("SELECT id, username, email, name, hashed_password, created_at, updated_at "
                     "FROM users ORDER BY id LIMIT 1")
            ).one()
            user_id = user_before.id

        environment = os.environ.copy()
        environment["DATABASE_URL"] = conftest._test_uri
        environment.pop("POSTGRES_CONNECTION_STRING", None)
        result = subprocess.run(
            ["uv", "run", "--no-project", "--with", "aegra-api==0.10.7", "python", "-c",
             "from aegra_api.core.migrations import run_migrations; run_migrations()"],
            cwd=Path(__file__).resolve().parents[2],
            env=environment,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        with engine.connect() as connection:
            revision_after = tuple(connection.execute(revision_query))
            user_after = connection.execute(
                text("SELECT id, username, email, name, hashed_password, created_at, updated_at "
                     "FROM users WHERE id = :user_id"),
                {"user_id": user_id},
            ).one_or_none()
        assert_preserved((revision_before, (user_before,)), (revision_after, (user_after,)))
        assert result.returncode != 0, (
            "Aegra unexpectedly migrated Orchestra revision; reassess ownership before cutover"
        )
        assert "Can't locate revision identified by '0001'" in result.stderr, (
            f"Unexpected Aegra migration failure (exit {result.returncode}): {result.stderr[-1600:]}"
        )
    finally:
        engine.dispose()
