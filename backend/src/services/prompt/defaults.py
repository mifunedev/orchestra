import os
from pathlib import Path
from typing import Literal

from src.services.prompt.langsmith import fetch_prompt
from src.utils.logger import logger

DefaultSystemPromptSource = Literal["file", "langsmith"]

DEFAULT_SYSTEM_PROMPT_LANGSMITH_NAME = "orchestra-default"
_DEFAULT_SYSTEM_PROMPT_FILE_PATH = Path(__file__).resolve().parents[2] / "static" / "prompts" / "md" / "default.md"
_FILE_CACHE: dict[tuple[str, str, int], str] = {}


def get_default_system_prompt_source() -> DefaultSystemPromptSource:
    raw_source = os.getenv("DEFAULT_SYSTEM_PROMPT_SOURCE", "file").strip().lower()
    if raw_source not in {"file", "langsmith"}:
        message = f"Failed to resolve default system prompt source: invalid DEFAULT_SYSTEM_PROMPT_SOURCE={raw_source!r}"
        logger.error(message)
        raise RuntimeError(message)
    return raw_source


def get_default_system_prompt_path() -> Path:
    configured_path = os.getenv("DEFAULT_SYSTEM_PROMPT_PATH")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return _DEFAULT_SYSTEM_PROMPT_FILE_PATH


def get_default_system_prompt() -> str:
    source = get_default_system_prompt_source()
    if source == "file":
        return _load_default_system_prompt_from_file(get_default_system_prompt_path())
    if source == "langsmith":
        prompt_name = os.getenv("DEFAULT_SYSTEM_PROMPT_LANGSMITH_NAME", DEFAULT_SYSTEM_PROMPT_LANGSMITH_NAME)
        return _load_default_system_prompt_from_langsmith(prompt_name)
    message = f"Failed to resolve default system prompt source: unsupported source={source!r}"
    logger.error(message)
    raise RuntimeError(message)


def _load_default_system_prompt_from_file(path: Path) -> str:
    try:
        stat = path.stat()
        cache_key = ("file", str(path), stat.st_mtime_ns)
        cached_prompt = _FILE_CACHE.get(cache_key)
        if cached_prompt is not None:
            return cached_prompt

        content = path.read_bytes().decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
        _FILE_CACHE.clear()
        _FILE_CACHE[cache_key] = content
        return content
    except Exception as exc:
        message = f"Failed to load default system prompt from source='file' path='{path}': {exc}"
        logger.error(message)
        raise RuntimeError(message) from exc


def _load_default_system_prompt_from_langsmith(prompt_name: str) -> str:
    try:
        prompt = fetch_prompt(prompt_name)
        if hasattr(prompt, "content"):
            return prompt.content
        if hasattr(prompt, "template"):
            return prompt.template
        formatted_prompt = prompt.format_prompt()
        return formatted_prompt.messages[-1].content
    except Exception as exc:
        message = f"Failed to load default system prompt from source='langsmith' name='{prompt_name}': {exc}"
        logger.error(message)
        raise RuntimeError(message) from exc
