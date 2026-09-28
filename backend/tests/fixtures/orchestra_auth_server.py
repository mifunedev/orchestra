from contextlib import asynccontextmanager

from fastapi import FastAPI
from langgraph.store.postgres.aio import AsyncPostgresStore

from src.routes.v0.auth import router
from src.services.db import async_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    from src.constants import DB_URI

    async with AsyncPostgresStore.from_conn_string(DB_URI) as store:
        app.state.store = store
        yield
    await async_engine.dispose()


app = FastAPI(lifespan=lifespan)
app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ["ORCHESTRA_AEGRA_AUTH_PORT"]), access_log=False)
