import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { streamThread } from "@/lib/services";
import apiClient from "@/lib/utils/apiClient";
import { resolveThreadOwner } from "@/lib/services/threadService";

vi.mock("@/lib/services/userSettingsService", () => ({
	getSettings: async () => ({ defaults: {} }),
}));
import useChat, { STREAM_RECOVERY_TOAST_ID } from "./useChat";

const mockSetLoading = vi.fn();
const mockSetLoadingMessage = vi.fn();
const mockInitiateStream = vi.fn();
const mockFormatMultimodalPayload = vi.fn();

class MockStreamSource {
	onEvent(_handler: unknown) {}
	onError(_handler: unknown) {}
	onClose(_handler: unknown) {}
	close() {}
	async start() {}
}

vi.mock("@/context/AppContext", () => ({
	useAppContext: () => ({
		setLoading: mockSetLoading,
		setLoadingMessage: mockSetLoadingMessage,
	}),
}));

const mockAgent = {
	id: "agent-1",
	model: "openai:gpt-4.1-mini",
	public: false,
	prompt: "",
	tools: [],
	a2a: {},
	mcp: {},
	subagents: [],
};
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({ agent: mockAgent }),
}));

vi.mock("@/lib/utils/format", () => ({
	formatContent: (content: unknown) => {
		if (typeof content === "string") return content;
		if (!content) return "";
		if (Array.isArray(content)) {
			return content
				.filter(
					(b: any) =>
						(b?.type === "text" || b?.type == null) &&
						typeof b?.text === "string",
				)
				.map((b: any) => b.text)
				.join("");
		}
		return "";
	},
	formatMessages: (messages: unknown[]) => messages,
	formatMultimodalPayload: (...args: unknown[]) =>
		mockFormatMultimodalPayload(...args),
}));

vi.mock("@/lib/services", () => ({
	initiateStream: (...args: unknown[]) => mockInitiateStream(...args),
	streamThread: vi.fn(),
}));

vi.mock("@/lib/utils/auth", () => ({
	getAuthToken: () => "token",
}));

vi.mock("@/lib/utils/message", () => ({
	StreamMessageHandler: class {
		toolNameRef = { current: "" };
		history: unknown[];

		constructor(
			_toolNameRef: unknown,
			_toolCallMapRef: unknown,
			history: unknown[],
		) {
			this.history = history;
		}

		processResponse() {}
	},
}));

// Controllable stand-in for the real DistributedStreamSource. Tests grab the
// constructed instance and drive its registered handlers directly.
const { MockDistributedStreamSource } = vi.hoisted(() => {
	class MockDistributedStreamSource {
		static instances: MockDistributedStreamSource[] = [];
		eventHandler: ((event: any) => void) | null = null;
		errorHandler: ((error: Error) => void) | null = null;
		closeHandler: (() => void) | null = null;
		closed = false;
		started = false;

		constructor(
			private threadId: string,
			private runId: string,
			_options?: unknown,
		) {
			MockDistributedStreamSource.instances.push(this);
		}

		getThreadId() {
			return this.threadId;
		}
		getRunId() {
			return this.runId;
		}
		getLastEventId() {
			return null;
		}
		onEvent(handler: (event: any) => void) {
			this.eventHandler = handler;
			return this;
		}
		onError(handler: (error: Error) => void) {
			this.errorHandler = handler;
			return this;
		}
		onClose(handler: () => void) {
			this.closeHandler = handler;
			return this;
		}
		close() {
			this.closed = true;
		}
		async start() {
			this.started = true;
		}
	}
	return { MockDistributedStreamSource };
});

vi.mock("@/lib/utils/streamSource", () => ({
	DistributedStreamSource: MockDistributedStreamSource,
}));

vi.mock("@/lib/utils/activeStreamRecovery", () => ({
	removeActiveStreamRecovery: vi.fn(),
	updateActiveStreamRecovery: vi.fn(),
	upsertActiveStreamRecovery: vi.fn(),
}));

vi.mock("sonner", () => {
	const toast: any = vi.fn();
	toast.success = vi.fn();
	toast.error = vi.fn();
	toast.warning = vi.fn();
	toast.info = vi.fn();
	return { toast };
});

describe("useChat Aegra routing", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		mockFormatMultimodalPayload.mockImplementation(
			async (content: string, images: File[]) => [
				{
					role: "user",
					content: images.length ? [content, images[0].name] : content,
				},
			],
		);
		mockInitiateStream.mockResolvedValue(new MockStreamSource());
		Object.assign(mockAgent, {
			public: false,
			prompt: "",
			tools: [],
			mcp: {},
			a2a: {},
			subagents: [],
		});
	});
	it("creates once with an authorized Orchestra tool and reuses native history on the second turn", async () => {
		Object.assign(mockAgent, { tools: ["get_weather"] });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "aegra-1" })),
			)
			.mockImplementation(
				async () =>
					new Response(
						'event: values\ndata: {"messages":[{"id":"a","type":"ai","content":"Sunny","tool_calls":[{"id":"c","name":"get_weather","args":{}}]},{"id":"t","type":"tool","tool_call_id":"c","content":"72"}]}\n\nevent: end\ndata: {}\n\n',
					),
			);
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => result.current.clearMessages());
		await act(async () => {
			await result.current.handleSubmit("hello");
		});
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads");
		expect(
			JSON.parse(fetchMock.mock.calls[1][1].body).config.configurable.tools,
		).toEqual(["get_weather"]);
		expect(result.current.metadata).toMatchObject({
			thread_id: "aegra-1",
			stream_owner: "aegra",
		});
		expect(result.current.messages.some((m) => m.content === "Sunny")).toBe(
			true,
		);
		expect(
			result.current.messages.some(
				(m) => m.tool_calls?.[0].name === "get_weather",
			),
		).toBe(true);
		expect(result.current.messages.some((m) => m.content === "72")).toBe(true);
		await act(async () => {
			await result.current.handleSubmit("again");
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[2][0]).toBe(
			"/api/v1/threads/aegra-1/runs/stream",
		);
		expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
			assistant_id: "orchestra",
			input: { messages: [{ role: "user", content: "again" }] },
			config: {
				configurable: { model: "openai:gpt-4.1-mini", tools: ["get_weather"] },
			},
		});
		expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(
			"Bearer token",
		);
		expect(mockInitiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
		expect(result.current.controller).toBeNull();
		act(() =>
			result.current.setMetadata({
				thread_id: "legacy-2",
				stream_owner: "legacy",
			}),
		);
		mockInitiateStream.mockResolvedValue(new MockStreamSource());
		await act(async () => {
			await result.current.handleSubmit("legacy turn");
		});
		expect(mockInitiateStream).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ thread_id: "legacy-2" }),
			}),
		);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		vi.unstubAllGlobals();
	});
	it("recovers v1 ownership after clearing browser storage before submitting", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify([{ thread_id: "remembered" }])),
			)
			.mockResolvedValueOnce(new Response("event: end\ndata: {}\n\n"));
		vi.stubGlobal("fetch", fetchMock);
		const legacySearch = vi
			.spyOn(apiClient, "post")
			.mockResolvedValue({ data: { threads: [] } });
		const { result } = renderHook(() => useChat());
		act(() => result.current.setMetadata({ thread_id: "remembered" }));
		localStorage.clear();
		await act(async () => {
			await result.current.handleSubmit("again");
		});
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads/search");
		expect(fetchMock.mock.calls[1][0]).toBe(
			"/api/v1/threads/remembered/runs/stream",
		);
		expect(mockInitiateStream).not.toHaveBeenCalled();
		expect(legacySearch).toHaveBeenCalledWith("/threads/search", {
			limit: 100,
			offset: 0,
			filter: {},
		});
		legacySearch.mockRestore();
		vi.unstubAllGlobals();
	});

	it("fails closed if server ownership cannot be resolved before a send", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		const { result } = renderHook(() => useChat());
		act(() => result.current.setMetadata({ thread_id: "unknown" }));
		await act(async () => {
			await result.current.handleSubmit("again");
		});
		expect(mockInitiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
		expect(result.current.runError?.message).toMatch(/offline|ownership/i);
		vi.unstubAllGlobals();
	});
	it.each([false, true])(
		"never falls back on failure (existing Aegra=%s)",
		async (existing) => {
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
			const { result } = renderHook(() => useChat());
			act(() => {
				result.current.clearMessages();
				if (existing)
					result.current.setMetadata({
						thread_id: "aegra-1",
						stream_owner: "aegra",
					});
			});
			await act(async () => {
				await result.current.handleSubmit("hello");
			});
			expect(result.current.runError).toMatchObject({
				message: "offline",
				recoverable: false,
			});
			expect(mockInitiateStream).not.toHaveBeenCalled();
			expect(streamThread).not.toHaveBeenCalled();
			vi.unstubAllGlobals();
		},
	);
	it.each([
		{
			name: "public assistant",
			config: { public: true },
			field: "model",
			value: "",
		},
		{
			name: "custom prompt",
			config: { prompt: "custom" },
			field: "system_prompt",
			value: "custom",
		},
		{
			name: "MCP",
			config: { mcp: { server: {} } },
			field: "mcp",
			value: { server: {} },
		},
		{
			name: "A2A",
			config: { a2a: { agent: {} } },
			field: "a2a",
			value: { agent: {} },
		},
		{
			name: "subagents",
			config: { subagents: [{ id: "sub" }] },
			field: "subagents",
			value: [{ id: "sub" }],
		},
	])(
		"selects v0 before creation for $name and retains its input",
		async ({ config, field, value }) => {
			Object.assign(mockAgent, config);
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);
			const { result } = renderHook(() => useChat());
			act(() => result.current.clearMessages());
			await act(async () => result.current.handleSubmit("hello"));
			expect(fetchMock).not.toHaveBeenCalled();
			expect(mockInitiateStream).toHaveBeenCalledWith(
				expect.objectContaining({
					[field]: value,
					input: { messages: [{ role: "user", content: "hello" }] },
				}),
			);
			expect(result.current.runError).toBeNull();
			vi.unstubAllGlobals();
		},
	);

	it("routes checkpoint overrides to v0 before creation", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => result.current.setMetadata({ checkpoint_id: "checkpoint-1" }));
		await act(async () => result.current.handleSubmit("hello"));
		expect(fetchMock).not.toHaveBeenCalled();
		expect(mockInitiateStream).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ checkpoint_id: "checkpoint-1" }),
			}),
		);
		vi.unstubAllGlobals();
	});

	it("keeps a v0 thread on v0 after the first response assigns its id", async () => {
		Object.assign(mockAgent, { mcp: { server: {} } });
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		await act(async () => result.current.handleSubmit("first"));
		act(() =>
			result.current.sseHandler(
				["metadata", { thread_id: "legacy-created" }],
				[],
				"messages",
			),
		);
		Object.assign(mockAgent, { mcp: {} });
		await act(async () => result.current.handleSubmit("second"));
		expect(mockInitiateStream).toHaveBeenCalledTimes(2);
		expect(mockInitiateStream).toHaveBeenLastCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ thread_id: "legacy-created" }),
			}),
		);
		expect(fetchMock).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
	it.each(["http", "native"])(
		"retains created ownership on run %s failure and permits Orchestra tools",
		async (failure) => {
			Object.assign(mockAgent, { tools: ["get_weather"] });
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ thread_id: "aegra-1" })),
				)
				.mockImplementation(async () =>
					failure === "http"
						? new Response("denied", { status: 403 })
						: new Response('event: error\ndata: {"message":"denied"}\n\n'),
				);
			vi.stubGlobal("fetch", fetchMock);
			const { result } = renderHook(() => useChat());
			act(() => result.current.clearMessages());
			await act(async () => {
				await result.current.handleSubmit("hello");
			});
			expect(result.current.metadata).toMatchObject({
				thread_id: "aegra-1",
				stream_owner: "aegra",
			});
			expect(result.current.runError?.recoverable).toBe(false);
			expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads");
			expect(fetchMock.mock.calls[1][0]).toBe(
				"/api/v1/threads/aegra-1/runs/stream",
			);
			expect(
				JSON.parse(fetchMock.mock.calls[1][1].body).config.configurable.tools,
			).toEqual(["get_weather"]);
			await act(async () => {
				await result.current.handleSubmit("retry");
			});
			expect(fetchMock).toHaveBeenCalledTimes(3);
			expect(mockInitiateStream).not.toHaveBeenCalled();
			expect(streamThread).not.toHaveBeenCalled();
			vi.unstubAllGlobals();
		},
	);
	it("never switches an existing v1 thread to v0 for later unsupported input", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "aegra-1" })),
			)
			.mockResolvedValueOnce(new Response("event: end\ndata: {}\n\n"));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		await act(async () => result.current.handleSubmit("first"));
		act(() => result.current.setSubmissionFiles({ "later.txt": {} }));
		await act(async () => result.current.handleSubmit("second"));
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(mockInitiateStream).not.toHaveBeenCalled();
		expect(result.current.runError?.message).toMatch(
			/does not support.*files/i,
		);
		expect(result.current.metadata).toMatchObject({
			thread_id: "aegra-1",
			stream_owner: "aegra",
		});
		vi.unstubAllGlobals();
	});

	it("does not treat passive legacy filesMap entries as attachments", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "passive" })),
			)
			.mockResolvedValueOnce(new Response("event: end\ndata: {}\n\n"));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => {
			result.current.clearMessages();
			result.current.setFilesMap(
				new Map([["passive", { "context.md": { content: ["context"] } }]]),
			);
		});
		await act(async () => {
			await result.current.handleSubmit("hello");
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toEqual({
			messages: [{ role: "user", content: "hello" }],
		});
		expect(mockInitiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
	it.each(["file", "image"])(
		"routes explicit %s to v0 before v1 creation and preserves the attachment",
		async (kind) => {
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);
			const { result } = renderHook(() => useChat());
			act(() => {
				result.current.clearMessages();
				if (kind === "file") result.current.setSubmissionFiles({ "a.txt": {} });
			});
			await act(async () => {
				await result.current.handleSubmit(
					"hello",
					kind === "image" ? [new File(["image"], "image.png")] : [],
				);
			});
			expect(fetchMock).not.toHaveBeenCalled();
			expect(mockInitiateStream).toHaveBeenCalledWith(
				expect.objectContaining({
					input: expect.objectContaining(
						kind === "file"
							? { files: { "a.txt": {} } }
							: {
									messages: [{ role: "user", content: ["hello", "image.png"] }],
								},
					),
				}),
			);
			expect(result.current.runError).toBeNull();
			vi.unstubAllGlobals();
		},
	);
});

describe("server-owned engine resolution", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("expands legacy list pages without requesting checkpoints", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify([])));
		vi.stubGlobal("fetch", fetchMock);
		const rows = Array.from({ length: 100 }, (_, index) => ({
			key: `other-${index}`,
		}));
		const post = vi.spyOn(apiClient, "post").mockImplementation(
			async (_path, payload: any) =>
				({
					data: {
						threads: [...rows, { value: { thread_id: "legacy-101" } }].slice(
							0,
							payload.limit,
						),
					},
				}) as any,
		);
		expect(await resolveThreadOwner("legacy-101")).toBe("legacy");
		expect(post.mock.calls.map(([, payload]: any[]) => payload)).toEqual([
			{ limit: 100, offset: 0, filter: {} },
			{ limit: 200, offset: 0, filter: {} },
		]);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads/search");
	});

	it("keeps unknown ids off legacy checkpoint search", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify([]))),
		);
		const post = vi
			.spyOn(apiClient, "post")
			.mockResolvedValue({ data: { threads: [] } });
		await expect(resolveThreadOwner("unknown")).rejects.toThrow(
			/could not be verified/i,
		);
		expect(post).toHaveBeenCalledWith("/threads/search", {
			limit: 100,
			offset: 0,
			filter: {},
		});
	});

	it("fails closed on native and legacy identifier collision", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify([{ thread_id: "collision" }])),
				),
		);
		const post = vi
			.spyOn(apiClient, "post")
			.mockResolvedValue({ data: { threads: [{ key: "collision" }] } });
		await expect(resolveThreadOwner("collision")).rejects.toThrow(/ambiguous/i);
		expect(post).toHaveBeenCalledWith("/threads/search", {
			limit: 100,
			offset: 0,
			filter: {},
		});
	});

	it("fails closed if the legacy list ignores an increased limit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify([]))),
		);
		const rows = Array.from({ length: 100 }, (_, index) => ({
			key: `other-${index}`,
		}));
		const post = vi
			.spyOn(apiClient, "post")
			.mockResolvedValue({ data: { threads: rows } });
		await expect(resolveThreadOwner("unseen")).rejects.toThrow(/pagination/i);
		expect(post).toHaveBeenCalledTimes(2);
	});
});

describe("useChat submission files", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFormatMultimodalPayload.mockResolvedValue([
			{ role: "user", content: "hello" },
		]);
		mockInitiateStream.mockResolvedValue(new MockStreamSource());
	});

	it("prefers canonical submission files over stale legacy filesMap entries", async () => {
		const { result } = renderHook(() => useChat());

		act(() => {
			result.current.setFilesMap(
				new Map([
					[
						"old-message",
						{
							"/stale.md": {
								content: ["stale"],
								created_at: "2024-01-01T00:00:00Z",
								modified_at: "2024-01-01T00:00:00Z",
							},
						},
					],
				]),
			);
			result.current.setMetadata({
				thread_id: "legacy-1",
				stream_owner: "legacy",
			});
			result.current.setSubmissionFiles({
				"/current.md": {
					content: ["current"],
					created_at: "2024-01-02T00:00:00Z",
					modified_at: "2024-01-02T00:00:00Z",
				},
			});
		});

		await act(async () => {
			await result.current.handleSubmit("hello");
		});

		expect(mockInitiateStream).toHaveBeenCalledWith(
			expect.objectContaining({
				input: expect.objectContaining({
					files: {
						"/current.md": {
							content: ["current"],
							created_at: "2024-01-02T00:00:00Z",
							modified_at: "2024-01-02T00:00:00Z",
						},
					},
				}),
			}),
		);
	});

	it("falls back to filesMap when no canonical submission files were provided", async () => {
		const { result } = renderHook(() => useChat());

		act(() => {
			result.current.setMetadata({
				thread_id: "legacy-1",
				stream_owner: "legacy",
			});
			result.current.setFilesMap(
				new Map([
					[
						"message-1",
						{
							"/legacy.md": {
								content: ["legacy"],
								created_at: "2024-01-03T00:00:00Z",
								modified_at: "2024-01-03T00:00:00Z",
							},
						},
					],
				]),
			);
		});

		await act(async () => {
			await result.current.handleSubmit("hello");
		});

		expect(mockInitiateStream).toHaveBeenCalledWith(
			expect.objectContaining({
				input: expect.objectContaining({
					files: {
						"/legacy.md": {
							content: ["legacy"],
							created_at: "2024-01-03T00:00:00Z",
							modified_at: "2024-01-03T00:00:00Z",
						},
					},
				}),
			}),
		);
	});
});

describe("useChat MCP sandbox unreachable (anti-storm)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		MockDistributedStreamSource.instances.length = 0;
	});

	it("routes 5 consecutive mcp_sandbox_unreachable events to a single run-error banner and zero toasts", async () => {
		const { result } = renderHook(() => useChat());

		act(() => {
			for (let i = 0; i < 5; i++) {
				result.current.sseHandler(
					["mcp_sandbox_unreachable", "MCP sandbox unreachable: boom"],
					[],
					"messages",
				);
			}
		});

		// ANTI-STORM: not one toast for five events — the surface is the banner.
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast).not.toHaveBeenCalled();
		expect(toast.warning).not.toHaveBeenCalled();
		expect(toast.info).not.toHaveBeenCalled();

		// Exactly one run-error state, not a stack of five.
		expect(result.current.runError).toEqual({
			runId: "",
			message: "MCP sandbox unreachable: boom",
			recoverable: false,
		});
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
	});

	it("marks the sandbox failure non-recoverable so the DLQ replay affordance is withheld", () => {
		const { result } = renderHook(() => useChat());

		act(() => {
			result.current.sseHandler(
				["mcp_sandbox_unreachable", { unexpected: "shape" }],
				[],
				"messages",
			);
		});

		expect(result.current.runError?.recoverable).toBe(false);
		// Replay is hidden, so the copy must tell the user what to do instead.
		expect(result.current.runError?.message).toBe(
			"The MCP sandbox server could not be reached. Send your message again to retry.",
		);
	});

	it("reaches the banner from a unified stream event (not just the legacy fallback)", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		const stream = MockDistributedStreamSource.instances[0];
		expect(stream).toBeDefined();

		act(() => {
			stream.eventHandler?.({
				type: "mcp_sandbox_unreachable",
				data: "MCP sandbox unreachable: connection refused",
			});
		});

		expect(result.current.runError).toEqual({
			runId: "",
			message: "MCP sandbox unreachable: connection refused",
			recoverable: false,
		});
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("uses the latest run_id from metadata, not the value captured at stream start", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		const stream = MockDistributedStreamSource.instances[0];

		// run_id arrives on a later metadata event, after startManagedStream
		// captured its render-time `metadata`.
		act(() => {
			stream.eventHandler?.({
				type: "metadata",
				data: {
					thread_id: "thread-1",
					run_id: "run-late",
					assistant_id: null,
					project_id: null,
				},
			});
		});

		act(() => {
			stream.eventHandler?.({
				type: "mcp_sandbox_unreachable",
				data: "MCP sandbox unreachable: boom",
			});
		});

		expect(result.current.runError?.runId).toBe("run-late");
	});
});

describe("useChat recovery-mode stream errors (anti-storm)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		MockDistributedStreamSource.instances.length = 0;
	});

	it("toasts once for a stream that emits four error events", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		const stream = MockDistributedStreamSource.instances[0];

		act(() => {
			for (let i = 0; i < 4; i++) {
				stream.eventHandler?.({
					type: "error",
					data: { error: "Lost the worker" },
				});
			}
		});

		// This pins the *teardown*, not the latch: the first error aborts the
		// controller and closes the stream, so events 2-4 bail at the
		// `signal.aborted` guard and never reach the toast. (The latch itself is
		// load-bearing on the onError path — see the transport-errors test.)
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith("Lost the worker", {
			id: STREAM_RECOVERY_TOAST_ID,
		});
		// The stream is torn down rather than left polling.
		expect(stream.closed).toBe(true);
	});

	it("keeps the latch per-stream: a later stream still notifies", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		act(() => {
			MockDistributedStreamSource.instances[0].eventHandler?.({
				type: "error",
				data: { error: "Lost the worker" },
			});
		});

		expect(toast.error).toHaveBeenCalledTimes(1);

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-2",
				runId: "run-2",
			});
		});

		expect(MockDistributedStreamSource.instances).toHaveLength(2);

		act(() => {
			MockDistributedStreamSource.instances[1].eventHandler?.({
				type: "error",
				data: { error: "Lost the worker again" },
			});
		});

		// Per-stream, not global: the second stream gets its own notification.
		expect(toast.error).toHaveBeenCalledTimes(2);
		expect(toast.error).toHaveBeenLastCalledWith("Lost the worker again", {
			id: STREAM_RECOVERY_TOAST_ID,
		});
	});

	it("collapses repeated transport errors on one recovery stream into a single toast", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		const stream = MockDistributedStreamSource.instances[0];

		act(() => {
			for (let i = 0; i < 3; i++) {
				stream.errorHandler?.(new Error("network down"));
			}
		});

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith(
			"Lost connection to the live stream. Refresh to retry reconnecting.",
			{ id: STREAM_RECOVERY_TOAST_ID },
		);
	});

	it("does not give the 404/409 informational toast the recovery id", async () => {
		const { result } = renderHook(() => useChat());

		await act(async () => {
			await result.current.attachToDistributedStream({
				threadId: "thread-1",
				runId: "run-1",
			});
		});

		const stream = MockDistributedStreamSource.instances[0];
		const notFound = Object.assign(new Error("gone"), { status: 404 });

		act(() => {
			stream.errorHandler?.(notFound);
		});

		expect(toast.error).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			"Stream ended while reconnecting. Loaded the latest saved thread state.",
		);
	});
});
