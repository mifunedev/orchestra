import os
import re
import subprocess
from pathlib import Path

import conftest
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

from src.integrations.aegra.schema_guard import require_aegra_schema


RUNTIME = """
import asyncio
import json

import psycopg
from sqlalchemy import create_engine, text

from aegra_api.core.database import db_manager
from aegra_api.core.migrations import _is_database_up_to_date, get_alembic_config
from aegra_api.settings import settings
from langgraph.checkpoint.base import empty_checkpoint
from src.integrations.aegra.schema_guard import require_aegra_schema


def evidence(label, database):
    with psycopg.connect(settings.db.database_url_sync) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT current_database(), current_schemas(true), "
                "to_regclass('alembic_version')::text, (SELECT version_num FROM alembic_version)"
            )
            actual, schemas, version_table, revision = cursor.fetchone()
            assert actual == database and schemas == ['pg_catalog', 'aegra'], (label, actual, schemas)
            assert version_table == 'alembic_version' and revision == expected_revision, (
                label, version_table, revision
            )
            print('AEGRA_EVIDENCE=' + json.dumps([label, actual, schemas, version_table, revision]), flush=True)


async def pool_evidence(label, database):
    async with db_manager.lg_pool.connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "SELECT current_database(), current_schemas(true), to_regclass('alembic_version')::text"
            )
            row = await cursor.fetchone()
            assert row['current_database'] == database
            assert row['current_schemas'] == ['pg_catalog', 'aegra']
            assert row['to_regclass'] == 'alembic_version'
            print('AEGRA_EVIDENCE=' + json.dumps([
                label, database, row['current_schemas'], row['to_regclass'], expected_revision
            ]), flush=True)


async def run(stage, database):
    assert not settings.app.RUN_MIGRATIONS_ON_STARTUP
    evidence('startup-psycopg-before', database)
    if stage == 'precheck':
        assert _is_database_up_to_date(get_alembic_config())
        evidence('startup-psycopg-after', database)
        return
    if stage == 'orm':
        engine = create_engine(settings.db.database_url_sync)
        try:
            with engine.connect() as conn:
                require_aegra_schema(conn, database, expected_revision)
        finally:
            engine.dispose()
        await db_manager.initialize()
        try:
            async with db_manager.get_engine().connect() as conn:
                await conn.run_sync(lambda sync_conn: require_aegra_schema(sync_conn, database, expected_revision))
                result = await conn.execute(text('SELECT count(*) FROM assistant'))
                assert result.scalar_one() >= 0
                result = await conn.execute(text(
                    "SELECT current_database(), current_schemas(true), to_regclass('alembic_version')::text"
                ))
                actual, schemas, version_table = result.one()
                assert actual == database and schemas == ['pg_catalog', 'aegra'] and version_table == 'alembic_version'
                print('AEGRA_EVIDENCE=' + json.dumps(
                    ['orm-asyncpg', actual, schemas, version_table, expected_revision]
                ), flush=True)
            await pool_evidence('checkpoint-store-psycopg', database)
        finally:
            await db_manager.close()
    elif stage in ('setup', 'roundtrip'):
        await db_manager.initialize()
        try:
            await pool_evidence('checkpoint-store-setup-pool', database)
            if stage == 'roundtrip':
                saver = db_manager.get_checkpointer()
                config = {'configurable': {'thread_id': 'aegra-proof', 'checkpoint_ns': ''}}
                saved = await saver.aput(
                    config, empty_checkpoint(), {'source': 'input', 'step': 1, 'writes': {}, 'parents': {}}, {}
                )
                found = await saver.aget_tuple(saved)
                assert found is not None and found.checkpoint['id'] == saved['configurable']['checkpoint_id']
                await pool_evidence('checkpoint-roundtrip-pool', database)
                store = db_manager.get_store()
                await store.aput(('aegra-proof',), 'item', {'value': 'aegra'})
                item = await store.aget(('aegra-proof',), 'item')
                assert item is not None and item.value == {'value': 'aegra'}
                await pool_evidence('store-roundtrip-pool', database)
        finally:
            await db_manager.close()
    else:
        raise ValueError(stage)


import sys

expected_revision = sys.argv[3]
asyncio.run(run(sys.argv[1], sys.argv[2]))
"""


@pytest.mark.skipif(os.environ.get("AEGRA_OWNERSHIP_LIVE") != "1", reason="Disposable Aegra proof is opt-in")
def test_aegra_runtime_schema_ownership(tmp_path):
    if os.environ.get("TEST_POSTGRES_CONNECTION_STRING") or conftest._test_postgres is None:
        pytest.fail("Refuse operator database: disposable pg17 testcontainer required")

    container = conftest._test_postgres._container
    container.reload()
    assert "pgvector/pgvector:pg17" in container.image.tags and container.status == "running"
    owner_url = make_url(conftest._test_uri)
    database = owner_url.database
    assert database == conftest._test_postgres.dbname
    password = "disposable_aegra_migrator"
    role_url = owner_url.set(username="aegra_migrator", password=password)
    owner = create_engine(owner_url)
    restricted = None
    try:
        with owner.begin() as conn:
            assert conn.execute(text("SELECT current_database() ")).scalar_one() == database
            assert conn.execute(text("SELECT version_num FROM public.alembic_version")).scalar_one() == "0001"
            conn.execute(text("CREATE SCHEMA aegra"))
            conn.execute(text("CREATE ROLE aegra_migrator LOGIN PASSWORD 'disposable_aegra_migrator'"))
            quoted_database = conn.dialect.identifier_preparer.quote(database)
            conn.execute(text(f"GRANT CONNECT ON DATABASE {quoted_database} TO aegra_migrator"))
            conn.execute(text("GRANT USAGE, CREATE ON SCHEMA aegra TO aegra_migrator"))
            conn.execute(text(f"ALTER ROLE aegra_migrator IN DATABASE {quoted_database} SET search_path = aegra"))

        restricted = create_engine(role_url)
        with restricted.connect() as conn:
            require_aegra_schema(conn, database)
            assert conn.execute(text("SHOW search_path")).scalar_one() == "aegra"
            for query in (
                "SELECT has_table_privilege(current_user, 'public.users', 'SELECT')",
                "SELECT has_table_privilege(current_user, 'public.alembic_version', 'SELECT')",
                "SELECT has_schema_privilege(current_user, 'public', 'CREATE')",
                "SELECT has_database_privilege(current_user, current_database(), 'CREATE')",
            ):
                assert conn.execute(text(query)).scalar_one() is False
            with pytest.raises(DBAPIError):
                conn.execute(text("SELECT count(*) FROM public.users"))
            conn.rollback()

        def snapshot():
            with owner.connect() as conn:
                return (
                    tuple(conn.execute(text("SELECT version_num FROM public.alembic_version ORDER BY version_num"))),
                    tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                    tuple(
                        conn.execute(
                            text(
                                "SELECT oid, relname, relkind, relfilenode FROM pg_class "
                                "WHERE relnamespace = 'public'::regnamespace ORDER BY oid"
                            )
                        )
                    ),
                    tuple(conn.execute(text("SELECT oid, extname, extnamespace FROM pg_extension ORDER BY oid"))),
                    tuple(conn.execute(text("SELECT oid, nspacl FROM pg_namespace WHERE nspname = 'public'"))),
                    tuple(
                        conn.execute(
                            text("SELECT oid, relacl FROM pg_class "
                                 "WHERE relnamespace = 'public'::regnamespace ORDER BY oid")
                        )
                    ),
                    tuple(
                        conn.execute(
                            text(
                                "SELECT indexrelid, indrelid, indisvalid FROM pg_index "
                                "WHERE indrelid IN (SELECT oid FROM pg_class "
                                "WHERE relnamespace = 'public'::regnamespace) ORDER BY indexrelid"
                            )
                        )
                    ),
                )

        before = snapshot()
        assert before[0] == (("0001",),) and len(before[1]) == 1
        environment = os.environ.copy()
        environment["DATABASE_URL"] = role_url.render_as_string(hide_password=False)
        environment["RUN_MIGRATIONS_ON_STARTUP"] = "false"
        environment["AEGRA_CONFIG"] = str(tmp_path / "no-index-config.json")
        environment.pop("POSTGRES_CONNECTION_STRING", None)
        backend = Path(__file__).resolve().parents[2]

        def invoke(arguments):
            completed = subprocess.run(
                ["uv", "run", "--no-project", "--with", "aegra-api==0.10.7", "python", *arguments],
                cwd=backend,
                env=environment,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            unchanged = snapshot() == before
            if completed.returncode or not unchanged:
                stderr = completed.stderr.replace(password, "[REDACTED]").replace(
                    environment["DATABASE_URL"], "[REDACTED DATABASE_URL]"
                )
                pytest.fail(
                    f"STOP: Aegra stage {arguments[-3:] if arguments[0] == '-c' else 'upgrade'} "
                    f"exit={completed.returncode} public_unchanged={unchanged}; stderr={stderr[-1800:]}"
                )
            return completed.stdout

        invoke(
            [
                "-c",
                "from sqlalchemy import create_engine; from aegra_api.settings import settings; "
                "from aegra_api.core.migrations import run_migrations; "
                "from src.integrations.aegra.schema_guard import require_aegra_schema; "
                "engine = create_engine(settings.db.database_url_sync); "
                f"conn = engine.connect(); require_aegra_schema(conn, {database!r}); "
                "conn.close(); engine.dispose(); "
                "assert not settings.app.RUN_MIGRATIONS_ON_STARTUP; run_migrations()",
            ]
        )
        with restricted.connect() as conn:
            revision = conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one()
            require_aegra_schema(conn, database, revision)
            assert conn.execute(text("SELECT to_regclass('alembic_version')::text")).scalar_one() == "alembic_version"
            schemas = conn.execute(text("SELECT current_schemas(true)")).scalar_one()
            print(f"alembic proof: database={database} schemas={schemas} revision={revision}")
        assert revision != "0001"
        for stage in ("precheck", "orm", "setup", "roundtrip"):
            output = invoke(["-c", RUNTIME, stage, database, revision])
            evidence = [line for line in output.splitlines() if line.startswith("AEGRA_EVIDENCE=")]
            assert evidence, f"STOP: no connection evidence for {stage}"
            print(f"runtime proof {stage}: {evidence}")
        assert snapshot() == before

        with restricted.connect() as conn:
            checkpoint_rows = tuple(conn.execute(text(
                "SELECT * FROM aegra.checkpoints WHERE thread_id = 'aegra-proof' ORDER BY checkpoint_id"
            )))
            store_rows = tuple(conn.execute(text("SELECT * FROM aegra.store WHERE key = 'item' ORDER BY key")))
            assert checkpoint_rows and store_rows

        archive = "/tmp/aegra-schema-restore.dump"

        def container_command(command):
            result = container.exec_run(command)
            if result.exit_code:
                pytest.fail(f"STOP: disposable container command failed: {command[0]} exit={result.exit_code}")
            assert snapshot() == before, f"STOP: public changed after {command[0]}"
            return result.output.decode()

        container_command([
            "pg_dump", "-U", conftest._test_postgres.username, "-d", database,
            "--format=custom", "--schema=aegra", f"--file={archive}",
        ])
        container_command(["test", "-s", archive])
        toc = container_command(["pg_restore", "--list", archive])
        entries = [line.split(";", 1)[1].strip() for line in toc.splitlines() if re.match(r"^\d+;", line)]
        assert entries, "STOP: archive has no entries"
        assert all(re.search(r"\b(?:aegra|SCHEMA - aegra)\b", entry) for entry in entries), (
            "STOP: archive contains objects outside aegra"
        )
        assert not any(re.search(r"\bpublic\b", entry) for entry in entries), (
            "STOP: archive contains public objects"
        )
        for object_type in ("SCHEMA - aegra", "TABLE aegra alembic_version", "TABLE DATA aegra alembic_version",
                            "TABLE DATA aegra checkpoints", "TABLE DATA aegra store"):
            assert any(object_type in entry for entry in entries), f"STOP: archive lacks {object_type}"
        with owner.connect() as conn:
            dependents = conn.execute(text(
                "SELECT d.deptype, dependent.type, dependent.schema, dependent.identity, "
                "referenced.type, referenced.schema, referenced.identity "
                "FROM pg_depend d "
                "LEFT JOIN pg_class dep ON dep.oid = d.refobjid AND d.refclassid = 'pg_class'::regclass "

                "CROSS JOIN LATERAL pg_identify_object(d.classid, d.objid, d.objsubid) dependent "
                "CROSS JOIN LATERAL pg_identify_object(d.refclassid, d.refobjid, d.refobjsubid) referenced "
                "WHERE referenced.schema = 'aegra' AND dependent.schema IS NOT NULL "
                "AND dependent.schema <> 'aegra' "
                "AND NOT (d.deptype = 'i' AND dependent.type = 'toast table' "
                "AND dependent.schema = 'pg_toast' "
                "AND d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass "
                "AND dep.relnamespace = 'aegra'::regnamespace "
                "AND dep.reltoastrelid = d.objid AND dep.relowner = 'aegra_migrator'::regrole)"
            )).all()
            assert not dependents, f"STOP: cross-schema dependents prevent restore: {dependents}"
        assert snapshot() == before, "STOP: public changed during archive preflight"
        with restricted.begin() as conn:
            assert conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one() == revision
            assert conn.execute(
                text("SELECT count(*) FROM aegra.checkpoints WHERE thread_id = 'aegra-proof'")
            ).scalar_one() > 0
            assert conn.execute(text("SELECT count(*) FROM aegra.store WHERE key = 'item'")).scalar_one() > 0
            conn.execute(text("UPDATE aegra.alembic_version SET version_num = 'rollback_probe'"))
            assert conn.execute(text("DELETE FROM aegra.checkpoints WHERE thread_id = 'aegra-proof'")).rowcount > 0
            assert conn.execute(text("DELETE FROM aegra.store WHERE key = 'item'")).rowcount > 0
        assert snapshot() == before, "STOP: public changed after Aegra-only destructive change"
        container_command([
            "pg_restore", "-U", conftest._test_postgres.username, "-d", database,
            "--exit-on-error", "--clean", "--if-exists", "--schema=aegra", archive,
        ])
        with restricted.connect() as conn:
            require_aegra_schema(conn, database, revision)
            assert conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one() == revision
            assert tuple(conn.execute(text(
                "SELECT * FROM aegra.checkpoints WHERE thread_id = 'aegra-proof' ORDER BY checkpoint_id"
            ))) == checkpoint_rows
            assert tuple(conn.execute(text("SELECT * FROM aegra.store WHERE key = 'item' ORDER BY key"))) == store_rows
        assert snapshot() == before, "STOP: public changed after restore"
        container_command(["rm", archive])
    finally:
        if restricted is not None:
            restricted.dispose()
        owner.dispose()
