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
    from sqlalchemy.engine import make_url

    aegra = make_url(os.environ["DATABASE_URL"])
    orchestra = make_url(os.environ["ORCHESTRA_AEGRA_AUTH_DATABASE_URL"])
    if (aegra.host, aegra.port, aegra.database) != (orchestra.host, orchestra.port, orchestra.database):
        raise ValueError("Auth and Aegra must use the same database")
    if not aegra.database or aegra.username == orchestra.username:
        raise ValueError("Aegra and auth require different roles")
    if os.environ.get(
        "POSTGRES_CONNECTION_STRING", orchestra.render_as_string(hide_password=False)
    ) != orchestra.render_as_string(hide_password=False):
        raise ValueError("Orchestra connection must use the auth role")
    os.environ["POSTGRES_CONNECTION_STRING"] = orchestra.render_as_string(hide_password=False)
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
