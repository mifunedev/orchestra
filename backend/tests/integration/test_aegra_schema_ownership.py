import os
import subprocess
from pathlib import Path

import conftest
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

from src.integrations.aegra.schema_guard import require_aegra_schema


@pytest.mark.skipif(os.environ.get("AEGRA_OWNERSHIP_LIVE") != "1", reason="Disposable Aegra proof is opt-in")
def test_aegra_schema_ownership():
    if os.environ.get("TEST_POSTGRES_CONNECTION_STRING") or conftest._test_postgres is None:
        pytest.fail("Refuse operator database: disposable pg17 testcontainer required")

    container = conftest._test_postgres._container
    container.reload()
    assert "pgvector/pgvector:pg17" in container.image.tags
    assert container.status == "running"

    owner_url = make_url(conftest._test_uri)
    database = owner_url.database
    assert database == conftest._test_postgres.dbname
    role = "aegra_migrator"
    password = "disposable_aegra_migrator"
    role_url = owner_url.set(username=role, password=password)
    owner = create_engine(owner_url)
    restricted = None
    try:
        with owner.begin() as conn:
            assert conn.execute(text("SELECT current_database()")).scalar_one() == database
            assert conn.execute(text("SELECT version_num FROM public.alembic_version")).scalar_one() == "0001"
            conn.execute(text("CREATE SCHEMA aegra"))
            conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            conn.execute(text("CREATE ROLE aegra_migrator LOGIN PASSWORD 'disposable_aegra_migrator'"))
            quoted_database = conn.dialect.identifier_preparer.quote(database)
            conn.execute(text(f"GRANT CONNECT ON DATABASE {quoted_database} TO aegra_migrator"))
            conn.execute(text("GRANT USAGE, CREATE ON SCHEMA aegra TO aegra_migrator"))
            conn.execute(text(f"ALTER ROLE aegra_migrator IN DATABASE {quoted_database} SET search_path = aegra"))

        restricted = create_engine(role_url)
        with restricted.connect() as conn:
            require_aegra_schema(conn, database)
            assert conn.execute(text("SHOW search_path")).scalar_one() == "aegra"
            assert "public" not in conn.execute(text("SELECT current_schemas(true)")).scalar_one()
            assert conn.execute(text("SELECT to_regclass('alembic_version')")).scalar_one() is None
        with restricted.connect() as conn:
            conn.execute(text("SET LOCAL search_path TO public"))
            with pytest.raises(ValueError, match="search_path"):
                require_aegra_schema(conn, database)
            conn.rollback()
        for statement in (
            "CREATE TABLE public.aegra_probe (id integer)",
            "ALTER TABLE public.users ADD COLUMN aegra_probe integer",
            "DROP TABLE public.users",
        ):
            with restricted.connect() as conn:
                with pytest.raises(DBAPIError):
                    conn.execute(text(statement))
                conn.rollback()

        def snapshot():
            with owner.connect() as conn:
                revision = tuple(
                    conn.execute(text("SELECT version_num FROM public.alembic_version ORDER BY version_num"))
                )
                users = tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id")))
                tables = tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
                )
                return revision, users, tables

        before = snapshot()
        assert before[0] == (("0001",),)
        assert len(before[1]) == 1

        environment = os.environ.copy()
        environment["DATABASE_URL"] = role_url.render_as_string(hide_password=False)
        environment["RUN_MIGRATIONS_ON_STARTUP"] = "false"
        environment.pop("POSTGRES_CONNECTION_STRING", None)
        migration = subprocess.run(
            [
                "uv", "run", "--no-project", "--with", "aegra-api==0.10.7", "python", "-c",
                "from sqlalchemy import create_engine; from aegra_api.settings import settings; "
                "from aegra_api.core.migrations import run_migrations; "
                "from src.integrations.aegra.schema_guard import require_aegra_schema; "
                "engine = create_engine(settings.db.database_url_sync); "
                f"conn = engine.connect(); require_aegra_schema(conn, {database!r}); "
                "conn.close(); engine.dispose(); "
                "assert not settings.app.RUN_MIGRATIONS_ON_STARTUP; run_migrations()",
            ],
            cwd=Path(__file__).resolve().parents[2],
            env=environment,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if migration.returncode:
            redacted = migration.stderr.replace(password, "[REDACTED]").replace(
                environment["DATABASE_URL"], "[REDACTED DATABASE_URL]"
            )
            pytest.fail(
                f"STOP: Aegra 0.10.7 migration exit={migration.returncode}; "
                f"public_unchanged={snapshot() == before}; stderr={redacted[-1800:]}"
            )

        after = snapshot()
        assert after == before, "STOP: Aegra changed Orchestra public objects"
        with owner.connect() as conn:
            aegra_revision = conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one()
            aegra_tables = tuple(
                conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'aegra' ORDER BY tablename"))
            )
        assert aegra_revision != "0001"
        assert aegra_tables
        with restricted.connect() as conn:
            assert conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one() == aegra_revision
        print(f"ownership proof: public={before[0][0][0]} aegra={aegra_revision} public_unchanged={after == before}")
    finally:
        if restricted is not None:
            restricted.dispose()
        owner.dispose()
