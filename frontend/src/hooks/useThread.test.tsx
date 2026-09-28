import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import useThread from "./useThread";

const mockSearchThreads = vi.fn();
const mockResolveThreadOwner = vi.fn();
const mockGetAegraState = vi.fn();
const mockSearchAegraThreads = vi.fn();

vi.mock("@/lib/services/threadService", () => ({
	searchThreads: (...args: any[]) => mockSearchThreads(...args),
	resolveThreadOwner: (...args: any[]) => mockResolveThreadOwner(...args),
	getAegraState: (...args: any[]) => mockGetAegraState(...args),
	searchAegraThreads: (...args: any[]) => mockSearchAegraThreads(...args),
}));

vi.mock("@/lib/utils/format", () => ({
	formatMessages: (messages: any[]) => messages,
}));

vi.mock("@/lib/utils/message", () => ({
	latestHumanMessage: () => ({ model: "openai:gpt-4.1-mini" }),
}));

type HookState = {
	threadLoading: boolean;
	threadError: string | null;
};

type ThreadCallbacks = {
	setCheckpoints: (checkpoints: any[]) => void;
	setMessages: (messages: any[]) => void;
	setMetadata: (metadata: any) => void;
	setFilesMap: (filesMap: Map<string, any>) => void;
	setTodos: (todos: any[]) => void;
	setModel: (model: string) => void;
};

function UseLoadThreadEffectHarness({
	threadId,
	enabled,
	onStateChange,
	callbacks,
}: {
	threadId: string;
	enabled: boolean;
	onStateChange: (state: HookState) => void;
	callbacks?: ThreadCallbacks;
}) {
	const thread = useThread();
	const threadCallbacks = callbacks || {
		setCheckpoints: vi.fn(),
		setMessages: vi.fn(),
		setMetadata: vi.fn(),
		setFilesMap: vi.fn(),
		setTodos: vi.fn(),
		setModel: vi.fn(),
	};

	thread.useLoadThreadEffect(threadId, threadCallbacks, { enabled });

	useEffect(() => {
		onStateChange({
			threadLoading: thread.threadLoading,
			threadError: thread.threadError,
		});
	}, [onStateChange, thread.threadError, thread.threadLoading]);

	return null;
}

describe("useThread", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResolveThreadOwner.mockResolvedValue("legacy");
		mockSearchAegraThreads.mockResolvedValue([]);
	});

	it("clears stale thread errors and loading state when hydration is disabled", async () => {
		mockSearchThreads.mockResolvedValueOnce([]);

		const state: HookState = {
			threadLoading: false,
			threadError: null,
		};

		const { rerender } = render(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={true}
				onStateChange={(nextState) => Object.assign(state, nextState)}
			/>,
		);

		await waitFor(() => {
			expect(state.threadError).toBe("No checkpoints found for thread");
		});

		rerender(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={false}
				onStateChange={(nextState) => Object.assign(state, nextState)}
			/>,
		);

		await waitFor(() => {
			expect(state.threadError).toBeNull();
			expect(state.threadLoading).toBe(false);
		});
	});

	it("does not apply late thread hydration after the effect is disabled", async () => {
		let resolveSearch: (value: any[]) => void = () => undefined;
		mockSearchThreads.mockImplementationOnce(
			() =>
				new Promise<any[]>((resolve) => {
					resolveSearch = resolve;
				}),
		);

		const callbacks: ThreadCallbacks = {
			setCheckpoints: vi.fn(),
			setMessages: vi.fn(),
			setMetadata: vi.fn(),
			setFilesMap: vi.fn(),
			setTodos: vi.fn(),
			setModel: vi.fn(),
		};

		const { rerender } = render(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={true}
				callbacks={callbacks}
				onStateChange={() => undefined}
			/>,
		);

		rerender(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={false}
				callbacks={callbacks}
				onStateChange={() => undefined}
			/>,
		);

		await act(async () => {
			resolveSearch([
				{
					metadata: {
						thread_id: "thread-123",
						files: {},
						todos: [],
					},
					values: {
						messages: [{ id: "msg-1", role: "user", content: "Hello" }],
					},
				},
			]);
			await Promise.resolve();
		});

		expect(callbacks.setMessages).not.toHaveBeenCalled();
		expect(callbacks.setMetadata).not.toHaveBeenCalled();
	});

	it("hydrates filesMap from metadata.files when loading a thread", async () => {
		const threadFiles = {
			"/historical.txt": {
				content: ["legacy"],
				created_at: "2024-01-01T00:00:00Z",
				modified_at: "2024-01-01T00:00:00Z",
			},
		};

		mockSearchThreads.mockResolvedValueOnce([
			{
				metadata: {
					thread_id: "thread-123",
					files: threadFiles,
					todos: [],
				},
				values: {
					messages: [
						{ id: "msg-1", role: "user", content: "Hello" },
						{ id: "msg-2", role: "assistant", content: "Hi" },
					],
				},
			},
		]);

		const callbacks: ThreadCallbacks = {
			setCheckpoints: vi.fn(),
			setMessages: vi.fn(),
			setMetadata: vi.fn(),
			setFilesMap: vi.fn(),
			setTodos: vi.fn(),
			setModel: vi.fn(),
		};

		render(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={true}
				callbacks={callbacks}
				onStateChange={() => undefined}
			/>,
		);

		const expected = new Map<string, any>();
		expected.set("thread", threadFiles);

		await waitFor(() => {
			expect(callbacks.setFilesMap).toHaveBeenCalledWith(expected);
		});
	});

	it("recovers native state without legacy checkpoints after localStorage is cleared", async () => {
		localStorage.clear();
		mockResolveThreadOwner.mockResolvedValue("aegra");
		mockGetAegraState.mockResolvedValue({
			values: {
				messages: [{ id: "native-1", type: "human", content: "Recovered" }],
			},
			metadata: {},
		});
		const { result } = renderHook(() => useThread());
		let data: any = null;
		await act(async () => {
			data = await result.current.loadThread("native-1");
		});
		expect(data?.messages[0].content).toBe("Recovered");
		expect(data?.metadata).toMatchObject({
			thread_id: "native-1",
			stream_owner: "aegra",
		});
		expect(mockSearchThreads).not.toHaveBeenCalled();
	});

	it("recovers legacy checkpoints after localStorage is cleared", async () => {
		localStorage.clear();
		mockSearchThreads.mockResolvedValue([
			{
				metadata: {},
				values: {
					messages: [{ id: "legacy-1", type: "human", content: "Legacy" }],
				},
			},
		]);
		const { result } = renderHook(() => useThread());
		let data: any = null;
		await act(async () => {
			data = await result.current.loadThread("legacy-1");
		});
		expect(mockResolveThreadOwner).toHaveBeenCalledWith("legacy-1");
		expect(mockSearchThreads).toHaveBeenCalledWith("list_checkpoints", {
			thread_id: "legacy-1",
		});
		expect(mockGetAegraState).not.toHaveBeenCalled();
		expect(data.messages[0].content).toBe("Legacy");
		expect(data.metadata).toMatchObject({
			thread_id: "legacy-1",
			stream_owner: "legacy",
		});
	});

	it("fails closed on unresolved ownership before any legacy checkpoint lookup", async () => {
		mockResolveThreadOwner.mockRejectedValue(new Error("offline"));
		const { result } = renderHook(() => useThread());
		let data: any = null;
		await act(async () => {
			data = await result.current.loadThread("unknown");
		});
		expect(data).toBeNull();
		expect(result.current.threadError).toBe("Failed to load thread");
		expect(mockSearchThreads).not.toHaveBeenCalled();
	});

	it("returns empty filesMap when metadata.files is empty", async () => {
		mockSearchThreads.mockResolvedValueOnce([
			{
				metadata: {
					thread_id: "thread-123",
					files: {},
					todos: [],
				},
				values: {
					messages: [
						{ id: "msg-1", role: "user", content: "Hello" },
						{ id: "msg-2", role: "assistant", content: "Hi" },
					],
				},
			},
		]);

		const callbacks: ThreadCallbacks = {
			setCheckpoints: vi.fn(),
			setMessages: vi.fn(),
			setMetadata: vi.fn(),
			setFilesMap: vi.fn(),
			setTodos: vi.fn(),
			setModel: vi.fn(),
		};

		render(
			<UseLoadThreadEffectHarness
				threadId="thread-123"
				enabled={true}
				callbacks={callbacks}
				onStateChange={() => undefined}
			/>,
		);

		await waitFor(() => {
			expect(callbacks.setFilesMap).toHaveBeenCalledWith(new Map());
		});
	});
});
