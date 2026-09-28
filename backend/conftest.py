import asyncio
import os
import socket
from pathlib import Path

import pytest


def _start_test_postgres():
    import docker
    from docker.errors import NotFound
    from testcontainers.postgres import PostgresContainer

    os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")
    try:
        network = next(
            iter(docker.from_env().containers.get(socket.gethostname()).attrs["NetworkSettings"]["Networks"])
        )
    except NotFound:
        network = None

    container = PostgresContainer("pgvector/pgvector:pg17", driver=None, tmpfs={"/var/lib/postgresql/data": "rw"})
    if network:
        container.with_kwargs(network=network)
    container.start()
    if network:
        container.reload()
        host = container._container.attrs["NetworkSettings"]["Networks"][network]["IPAddress"]
        port = 5432
    else:
        host = container.get_container_host_ip()
        port = container.get_exposed_port(5432)
    container.exec(
        ["psql", "-U", container.username, "-d", container.dbname, "-c", "CREATE EXTENSION IF NOT EXISTS vector"]
    )
    uri = f"postgresql://{container.username}:{container.password}@{host}:{port}/{container.dbname}?sslmode=disable"
    return container, uri


def _migrate():
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    command.upgrade(config, "head")


_test_postgres = None
_test_uri = os.environ.get("TEST_POSTGRES_CONNECTION_STRING")
if os.environ.get("AEGRA_OWNERSHIP_LIVE") == "1" and _test_uri:
    pytest.exit("Aegra ownership probe refuses TEST_POSTGRES_CONNECTION_STRING before migrations", returncode=3)
if not _test_uri:
    _test_postgres, _test_uri = _start_test_postgres()
os.environ["POSTGRES_CONNECTION_STRING"] = _test_uri
os.environ.pop("POSTGRES_CONNECTION_STRING_SESSION", None)
try:
    _migrate()
except BaseException:
    if _test_postgres:
        _test_postgres.stop()
    raise


def pytest_sessionfinish(session, exitstatus):
    if _test_postgres:
        _test_postgres.stop()


from src.constants import DB_URI  # noqa: E402

if DB_URI != _test_uri:
    if _test_postgres:
        _test_postgres.stop()
    pytest.exit("src.constants.DB_URI does not point at the test database", returncode=3)


async def _seed():
    from seeds.user_seeder import engine, seed_admin
    from src.services.db import get_checkpoint_db, get_store_db

    await seed_admin()
    await engine.dispose()
    async with get_checkpoint_db() as saver:
        await saver.setup()
    async with get_store_db() as store:
        await store.setup()


asyncio.run(_seed())
