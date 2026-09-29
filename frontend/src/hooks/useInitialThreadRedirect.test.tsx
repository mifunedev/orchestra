import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import useThread from "./useThread";
import {
	searchThreads,
	resolveThreadOwner,
	getAegraState,
	searchAegraThreads,
} from "@/lib/services/threadService";

vi.mock("@/lib/services/threadService", () => ({
	searchThreads: vi.fn(),
	resolveThreadOwner: vi.fn(),
	getAegraState: vi.fn(),
	searchAegraThreads: vi.fn(),
}));
import useInitialThreadRedirect from "./useInitialThreadRedirect";

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock("react-router-dom", async () => {
	const actual =
		await vi.importActual<typeof import("react-router-dom")>(
			"react-router-dom",
		);

	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => mockUseLocation(),
	};
});

describe("useInitialThreadRedirect", () => {
	beforeEach(() => {
		localStorage.clear();
		mockNavigate.mockReset();
		vi.mocked(resolveThreadOwner).mockReset().mockResolvedValue("aegra");
		mockUseLocation.mockReset();
		mockUseLocation.mockReturnValue({ state: null });
	});

	it("redirects a live v1 conversation to its own thread route after browser storage is cleared", async () => {
		mockUseLocation.mockReturnValue({ pathname: "/chat", state: null });
		localStorage.clear();
		const { rerender } = renderHook(
			({
				threadId,
				hasMessages,
			}: {
				threadId?: string;
				hasMessages: boolean;
			}) => useInitialThreadRedirect({ threadId, hasMessages }),
			{
				initialProps: {
					threadId: undefined as string | undefined,
					hasMessages: false,
				},
			},
		);

		rerender({ threadId: "aegra-123", hasMessages: true });
		rerender({ threadId: "aegra-123", hasMessages: true });
		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/thread/aegra-123", {
				replace: true,
			}),
		);

		mockNavigate.mockClear();
		rerender({ threadId: undefined, hasMessages: false });
		rerender({ threadId: "orchestra-123", hasMessages: true });
		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
		expect(mockNavigate).toHaveBeenCalledWith("/thread/orchestra-123", {
			replace: true,
		});
	});

	it("does not hydrate old threads through checkpoint fallback", async () => {
		localStorage.clear();
		vi.mocked(resolveThreadOwner).mockImplementation(async (id) => {
			if (id === "native") return "aegra";
			throw new Error("Thread unavailable in Aegra");
		});
		vi.mocked(getAegraState).mockResolvedValue({
			values: {
				messages: [{ id: "n", type: "human", content: "native text" }],
			},
			metadata: {},
		});
		vi.mocked(searchThreads).mockResolvedValue([
			{
				values: {
					messages: [{ id: "l", type: "human", content: "legacy text" }],
				},
				metadata: {},
			},
		] as never);
		const { result } = renderHook(() => useThread());
		let native: any;
		await act(async () => {
			native = await result.current.loadThread("native");
		});
		expect(native.messages[0].content).toBe("native text");
		expect(native.metadata).toMatchObject({
			thread_id: "native",
			stream_owner: "aegra",
		});
		expect(searchThreads).not.toHaveBeenCalled();
		let legacy: any;
		await act(async () => {
			legacy = await result.current.loadThread("legacy");
		});
		expect(legacy).toBeNull();
		expect(result.current.threadError).toBe("Thread unavailable in Aegra");
		expect(searchThreads).not.toHaveBeenCalled();
	});

	it("discovers only native sidebar rows", async () => {
		localStorage.clear();
		vi.mocked(searchThreads).mockResolvedValue([
			{
				key: "legacy",
				value: { thread_id: "legacy" },
				updated_at: "2025-01-01",
			},
		] as never);
		vi.mocked(searchAegraThreads).mockResolvedValue([
			{ thread_id: "native", updated_at: "2025-01-02", metadata: {} },
		] as never);
		const { result } = renderHook(() => {
			const thread = useThread();
			thread.useListThreadsEffect();
			return thread;
		});
		await waitFor(() =>
			expect(result.current.threads.map((thread) => thread.key)).toContain(
				"native",
			),
		);
		expect(result.current.threads.map((thread) => thread.key)).not.toContain(
			"legacy",
		);
		expect(searchThreads).not.toHaveBeenCalled();
	});

	it("routes a newly created native thread even before the run yields messages", async () => {
		vi.mocked(resolveThreadOwner).mockResolvedValue("aegra");
		renderHook(() =>
			useInitialThreadRedirect({ threadId: "new-native", hasMessages: false }),
		);
		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/thread/new-native", {
				replace: true,
			}),
		);
	});

	it("does not navigate when threadId is missing", () => {
		renderHook(() =>
			useInitialThreadRedirect({
				threadId: undefined,
				hasMessages: true,
			}),
		);

		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("does not navigate an old-only thread without messages", async () => {
		vi.mocked(resolveThreadOwner).mockRejectedValue(
			new Error("Thread unavailable in Aegra"),
		);
		renderHook(() =>
			useInitialThreadRedirect({
				threadId: "thread-123",
				hasMessages: false,
			}),
		);

		await waitFor(() =>
			expect(resolveThreadOwner).toHaveBeenCalledWith("thread-123"),
		);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(searchThreads).not.toHaveBeenCalled();
	});

	it("redirects a live conversation immediately when native search is delayed", () => {
		vi.mocked(resolveThreadOwner).mockImplementation(
			() => new Promise(() => {}),
		);
		renderHook(() =>
			useInitialThreadRedirect({ threadId: "new-native", hasMessages: true }),
		);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/new-native", {
			replace: true,
		});
		expect(resolveThreadOwner).not.toHaveBeenCalled();
	});

	it("redirects a live conversation even when native search rejects", () => {
		vi.mocked(resolveThreadOwner).mockRejectedValue(
			new Error("Search unavailable"),
		);
		renderHook(() =>
			useInitialThreadRedirect({ threadId: "new-native", hasMessages: true }),
		);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/new-native", {
			replace: true,
		});
		expect(resolveThreadOwner).not.toHaveBeenCalled();
	});

	it("navigates once when threadId appears for an active conversation", async () => {
		const { rerender } = renderHook(
			({
				threadId,
				hasMessages,
			}: {
				threadId?: string;
				hasMessages: boolean;
			}) => useInitialThreadRedirect({ threadId, hasMessages }),
			{
				initialProps: {
					threadId: undefined as string | undefined,
					hasMessages: true,
				},
			},
		);

		rerender({ threadId: "thread-123", hasMessages: true });
		rerender({ threadId: "thread-123", hasMessages: true });

		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
		expect(mockNavigate).toHaveBeenCalledWith("/thread/thread-123", {
			replace: true,
		});
	});

	it("can redirect again after the conversation resets", async () => {
		const { rerender } = renderHook(
			({
				threadId,
				hasMessages,
			}: {
				threadId?: string;
				hasMessages: boolean;
			}) => useInitialThreadRedirect({ threadId, hasMessages }),
			{
				initialProps: {
					threadId: "thread-123" as string | undefined,
					hasMessages: true,
				},
			},
		);

		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
		expect(mockNavigate).toHaveBeenLastCalledWith("/thread/thread-123", {
			replace: true,
		});

		rerender({ threadId: undefined, hasMessages: false });
		rerender({ threadId: "thread-456", hasMessages: true });

		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(2));
		expect(mockNavigate).toHaveBeenLastCalledWith("/thread/thread-456", {
			replace: true,
		});
	});

	it("suppresses the initial redirect when threadId matches staleThreadId", () => {
		mockUseLocation.mockReturnValue({
			state: { staleThreadId: "thread-123" },
		});

		renderHook(() =>
			useInitialThreadRedirect({
				threadId: "thread-123",
				hasMessages: true,
			}),
		);

		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("redirects when threadId differs from staleThreadId", async () => {
		mockUseLocation.mockReturnValue({
			state: { staleThreadId: "stale-thread" },
		});

		const { rerender } = renderHook(
			({
				threadId,
				hasMessages,
			}: {
				threadId?: string;
				hasMessages: boolean;
			}) => useInitialThreadRedirect({ threadId, hasMessages }),
			{
				initialProps: {
					threadId: "stale-thread" as string | undefined,
					hasMessages: true,
				},
			},
		);

		// First render: suppressed (threadId matches staleThreadId)
		expect(mockNavigate).not.toHaveBeenCalled();

		// New thread arrives — different from staleThreadId, should redirect
		rerender({ threadId: "new-thread", hasMessages: true });
		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
		expect(mockNavigate).toHaveBeenCalledWith("/thread/new-thread", {
			replace: true,
		});
	});

	it("re-enables redirects after the stale thread clears and a new thread arrives", async () => {
		mockUseLocation.mockReturnValue({
			state: { staleThreadId: "thread-123" },
		});

		const { rerender } = renderHook(
			({
				threadId,
				hasMessages,
			}: {
				threadId?: string;
				hasMessages: boolean;
			}) => useInitialThreadRedirect({ threadId, hasMessages }),
			{
				initialProps: {
					threadId: "thread-123" as string | undefined,
					hasMessages: true,
				},
			},
		);

		expect(mockNavigate).not.toHaveBeenCalled();

		rerender({ threadId: undefined, hasMessages: false });
		rerender({ threadId: "thread-456", hasMessages: true });

		await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
		expect(mockNavigate).toHaveBeenCalledWith("/thread/thread-456", {
			replace: true,
		});
	});
});
