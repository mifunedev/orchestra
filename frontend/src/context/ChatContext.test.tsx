import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ChatProvider, { useChatContext } from "./ChatContext";
import { toast } from "sonner";
import { initiateStream, streamThread } from "@/lib/services";
import apiClient from "@/lib/utils/apiClient";

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
		vi.restoreAllMocks();
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
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads");
		expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toEqual({
			messages: [{ role: "user", content: "hello" }],
		});
		expect(toast.error).not.toHaveBeenCalled();
		expect(initiateStream).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
	});
	it("routes an explicit attachment to v0 before creating v1 and keeps the queued prompt and file", async () => {
		vi.mocked(initiateStream).mockResolvedValue({
			onEvent() {},
			onError() {},
			onClose() {},
			async start() {},
			close() {},
		} as any);
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
		expect(fetchMock).not.toHaveBeenCalled();
		expect(streamThread).not.toHaveBeenCalled();
		expect(initiateStream).toHaveBeenCalledTimes(1);
		expect(vi.mocked(initiateStream).mock.calls[0][0]).toMatchObject({
			input: {
				messages: [
					{
						role: "user",
						content: [{ type: "text", text: "keep this queued prompt" }],
					},
				],
				files: { "/attached.txt": { content: ["explicit attachment"] } },
			},
		});
		expect(toast.error).not.toHaveBeenCalled();
	});
	it("still submits all passive files to a legacy Orchestra thread", async () => {
		vi.mocked(initiateStream).mockResolvedValue({
			onEvent() {},
			onError() {},
			onClose() {},
			async start() {},
			close() {},
		} as any);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify([])));
		vi.stubGlobal("fetch", fetchMock);
		const legacySearch = vi.spyOn(apiClient, "post").mockResolvedValue({
			data: { threads: [{ key: "legacy", value: { thread_id: "legacy" } }] },
		});
		const { result } = renderHook(() => useChatContext(), { wrapper });
		await waitFor(() =>
			expect(Object.keys(result.current.submissionFiles)).toHaveLength(4),
		);
		act(() => result.current.setMetadata({ thread_id: "legacy" }));
		await act(async () => {
			await result.current.handleSubmit("hello");
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/threads/search");
		expect(legacySearch).toHaveBeenCalledWith("/threads/search", {
			limit: 1,
			offset: 0,
			filter: { thread_id: "legacy" },
		});
		expect(initiateStream).toHaveBeenCalledOnce();
		expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
			legacySearch.mock.invocationCallOrder[0],
		);
		expect(legacySearch.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(initiateStream).mock.invocationCallOrder[0],
		);
		expect(
			Object.keys(vi.mocked(initiateStream).mock.calls[0][0].input.files ?? {}),
		).toHaveLength(4);
	});
});
