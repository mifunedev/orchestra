"""Reasoning-effort policy for chat models.

Two separate concerns live here.

**Transport.** OpenAI's newest reasoning models reject function tools on
``/v1/chat/completions`` while reasoning is active::

    Function tools with reasoning_effort are not supported for gpt-5.6-luna in
    /v1/chat/completions. To use function tools, use /v1/responses or set
    reasoning_effort to 'none'.

Every Orchestra agent binds function tools (deepagents ships todo/filesystem
tools), so an OpenAI reasoning model is only usable on ``/v1/responses``. The
alternative -- forcing ``reasoning_effort="none"`` -- would silently disable
reasoning on the very models that were picked for it. ``reasoning_kwargs()``
therefore routes OpenAI reasoning models through the Responses API.

**Effort.** Which effort values a model accepts differs per model (``o3`` takes
low/medium/high, ``gpt-5`` adds ``minimal``, ``gpt-5.6-luna`` adds ``xhigh`` and
``max``, ``gpt-5.2-chat-latest`` takes only ``medium``). Rather than hard-code
that matrix, the values are read from the models.dev catalogue that already
backs ``GET /api/llm/models``.

Only providers whose LangChain chat class accepts a ``reasoning_effort`` kwarg
are offered an effort: Anthropic and Gemini expose token *budgets* instead
(``thinking`` / ``thinking_budget``) and ``ChatBedrockConverse`` forbids extra
kwargs outright, so passing one there would either be silently dropped or raise.
"""

from typing import Any

from src.utils.logger import logger

# LangChain provider prefix (as emitted by LLMService.model_by_provider) mapped
# to the key models.dev uses for the same provider.
_CATALOG_PROVIDER: dict[str, str] = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google_genai": "google",
    "xai": "xai",
    "groq": "groq",
    "bedrock_converse": "amazon-bedrock",
}

# Providers whose LangChain chat class accepts a ``reasoning_effort`` kwarg.
EFFORT_PROVIDERS: frozenset[str] = frozenset({"openai", "xai", "groq"})

# Offline fallback: OpenAI reasoning families, used only when the models.dev
# catalogue is unreachable. Getting this wrong costs a 400 on the first chat, so
# it deliberately errs toward "is a reasoning model".
_OPENAI_REASONING_PREFIXES: tuple[str, ...] = ("o1", "o3", "o4", "gpt-5", "gpt-6")


def split_model(model: str | None) -> tuple[str, str]:
    """Split a ``provider:model-id`` string into its two halves.

    Returns ``("", "")`` for anything unparseable so callers can treat an
    unknown model as "no reasoning support" without guarding for None.
    """
    if not model or not isinstance(model, str) or ":" not in model:
        return "", ""
    provider, _, model_id = model.partition(":")
    return provider, model_id


def _catalog_entry(model: str | None) -> dict[str, Any]:
    """Look up a model's models.dev entry. Returns ``{}`` when unavailable."""
    provider, model_id = split_model(model)
    catalog_key = _CATALOG_PROVIDER.get(provider)
    if not catalog_key or not model_id:
        return {}

    try:
        # Lazy import: src.services.llm imports from src.utils at module scope.
        from src.services.llm import llm_service

        catalog = llm_service._fetch_models() or {}
    except Exception as exc:  # pragma: no cover - defensive, network is cached
        logger.warning(f"Reasoning catalogue unavailable for {model}: {exc}")
        return {}

    models = (catalog.get(catalog_key) or {}).get("models") or {}
    entry = models.get(model_id)
    return entry if isinstance(entry, dict) else {}


def is_reasoning_model(model: str | None) -> bool:
    """Whether *model* performs internal reasoning.

    Trusts the models.dev ``reasoning`` flag when the catalogue is reachable and
    falls back to OpenAI's family prefixes when it is not.
    """
    provider, model_id = split_model(model)
    if not provider:
        return False

    entry = _catalog_entry(model)
    if entry:
        return bool(entry.get("reasoning"))

    if provider == "openai":
        return model_id.startswith(_OPENAI_REASONING_PREFIXES)
    return False


def get_reasoning_options(model: str | None) -> list[str]:
    """Effort values Orchestra can actually apply to *model*.

    Empty for providers Orchestra cannot pass an effort to, so that the value
    doubles as "should the UI offer an effort picker for this model".
    """
    provider, _ = split_model(model)
    if provider not in EFFORT_PROVIDERS:
        return []

    for option in _catalog_entry(model).get("reasoning_options") or []:
        if isinstance(option, dict) and option.get("type") == "effort":
            values = option.get("values")
            if isinstance(values, list):
                return [str(value) for value in values]
    return []


def resolve_reasoning_effort(model: str | None, effort: str | None) -> str | None:
    """Return *effort* if *model* accepts it, otherwise ``None``.

    Dropping an unsupported effort rather than raising keeps a stale user
    default (say ``xhigh`` carried over to a model that stops at ``high``) from
    turning every subsequent chat into a 400. The API layer validates explicit
    per-request values up front so callers still get told when they are wrong.
    """
    if not effort:
        return None

    options = get_reasoning_options(model)
    if effort in options:
        return effort

    logger.info(f"Dropping unsupported reasoning_effort '{effort}' for model '{model}' (supported: {options})")
    return None


def reasoning_kwargs(model: str | None, effort: str | None = None) -> dict[str, Any]:
    """Build the ``init_chat_model`` kwargs that configure reasoning.

    Args:
        model: Fully qualified ``provider:model-id`` string.
        effort: Requested reasoning effort, or None to leave it to the provider.

    Returns:
        Kwargs to merge into the ``init_chat_model`` call. Empty for models that
        do not reason or providers Orchestra cannot configure.
    """
    provider, _ = split_model(model)
    if not provider:
        return {}

    kwargs: dict[str, Any] = {}

    # OpenAI reasoning models only accept function tools on the Responses API.
    if provider == "openai" and is_reasoning_model(model):
        kwargs["use_responses_api"] = True

    resolved = resolve_reasoning_effort(model, effort)
    if resolved:
        kwargs["reasoning_effort"] = resolved

    return kwargs
