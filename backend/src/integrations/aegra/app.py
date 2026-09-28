import os
import re
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from psycopg.conninfo import conninfo_to_dict
from starlette.responses import JSONResponse

from src.integrations.aegra import authority


_ALLOWED = (
    ("POST", re.compile(r"/threads(?:/search)?")),
    ("GET", re.compile(r"/threads/[^/]+(?:/state|/runs(?:/[^/]+(?:/stream)?)?)?")),
    ("POST", re.compile(r"/threads/[^/]+/runs/stream")),
)


class RequestBoundary:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope["path"].removeprefix(scope.get("root_path", ""))
        if not any(scope["method"] == method and pattern.fullmatch(path) for method, pattern in _ALLOWED):
            await JSONResponse({"detail": "Unsupported Aegra operation"}, status_code=404)(scope, receive, send)
            return
        token = authority.credentials.set(None)
        try:
            await self.app(scope, receive, send)
        finally:
            authority.credentials.reset(token)


def create_app():
    database_url = os.environ["AEGRA_DATABASE_URL"]
    orchestra_url = os.environ["POSTGRES_CONNECTION_STRING"]
    if not database_url.startswith(("postgresql://", "postgres://")):
        raise ValueError("AEGRA_DATABASE_URL must be a PostgreSQL URI")
    aegra_database = conninfo_to_dict(database_url).get("dbname")
    orchestra_database = conninfo_to_dict(orchestra_url).get("dbname")
    if not aegra_database or not orchestra_database or aegra_database == orchestra_database:
        raise ValueError("Aegra requires a database distinct from Orchestra")
    if "aegra_api.settings" in sys.modules:
        raise RuntimeError("Create the Orchestra Aegra application before importing the Aegra runtime")
    authority.api_url()
    os.environ.update(
        DATABASE_URL=database_url,
        AEGRA_CONFIG=str(Path(__file__).with_name("aegra.json")),
        REDIS_BROKER_ENABLED="false",
        CRON_ENABLED="false",
        RUN_MIGRATIONS_ON_STARTUP="true",
    )
    from aegra_api.core.auth_middleware import get_auth_instance
    from aegra_api.main import app as native_app
    from src.integrations.aegra.auth import auth

    if get_auth_instance() is not auth:
        raise RuntimeError("Orchestra credential authority was not installed")

    @asynccontextmanager
    async def lifespan(app):
        async with native_app.router.lifespan_context(native_app):
            yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.mount("/api/aegra", RequestBoundary(native_app))
    return app
