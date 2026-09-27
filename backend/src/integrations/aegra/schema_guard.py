from sqlalchemy import text
from sqlalchemy.engine import Connection


def require_aegra_schema(connection: Connection, database: str) -> None:
    actual_database, role, is_superuser, search_path, schemas, version_table = connection.execute(
        text(
            "SELECT current_database(), current_user, rolsuper, current_setting('search_path'), "
            "current_schemas(true), to_regclass('alembic_version') "
            "FROM pg_roles WHERE rolname = current_user"
        )
    ).one()
    if actual_database != database:
        raise ValueError("Aegra migration database mismatch")
    if role != "aegra_migrator" or is_superuser:
        raise ValueError("Aegra migration requires the restricted role")
    if search_path != "aegra" or "aegra" not in schemas or "public" in schemas:
        raise ValueError("Aegra migration search_path must resolve only to aegra")
    if version_table is not None:
        raise ValueError("Aegra migration must start without an unqualified revision table")
