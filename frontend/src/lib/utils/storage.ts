import { DEFAULT_SYSTEM_PROMPT } from "../config/instruction";

export const MEMORY_KEY = "orchestra:chat:payload:memory";
export function getMemory(): boolean {
	if (typeof window === "undefined") return false;
	const memory = window.localStorage.getItem(MEMORY_KEY) ?? null;
	if (memory) {
		return JSON.parse(memory);
	}
	return false;
}

export function toggleMemory() {
	if (typeof window === "undefined") return;
	const memory = getMemory();
	window.localStorage.setItem(MEMORY_KEY, JSON.stringify(!memory));
}

//------------------------------------------------------------------------
export const SYSTEM_PROMPT_KEY = "orchestra:chat:payload:system";
export function getSystemPrompt(): string {
	if (typeof window === "undefined") return DEFAULT_SYSTEM_PROMPT;
	const model = window.localStorage.getItem(SYSTEM_PROMPT_KEY) ?? null;
	if (model) return model;
	return DEFAULT_SYSTEM_PROMPT;
}

export function setSystemPrompt(system: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(SYSTEM_PROMPT_KEY, system);
}
