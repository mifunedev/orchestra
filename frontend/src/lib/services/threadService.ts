import apiClient from "@/lib/utils/apiClient";
import {
	SemanticThread,
	ThreadPayload,
	ThreadSearchRequest,
} from "@/lib/entities";
import { DEFAULT_OPTIMIZE_MODEL } from "@/lib/config/llm";
import { VITE_API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/utils/auth";
import { SSE, SSEOptions } from "sse.js";
import { Agent } from "./agentService";
import {
	StreamSource,
	SyncStreamSource,
	DistributedStreamSource,
	type DistributedStreamOptions,
} from "@/lib/utils/streamSource";
import { isDistributedResponse } from "@/lib/entities/stream";

export type ThreadOwner = "aegra" | "legacy";

type AegraThread = {
	thread_id: string;
	updated_at?: string;
	metadata?: Record<string, any>;
};

export async function searchAegraThreads(
	limit = 100,
	offset = 0,
): Promise<AegraThread[]> {
	const response = await fetch("/api/v1/threads/search", {
		method: "POST",
		headers: aegraHeaders(),
		body: JSON.stringify({ limit, offset }),
	});
	if (!response.ok) throw new Error(`Aegra search failed (${response.status})`);
	const threads = await response.json();
	if (!Array.isArray(threads)) throw new Error("Invalid Aegra search response");
	return threads;
}

export async function getAegraState(threadId: string): Promise<any> {
	const response = await fetch(
		`/api/v1/threads/${encodeURIComponent(threadId)}/state`,
		{
			headers: aegraHeaders(),
		},
	);
	if (!response.ok) throw new Error(`Aegra state failed (${response.status})`);
	return response.json();
}

export async function resolveThreadOwner(
	threadId: string,
): Promise<ThreadOwner> {
	const limit = 100;
	for (let offset = 0; ; offset += limit) {
		const page = await searchAegraThreads(limit, offset);
		if (page.some((thread) => thread.thread_id === threadId)) return "aegra";
		if (page.length < limit) break;
	}
	let response;
	try {
		response = await apiClient.get(`/threads/${encodeURIComponent(threadId)}`);
	} catch (error: any) {
		if (error.response?.status === 404)
			throw new Error("Thread ownership could not be verified");
		throw error;
	}
	if (response.status !== 200 || response.data?.thread?.id !== threadId)
		throw new Error("Thread ownership could not be verified");
	return "legacy";
}

export async function createAegraThread(signal: AbortSignal): Promise<string> {
	const response = await fetch("/api/v1/threads", {
		method: "POST",
		headers: aegraHeaders(),
		body: "{}",
		signal,
	});
	if (!response.ok)
		throw new Error(`Aegra thread creation failed (${response.status})`);
	const thread = await response.json();
	if (typeof thread.thread_id !== "string" || !thread.thread_id)
		throw new Error("Missing Aegra thread id");
	return thread.thread_id;
}

function aegraHeaders() {
	const token = getAuthToken();
	if (!token) throw new Error("Authentication required");
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
		Accept: "text/event-stream",
	};
}

export async function streamAegraThread(
	threadId: string,
	content: string,
	model: string,
	tools: string[],
	signal: AbortSignal,
) {
	return fetch(`/api/v1/threads/${encodeURIComponent(threadId)}/runs/stream`, {
		method: "POST",
		headers: aegraHeaders(),
		signal,
		body: JSON.stringify({
			assistant_id: "orchestra",
			input: { messages: [{ role: "user", content }] },
			config: { configurable: { model, tools } },
			stream_mode: ["messages", "updates", "values"],
		}),
	});
}

const SYSTEM_PROMPT = `GOAL:
Generate a system prompt for an AI Agent.

RETURN FORMAT:
Do no return anything except the final system.

WARNING:
Attention to formatting. Not adhering to return format will result in failure.

CONTEXT:
You are an expert prompt engineer who uses optimizes system prompts for AI agents. Your agents need to know they're EXPERTS!`;

const getSystemPrompt = (previousSystemPrompt?: string) => {
	if (previousSystemPrompt) {
		return SYSTEM_PROMPT + `\n\nPROMPT TO ALTER:\n${previousSystemPrompt}`;
	}

	return SYSTEM_PROMPT;
};

export const findThread = async (threadId: string) => {
	try {
		const response = await apiClient.get(`/llm/thread/${threadId}`);
		return response;
	} catch (error: any) {
		console.error("Error finding thread:", error);
		throw new Error(error.response?.data?.detail || "Failed to find thread");
	}
};

export const getThread = async (threadId: string) => {
	const headers: Record<string, string> = {};
	const token = getAuthToken();
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await apiClient.get(`/threads/${threadId}`, { headers });

	return response.data.thread;
};

/**
 * Creates a new thread with the provided payload
 * @param payload - Thread configuration containing system prompt and other settings
 * @returns The created thread data
 */
export const createJsonThread = async (payload: ThreadPayload) => {
	try {
		const response = await apiClient.post("/llm/thread", payload, {
			headers: {
				Accept: "application/json",
			},
		});
		return response.data;
	} catch (error: any) {
		console.error("Error creating thread:", error);
		throw new Error(error.response?.data?.detail || "Failed to create thread");
	}
};

export const optimizeSystemPrompt = async (payload: ThreadPayload) => {
	payload.system = SYSTEM_PROMPT;
	payload.model = DEFAULT_OPTIMIZE_MODEL;
	try {
		const response = await apiClient.post("/llm/chat", payload);
		return response.data.answer.content;
	} catch (error: any) {
		console.error("Error optimizing system prompt:", error);
		throw new Error(
			error.response?.data?.detail || "Failed to optimize system prompt",
		);
	}
};

export const alterSystemPrompt = async (payload: ThreadPayload) => {
	payload.system = getSystemPrompt(payload.system);
	payload.model = DEFAULT_OPTIMIZE_MODEL;
	try {
		const response = await apiClient.post("/llm/chat", payload);
		return response.data.answer.content;
	} catch (error: any) {
		console.error("Error altering system prompt:", error);
		throw new Error(
			error.response?.data?.detail || "Failed to alter system prompt",
		);
	}
};

type MessageContent = string | Array<{ type: string; [key: string]: any }>;
type Messages = { role: string; content: MessageContent; [key: string]: any }[];
type Input = { messages: Messages };
// type Metadata = { thread_id?: string; checkpoint_id?: string; [key: string]: any };
type A2A = { [key: string]: any };
type MCP = { [key: string]: any };
type Tools = string[];
type Subagents = Agent[];
type Files = Record<
	string,
	{ content: string[]; created_at: string; modified_at: string }
>;
interface StreamThreadPayload {
	system_prompt?: string;
	input: Input & { files?: Files };
	model: string;
	metadata: any;
	a2a?: A2A;
	mcp?: MCP;
	tools?: Tools;
	subagents?: Subagents;
}

export const streamThread = (payload: StreamThreadPayload): SSE => {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "text/event-stream",
		};
		const token = getAuthToken();
		if (token) headers.Authorization = `Bearer ${token}`;

		if (payload.system_prompt?.trim() === "") {
			delete payload.system_prompt;
		}
		const newConfig: SSEOptions = {
			headers: headers,
			payload: JSON.stringify(payload),
			method: "POST",
			start: false,
		};
		const source = new SSE(`${VITE_API_URL}/llm/stream`, newConfig);
		return source;
	} catch (error: unknown) {
		console.error("Error streaming thread:", error);
		throw error;
	}
};

/**
 * Initiates a stream request. Handles both sync and distributed modes.
 * Returns a unified StreamSource interface.
 *
 * @param payload - Stream request payload
 * @returns StreamSource that can be used to read events
 * @throws Error on network/auth failures
 */
export async function initiateStream(
	payload: StreamThreadPayload,
): Promise<StreamSource> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "text/event-stream",
	};

	const token = getAuthToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	// Clean up empty system prompt
	if (payload.system_prompt?.trim() === "") {
		delete payload.system_prompt;
	}

	const response = await fetch(`${VITE_API_URL}/llm/stream`, {
		method: "POST",
		headers,
		body: JSON.stringify(payload),
	});

	// Distributed mode: 202 Accepted
	if (response.status === 202) {
		const data = await response.json();

		if (!isDistributedResponse(data)) {
			throw new Error("Invalid distributed response format");
		}

		// Detect if this is a first turn (no existing thread_id) or follow-up
		// For first turn, we can skip the initial delay since there's no stale stream
		// For follow-up, we need the delay to avoid race condition with worker startup
		const isFirstTurn = !payload.metadata?.thread_id;
		const options: DistributedStreamOptions = {
			skipInitialDelay: isFirstTurn,
		};

		return new DistributedStreamSource(data.thread_id, data.run_id, options);
	}

	// Sync mode: 200 OK
	if (response.status === 200) {
		return new SyncStreamSource(response);
	}

	// Error responses
	if (response.status === 401) {
		throw new Error("Authentication required");
	}

	if (response.status === 429) {
		throw new Error("Rate limit exceeded");
	}

	throw new Error(`Unexpected response: ${response.status}`);
}

export const searchThreads = async (
	action: "list_threads" | "list_checkpoints" | "get_checkpoint",
	filter: { thread_id?: string; checkpoint_id?: string } = {},
	limit: number = 20,
	offset: number = 0,
) => {
	let payload;
	if (action === "list_threads") {
		payload = {
			limit: limit,
			offset: offset,
			filter: filter,
		};
	} else if (action === "list_checkpoints") {
		payload = {
			limit: limit,
			offset: offset,
			filter: { thread_id: filter.thread_id },
		};
	} else if (action === "get_checkpoint") {
		payload = {
			limit: limit,
			offset: offset,
			filter: {
				thread_id: filter.thread_id,
				checkpoint_id: filter.checkpoint_id,
			},
		};
	}
	const response = await apiClient.post(`/threads/search`, payload, {
		headers: {
			"Content-Type": "application/json",
		},
	});
	const data = await response.data;

	if (action === "list_threads") {
		return data.threads;
	} else if (action === "list_checkpoints") {
		return data.checkpoints;
	} else if (action === "get_checkpoint") {
		return data.checkpoint;
	}
};

export const deleteThread = async (threadId: string, assistantId?: string) => {
	try {
		if ((await resolveThreadOwner(threadId)) !== "legacy")
			throw new Error("Native thread deletion is unavailable");
		let url = `/threads/${threadId}`;
		if (assistantId) {
			url = `/a/${assistantId}/threads/${threadId}`;
		}
		const response = await apiClient.delete(url, {
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${getAuthToken()}`,
			},
		});
		return response;
	} catch (error: any) {
		console.error("Error deleting thread:", error);
		throw new Error(error.response?.data?.detail || "Failed to delete thread");
	}
};

export const searchThreadsByProject = async (
	projectId: string,
	limit: number = 20,
	offset: number = 0,
) => {
	try {
		const payload = {
			limit: limit,
			offset: offset,
			filter: { project_id: projectId },
		};
		const response = await apiClient.post(`/threads/search`, payload, {
			headers: {
				"Content-Type": "application/json",
			},
		});
		return response.data.threads || [];
	} catch (error: any) {
		console.error("Error searching threads by project:", error);
		throw new Error(
			error.response?.data?.detail || "Failed to search threads by project",
		);
	}
};

export const updateThreadProject = async (
	threadId: string,
	projectId: string | null,
) => {
	try {
		if ((await resolveThreadOwner(threadId)) !== "legacy")
			throw new Error("Native projects are unavailable");
		const response = await apiClient.patch(
			`/threads/${threadId}`,
			{ project_id: projectId },
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getAuthToken()}`,
				},
			},
		);
		return response.data;
	} catch (error: any) {
		console.error("Error updating thread project:", error);
		throw new Error(
			error.response?.data?.detail || "Failed to update thread project",
		);
	}
};

export const searchThreadsSemantic = async (
	request: ThreadSearchRequest,
): Promise<{ threads: SemanticThread[] }> => {
	try {
		const response = await apiClient.post(`/threads/search`, request, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${getAuthToken()}`,
			},
		});
		return response.data;
	} catch (error: any) {
		console.error("Error searching threads semantically:", error);
		throw new Error(error.response?.data?.detail || "Failed to search threads");
	}
};

/**
 * Sends an abort signal to a running distributed worker task.
 * The worker will gracefully terminate at the next iteration checkpoint.
 *
 * @param threadId - The thread ID of the running task
 * @returns Promise resolving to abort response with status and message
 * @throws Error on auth failure (401), not found (404), or forbidden (403)
 */
export const abortThread = async (
	threadId: string,
): Promise<{ status: string; thread_id: string; message: string }> => {
	try {
		const response = await apiClient.post(
			`/threads/${threadId}/abort`,
			{},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getAuthToken()}`,
				},
			},
		);
		return response.data;
	} catch (error: any) {
		console.error("Error aborting thread:", error);
		if (error.response?.status === 403) {
			throw new Error("Not authorized to abort this thread");
		}
		if (error.response?.status === 404) {
			throw new Error("Thread not found");
		}
		throw new Error(error.response?.data?.detail || "Failed to abort thread");
	}
};
