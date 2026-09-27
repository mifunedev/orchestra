"""Tests for the reasoning-effort policy (issue #961).

The catalogue is stubbed rather than fetched so these tests pin behaviour, not
whatever models.dev happens to publish today.
"""

from unittest.mock import MagicMock, patch

import pytest

from src.utils.reasoning import (
    EFFORT_PROVIDERS,
    get_reasoning_options,
    is_reasoning_model,
    reasoning_kwargs,
    resolve_reasoning_effort,
    split_model,
)

# Shaped like the real https://models.dev/api.json payload.
CATALOG = {
    "openai": {
        "models": {
            "gpt-5.6-luna": {
                "reasoning": True,
                "reasoning_options": [{"type": "effort", "values": ["none", "low", "medium", "high", "xhigh", "max"]}],
            },
            "o3": {"reasoning": True, "reasoning_options": [{"type": "effort", "values": ["low", "medium", "high"]}]},
            "gpt-4.1-mini": {"reasoning": False, "reasoning_options": None},
        }
    },
    "xai": {
        "models": {
            "grok-4.5": {"reasoning": True, "reasoning_options": [{"type": "effort", "values": ["low", "high"]}]},
        }
    },
    "anthropic": {
        "models": {
            # Reasoning, but via a token budget rather than an effort enum.
            "claude-sonnet-4-5": {"reasoning": True, "reasoning_options": [{"type": "budget_tokens", "min": 1024}]},
        }
    },
    "amazon-bedrock": {
        "models": {
            "openai.gpt-5.6-luna": {
                "reasoning": True,
                "reasoning_options": [{"type": "effort", "values": ["low", "high"]}],
            },
        }
    },
}


@pytest.fixture
def catalog():
    """Serve CATALOG in place of the live models.dev fetch."""
    service = MagicMock()
    service._fetch_models.return_value = CATALOG
    with patch("src.services.llm.llm_service", service):
        yield service


@pytest.fixture
def no_catalog():
    """Simulate models.dev being unreachable with a cold cache."""
    service = MagicMock()
    service._fetch_models.return_value = {}
    with patch("src.services.llm.llm_service", service):
        yield service


class TestSplitModel:
    @pytest.mark.parametrize(
        "model,expected",
        [
            ("openai:gpt-5.6-luna", ("openai", "gpt-5.6-luna")),
            ("groq:openai/gpt-oss-120b", ("groq", "openai/gpt-oss-120b")),
            (
                "bedrock_converse:us.anthropic.claude-sonnet-4-5-20250929-v1:0",
                ("bedrock_converse", "us.anthropic.claude-sonnet-4-5-20250929-v1:0"),
            ),  # noqa: E501
            ("no-colon", ("", "")),
            ("", ("", "")),
            (None, ("", "")),
        ],
    )
    def test_split(self, model, expected):
        assert split_model(model) == expected


class TestIsReasoningModel:
    def test_trusts_catalog_flag(self, catalog):
        assert is_reasoning_model("openai:gpt-5.6-luna") is True
        assert is_reasoning_model("openai:gpt-4.1-mini") is False

    def test_falls_back_to_openai_families_when_catalog_is_empty(self, no_catalog):
        """A cold cache must not silently reintroduce the 400 this policy fixes."""
        assert is_reasoning_model("openai:gpt-5.6-luna") is True
        assert is_reasoning_model("openai:o3") is True
        assert is_reasoning_model("openai:gpt-4o") is False

    def test_unknown_provider_is_not_reasoning(self, catalog):
        assert is_reasoning_model("ollama:llama3") is False
        assert is_reasoning_model(None) is False


class TestGetReasoningOptions:
    def test_effort_values_from_catalog(self, catalog):
        assert get_reasoning_options("openai:gpt-5.6-luna") == ["none", "low", "medium", "high", "xhigh", "max"]
        assert get_reasoning_options("openai:o3") == ["low", "medium", "high"]
        assert get_reasoning_options("xai:grok-4.5") == ["low", "high"]

    def test_empty_for_non_reasoning_model(self, catalog):
        assert get_reasoning_options("openai:gpt-4.1-mini") == []

    def test_empty_for_budget_style_providers(self, catalog):
        """Anthropic reasons, but via `thinking` -- there is no effort to offer."""
        assert get_reasoning_options("anthropic:claude-sonnet-4-5") == []

    def test_empty_for_bedrock_even_when_catalog_lists_efforts(self, catalog):
        """ChatBedrockConverse sets extra="forbid" -- an effort kwarg would raise."""
        assert get_reasoning_options("bedrock_converse:us.openai.gpt-5.6-luna") == []

    def test_only_effort_providers_are_offered(self):
        assert EFFORT_PROVIDERS == frozenset({"openai", "xai", "groq"})


class TestResolveReasoningEffort:
    def test_supported_effort_passes_through(self, catalog):
        assert resolve_reasoning_effort("openai:gpt-5.6-luna", "xhigh") == "xhigh"

    def test_unsupported_effort_is_dropped_not_raised(self, catalog):
        """A stale saved default must not turn every chat into a 400."""
        assert resolve_reasoning_effort("openai:o3", "xhigh") is None
        assert resolve_reasoning_effort("openai:gpt-4.1-mini", "low") is None
        assert resolve_reasoning_effort("anthropic:claude-sonnet-4-5", "low") is None

    def test_no_effort_requested(self, catalog):
        assert resolve_reasoning_effort("openai:gpt-5.6-luna", None) is None


class TestReasoningKwargs:
    def test_openai_reasoning_model_uses_responses_api(self, catalog):
        """The #961 regression pin.

        On /v1/chat/completions OpenAI rejects function tools whenever reasoning
        is active, and every Orchestra agent binds tools. Losing this flag brings
        back a 500 on every chat with the default model.
        """
        assert reasoning_kwargs("openai:gpt-5.6-luna")["use_responses_api"] is True
        assert reasoning_kwargs("openai:o3")["use_responses_api"] is True

    def test_openai_reasoning_model_still_uses_responses_api_offline(self, no_catalog):
        assert reasoning_kwargs("openai:gpt-5.6-luna") == {"use_responses_api": True}

    def test_default_gpt_6_uses_responses_api_offline_without_explicit_effort(self, no_catalog):
        assert reasoning_kwargs("openai:gpt-6-luna", None) == {"use_responses_api": True}

    def test_effort_is_applied(self, catalog):
        assert reasoning_kwargs("openai:gpt-5.6-luna", "high") == {
            "use_responses_api": True,
            "reasoning_effort": "high",
        }

    def test_effort_without_transport_change_for_xai(self, catalog):
        """xAI takes an effort but is not subject to the OpenAI transport bug."""
        assert reasoning_kwargs("xai:grok-4.5", "high") == {"reasoning_effort": "high"}

    def test_non_reasoning_openai_model_is_untouched(self, catalog):
        assert reasoning_kwargs("openai:gpt-4.1-mini", "low") == {}

    def test_bedrock_never_receives_kwargs(self, catalog):
        """ChatBedrockConverse forbids extras -- any kwarg here is a hard failure."""
        assert reasoning_kwargs("bedrock_converse:us.openai.gpt-5.6-luna", "high") == {}

    def test_anthropic_never_receives_an_effort(self, catalog):
        assert reasoning_kwargs("anthropic:claude-sonnet-4-5", "high") == {}

    def test_unparseable_model(self, catalog):
        assert reasoning_kwargs(None, "high") == {}
        assert reasoning_kwargs("garbage", "high") == {}
