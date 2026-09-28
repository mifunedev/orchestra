import os
from collections.abc import Mapping

from langgraph_sdk import Auth
from langgraph.store.postgres.aio import AsyncPostgresStore
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.utils.auth import resolve_identity
from src.utils.db import get_asyncpg_connect_args, get_asyncpg_url


auth = Auth()


@auth.authenticate
async def authenticate(headers: Mapping[str, str]) -> dict:
    database_url = os.environ["DATABASE_URL"]
    auth_url = os.environ["ORCHESTRA_AEGRA_AUTH_DATABASE_URL"]
    aegra_db = make_url(database_url)
    orchestra_db = make_url(auth_url)
    if (aegra_db.host, aegra_db.port, aegra_db.database) != (
        orchestra_db.host,
        orchestra_db.port,
        orchestra_db.database,
    ) or aegra_db.username == orchestra_db.username:
        raise ValueError("Auth requires a separate role in the same database")

    engine = create_async_engine(
        get_asyncpg_url(orchestra_db), connect_args=get_asyncpg_connect_args(orchestra_db), pool_pre_ping=True
    )
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        authorization = headers.get("authorization", "")
        bearer = authorization[7:] if authorization.lower().startswith("bearer ") else None
        async with AsyncPostgresStore.from_conn_string(auth_url) as store:
            user = await resolve_identity(headers, bearer, store, session_factory)
        return {"identity": str(user.id), "display_name": user.name or user.username}
    finally:
        await engine.dispose()
