import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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
		mockUseLocation.mockReset();
		mockUseLocation.mockReturnValue({ state: null });
	});

	it("keeps Aegra conversations on /chat while Orchestra conversations still redirect", () => {
		mockUseLocation.mockReturnValue({ pathname: "/chat", state: null });
		localStorage.setItem("aegra-thread:aegra-123", "1");
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
		expect(mockNavigate).not.toHaveBeenCalled();

		rerender({ threadId: undefined, hasMessages: false });
		rerender({ threadId: "orchestra-123", hasMessages: true });
		expect(mockNavigate).toHaveBeenCalledTimes(1);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/orchestra-123", {
			replace: true,
		});
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

	it("does not navigate when there are no messages", () => {
		renderHook(() =>
			useInitialThreadRedirect({
				threadId: "thread-123",
				hasMessages: false,
			}),
		);

		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("navigates once when threadId appears for an active conversation", () => {
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

		expect(mockNavigate).toHaveBeenCalledTimes(1);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/thread-123", {
			replace: true,
		});
	});

	it("can redirect again after the conversation resets", () => {
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

		expect(mockNavigate).toHaveBeenCalledTimes(1);
		expect(mockNavigate).toHaveBeenLastCalledWith("/thread/thread-123", {
			replace: true,
		});

		rerender({ threadId: undefined, hasMessages: false });
		rerender({ threadId: "thread-456", hasMessages: true });

		expect(mockNavigate).toHaveBeenCalledTimes(2);
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

	it("redirects when threadId differs from staleThreadId", () => {
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
		expect(mockNavigate).toHaveBeenCalledTimes(1);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/new-thread", {
			replace: true,
		});
	});

	it("re-enables redirects after the stale thread clears and a new thread arrives", () => {
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

		expect(mockNavigate).toHaveBeenCalledTimes(1);
		expect(mockNavigate).toHaveBeenCalledWith("/thread/thread-456", {
			replace: true,
		});
	});
});
