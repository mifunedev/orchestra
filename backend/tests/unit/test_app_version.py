import importlib
import tomllib
from pathlib import Path

import src.constants

PYPROJECT = Path(__file__).resolve().parents[2] / "pyproject.toml"


def _reload(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("APP_VERSION", raising=False)
    else:
        monkeypatch.setenv("APP_VERSION", value)
    return importlib.reload(src.constants)


def test_app_version_defaults_to_pyproject_version(monkeypatch):
    expected = tomllib.loads(PYPROJECT.read_text())["project"]["version"]
    assert _reload(monkeypatch, None).APP_VERSION == expected


def test_app_version_env_override(monkeypatch):
    assert _reload(monkeypatch, "9.8.7").APP_VERSION == "9.8.7"
    monkeypatch.delenv("APP_VERSION")
    importlib.reload(src.constants)
