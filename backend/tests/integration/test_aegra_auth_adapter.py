import asyncio
import json
import os
import subprocess
from datetime import timedelta
from pathlib import Path

import conftest
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

from src.integrations.aegra.schema_guard import require_aegra_schema
from src.repos.api_token_repo import ApiTokenRepo
from src.schemas.models import User
from src.utils.auth import create_access_token, generate_api_key_str, hash_token


BACKEND = Path(__file__).resolve().parents[2]
CONFIG = BACKEND / "tests/fixtures/aegra_auth.json"
MIGRATE = (
    "from sqlalchemy import create_engine; from aegra_api.settings import settings; "
    "from aegra_api.core.migrations import run_migrations; "
    "from src.integrations.aegra.schema_guard import require_aegra_schema; "
    "engine = create_engine(settings.db.database_url_sync); "
    "conn = engine.connect(); require_aegra_schema(conn, __import__('os').environ['PROBE_DATABASE']); "
    "conn.close(); engine.dispose(); "
    "assert not settings.app.RUN_MIGRATIONS_ON_STARTUP; run_migrations()"
)
ROUTES = """
import asyncio
import json
import os

import httpx
from aegra_api.main import app
from aegra_api.core.auth_middleware import get_auth_backend

async def run():
    backend = get_auth_backend()
    assert backend.auth_instance is not None
    user = await backend.auth_instance._authenticate_handler({'authorization': 'Bearer ' + os.environ['PROBE_JWT']})
    assert user['identity'] == os.environ['PROBE_USER_ID']
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            route = '/assistants/search'
            cases = [
                ('missing', {}, 401),
                ('invalid', {'authorization': 'Bearer invalid'}, 401),
                ('expired', {'authorization': 'Bearer ' + os.environ['PROBE_EXPIRED']}, 401),
                ('revoked', {'x-api-key': os.environ['PROBE_REVOKED']}, 401),
                ('jwt', {'authorization': 'Bearer ' + os.environ['PROBE_JWT']}, 200),
                ('api-key', {'x-api-key': os.environ['PROBE_API_KEY']}, 200),
            ]
            for label, headers, expected in cases:
                response = await client.post(
                    route, json={'limit': 1, 'user_id': 'forged', 'tenant_id': 'forged'}, headers=headers
                )
                assert response.status_code == expected, (label, response.status_code, response.text[:300])
                print('AUTH_ROUTE=' + json.dumps([label, response.status_code]), flush=True)
            async with client.stream(
                'POST', '/runs/stream',
                json={'assistant_id': 'auth_probe', 'input': {'message': 'hello'}, 'stream_mode': 'values'},
                headers={'x-api-key': os.environ['PROBE_API_KEY']},
            ) as response:
                assert response.status_code == 200, response.status_code
                print('AUTH_STREAM=' + str(response.status_code), flush=True)
                import psycopg
                with psycopg.connect(os.environ['DATABASE_URL']) as connection:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT count(*) FROM pg_stat_activity WHERE usename = 'orchestra_auth' "
                            "AND datname = current_database()"
                        )
                        assert cursor.fetchone()[0] == 0
                events = [event async for event in response.aiter_lines()]
                assert any('hello' in event for event in events), events[-5:]

asyncio.run(run())
"""


@pytest.mark.skipif(os.environ.get("AEGRA_OWNERSHIP_LIVE") != "1", reason="Disposable Aegra proof is opt-in")
def test_aegra_auth_adapter(tmp_path):
    if os.environ.get("TEST_POSTGRES_CONNECTION_STRING") or conftest._test_postgres is None:
        pytest.fail("Refuse operator database: disposable pg17 testcontainer required")
    container = conftest._test_postgres._container
    container.reload()
    assert "pgvector/pgvector:pg17" in container.image.tags and container.status == "running"
    owner_url = make_url(conftest._test_uri)
    database = owner_url.database
    assert database == conftest._test_postgres.dbname
    migrator_url = owner_url.set(username="aegra_migrator", password="disposable_migrator_only")
    auth_url = owner_url.set(username="orchestra_auth", password="disposable_auth_only")
    owner = create_engine(owner_url)
    migrator = None
    restricted = None
    try:
        with owner.begin() as conn:
            assert conn.execute(text("SELECT version_num FROM public.alembic_version")).scalar_one() == "0001"
            user_id, email = conn.execute(text("SELECT id, email FROM public.users LIMIT 1")).one()
            conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            conn.execute(text("CREATE SCHEMA aegra"))
            conn.execute(text("CREATE ROLE aegra_migrator LOGIN PASSWORD 'disposable_migrator_only'"))
            conn.execute(text("CREATE ROLE orchestra_auth LOGIN PASSWORD 'disposable_auth_only'"))
            quoted = conn.dialect.identifier_preparer.quote(database)
            conn.execute(text(f"GRANT CONNECT ON DATABASE {quoted} TO aegra_migrator, orchestra_auth"))
            conn.execute(text("GRANT USAGE, CREATE ON SCHEMA aegra TO aegra_migrator"))
            conn.execute(text("GRANT USAGE ON SCHEMA public TO orchestra_auth"))
            conn.execute(text("GRANT SELECT ON public.users TO orchestra_auth"))
            conn.execute(text("GRANT SELECT ON public.store TO orchestra_auth"))
            conn.execute(
                text(
                    "GRANT INSERT (prefix, key, value, created_at, updated_at, expires_at, ttl_minutes), "
                    "UPDATE (value, updated_at, expires_at, ttl_minutes) "
                    "ON public.store TO orchestra_auth"
                )
            )
            conn.execute(text(f"ALTER ROLE aegra_migrator IN DATABASE {quoted} SET search_path = aegra"))
            conn.execute(text(f"ALTER ROLE orchestra_auth IN DATABASE {quoted} SET search_path = public"))
        migrator = create_engine(migrator_url)
        restricted = create_engine(auth_url)
        with migrator.connect() as conn:
            require_aegra_schema(conn, database)
            assert not conn.execute(text("SELECT has_schema_privilege(current_user, 'public', 'CREATE')")).scalar_one()
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.users', 'SELECT')")
            ).scalar_one()
            for statement in (
                "CREATE TABLE public.migration_probe (id integer)",
                "ALTER TABLE public.users ADD COLUMN migration_probe integer",
                "DROP TABLE public.users",
            ):
                with pytest.raises(DBAPIError):
                    conn.execute(text(statement))
                conn.rollback()
        with restricted.connect() as conn:
            assert conn.execute(text("SELECT current_database()")).scalar_one() == database
            assert conn.execute(text("SELECT current_schemas(true)")).scalar_one() == ["pg_catalog", "public"]
            assert conn.execute(text("SELECT has_table_privilege(current_user, 'public.users', 'SELECT')")).scalar_one()
            assert conn.execute(text("SELECT has_table_privilege(current_user, 'public.store', 'SELECT')")).scalar_one()
            assert not conn.execute(text("SELECT has_schema_privilege(current_user, 'aegra', 'USAGE')")).scalar_one()
            assert not conn.execute(text("SELECT has_schema_privilege(current_user, 'public', 'CREATE')")).scalar_one()
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.users', 'UPDATE')")
            ).scalar_one()
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.alembic_version', 'SELECT')")
            ).scalar_one()
            assert not conn.execute(
                text("SELECT has_database_privilege(current_user, current_database(), 'CREATE')")
            ).scalar_one()
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.store_migrations', 'INSERT')")
            ).scalar_one()
            unrelated = conn.execute(
                text(
                    "SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace "
                    "AND relkind IN ('r', 'p') AND relname NOT IN ('users', 'store') "
                    "AND (has_table_privilege(current_user, oid, 'SELECT') "
                    "OR has_table_privilege(current_user, oid, 'INSERT') "
                    "OR has_table_privilege(current_user, oid, 'UPDATE') "
                    "OR has_table_privilege(current_user, oid, 'DELETE'))"
                )
            ).all()
            assert not unrelated
            for statement in (
                "CREATE TABLE public.auth_probe (id integer)",
                "ALTER TABLE public.users ADD COLUMN auth_probe integer",
                "SELECT * FROM aegra.alembic_version",
            ):
                with pytest.raises(DBAPIError):
                    conn.execute(text(statement))
                conn.rollback()
        with owner.connect() as conn:
            before = (
                tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                tuple(conn.execute(text("SELECT version_num FROM public.alembic_version"))),
                tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                ),
            )
        environment = os.environ.copy()
        environment.update(
            {
                "DATABASE_URL": migrator_url.render_as_string(hide_password=False),
                "ORCHESTRA_AEGRA_AUTH_DATABASE_URL": auth_url.render_as_string(hide_password=False),
                "POSTGRES_CONNECTION_STRING": auth_url.render_as_string(hide_password=False),
                "RUN_MIGRATIONS_ON_STARTUP": "false",
                "REDIS_BROKER_ENABLED": "false",
                "AEGRA_CONFIG": str(CONFIG),
                "PROBE_DATABASE": database,
            }
        )

        def invoke(args, *, valid=True):
            result = subprocess.run(
                ["uv", "run", "--no-sync", "--with", "aegra-api==0.10.7", "python", *args],
                cwd=BACKEND,
                env=environment,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            assert (result.returncode == 0) == valid, (
                result.returncode,
                result.stderr.replace("disposable_auth_only", "[REDACTED]").replace(
                    "disposable_migrator_only", "[REDACTED]"
                )[-1200:],
            )
            return result

        invoke(["-c", MIGRATE])
        with migrator.connect() as conn:
            revision = conn.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one()
            require_aegra_schema(conn, database, revision)
        with owner.connect() as conn:
            assert before == (
                tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                tuple(conn.execute(text("SELECT version_num FROM public.alembic_version"))),
                tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                ),
            )
        with restricted.connect() as conn:
            for statement in ("SELECT * FROM aegra.alembic_version", "CREATE TABLE public.auth_probe (id integer)"):
                with pytest.raises(DBAPIError):
                    conn.execute(text(statement))
                conn.rollback()
        config = json.loads(CONFIG.read_text())
        for invalid in (
            {},
            {"auth": {"path": "missing.module:auth"}},
            {"auth": {"path": "src.integrations.aegra.auth:missing"}},
        ):
            path = tmp_path / "invalid.json"
            path.write_text(json.dumps({**config, **invalid} if invalid else {"graphs": config["graphs"]}))
            invoke(["-m", "src.integrations.aegra.launch", str(path), "--check"], valid=False)
        invoke(["-m", "src.integrations.aegra.launch", str(CONFIG), "--check"])
        invoke(
            [
                "-c",
                "from aegra_api.core.auth_middleware import LangGraphAuthBackend; "
                "from src.integrations.aegra.launch import validate; "
                "from pathlib import Path; "
                "LangGraphAuthBackend._load_from_path = lambda *args: None; "
                f"validate(Path({str(CONFIG)!r}))",
            ],
            valid=False,
        )
        token = generate_api_key_str()
        revoked = generate_api_key_str()

        async def seed_tokens():
            from langgraph.store.postgres.aio import AsyncPostgresStore

            async with AsyncPostgresStore.from_conn_string(conftest._test_uri) as store:
                repo = ApiTokenRepo(str(user_id), store)
                await repo.create_token("live", hash_token(token), token[:12])
                removed = await repo.create_token("revoked", hash_token(revoked), revoked[:12])
                assert await repo.revoke_token(removed.id)

        asyncio.run(seed_tokens())
        user = User(id=user_id, email=email, username="probe", name="Probe")
        environment.update(
            {
                "PROBE_USER_ID": str(user_id),
                "PROBE_JWT": create_access_token(user),
                "PROBE_EXPIRED": create_access_token(user, expires_delta=timedelta(seconds=-10)),
                "PROBE_API_KEY": token,
                "PROBE_REVOKED": revoked,
            }
        )
        restricted.dispose()
        result = invoke(["-c", ROUTES])
        assert [line for line in result.stdout.splitlines() if line.startswith("AUTH_ROUTE=")] == [
            f"AUTH_ROUTE={json.dumps([label, code])}"
            for label, code in (
                ("missing", 401),
                ("invalid", 401),
                ("expired", 401),
                ("revoked", 401),
                ("jwt", 200),
                ("api-key", 200),
            )
        ]
        assert "AUTH_STREAM=" in result.stdout
        with owner.connect() as conn:
            assert before == (
                tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                tuple(conn.execute(text("SELECT version_num FROM public.alembic_version"))),
                tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                ),
            )
            assert (
                conn.execute(
                    text(
                        "SELECT value->>'last_used_at' FROM public.store WHERE key IN "
                        "(SELECT value->>'token_id' FROM public.store WHERE key = :hash)"
                    ),
                    {"hash": hash_token(token)},
                ).scalar_one()
                is not None
            )
    finally:
        if restricted is not None:
            restricted.dispose()
        if migrator is not None:
            migrator.dispose()
        owner.dispose()
