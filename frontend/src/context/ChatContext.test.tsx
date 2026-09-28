import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ChatProvider, { useChatContext } from "./ChatContext";
import { toast } from "sonner";
import { initiateStream, streamThread } from "@/lib/services";

vi.mock("@/hooks/useConfigHook", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useImageHook", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useThread", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useModel", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useMessageQueue", () => ({
	default: () => ({ clearQueue: () => {} }),
}));
vi.mock("@/context/AppContext", () => ({
	useAppContext: () => ({ setLoading: () => {}, setLoadingMessage: () => {} }),
}));
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({
		agent: {
			model: "openai:gpt-4.1-mini",
			tools: [],
			prompt: "",
			mcp: {},
			a2a: {},
			subagents: [],
		},
	}),
}));
vi.mock("@/lib/utils/auth", () => ({ getAuthToken: () => "token" }));
vi.mock("@/lib/services", () => ({
	initiateStream: vi.fn(),
	streamThread: vi.fn(),
}));
vi.mock("@/lib/services/memoryService", () => ({
	default: { getFiles: async () => ({}) },
}));
vi.mock("@/lib/services/userSettingsService", () => ({
	getSettings: async () => ({
		defaults: {
			files: Object.fromEntries(
				["profile", "settings", "context", "memory"].map((name) => [
					`/${name}.md`,
					{
						content: [name],
						created_at: "2024-01-01",
						modified_at: "2024-01-01",
					},
				]),
			),
		},
	}),
	patchDefaults: vi.fn().mockResolvedValue({}),
}));
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
	<ChatProvider>{children}</ChatProvider>
);

describe("Aegra submission file provenance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});
	it("allows a text chat with four passive account files without submitting them", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "native" })),
			)
			.mockResolvedValueOnce(new Response("event: end\ndata: {}\n\n"));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChatContext(), { wrapper });
		await waitFor(() =>
			expect(Object.keys(result.current.submissionFiles)).toHaveLength(4),
		);
		await act(async () => {
			await result.current.handleSubmit("hello");
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/aegra/threads");
		expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toEqual({
			messages: [{ role: "user", content: "hello" }],
		});
		expect(toast.error).not.toHaveBeenCalled();
		expect(initiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
	});
	it("visibly rejects an explicit file before any request and restores the cleared queued prompt", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChatContext(), { wrapper });
		await waitFor(() =>
			expect(Object.keys(result.current.submissionFiles)).toHaveLength(4),
		);
		act(() => {
			result.current.createFile("/attached.txt", "explicit attachment");
			result.current.setQuery("");
		});
		await act(async () => {
			await result.current.handleSubmit("keep this queued prompt");
		});
		expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/files/i));
		expect(result.current.query).toBe("keep this queued prompt");
		expect(result.current.messages).toHaveLength(0);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(initiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
	});
	it("still submits all passive files to a legacy Orchestra thread", async () => {
		vi.mocked(initiateStream).mockResolvedValue({
			onEvent() {},
			onError() {},
			onClose() {},
			async start() {},
			close() {},
		} as any);
		const { result } = renderHook(() => useChatContext(), { wrapper });
		await waitFor(() =>
			expect(Object.keys(result.current.submissionFiles)).toHaveLength(4),
		);
		act(() => result.current.setMetadata({ thread_id: "legacy" }));
		await act(async () => {
			await result.current.handleSubmit("hello");
		});
		expect(
			Object.keys(vi.mocked(initiateStream).mock.calls[0][0].input.files ?? {}),
		).toHaveLength(4);
	});
});
