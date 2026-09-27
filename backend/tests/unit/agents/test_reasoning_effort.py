"""Reasoning configuration must survive the trip into init_chat_model (issue #961)."""

from unittest.mock import MagicMock, patch

import pytest

from src.agents import init_graph
from src.schemas.entities import LLMRequest


def build_graph(model: str, **kwargs):
    """Run init_graph with the model factory stubbed; return its call kwargs."""
    with (
        patch("langchain.chat_models.init_chat_model", return_value=MagicMock()) as mock_init_chat_model,
        patch("src.agents.create_deep_agent", return_value=MagicMock()),
    ):
        init_graph(
            tools=[],
            subagents=[],
            model=model,
            system_prompt="You are a helpful assistant.",
            middleware=[],
            **kwargs,
        )
    return mock_init_chat_model.call_args.kwargs


class TestInitGraphReasoning:
    def test_openai_reasoning_model_gets_responses_api(self):
        """Without this the default model 500s on every chat -- see #961."""
        assert build_graph("openai:gpt-5.6-luna")["use_responses_api"] is True

    def test_new_default_keeps_automatic_effort_unset(self):
        kwargs = build_graph("openai:gpt-6-luna")
        assert kwargs["model"] == "openai:gpt-6-luna"
        assert "reasoning_effort" not in kwargs

    def test_effort_reaches_the_model(self):
        kwargs = build_graph("openai:gpt-5.6-luna", reasoning_effort="high")
        assert kwargs["reasoning_effort"] == "high"
        assert kwargs["use_responses_api"] is True

    def test_unsupported_effort_is_dropped_rather_than_passed_on(self):
        assert "reasoning_effort" not in build_graph("openai:gpt-5.6-luna", reasoning_effort="banana")

    def test_non_reasoning_model_call_is_unchanged(self):
        assert build_graph("openai:gpt-4.1-mini", api_key="sk-test") == {
            "model": "openai:gpt-4.1-mini",
            "api_key": "sk-test",
        }

    def test_bedrock_call_is_unchanged(self):
        """ChatBedrockConverse forbids extra kwargs -- adding one would raise."""
        model = "bedrock_converse:us.anthropic.claude-sonnet-4-5-20250929-v1:0"
        assert build_graph(model) == {"model": model}


class TestLLMRequestReasoningEffort:
    def test_supported_effort_is_accepted(self):
        request = LLMRequest(
            input={"messages": [{"role": "user", "content": "hi"}]},
            model="openai:gpt-5.6-luna",
            reasoning_effort="high",
        )
        assert request.reasoning_effort == "high"

    def test_unsupported_effort_is_rejected_with_the_supported_set(self):
        with pytest.raises(ValueError) as exc:
            LLMRequest(
                input={"messages": [{"role": "user", "content": "hi"}]},
                model="openai:gpt-5.6-luna",
                reasoning_effort="banana",
            )
        assert "does not support reasoning_effort" in str(exc.value)
        assert "high" in str(exc.value)

    def test_effort_on_a_model_without_one_is_rejected(self):
        with pytest.raises(ValueError):
            LLMRequest(
                input={"messages": [{"role": "user", "content": "hi"}]},
                model="openai:gpt-4.1-mini",
                reasoning_effort="low",
            )

    def test_effort_without_a_model_is_deferred_not_rejected(self):
        """The model is resolved from user settings later, so validate later too."""
        request = LLMRequest(
            input={"messages": [{"role": "user", "content": "hi"}]},
            reasoning_effort="high",
        )
        assert request.reasoning_effort == "high"

    def test_defaults_to_none(self):
        request = LLMRequest(input={"messages": [{"role": "user", "content": "hi"}]})
        assert request.reasoning_effort is None
