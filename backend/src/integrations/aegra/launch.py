import json
import os
import sys
from pathlib import Path


def validate(config_path: Path) -> None:
    if not config_path.is_file():
        raise ValueError("Aegra config file is required")
    config = json.loads(config_path.read_text())
    path = config.get("auth", {}).get("path") if isinstance(config, dict) else None
    if path != "src.integrations.aegra.auth:auth":
        raise ValueError("Aegra auth.path must name the Orchestra adapter")
    if os.environ.get("RUN_MIGRATIONS_ON_STARTUP", "").lower() != "false":
        raise ValueError("Aegra startup migrations must be disabled")
    if os.environ.get("POSTGRES_CONNECTION_STRING_SESSION") or any(
        name.startswith("ORCHESTRA_AEGRA_") and name != "ORCHESTRA_AEGRA_AUTH_PORT" for name in os.environ
    ):
        raise ValueError("Aegra must not receive an Orchestra database URL")
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url

    from src.integrations.aegra.schema_guard import require_aegra_schema

    url = make_url(os.environ["DATABASE_URL"])
    if not url.database or url.username != "aegra_migrator":
        raise ValueError("Aegra requires its restricted database role")
    if os.environ.get("POSTGRES_CONNECTION_STRING") not in (None, url.render_as_string(hide_password=False)):
        raise ValueError("Aegra must not receive another database URL")
    engine = create_engine(url)
    try:
        with engine.connect() as connection:
            role, search_path, schemas = connection.execute(
                text("SELECT current_user, current_setting('search_path'), current_schemas(true)")
            ).one()
            if role != "aegra_migrator" or search_path != "aegra" or "public" in schemas:
                raise ValueError("Aegra database role must resolve only to aegra")
            revision = connection.execute(text("SELECT version_num FROM aegra.alembic_version")).scalar_one()
            require_aegra_schema(connection, url.database, revision)
            public_access = connection.execute(
                text(
                    "SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                    "WHERE n.nspname='public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S') "
                    "AND (has_table_privilege(current_user, c.oid, 'SELECT') "
                    "OR has_table_privilege(current_user, c.oid, 'INSERT') "
                    "OR has_table_privilege(current_user, c.oid, 'UPDATE') "
                    "OR has_table_privilege(current_user, c.oid, 'DELETE')))"
                )
            ).scalar_one()
            if public_access:
                raise ValueError("Aegra role has public table access")
    finally:
        engine.dispose()
    os.environ["POSTGRES_CONNECTION_STRING"] = url.render_as_string(hide_password=False)
    os.environ["AEGRA_CONFIG"] = str(config_path.resolve())
    from aegra_api.core.auth_middleware import LangGraphAuthBackend

    backend = LangGraphAuthBackend()
    if backend.auth_instance is None or backend.auth_instance._authenticate_handler is None:
        raise ValueError("Aegra auth.path could not load an authenticate handler")


def main() -> None:
    try:
        if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != "--check"):
            raise ValueError("Usage: python -m src.integrations.aegra.launch CONFIG [--check]")
        validate(Path(sys.argv[1]))
    except Exception:
        print("Aegra guarded startup refused: invalid configuration or auth loader", file=sys.stderr)
        raise SystemExit(1) from None
    if len(sys.argv) == 3:
        return
    import uvicorn

    uvicorn.run("aegra_api.main:app", host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))


if __name__ == "__main__":
    main()
