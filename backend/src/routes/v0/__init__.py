import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from src.constants import DOCS_BASE_URL, LANGCONNECT_SERVER_URL
from .llm import llm_router as llm
from .thread import router as thread
from .tool import router as tool
from .info import router as info
from .auth import router as auth
from .storage import router as storage
from .assistant import router as assistant
from .schedule import router as schedule
from .prompt import router as prompt
from .project import router as project
from .api_tokens import router as api_tokens
from .share import router as share
from .settings import router as settings
from .memory import router as memory
from .config import router as config


def create_api_router(app: FastAPI, prefix: str = "/api"):
    app.include_router(auth, prefix=prefix)
    app.include_router(info, prefix=prefix)
    app.include_router(llm, prefix=prefix)
    app.include_router(thread, prefix=prefix)
    app.include_router(tool, prefix=prefix)
    app.include_router(assistant, prefix=prefix)
    app.include_router(prompt, prefix=prefix)
    app.include_router(project, prefix=prefix)
    app.include_router(schedule, prefix=prefix)
    if LANGCONNECT_SERVER_URL:
        from .rag import gateway as rag

        app.include_router(rag, prefix=prefix)
    app.include_router(storage, prefix=prefix)
    app.include_router(api_tokens, prefix=prefix)
    app.include_router(share, prefix=prefix)
    app.include_router(settings, prefix=prefix)
    app.include_router(memory, prefix=prefix)
    app.include_router(config, prefix=prefix)
    return app


def mount_static_router(app: FastAPI):
    @app.get("/docs", include_in_schema=False)
    @app.get("/docs/{path:path}", include_in_schema=False)
    async def redirect_docs(path: str = ""):
        target = DOCS_BASE_URL
        if path:
            target = f"{target}/{path}"
        return RedirectResponse(url=target, status_code=307)

    if os.path.exists("src/public/assets"):
        app.mount("/assets", StaticFiles(directory="src/public/assets"), name="assets")
    if os.path.exists("src/public/icons"):
        app.mount("/icons", StaticFiles(directory="src/public/icons"), name="icons")
    if os.path.exists("src/public/embed"):
        app.mount("/embed", StaticFiles(directory="src/public/embed"), name="embed")

    # Only mount SPA catch-all if index.html exists
    if os.path.exists("src/public/index.html"):

        @app.get("/{filename:path}", include_in_schema=False)
        async def serve_static_or_index(filename: str, request: Request):
            # List of static files to check for at the root
            static_files = [
                "manifest.json",
                "sw.js",
                "favicon.ico",
                "robots.txt",
                "manifest.webmanifest",
            ]

            # If the request is for a known static file and it exists, serve it
            if filename in static_files and os.path.exists(f"src/public/{filename}"):
                return FileResponse(f"src/public/{filename}")

            # For any file that exists on disk (icons/, embed/, etc.), serve it directly
            file_path = f"src/public/{filename}"
            if filename and os.path.isfile(file_path):
                return FileResponse(file_path)

            # For all other routes, serve the index.html for SPA routing
            return FileResponse("src/public/index.html")

    return app
