import asyncio
import json
import os
import socket
import subprocess
import time
from datetime import timedelta
from pathlib import Path

import conftest
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

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
    "with_connection = engine.connect(); "
    "require_aegra_schema(with_connection, __import__('os').environ['PROBE_DATABASE']); "
    "with_connection.close(); engine.dispose(); "
    "assert not settings.app.RUN_MIGRATIONS_ON_STARTUP; run_migrations()"
)
ROUTES = """
import asyncio
import json
import os

import httpx
from pathlib import Path
from src.integrations.aegra.launch import validate
validate(Path(os.environ['AEGRA_CONFIG']))
from aegra_api.main import app
from aegra_api.core.auth_middleware import get_auth_backend
from src.integrations.aegra import auth as adapter

async def run():
    backend = get_auth_backend()
    assert backend.auth_instance is not None
    handler = backend.auth_instance._authenticate_handler
    user = await handler({'authorization': 'Bearer ' + os.environ['PROBE_JWT'], 'x-user-id': 'forged'})
    assert user['identity'] == os.environ['PROBE_USER_ID']
    assert 'POSTGRES_CONNECTION_STRING' in os.environ
    assert not any(key.startswith('ORCHESTRA_AEGRA_') and key != 'ORCHESTRA_AEGRA_AUTH_PORT' for key in os.environ)
    assert 'src.services.db' not in __import__('sys').modules
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            for label, headers, expected in (
                ('missing', {}, 401),
                ('invalid', {'authorization': 'Bearer invalid'}, 401),
                ('expired', {'authorization': 'Bearer ' + os.environ['PROBE_EXPIRED']}, 401),
                ('revoked', {'x-api-key': os.environ['PROBE_REVOKED']}, 401),
                ('jwt', {'authorization': 'Bearer ' + os.environ['PROBE_JWT']}, 200),
                ('api-key', {'x-api-key': os.environ['PROBE_API_KEY']}, 200),
            ):
                response = await client.post(
                    '/assistants/search',
                    json={'limit': 1, 'user_id': 'forged', 'tenant_id': 'forged'}, headers=headers,
                )
                assert response.status_code == expected, (label, response.status_code, response.text[:300])
                print('AUTH_ROUTE=' + json.dumps([label, response.status_code]), flush=True)
            async with client.stream(
                'POST', '/runs/stream',
                json={'assistant_id': 'auth_probe', 'input': {'message': 'hello'}, 'stream_mode': 'values'},
                headers={'x-api-key': os.environ['PROBE_API_KEY']},
            ) as response:
                assert response.status_code == 200, response.status_code
                events = [event async for event in response.aiter_lines()]
                assert any('hello' in event for event in events), events[-5:]
                print('AUTH_STREAM=200', flush=True)
    original = adapter.httpx.AsyncClient
    for label, result in (
        ('redirect', httpx.Response(307, headers={'location': 'http://example.com/steal'})),
        ('malformed', httpx.Response(200, json={'user': {'id': ''}})),
        ('non-200', httpx.Response(503)),
    ):
        transport = httpx.MockTransport(lambda request: result)
        adapter.httpx.AsyncClient = lambda **kwargs: original(transport=transport, **kwargs)
        try:
            try:
                await handler({'x-api-key': os.environ['PROBE_API_KEY']})
                raise AssertionError(label + ' unexpectedly authenticated')
            except adapter.Auth.exceptions.HTTPException as exc:
                assert exc.status_code == 401, label
            print('AUTH_FAIL=' + label, flush=True)
        finally:
            adapter.httpx.AsyncClient = original
    os.environ['ORCHESTRA_AEGRA_AUTH_PORT'] = '1'
    try:
        await handler({'x-api-key': os.environ['PROBE_API_KEY']})
        raise AssertionError('unreachable unexpectedly authenticated')
    except adapter.Auth.exceptions.HTTPException as exc:
        assert exc.status_code == 401
    print('AUTH_FAIL=unreachable', flush=True)

asyncio.run(run())
"""


def invoke(args, environment, *, valid=True):
    result = subprocess.run(
        ["uv", "run", "--no-sync", "--with", "aegra-api==0.10.7", "python", *args],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )
    assert (result.returncode == 0) == valid, (
        result.returncode,
        result.stderr.replace("disposable_migrator_only", "[REDACTED]")[-1500:],
    )
    return result


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
    owner = create_engine(owner_url)
    migrator = None
    socket_name = f"aegra-auth-{os.getpid()}"
    session = "orchestra-auth"
    service_created = False
    try:
        with owner.begin() as conn:
            assert conn.execute(text("SELECT version_num FROM public.alembic_version")).scalar_one() == "0001"
            user_id, email = conn.execute(text("SELECT id, email FROM public.users LIMIT 1")).one()
            conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            conn.execute(text("CREATE SCHEMA aegra"))
            conn.execute(text("CREATE ROLE aegra_migrator LOGIN PASSWORD 'disposable_migrator_only'"))
            quoted = conn.dialect.identifier_preparer.quote(database)
            conn.execute(text(f"GRANT CONNECT ON DATABASE {quoted} TO aegra_migrator"))
            conn.execute(text("GRANT USAGE, CREATE ON SCHEMA aegra TO aegra_migrator"))
            conn.execute(text(f"ALTER ROLE aegra_migrator IN DATABASE {quoted} SET search_path = aegra"))
        migrator = create_engine(migrator_url)
        with migrator.connect() as conn:
            require_aegra_schema(conn, database)
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.users', 'SELECT')")
            ).scalar_one()
            assert not conn.execute(
                text("SELECT has_table_privilege(current_user, 'public.store', 'SELECT')")
            ).scalar_one()
            assert not conn.execute(text("SELECT has_schema_privilege(current_user, 'public', 'CREATE')")).scalar_one()
            assert "public" not in conn.execute(text("SELECT current_schemas(true)")).scalar_one()
        public_catalog = (
            "SELECT oid, relname, relkind, relacl FROM pg_class WHERE relnamespace='public'::regnamespace ORDER BY oid"
        )
        store_snapshot_query = (
            "SELECT row_to_json(t)::text FROM public.store t "
            "WHERE prefix NOT LIKE '%api_tokens%' AND prefix NOT LIKE '%api_token_index%' ORDER BY 1"
        )
        with owner.connect() as conn:
            before = (
                tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                tuple(conn.execute(text("SELECT version_num FROM public.alembic_version"))),
                tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                ),
                tuple(conn.execute(text(public_catalog))),
            )
        environment = os.environ.copy()
        for name in tuple(environment):
            if "POSTGRES_CONNECTION_STRING" in name or name.startswith("ORCHESTRA_AEGRA_"):
                environment.pop(name, None)
        environment.update(
            {
                "DATABASE_URL": migrator_url.render_as_string(hide_password=False),
                "RUN_MIGRATIONS_ON_STARTUP": "false",
                "REDIS_BROKER_ENABLED": "false",
                "AEGRA_CONFIG": str(CONFIG),
                "PROBE_DATABASE": database,
            }
        )
        invoke(["-c", MIGRATE], environment)
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
                tuple(conn.execute(text(public_catalog))),
            )
        config = json.loads(CONFIG.read_text())
        for invalid in (
            {},
            {"auth": {"path": "missing.module:auth"}},
            {"auth": {"path": "src.integrations.aegra.auth:missing"}},
        ):
            path = tmp_path / "invalid.json"
            path.write_text(json.dumps({**config, **invalid} if invalid else {"graphs": config["graphs"]}))
            invoke(["-m", "src.integrations.aegra.launch", str(path), "--check"], environment, valid=False)
        invoke(["-m", "src.integrations.aegra.launch", str(CONFIG), "--check"], environment)
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
        with owner.connect() as conn:
            assert (
                conn.execute(
                    text(
                        "SELECT value->>'last_used_at' FROM public.store WHERE key IN "
                        "(SELECT value->>'token_id' FROM public.store WHERE key = :hash)"
                    ),
                    {"hash": hash_token(token)},
                ).scalar_one()
                is None
            )
            public_rows = tuple(
                (
                    table,
                    tuple(conn.execute(text(f'SELECT row_to_json(t)::text FROM public."{table}" t ORDER BY 1'))),
                )
                for (table,) in conn.execute(
                    text(
                        "SELECT tablename FROM pg_tables WHERE schemaname='public' "
                        "AND tablename != 'store' ORDER BY tablename"
                    )
                )
            )
            non_token_store = tuple(conn.execute(text(store_snapshot_query)))
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
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        environment["ORCHESTRA_AEGRA_AUTH_PORT"] = str(port)
        service_env = os.environ.copy()
        service_env["POSTGRES_CONNECTION_STRING"] = conftest._test_uri
        service_env["ORCHESTRA_AEGRA_AUTH_PORT"] = str(port)
        service_env["PYTHONPATH"] = str(BACKEND)
        subprocess.run(
            [
                "tmux",
                "-L",
                socket_name,
                "-f",
                "/dev/null",
                "new-session",
                "-d",
                "-s",
                session,
                "-c",
                str(BACKEND),
                "uv run --no-sync python tests/fixtures/orchestra_auth_server.py",
            ],
            env=service_env,
            check=True,
            capture_output=True,
            timeout=20,
        )
        service_created = True
        deadline = time.monotonic() + 30
        while True:
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=1) as connection:
                    connection.sendall(b"GET /api/auth/user HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
                    assert b"401" in connection.recv(128)
                break
            except OSError:
                if time.monotonic() > deadline:
                    raise AssertionError("Orchestra auth service did not start") from None
                time.sleep(0.2)
        result = invoke(["-c", ROUTES], environment)
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
        assert "AUTH_STREAM=200" in result.stdout
        assert [line for line in result.stdout.splitlines() if line.startswith("AUTH_FAIL=")] == [
            f"AUTH_FAIL={label}" for label in ("redirect", "malformed", "non-200", "unreachable")
        ]
        with owner.connect() as conn:
            assert before == (
                tuple(conn.execute(text("SELECT * FROM public.users ORDER BY id"))),
                tuple(conn.execute(text("SELECT version_num FROM public.alembic_version"))),
                tuple(
                    conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                ),
                tuple(conn.execute(text(public_catalog))),
            )
            assert public_rows == tuple(
                (
                    table,
                    tuple(conn.execute(text(f'SELECT row_to_json(t)::text FROM public."{table}" t ORDER BY 1'))),
                )
                for table, _ in public_rows
            )
            assert non_token_store == tuple(conn.execute(text(store_snapshot_query)))
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
            assert (
                conn.execute(
                    text(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                        "AND usename='aegra_migrator' "
                        "AND (query ILIKE '%public.users%' OR query ILIKE '%public.store%')"
                    )
                ).scalar_one()
                == 0
            )
            assert (
                conn.execute(
                    text(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                        "AND usename=:owner AND state='idle in transaction'"
                    ),
                    {"owner": owner_url.username},
                ).scalar_one()
                == 0
            )
    finally:
        if service_created:
            subprocess.run(
                ["tmux", "-L", socket_name, "kill-session", "-t", session], check=True, capture_output=True, timeout=10
            )
        if migrator is not None:
            migrator.dispose()
        owner.dispose()
