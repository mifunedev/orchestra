from pathlib import Path
from runpy import run_path
from unittest.mock import patch

import pytest

import src.constants as constants


LLM_CONSTANTS = Path(__file__).resolve().parents[3] / "src/constants/llm.py"


@pytest.mark.parametrize(
    ("keys", "expected"),
    [
        ({"OPENAI_API_KEY": "sk-test"}, "openai:gpt-6-luna"),
        ({"GOOGLE_API_KEY": "test"}, "google_genai:gemini-3-flash-preview"),
        ({"XAI_API_KEY": "test"}, "xai:grok-4-1-fast"),
        ({"ANTHROPIC_API_KEY": "test"}, "anthropic:claude-haiku-4-5"),
        ({"GROQ_API_KEY": "test"}, "groq:llama-3.3-70b-versatile"),
        ({}, None),
    ],
)
def test_default_chat_model_by_available_key(keys, expected):
    provider_keys = dict.fromkeys(
        ("OPENAI_API_KEY", "GOOGLE_API_KEY", "XAI_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY"), None
    )
    provider_keys.update(keys)

    with patch.multiple(constants, **provider_keys):
        module = run_path(str(LLM_CONSTANTS))

    assert module["DEFAULT_CHAT_MODEL"] == expected
    assert module["get_default_chat_model"]() == expected
    if keys.get("OPENAI_API_KEY"):
        assert module["ChatModels"].OPENAI_GPT_6_LUNA.value == expected
        assert module["DEFAULT_CHAT_MODEL_BASIC"] == "openai:gpt-5-nano"


def test_openai_wins_when_multiple_keys_are_available():
    with patch.multiple(constants, OPENAI_API_KEY="sk-test", GOOGLE_API_KEY="test"):
        module = run_path(str(LLM_CONSTANTS))

    assert module["DEFAULT_CHAT_MODEL"] == "openai:gpt-6-luna"
