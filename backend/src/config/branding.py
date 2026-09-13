"""White-label branding configuration.

Loads brand + public-URL config from a YAML file and exposes a validated
``BRANDING`` singleton. Secrets never live here — only public, white-labelable
values (brand name, logos, docs/console links, contact). Individual values can
still be overridden by environment variables where wired (see ``src/constants``),
preserving backward compatibility.

Resolution order for the YAML path:
  1. explicit ``path`` argument
  2. ``WHITELABEL_CONFIG`` environment variable
  3. ``<backend>/config/whitelabel.yaml``

A missing, empty, or invalid file falls back to the built-in defaults so the
app never fails to boot on branding config.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml
from pydantic import BaseModel, Field

# src/config/branding.py -> config -> src -> backend
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CONFIG_PATH = _BACKEND_ROOT / "config" / "whitelabel.yaml"


class Brand(BaseModel):
    name: str = "Mifune"
    title: str = "Mifune - Orchestra 🪶"
    short_name: str = "Mifune"
    copyright_holder: str = "Mifune"
    logo_url: str = ""


class Urls(BaseModel):
    console: str = "https://console.mifune.dev"
    api_base: str = "https://console.mifune.dev/api"
    docs: str = "https://github.com/mifunedev/orchestra/tree/development/docs"
    website: str = "https://mifune.dev"
    blog: str = "https://mifune.dev/blog"
    socials: str = "https://mifune.dev/socials"
    github: str = "https://github.com/mifunedev"
    slack_invite: str = ""


class Contact(BaseModel):
    name: str = "Ryan Eggleston"
    email: str = "reggleston@mifune.dev"


class Branding(BaseModel):
    brand: Brand = Field(default_factory=Brand)
    urls: Urls = Field(default_factory=Urls)
    contact: Contact = Field(default_factory=Contact)


def load_branding(path: str | os.PathLike | None = None) -> Branding:
    """Load white-label branding from YAML, falling back to built-in defaults."""
    cfg_path = Path(path or os.getenv("WHITELABEL_CONFIG") or _DEFAULT_CONFIG_PATH)
    if not cfg_path.is_file():
        return Branding()
    try:
        data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return Branding()
    if not isinstance(data, dict):
        return Branding()
    return Branding.model_validate(data)


BRANDING = load_branding()
