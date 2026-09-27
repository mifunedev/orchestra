import sqlite3

import pytest


def snapshot(connection, user_id):
    revision_query = "SELECT version_num FROM alembic_version ORDER BY version_num"
    revisions = tuple(row[0] for row in connection.execute(revision_query))
    users = tuple(
        connection.execute(
            "SELECT id, username, email, name, hashed_password, created_at, updated_at "
            "FROM users WHERE id = ?",
            (user_id,),
        )
    )
    return revisions, users


def assert_preserved(before, after):
    assert after[0] == before[0], f"Orchestra revision changed: {before[0]!r} -> {after[0]!r}"
    assert after[1] == before[1], f"Seeded user changed: {before[1]!r} -> {after[1]!r}"


@pytest.fixture
def seeded_connection():
    with sqlite3.connect(":memory:") as connection:
        connection.execute("CREATE TABLE alembic_version (version_num TEXT NOT NULL)")
        connection.execute(
            "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, email TEXT, name TEXT, "
            "hashed_password TEXT, created_at TEXT, updated_at TEXT)"
        )
        connection.execute("INSERT INTO alembic_version VALUES ('0001')")
        connection.execute(
            "INSERT INTO users VALUES ('seed', 'seed-user', 'seed@example.invalid', 'Seed', 'hash', 'created', NULL)"
        )
        yield connection


def test_preserved_snapshot_passes(seeded_connection):
    before = snapshot(seeded_connection, "seed")
    assert_preserved(before, snapshot(seeded_connection, "seed"))


@pytest.mark.parametrize(
    ("mutation", "error"),
    [
        ("UPDATE alembic_version SET version_num = 'aegra'", "Orchestra revision changed"),
        ("INSERT INTO alembic_version VALUES ('extra')", "Orchestra revision changed"),
        ("UPDATE users SET email = 'altered@example.invalid' WHERE id = 'seed'", "Seeded user changed"),
        ("DELETE FROM users WHERE id = 'seed'", "Seeded user changed"),
    ],
)
def test_snapshot_detects_mutation(seeded_connection, mutation, error):
    before = snapshot(seeded_connection, "seed")
    seeded_connection.execute(mutation)
    with pytest.raises(AssertionError, match=error):
        assert_preserved(before, snapshot(seeded_connection, "seed"))
