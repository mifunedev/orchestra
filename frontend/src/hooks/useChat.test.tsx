import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { initiateStream, streamThread } from "@/lib/services";
import apiClient from "@/lib/utils/apiClient";
import useChat from "./useChat";
import { AEGRA_FILES_SOURCE } from "@/lib/utils/aegraStream";

const mockSetLoading = vi.fn();
const mockSetLoadingMessage = vi.fn();
const mockAgent = {
	id: "agent-1",
	model: "openai:gpt-4.1-mini",
	public: false,
	prompt: "",
	tools: [] as string[],
	a2a: {} as Record<string, unknown>,
	mcp: {} as Record<string, unknown>,
	subagents: [] as { id: string }[],
};
vi.mock("@/lib/services/userSettingsService", () => ({
	getSettings: async () => ({ defaults: {} }),
}));
vi.mock("@/context/AppContext", () => ({
	useAppContext: () => ({
		setLoading: mockSetLoading,
		setLoadingMessage: mockSetLoadingMessage,
	}),
}));
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({ agent: mockAgent }),
}));
vi.mock("@/lib/services", () => ({
	initiateStream: vi.fn(),
	streamThread: vi.fn(),
}));
vi.mock("@/lib/utils/auth", () => ({ getAuthToken: () => "token" }));
vi.mock("sonner", () => {
	const toast = Object.assign(vi.fn(), { error: vi.fn() });
	return { toast };
});

const assertNoLegacyChat = (fetchMock: ReturnType<typeof vi.fn>) => {
	expect(initiateStream).not.toHaveBeenCalled();
	expect(streamThread).not.toHaveBeenCalled();
	expect(apiClient.get).not.toHaveBeenCalled();
	expect(apiClient.post).not.toHaveBeenCalled();
	expect(apiClient.delete).not.toHaveBeenCalled();
	expect(
		fetchMock.mock.calls.every(([url]) => String(url).startsWith("/api/v1/")),
	).toBe(true);
};

describe("useChat native-only submission", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		Object.assign(mockAgent, {
			public: false,
			prompt: "",
			tools: [],
			mcp: {},
			a2a: {},
			subagents: [],
		});
		vi.spyOn(apiClient, "get");
		vi.spyOn(apiClient, "post");
		vi.spyOn(apiClient, "delete");
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("streams authorized tools and a second turn only through v1", async () => {
		mockAgent.tools = ["get_weather"];
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "native" })),
			)
			.mockResolvedValue(
				new Response(
					'event: values\ndata: {"messages":[{"id":"a","type":"ai","content":"Sunny","tool_calls":[{"id":"c","name":"get_weather","args":{}}]}]}\n\nevent: end\ndata: {}\n\n',
				),
			);
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		await act(async () => result.current.handleSubmit("hello"));
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads");
		expect(result.current.messages.some((m) => m.content === "Sunny")).toBe(
			true,
		);
		await act(async () => result.current.handleSubmit("again"));
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[2][0]).toBe(
			"/api/v1/threads/native/runs/stream",
		);
		expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
			input: { messages: [{ role: "user", content: "again" }] },
			config: { configurable: { tools: ["get_weather"] } },
		});
		expect(result.current.metadata).toMatchObject({
			thread_id: "native",
			stream_owner: "aegra",
		});
		assertNoLegacyChat(fetchMock);
	});

	it("preserves native files from SSE and ignores passive account files", async () => {
		const files = { "/answer.txt": { content: "answer" } };
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "native" })),
			)
			.mockResolvedValueOnce(
				new Response(
					`event: updates\ndata: ${JSON.stringify({ tools: { files } })}\n\nevent: end\ndata: {}\n\n`,
				),
			);
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() =>
			result.current.setFilesMap(
				new Map([["passive", { "context.md": { content: ["context"] } }]]),
			),
		);
		await act(async () => result.current.handleSubmit("write a file"));
		expect(result.current.filesMap.get(AEGRA_FILES_SOURCE)).toEqual(files);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toEqual({
			messages: [{ role: "user", content: "write a file" }],
		});
		assertNoLegacyChat(fetchMock);
	});

	it.each([
		["attachment", { files: { "a.txt": {} } }, [], /files/i],
		["image", {}, [new File(["image"], "image.png")], /files/i],
		["MCP", { agent: { mcp: { server: {} } } }, [], /MCP/],
		["A2A", { agent: { a2a: { agent: {} } } }, [], /A2A/],
		["subagents", { agent: { subagents: [{ id: "sub" }] } }, [], /subagents/],
		["public assistant", { agent: { public: true } }, [], /public assistants/],
		[
			"custom prompt",
			{ agent: { prompt: "custom" } },
			[],
			/custom system prompt/,
		],
		[
			"checkpoint override",
			{ metadata: { checkpoint_id: "checkpoint-1" } },
			[],
			/checkpoint overrides/,
		],
	] as const)(
		"rejects %s before any thread or run and retains the draft",
		async (_name, setup, images, error) => {
			if ("agent" in setup) Object.assign(mockAgent, setup.agent);
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);
			const { result } = renderHook(() => useChat());
			act(() => {
				result.current.setQuery("draft");
				if ("files" in setup) result.current.setSubmissionFiles(setup.files);
				if ("metadata" in setup) result.current.setMetadata(setup.metadata);
			});
			await act(async () =>
				result.current.handleSubmit(undefined, [...images]),
			);
			expect(result.current.query).toBe("draft");
			expect(result.current.runError?.message).toMatch(error);
			expect(toast.error).toHaveBeenCalled();
			if ("files" in setup)
				expect(result.current.submissionFiles).toEqual(setup.files);
			expect(fetchMock).not.toHaveBeenCalled();
			assertNoLegacyChat(fetchMock);
		},
	);

	it("rejects unsupported input on an existing native thread without changing ownership", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => {
			result.current.setMetadata({
				thread_id: "native",
				stream_owner: "aegra",
			});
			result.current.setQuery("draft");
			result.current.setSubmissionFiles({ "later.txt": {} });
		});
		await act(async () => result.current.handleSubmit());
		expect(result.current.metadata).toMatchObject({
			thread_id: "native",
			stream_owner: "aegra",
		});
		expect(result.current.query).toBe("draft");
		expect(result.current.runError?.message).toMatch(/files/i);
		expect(fetchMock).not.toHaveBeenCalled();
		assertNoLegacyChat(fetchMock);
	});

	it("verifies an unknown-owner native thread through paginated v1 search", async () => {
		const firstPage = Array.from({ length: 100 }, (_, index) => ({
			thread_id: `native-${index}`,
		}));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(firstPage)))
			.mockResolvedValueOnce(
				new Response(JSON.stringify([{ thread_id: "target" }])),
			)
			.mockResolvedValueOnce(new Response("event: end\ndata: {}\n\n"));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => result.current.setMetadata({ thread_id: "target" }));
		await act(async () => result.current.handleSubmit("hello"));
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			"/api/v1/threads/search",
			"/api/v1/threads/search",
			"/api/v1/threads/target/runs/stream",
		]);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
			limit: 100,
			offset: 100,
		});
		expect(result.current.metadata).toMatchObject({
			thread_id: "target",
			stream_owner: "aegra",
		});
		assertNoLegacyChat(fetchMock);
	});

	it("fails closed on an old thread without verified native ownership", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify([])));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => {
			result.current.setMetadata({ thread_id: "old" });
			result.current.setQuery("draft");
		});
		await act(async () => result.current.handleSubmit());
		expect(result.current.query).toBe("draft");
		expect(result.current.runError?.message).toMatch(/unavailable in Aegra/i);
		expect(result.current.metadata.stream_owner).toBeUndefined();
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			"/api/v1/threads/search",
		]);
		assertNoLegacyChat(fetchMock);
	});

	it("rejects explicit legacy ownership before any request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChat());
		act(() => {
			result.current.setMetadata({ thread_id: "old", stream_owner: "legacy" });
			result.current.setQuery("draft");
		});
		await act(async () => result.current.handleSubmit());
		expect(result.current.query).toBe("draft");
		expect(result.current.runError?.message).toMatch(/unavailable in Aegra/i);
		expect(fetchMock).not.toHaveBeenCalled();
		assertNoLegacyChat(fetchMock);
	});

	it.each(["http", "native"])(
		"keeps created ownership on %s v1 run failure",
		async (failure) => {
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ thread_id: "native" })),
				)
				.mockResolvedValue(
					failure === "http"
						? new Response("denied", { status: 403 })
						: new Response('event: error\ndata: {"message":"denied"}\n\n'),
				);
			vi.stubGlobal("fetch", fetchMock);
			const { result } = renderHook(() => useChat());
			act(() => result.current.setQuery("draft"));
			await act(async () => result.current.handleSubmit());
			expect(result.current.metadata).toMatchObject({
				thread_id: "native",
				stream_owner: "aegra",
			});
			expect(result.current.runError?.recoverable).toBe(false);
			expect(result.current.query).toBe("draft");
			await act(async () => result.current.handleSubmit("retry"));
			expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
				"/api/v1/threads",
				"/api/v1/threads/native/runs/stream",
				"/api/v1/threads/native/runs/stream",
			]);
			assertNoLegacyChat(fetchMock);
		},
	);

	it("never deletes or replays a native run via legacy endpoints", async () => {
		const { result } = renderHook(() => useChat());
		await expect(result.current.deleteThread("native")).rejects.toThrow(
			/unavailable/i,
		);
		await act(async () => result.current.replayRun("run-1"));
		expect(toast.error).toHaveBeenCalledWith(
			expect.stringMatching(/unavailable/i),
		);
		expect(apiClient.get).not.toHaveBeenCalled();
		expect(apiClient.post).not.toHaveBeenCalled();
		expect(apiClient.delete).not.toHaveBeenCalled();
	});
});
