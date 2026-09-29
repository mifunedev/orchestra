import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { readFileSync } from "node:fs";
import useThread from "./useThread";
import { AEGRA_FILES_SOURCE } from "@/lib/utils/aegraStream";

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
		mockResolveThreadOwner.mockResolvedValue("aegra");
		mockSearchAegraThreads.mockResolvedValue([]);
	});

	it("clears stale thread errors and loading state when hydration is disabled", async () => {
		mockResolveThreadOwner.mockRejectedValueOnce(
			new Error("Thread unavailable in Aegra"),
		);

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
			expect(state.threadError).toBe("Thread unavailable in Aegra");
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
		let resolveSearch: (value: any) => void = () => undefined;
		mockGetAegraState.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
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
			resolveSearch({
				metadata: {},
				values: { messages: [{ id: "msg-1", role: "user", content: "Hello" }] },
			});
			await Promise.resolve();
		});

		expect(callbacks.setMessages).not.toHaveBeenCalled();
		expect(callbacks.setMetadata).not.toHaveBeenCalled();
	});

	it("hydrates filesMap from native state when loading a thread", async () => {
		const threadFiles = {
			"/historical.txt": {
				content: ["legacy"],
				created_at: "2024-01-01T00:00:00Z",
				modified_at: "2024-01-01T00:00:00Z",
			},
		};

		mockGetAegraState.mockResolvedValueOnce({
			metadata: {},
			values: {
				files: threadFiles,
				messages: [
					{ id: "msg-1", role: "user", content: "Hello" },
					{ id: "msg-2", role: "assistant", content: "Hi" },
				],
			},
		});

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
		expected.set(AEGRA_FILES_SOURCE, threadFiles);

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

	it("hydrates native files with their metadata and original content formats", async () => {
		mockResolveThreadOwner.mockResolvedValue("aegra");
		const files = {
			"/answer.txt": {
				content: ["one", "two"],
				created_at: "2024-01-01",
				modified_at: "2024-01-02",
			},
			"/note.txt": {
				content: "line one\nline two",
				created_at: "2024-01-03",
				modified_at: "2024-01-04",
			},
		};
		mockGetAegraState.mockResolvedValue({
			values: { messages: [], files },
			metadata: {},
		});
		const { result } = renderHook(() => useThread());
		let data: any;
		await act(async () => {
			data = await result.current.loadThread("native-1");
		});
		expect(data.filesMap).toEqual(new Map([[AEGRA_FILES_SOURCE, files]]));
		expect(data.filesMap.get(AEGRA_FILES_SOURCE)["/note.txt"].content).toBe(
			"line one\nline two",
		);
		expect(mockSearchThreads).not.toHaveBeenCalled();
	});

	it("rejects an old-only direct URL without reading checkpoints or state", async () => {
		mockResolveThreadOwner.mockRejectedValueOnce(
			new Error("Thread unavailable in Aegra"),
		);
		const { result } = renderHook(() => useThread());
		let data: any = null;
		await act(async () => {
			data = await result.current.loadThread("legacy-1");
		});
		expect(data).toBeNull();
		expect(result.current.threadError).toBe("Thread unavailable in Aegra");
		expect(mockSearchThreads).not.toHaveBeenCalled();
		expect(mockGetAegraState).not.toHaveBeenCalled();
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

	it("returns empty filesMap when native files are empty", async () => {
		mockGetAegraState.mockResolvedValueOnce({
			metadata: {},
			values: { files: {}, messages: [] },
		});

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

	it("lists only native threads and paginates using native offsets", async () => {
		const page = Array.from({ length: 20 }, (_, index) => ({
			thread_id: `native-${index}`,
			updated_at: `2025-01-${String(index + 1).padStart(2, "0")}`,
			metadata: { thread_name: `Native ${index}` },
		}));
		mockSearchAegraThreads
			.mockResolvedValueOnce(page)
			.mockResolvedValueOnce([
				{ thread_id: "native-20", metadata: { thread_name: "Next" } },
			]);
		const { result } = renderHook(() => {
			const thread = useThread();
			thread.useListThreadsEffect();
			return thread;
		});
		await waitFor(() => expect(result.current.threads).toHaveLength(20));
		expect(result.current.threads[0]).toMatchObject({
			key: "native-0",
			value: { thread_id: "native-0", title: "Native 0" },
		});
		expect(result.current.hasMoreThreads).toBe(true);
		await act(async () => result.current.loadMoreThreads());
		expect(result.current.threads).toHaveLength(21);
		expect(result.current.hasMoreThreads).toBe(false);
		expect(mockSearchAegraThreads).toHaveBeenNthCalledWith(1, 20, 0);
		expect(mockSearchAegraThreads).toHaveBeenNthCalledWith(2, 20, 20);
		expect(mockSearchThreads).not.toHaveBeenCalled();
	});

	it("does not invoke the legacy recovery hook or checkpoint effect in ThreadPage", () => {
		const page = readFileSync("src/pages/threads/ThreadPage.tsx", "utf8");
		expect(page).not.toContain("useActiveStreamRecovery");
		expect(page).not.toContain("useListCheckpointsEffect");
	});

	it("does not list old rows for filtered assistant or project views", async () => {
		const { result } = renderHook(() => useThread());
		await act(async () => {
			await result.current.searchThreads("list_threads", {
				metadata: { assistant_id: "assistant-1" },
			} as any);
		});
		expect(result.current.threads).toEqual([]);
		expect(mockSearchThreads).not.toHaveBeenCalled();
	});
});
