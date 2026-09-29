import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ChatProvider, { useChatContext } from "./ChatContext";
import { toast } from "sonner";
import { initiateStream, streamThread } from "@/lib/services";
import apiClient from "@/lib/utils/apiClient";
import { patchDefaults } from "@/lib/services/userSettingsService";
import { AEGRA_FILES_SOURCE } from "@/lib/utils/aegraStream";

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
	it("shows a native file while streaming and removes it on thread change without saving it to account settings", async () => {
		const files = {
			"/answer.txt": {
				content: "first\nsecond",
				created_at: "2024-01-01",
				modified_at: "2024-01-02",
			},
		};
		let streamController: ReadableStreamDefaultController<Uint8Array>;
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				streamController = controller;
			},
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ thread_id: "native" })),
			)
			.mockResolvedValueOnce(new Response(stream));
		vi.stubGlobal("fetch", fetchMock);
		const { result } = renderHook(() => useChatContext(), { wrapper });
		await waitFor(() => expect(result.current.fileSystem.size).toBe(4));
		let submit: Promise<void>;
		act(() => {
			submit = result.current.handleSubmit("write a file");
		});
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		act(() => {
			streamController.enqueue(
				new TextEncoder().encode(
					`event: values\ndata: ${JSON.stringify({ messages: [], files })}\n\n`,
				),
			);
		});
		await waitFor(() => {
			expect(result.current.controller).not.toBeNull();
			expect(result.current.filesMap.get(AEGRA_FILES_SOURCE)).toEqual(files);
			expect(result.current.fileSystem.get("/answer.txt")).toMatchObject({
				content: ["first", "second"],
				created_at: "2024-01-01",
				modified_at: "2024-01-02",
				source: AEGRA_FILES_SOURCE,
			});
		});
		expect(patchDefaults).not.toHaveBeenCalled();
		await act(async () => {
			streamController.enqueue(
				new TextEncoder().encode("event: end\ndata: {}\n\n"),
			);
			streamController.close();
			await submit!;
		});
		act(() => {
			result.current.setMetadata({ thread_id: "other", stream_owner: "aegra" });
			result.current.setFilesMap(new Map());
		});
		await waitFor(() =>
			expect(result.current.fileSystem.has("/answer.txt")).toBe(false),
		);
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(patchDefaults).not.toHaveBeenCalled();
	});

	it("rejects an explicit attachment before creation and retains the queued file", async () => {
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
		expect(initiateStream).not.toHaveBeenCalled();
		expect(result.current.runError?.message).toMatch(/files/i);
		expect(result.current.query).toBe("keep this queued prompt");
		expect(result.current.submissionFiles["/attached.txt"]).toMatchObject({
			content: ["explicit attachment"],
		});
		expect(toast.error).toHaveBeenCalled();
	});
	it("does not submit passive files or contact legacy for an unavailable thread", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify([])));
		vi.stubGlobal("fetch", fetchMock);
		const legacyLookup = vi.spyOn(apiClient, "get");
		const checkpointSearch = vi.spyOn(apiClient, "post");
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
		expect(legacyLookup).not.toHaveBeenCalled();
		expect(checkpointSearch).not.toHaveBeenCalled();
		expect(initiateStream).not.toHaveBeenCalled();
		expect(result.current.runError?.message).toMatch(/unavailable/i);
	});
});
