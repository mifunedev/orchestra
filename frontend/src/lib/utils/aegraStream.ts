export type AegraState = { messages: any[]; runId?: string; done: boolean };

function normalizeMessage(message: any) {
	const type = message.type ?? message.role;
	const types: Record<string, string> = {
		AIMessageChunk: "ai",
		AIMessage: "ai",
		ToolMessageChunk: "tool",
		ToolMessage: "tool",
		HumanMessage: "human",
	};
	return { ...message, type: types[type] ?? type };
}

export async function consumeAegraStream(
	response: Response,
	onState: (state: AegraState) => void,
	signal?: AbortSignal,
): Promise<void> {
	if (!response.ok)
		throw new Error(`Aegra request failed (${response.status})`);
	if (!response.body) throw new Error("Aegra stream has no body");
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let state: AegraState = { messages: [], done: false };
	let finalValues = false;
	const upsert = (message: any, chunk: boolean) => {
		const normalized = normalizeMessage(message);
		const index = state.messages.findIndex((m) => m.id === message.id);
		const previous = index >= 0 ? state.messages[index] : undefined;
		if (chunk && previous) {
			normalized.content =
				typeof previous.content === "string" &&
				typeof message.content === "string"
					? previous.content + message.content
					: [
							...(Array.isArray(previous.content) ? previous.content : []),
							...(Array.isArray(message.content) ? message.content : []),
						];
		}
		if (chunk && message.tool_call_chunks?.length) {
			const calls = [...(previous?.tool_calls ?? [])];
			for (const part of message.tool_call_chunks) {
				const i = part.index ?? 0;
				const old = calls[i] ?? {};
				calls[i] = {
					id: part.id || old.id,
					name: part.name || old.name,
					args: (old.args ?? "") + (part.args ?? ""),
				};
			}
			normalized.tool_calls = calls;
		}
		state.messages =
			index < 0
				? [...state.messages, normalized]
				: state.messages.map((m, i) => (i === index ? normalized : m));
	};
	const dispatch = (frame: string) => {
		const lines = frame.split("\n");
		const event = lines
			.find((line) => line.startsWith("event:"))
			?.slice(6)
			.trim();
		const data = lines
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice(5).trimStart())
			.join("\n");
		if (!data && event !== "end") return;
		if (event === "end" || event === "done" || data === "[DONE]") {
			state = { ...state, done: true };
		} else {
			const value = JSON.parse(data);
			if (event === "error")
				throw new Error(value.message ?? value.error ?? "Aegra run failed");
			if (event === "metadata") state = { ...state, runId: value.run_id };
			if (event === "messages" || event === "messages/partial") {
				finalValues = false;
				const message = Array.isArray(value) ? value[0] : value;
				if (message) upsert(message, event === "messages");
			}
			if (event === "updates") {
				finalValues = false;
				for (const update of Object.values(value ?? {}) as any[]) {
					const messages = update?.messages;
					if (Array.isArray(messages)) {
						for (const message of messages) upsert(message, false);
					} else if (Array.isArray(messages?.value)) {
						state = {
							...state,
							messages: messages.value.map(normalizeMessage),
						};
					}
				}
			}
			if (event === "values" && Array.isArray(value.messages)) {
				state = { ...state, messages: value.messages.map(normalizeMessage) };
				finalValues = true;
			}
		}
		onState({ ...state });
	};
	const cancel = () => {
		void reader.cancel();
	};
	signal?.addEventListener("abort", cancel);
	try {
		while (!state.done) {
			if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
			const { value, done } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			buffer = buffer.replace(/\r\n/g, "\n");
			let boundary: number;
			while ((boundary = buffer.indexOf("\n\n")) >= 0) {
				dispatch(buffer.slice(0, boundary));
				buffer = buffer.slice(boundary + 2);
			}
			if (done) {
				if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
				if (!state.done && !finalValues)
					throw new Error("Aegra stream ended before completion");
				state = { ...state, done: true };
				onState(state);
			}
		}
	} finally {
		signal?.removeEventListener("abort", cancel);
		await reader.cancel();
		reader.releaseLock();
	}
}
