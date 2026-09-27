export enum ModelName {
	OPENAI_GPT_5 = "openai:gpt-5",
	OPENAI_GPT_5_MINI = "openai:gpt-5-mini",
	OPENAI_GPT_5_NANO = "openai:gpt-5-nano",
	OPENAI_GPT_6_LUNA = "openai:gpt-6-luna",
	OPENAI_EMBEDDING_LARGE = "openai:text-embedding-3-large",
	ANTHROPIC_CLAUDE_3_7_SONNET_LATEST = "anthropic:claude-3-7-sonnet-latest",
	ANTHROPIC_CLAUDE_4_SONNET = "anthropic:claude-sonnet-4-20250514",
	ANTHROPIC_CLAUDE_4_OPUS = "anthropic:claude-opus-4-20250514",
	GEMINI_PRO_2_5 = "google_genai:gemini-2.5-pro",
	GEMINI_PRO_2_5_FLASH = "google_genai:gemini-2.5-flash",
	GEMINI_PRO_2_5_FLASH_LITE = "google_genai:gemini-2.5-flash-lite",
}

export const DEFAULT_CHAT_MODEL = ModelName.OPENAI_GPT_6_LUNA;
export const DEFAULT_OPTIMIZE_MODEL = ModelName.OPENAI_GPT_5_NANO;

// Helper to check if a model is valid
export function isValidModelName(model: string | null): boolean {
	return !!model && Object.values(ModelName).includes(model as ModelName);
}

class LLLMConfig {
	static DEFAULT_CHAT_MODEL = DEFAULT_CHAT_MODEL;
	static DEFAULT_OPTIMIZE_MODEL = DEFAULT_OPTIMIZE_MODEL;
	static MODELS = ModelName;
}

export default LLLMConfig;
