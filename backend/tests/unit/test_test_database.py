import os

from sqlalchemy.engine.url import make_url

from src.constants import DB_URI


def test_db_uri_is_the_bootstrapped_test_database():
    assert DB_URI == os.environ["POSTGRES_CONNECTION_STRING"]
    url = make_url(DB_URI)
    assert url.database != "orchestra_dev"
    if not os.environ.get("TEST_POSTGRES_CONNECTION_STRING"):
        assert url.database == "test"
        assert url.host not in {"pgvector", "localhost"} or url.port != 5432
