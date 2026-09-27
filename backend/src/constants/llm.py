import os
from enum import Enum
from src.constants import (
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    OLLAMA_BASE_URL,
    GROQ_API_KEY,
    GOOGLE_API_KEY,
    XAI_API_KEY,
    AWS_BEARER_TOKEN_BEDROCK,
)
from src.utils.logger import logger


class ChatModels(str, Enum):
    if OPENAI_API_KEY:
        OPENAI_REASONING_03 = "openai:o3"
        OPENAI_REASONING_04_MINI = "openai:o4-mini"
        OPENAI_GPT_4_1_NANO = "openai:gpt-4.1-nano"
        OPENAI_GPT_4_1_MINI = "openai:gpt-4.1-mini"
        OPENAI_GPT_5_NANO = "openai:gpt-5-nano"
        OPENAI_GPT_5_MINI = "openai:gpt-5-mini"
        OPENAI_GPT_5 = "openai:gpt-5"
        OPENAI_GPT_5_1 = "openai:gpt-5.1"
        OPENAI_GPT_5_2 = "openai:gpt-5.2"
        OPENAI_GPT_5_2_CHAT_LATEST = "openai:gpt-5.2-chat-latest"
        OPENAI_GPT_5_2_PRO = "openai:gpt-5.2-pro"
        OPENAI_GPT_6_LUNA = "openai:gpt-6-luna"
        # OPENAI_GPT_5_CODEX = "openai:gpt-5-codex"
    if ANTHROPIC_API_KEY:
        ANTHROPIC_CLAUDE_3_7_SONNET = "anthropic:claude-3-7-sonnet-latest"
        ANTHROPIC_CLAUDE_4_SONNET = "anthropic:claude-sonnet-4"
        ANTHROPIC_CLAUDE_4_OPUS = "anthropic:claude-opus-4-1"
        ANTHROPIC_CLAUDE_4_5_HAIKU = "anthropic:claude-haiku-4-5"
        ANTHROPIC_CLAUDE_4_5_SONNET = "anthropic:claude-sonnet-4-5"
    if XAI_API_KEY:
        XAI_GROK_4_1_FAST = "xai:grok-4-1-fast"
        XAI_GROK_4_1_FAST_NON_REASONING = "xai:grok-4-1-fast-non-reasoning"
        XAI_GROK_4 = "xai:grok-4"
        XAI_GROK_4_FAST = "xai:grok-4-fast"
        XAI_GROK_4_FAST_NON_REASONING = "xai:grok-4-fast-non-reasoning"
        XAI_GROK_CODE_FAST_1 = "xai:grok-code-fast-1"
    if GOOGLE_API_KEY:
        GOOGLE_GEMINI_2_5_FLASH_LITE = "google_genai:gemini-2.5-flash-lite"
        GOOGLE_GEMINI_2_5_FLASH = "google_genai:gemini-2.5-flash"
        GOOGLE_GEMINI_2_5_PRO = "google_genai:gemini-2.5-pro"
        GOOGLE_GEMINI_FLASH_LITE_LATEST = "google_genai:gemini-flash-lite-latest"
        GOOGLE_GEMINI_3_FLASH_PREVIEW = "google_genai:gemini-3-flash-preview"
    if GROQ_API_KEY:
        GROQ_OPENAI_GPT_OSS_120B = "groq:openai/gpt-oss-120b"
        GROQ_LLAMA_3_3_70B_VERSATILE = "groq:llama-3.3-70b-versatile"
    if AWS_BEARER_TOKEN_BEDROCK:
        # Claude 4.5 models via Bedrock - require inference profiles (us. prefix for US region)
        # See: https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
        BEDROCK_CLAUDE_4_5_SONNET = "bedrock_converse:us.anthropic.claude-sonnet-4-5-20250929-v1:0"
        BEDROCK_CLAUDE_4_5_HAIKU = "bedrock_converse:us.anthropic.claude-haiku-4-5-20251001-v1:0"
        BEDROCK_CLAUDE_4_5_OPUS = "bedrock_converse:us.anthropic.claude-opus-4-5-20251101-v1:0"
        # Moonshot Kimi K2 (deep reasoning with tool use)
        BEDROCK_KIMI_K2_THINKING = "bedrock_converse:us.moonshot.kimi-k2-thinking"
        # Claude 3.5 models via Bedrock (legacy - direct model IDs still work)
        BEDROCK_CLAUDE_3_5_SONNET = "bedrock_converse:us.anthropic.claude-3-5-sonnet-20241022-v2:0"
        BEDROCK_CLAUDE_3_5_HAIKU = "bedrock_converse:us.anthropic.claude-3-5-haiku-20241022-v1:0"
        # Amazon Titan
        BEDROCK_TITAN_TEXT_PREMIER = "bedrock_converse:amazon.titan-text-premier-v1:0"
        # Meta Llama
        BEDROCK_LLAMA_3_2_90B = "bedrock_converse:us.meta.llama3-2-90b-instruct-v1:0"
        # Mistral
        BEDROCK_MISTRAL_LARGE = "bedrock_converse:us.mistral.mistral-large-2407-v1:0"


def get_ollama_models():
    models = []
    try:
        import requests

        response = requests.get(f"{OLLAMA_BASE_URL.rstrip('/')}/api/tags", timeout=3)
        if response.ok:
            data = response.json()
            tags = data.get("models", []) if isinstance(data, dict) else []
            for tag in tags:
                model_name = tag.get("name")
                if model_name:
                    models.append(f"ollama:{model_name}")
    except Exception as e:
        logger.error(f"Error getting Ollama models: {e}")
        pass
    return models


def get_all_models():
    from src.services.llm import llm_service  # Lazy import to avoid circular dependency

    models = []
    if OPENAI_API_KEY:
        models.extend(llm_service.model_by_provider(provider="openai"))
    if ANTHROPIC_API_KEY:
        models.extend(llm_service.model_by_provider(provider="anthropic"))
    if GOOGLE_API_KEY:
        models.extend(llm_service.model_by_provider(provider="google"))
    if GROQ_API_KEY:
        models.extend(llm_service.model_by_provider(provider="groq"))
    if XAI_API_KEY:
        models.extend(llm_service.model_by_provider(provider="xai"))
    if AWS_BEARER_TOKEN_BEDROCK:
        models.extend(llm_service.model_by_provider(provider="amazon-bedrock"))
    if OLLAMA_BASE_URL:
        models.extend(get_ollama_models())
    return sorted(models)


def get_free_models():
    models = []
    if OPENAI_API_KEY:
        models.extend(
            [
                ChatModels.OPENAI_GPT_4_1_NANO.value,
                ChatModels.OPENAI_GPT_4_1_MINI.value,
                ChatModels.OPENAI_GPT_5_NANO.value,
                ChatModels.OPENAI_GPT_5_MINI.value,
            ]
        )
    if ANTHROPIC_API_KEY:
        models.append(ChatModels.ANTHROPIC_CLAUDE_4_5_HAIKU.value)
    if GOOGLE_API_KEY:
        models.append(ChatModels.GOOGLE_GEMINI_3_FLASH_PREVIEW.value)
    if GROQ_API_KEY:
        models.append(ChatModels.GROQ_OPENAI_GPT_OSS_120B.value)
    if XAI_API_KEY:
        models.append(ChatModels.XAI_GROK_4_1_FAST.value)
    if OLLAMA_BASE_URL:
        models.extend(get_ollama_models())
    return sorted(models)


def get_default_chat_model():
    """Get the default chat model based on available API keys."""
    if OPENAI_API_KEY:
        return ChatModels.OPENAI_GPT_6_LUNA.value
    if GOOGLE_API_KEY:
        return ChatModels.GOOGLE_GEMINI_3_FLASH_PREVIEW.value
    if XAI_API_KEY:
        return ChatModels.XAI_GROK_4_1_FAST.value
    if ANTHROPIC_API_KEY:
        return ChatModels.ANTHROPIC_CLAUDE_4_5_HAIKU.value
    if GROQ_API_KEY:
        return ChatModels.GROQ_LLAMA_3_3_70B_VERSATILE.value
    return None


def get_default_low_cost_model():
    """Get the default low-cost chat model based on available API keys."""
    if GOOGLE_API_KEY:
        return ChatModels.GOOGLE_GEMINI_3_FLASH_PREVIEW.value
    if OPENAI_API_KEY:
        return ChatModels.OPENAI_GPT_5_NANO.value
    if XAI_API_KEY:
        return ChatModels.XAI_GROK_4_1_FAST.value
    if ANTHROPIC_API_KEY:
        return ChatModels.ANTHROPIC_CLAUDE_4_5_HAIKU.value
    if GROQ_API_KEY:
        return ChatModels.GROQ_OPENAI_GPT_OSS_120B.value
    return None


DEFAULT_CHAT_MODEL = get_default_chat_model()
DEFAULT_CHAT_MODEL_BASIC = get_default_low_cost_model()
DEFAULT_CHAT_MODEL_ADVANCED = ChatModels.OPENAI_GPT_5_2.value if hasattr(ChatModels, "OPENAI_GPT_5_2") else None


def _safe_int_env(var_name: str, default: int) -> int:
    """
    Safely parse an environment variable as an integer.

    Args:
        var_name: The name of the environment variable.
        default: The default value to use if parsing fails.

    Returns:
        The parsed integer value, or the default if parsing fails.
    """
    raw_value = os.getenv(var_name)
    if raw_value is None:
        return default
    try:
        return int(raw_value)
    except ValueError:
        logger.warning(
            f"Invalid value for {var_name}: '{raw_value}' is not a valid integer. Using default value: {default}"
        )
        return default


# Anthropic prompt cache TTL (valid: "5m" or "1h")
ANTHROPIC_PROMPT_CACHE_TTL = os.getenv("ANTHROPIC_PROMPT_CACHE_TTL", "5m")

# Compaction middleware constants
DEFAULT_COMPACTION_TOKEN_THRESHOLD = _safe_int_env("COMPACTION_TOKEN_THRESHOLD", 170000)
DEFAULT_COMPACTION_RECENT_MESSAGES = _safe_int_env("COMPACTION_RECENT_MESSAGES", 6)
DEFAULT_COMPACTION_MODEL = DEFAULT_CHAT_MODEL_BASIC or DEFAULT_CHAT_MODEL
