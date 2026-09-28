import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
	formatContent,
	formatMultimodalPayload,
	formatMessages,
} from "@/lib/utils/format";
import { streamThread, initiateStream } from "@/lib/services";
import apiClient from "@/lib/utils/apiClient";
import {
	createAegraThread,
	streamAegraThread,
	isAegraThread,
} from "@/lib/services/threadService";
import { consumeAegraStream } from "@/lib/utils/aegraStream";
import { getAuthToken } from "@/lib/utils/auth";
import { useAgentContext } from "@/context/AgentContext";
import { StreamMessageHandler } from "@/lib/utils/message";
import type { Todo } from "@/components/lists/TodoList";
import type { StreamEvent } from "@/lib/entities/stream";
import {
	DistributedStreamSource,
	type StreamSource,
} from "@/lib/utils/streamSource";
import {
	removeActiveStreamRecovery,
	updateActiveStreamRecovery,
	upsertActiveStreamRecovery,
} from "@/lib/utils/activeStreamRecovery";
import { toast } from "sonner";
import { getSettings } from "@/lib/services/userSettingsService";
import { useMountEffect } from "@/hooks/useMountEffect";

type StreamMode = "messages" | "values" | "updates" | "debug" | "tasks";

/**
 * Stable sonner id for stream-recovery failures. Sonner dedupes by id, so
 * reusing it collapses repeated recovery errors into a single toast. Kept
 * colocated with its call sites (see `lib/utils/connectionToast.ts`) rather
 * than in a shared barrel.
 */
export const STREAM_RECOVERY_TOAST_ID = "stream-recovery";

export type RunError = {
	runId: string;
	message: string;
	recoverable: boolean;
};

let in_mem_messages: any[] = [];

export type ChatContextType = {
	responseRef: React.RefObject<string>;
	toolCallMapRef: React.RefObject<Map<string, { name: string; args: string }>>;
	query: string;
	setQuery: (query: string) => void;
	appendToQuery: (text: string) => void;
	inputRef: React.RefObject<HTMLTextAreaElement>;
	handleSubmit: (query?: string, images?: File[]) => Promise<void>;
	sseHandler: (
		payload: any,
		messages: any[],
		stream_mode: StreamMode | Array<StreamMode>,
	) => void;
	clearContent: () => void;
	messages: any[];
	setMessages: (messages: any[]) => void;
	controller: AbortController | null;
	setController: (controller: AbortController | null) => void;
	metadata: {
		[key: string]: any;
	};
	setMetadata: (metadata: { [key: string]: any }) => void;
	abortQuery: () => void;
	deleteThread: (threadId: string) => void;
	// NEW
	handleTextareaResize: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	clearMessages: () => void;
	resetMetadata: () => void;
	// tools
	arcade: {
		tools: string[];
		toolkit: string[];
	};
	setArcade: (arcade: { tools: string[]; toolkit: string[] }) => void;
	streamingRate: {
		count: number;
		startTime: number;
		rate: number | null;
	} | null;
	filesMap: Map<string, any>;
	setFilesMap: (filesMap: Map<string, any>) => void;
	submissionFiles: Record<string, any> | null;
	setSubmissionFiles: (
		files: Record<string, any> | null,
		hasExplicitAttachments?: boolean,
	) => void;
	todos: Todo[];
	setTodos: (todos: Todo[]) => void;
	viewMode: "chat" | "editor";
	setViewMode: (mode: "chat" | "editor") => void;
	ttft: number | null;
	submitStartTime: number | null;
	// File CRUD operations
	addFile: (path: string, content?: string) => void;
	updateFileContent: (path: string, content: string) => void;
	removeFile: (path: string) => void;
	renameFile: (oldPath: string, newPath: string) => void;
	getFilesForSubmission: () => Record<string, any>;
	attachToDistributedStream: (options: {
		threadId: string;
		runId: string;
		lastEventId?: string | null;
		route?: string;
	}) => Promise<void>;
	// Persistent error surface for permanently-failed runs (DLQ replay)
	runError: RunError | null;
	setRunError: (error: RunError | null) => void;
	replayRun: (runId: string) => Promise<void>;
};

export default function useChat(): ChatContextType {
	const { setLoading, setLoadingMessage } = useAppContext();
	const { agent } = useAgentContext();
	const responseRef = useRef("");
	const toolNameRef = useRef("");
	const toolCallMapRef = useRef(
		new Map<string, { name: string; args: string }>(),
	);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const [query, setQuery] = useState("");
	const [messages, setMessagesState] = useState<any[]>([]);
	// const [state, setState] = useState<any[]>([]);

	const setMessages = (newMessages: any[]) => {
		in_mem_messages = [...newMessages];
		setMessagesState(newMessages);
	};
	const [metadata, setMetadataState] = useState<any>(() => {
		const storedProjectId = localStorage.getItem("current_project_id");
		return {
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			language: navigator.language,
			current_utc: undefined,
			...(storedProjectId ? { project_id: storedProjectId } : {}),
		};
	});

	// `metadata` is captured by closure at render time, but stream callbacks
	// (startManagedStream -> handleMessages) can outlive that render and need the
	// *latest* run_id, which is written by a later "metadata" event. Mirror the
	// state into a ref so those callbacks read fresh values.
	const metadataRef = useRef<any>(metadata);
	metadataRef.current = metadata;
	const setMetadata = useCallback((update: any) => {
		const previous = metadataRef.current;
		const next = {
			...(typeof update === "function" ? update(previous) : update),
		};
		if (typeof update === "function" && next.thread_id !== previous.thread_id) {
			delete next.stream_owner;
		}
		metadataRef.current = next;
		setMetadataState(next);
	}, []);

	const [controller, setController] = useState<AbortController | null>(null);

	// Persistent error state for permanently-failed runs (DLQ replay affordance).
	// Set by the distributed "error" stream event; cleared on a fresh submit or
	// once a replay is issued.
	const [runError, setRunError] = useState<RunError | null>(null);

	const [streamingRate, setStreamingRate] = useState<{
		count: number;
		startTime: number;
		rate: number | null;
	} | null>(null);

	const [savedTimezone, setSavedTimezone] = useState<string | null>(null);

	useMountEffect(() => {
		getSettings()
			.then((res) => setSavedTimezone(res.defaults.timezone))
			.catch(() => {});
	});

	const [arcade, setArcade] = useState({
		tools: [] as string[],
		toolkit: [] as string[],
	});

	const [filesMap, setFilesMap] = useState<Map<string, any>>(new Map());
	const [submissionFiles, setSubmissionFilesState] = useState<Record<
		string,
		any
	> | null>(null);
	const [todos, setTodos] = useState<Todo[]>([]);
	const [viewMode, setViewMode] = useState<"chat" | "editor">("chat");
	const [ttft, setTtft] = useState<number | null>(null);
	const [submitStartTime, setSubmitStartTime] = useState<number | null>(null);
	const submitStartTimeRef = useRef<number | null>(null);

	const hasExplicitAttachmentsRef = useRef(false);
	const setSubmissionFiles = useCallback(
		(
			files: Record<string, any> | null,
			hasExplicitAttachments = Object.keys(files ?? {}).length > 0,
		) => {
			hasExplicitAttachmentsRef.current = hasExplicitAttachments;
			setSubmissionFilesState(files ? { ...files } : null);
		},
		[],
	);

	const collectFilesFromLegacyMap = useCallback((): Record<string, any> => {
		const result: Record<string, any> = {};
		filesMap.forEach((files) => {
			Object.assign(result, files);
		});
		return result;
	}, [filesMap]);

	const getResolvedSubmissionFiles = useCallback((): Record<string, any> => {
		return submissionFiles ?? collectFilesFromLegacyMap();
	}, [collectFilesFromLegacyMap, submissionFiles]);

	const abortQuery = async () => {
		// Send abort signal to backend for distributed mode (fire-and-forget for responsive UX)
		const threadId = metadata?.thread_id;
		if (
			threadId &&
			metadata?.stream_owner !== "aegra" &&
			!isAegraThread(threadId)
		) {
			import("@/lib/services/threadService")
				.then(({ abortThread }) => abortThread(threadId))
				.then(() => console.log("Backend abort signal sent"))
				.catch((err) =>
					console.warn("Failed to send backend abort signal:", err),
				);
		}

		aegraControllerRef.current?.abort();
		aegraControllerRef.current = null;
		// Immediately close local connection for responsive UX
		if (controller) {
			controller.abort();
			setController(null);
		}

		setLoading(false);
		setLoadingMessage("");
	};

	const sseHandler = (payload: any, messages: any[]) => {
		handleMessages(payload, messages);
		return true;
	};

	/**
	 * Converts a StreamEvent to the legacy payload format for handleMessages().
	 * This allows reusing the existing message handling logic.
	 */
	const convertEventToLegacy = (event: StreamEvent): any[] | null => {
		switch (event.type) {
			case "metadata":
				return ["metadata", event.data];
			case "messages":
				return ["messages", event.data];
			case "values":
				return ["values", event.data];
			case "error":
				// Forward the full error payload ({ run_id, error, recoverable })
				// so handleMessages can surface a persistent, replayable error
				// state. recoveryMode errors are handled upstream in
				// startManagedStream and never reach this converter.
				return ["error", event.data];
			case "mcp_sandbox_unreachable":
				// Surfaced as a persistent, non-recoverable run error banner.
				// Without this case the event was silently dropped on the unified
				// stream path and the run stopped with no explanation.
				return ["mcp_sandbox_unreachable", event.data];
			case "aborted":
				return ["aborted", event.data];
			case "done":
				return null; // Handled separately
			default:
				return null;
		}
	};

	const clearDistributedRecovery = (threadId?: string) => {
		if (threadId) {
			removeActiveStreamRecovery(threadId);
		}
	};

	const persistDistributedRecovery = (
		source: DistributedStreamSource,
		route: string,
	) => {
		const now = new Date().toISOString();
		upsertActiveStreamRecovery({
			threadId: source.getThreadId(),
			runId: source.getRunId(),
			lastEventId: source.getLastEventId(),
			startedAt: now,
			updatedAt: now,
			route,
			status: "running",
		});
	};

	const updateDistributedRecoveryCursor = (
		source: DistributedStreamSource,
		route: string,
	) => {
		updateActiveStreamRecovery(source.getThreadId(), {
			runId: source.getRunId(),
			lastEventId: source.getLastEventId(),
			updatedAt: new Date().toISOString(),
			route,
		});
	};

	const getRoutePath = () =>
		typeof window !== "undefined" ? window.location.pathname : "/chat";

	const startManagedStream = async (
		stream: StreamSource,
		options: {
			recoveryMode: boolean;
			route: string;
		},
	): Promise<{ controller: AbortController; stream: StreamSource }> => {
		const controller = new AbortController();
		// Per-stream latch: a failing recovery stream can emit many `error`
		// events, each of which previously produced its own toast. Notify once
		// per stream (a *new* stream still gets its own notification).
		let recoveryFailureNotified = false;
		const notifyRecoveryFailure = (message: string) => {
			if (recoveryFailureNotified) return;
			recoveryFailureNotified = true;
			toast.error(message, { id: STREAM_RECOVERY_TOAST_ID });
		};
		const distributedStream =
			stream instanceof DistributedStreamSource ? stream : null;
		const threadId = distributedStream?.getThreadId() ?? metadata?.thread_id;

		stream.onEvent((event: StreamEvent) => {
			// Bail out if the stream was aborted (prevents stale SSE events from
			// re-populating messages/metadata after clearMessages)
			if (controller.signal.aborted) return;

			if (distributedStream) {
				updateDistributedRecoveryCursor(distributedStream, options.route);
			}

			if (
				event.type === "done" ||
				event.type === "error" ||
				event.type === "mcp_sandbox_unreachable" ||
				event.type === "aborted"
			) {
				clearDistributedRecovery(threadId);
			}

			if (event.type === "done") {
				setLoading(false);
				setLoadingMessage("");
				setController(null);
				return;
			}

			if (options.recoveryMode && event.type === "error") {
				setLoading(false);
				setLoadingMessage("");
				setController(null);
				// Stop the stream: without this the source keeps polling and keeps
				// emitting error events.
				controller.abort();
				stream.close();
				notifyRecoveryFailure(
					event.data.error || "Lost connection to the live stream.",
				);
				return;
			}

			if (options.recoveryMode && event.type === "aborted") {
				setLoading(false);
				setLoadingMessage("");
				setController(null);
				return;
			}

			const legacyPayload = convertEventToLegacy(event);
			if (legacyPayload) {
				sseHandler(legacyPayload, in_mem_messages);
			}
		});

		stream.onError((error: Error) => {
			console.error("Stream error:", error);
			const status = (error as Error & { status?: number }).status;
			setLoading(false);
			setLoadingMessage("");
			setController(null);

			if (options.recoveryMode) {
				if (status === 404 || status === 409) {
					clearDistributedRecovery(threadId);
					toast(
						"Stream ended while reconnecting. Loaded the latest saved thread state.",
					);
					return;
				}

				notifyRecoveryFailure(
					"Lost connection to the live stream. Refresh to retry reconnecting.",
				);
				return;
			}

			alert(error.message);

			const lastMessageIndex =
				in_mem_messages.length > 0 ? in_mem_messages.length - 1 : -1;
			if (lastMessageIndex >= 0) {
				setQuery(in_mem_messages[lastMessageIndex].content);
				clearMessages(lastMessageIndex);
			}
		});

		stream.onClose(() => {
			console.log("Stream connection closed");
		});

		controller.signal.addEventListener("abort", () => {
			console.log("Aborting stream connection");
			stream.close();
			setLoading(false);
			setLoadingMessage("");
		});

		void stream.start();
		return { controller, stream };
	};

	/**
	 * Handles SSE using the new unified stream abstraction.
	 * Supports both sync mode (direct SSE) and distributed mode (polling).
	 */
	const handleSSEUnified = async (
		query: string,
		images: File[],
	): Promise<{ controller: AbortController; stream: StreamSource }> => {
		// Optimistic UI: Add user message immediately
		const userMessage = {
			id: `user-${Date.now()}`,
			model: agent.model,
			content: query,
			role: "user",
			type: "user",
		};

		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		clearContent();
		const formatedMessages = await formatMultimodalPayload(query, images);
		const enrichedMetadata = getMetadata();

		const filesToSubmit = getResolvedSubmissionFiles();

		// Build payload based on agent type
		const payload = agent.public
			? {
					input: {
						messages: formatedMessages,
					},
					metadata: enrichedMetadata,
					model: "",
				}
			: {
					system_prompt: agent.prompt,
					input: {
						messages: formatedMessages,
						...(Object.keys(filesToSubmit).length > 0 && {
							files: filesToSubmit,
						}),
					},
					model: agent.model,
					metadata: enrichedMetadata,
					tools: agent.tools,
					a2a: agent.a2a,
					mcp: agent.mcp,
					subagents: agent.subagents,
				};

		const route = getRoutePath();
		const stream = await initiateStream(payload);
		if (stream instanceof DistributedStreamSource) {
			persistDistributedRecovery(stream, route);
		}

		setLoadingMessage("Processing request...");
		return startManagedStream(stream, {
			recoveryMode: false,
			route,
		});
	};

	const attachToDistributedStream = async ({
		threadId,
		runId,
		lastEventId = null,
		route = getRoutePath(),
	}: {
		threadId: string;
		runId: string;
		lastEventId?: string | null;
		route?: string;
	}) => {
		if (controller) {
			return;
		}

		setLoading(true);
		setLoadingMessage("Reconnecting stream...");
		const stream = new DistributedStreamSource(threadId, runId, {
			skipInitialDelay: true,
			lastEventId,
		});
		persistDistributedRecovery(stream, route);
		const { controller: nextController } = await startManagedStream(stream, {
			recoveryMode: true,
			route,
		});
		setController(nextController);
	};

	const handleSSE = async (
		query: string,
		images: File[],
		abortController: AbortController | null = null,
	) => {
		// Add user message to the existing messages state
		const userMessage = {
			id: `user-${Date.now()}`,
			model: agent.model,
			content: query,
			role: "user",
			type: "user",
		};

		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		clearContent();
		const controller = abortController || new AbortController();
		const formatedMessages = await formatMultimodalPayload(query, images);
		const enrichedMetadata = getMetadata();
		const filesToSubmit = getResolvedSubmissionFiles();

		// For public agents, only send input and metadata (settings are server-side)
		const payload = agent.public
			? {
					input: {
						messages: formatedMessages,
					},
					metadata: enrichedMetadata,
					model: "", // Required by type but ignored server-side for public agents
				}
			: {
					system_prompt: agent.prompt,
					input: {
						messages: formatedMessages,
						...(Object.keys(filesToSubmit).length > 0 && {
							files: filesToSubmit,
						}),
					},
					model: agent.model,
					metadata: enrichedMetadata,
					tools: agent.tools,
					a2a: agent.a2a,
					mcp: agent.mcp,
					subagents: agent.subagents,
				};

		const source = streamThread(payload);
		source.stream();

		source.addEventListener("message", function (e: any) {
			// Check for [DONE] signal first (not valid JSON)
			if (e.data === "[DONE]") {
				console.log("Stream complete: [DONE] received");
				source.close();
				setController(null);
				setLoading(false);
				return;
			}

			// Parse JSON-encoded data payloads
			try {
				const payload = JSON.parse(e.data);
				sseHandler(payload, in_mem_messages);
			} catch (_parseError) {
				console.warn("Failed to parse SSE message:", e.data);
			}
		});

		// Close handling
		source.addEventListener("close", () => {
			console.log("Connection closed");
			source.close();
			setController(null);
			setLoading(false);
		});

		source.addEventListener("error", (e: any) => {
			console.error("Error on stream:", e);
			const error = JSON.parse(e.data);
			alert(error.detail || error.error);
			source.close();
			setController(null);
			setLoading(false);
			const lastMessageIndex =
				in_mem_messages.length > 0 ? in_mem_messages.length - 1 : -1;
			if (lastMessageIndex >= 0) {
				setQuery(in_mem_messages[lastMessageIndex].content);
				clearMessages(lastMessageIndex);
			}
		});

		controller.signal.addEventListener("abort", () => {
			console.log("Aborting stream connection");
			source.close();
			setLoading(false);
		});

		return { controller, source };
	};

	const aegraControllerRef = useRef<AbortController | null>(null);

	const handleAegraSubmit = async (content: string, images: File[]) => {
		const abortController = new AbortController();
		aegraControllerRef.current = abortController;
		setController(abortController);
		try {
			const unsupported = [
				["files", images.length > 0 || hasExplicitAttachmentsRef.current],
				["public assistants", agent.public],
				["MCP", Object.keys(agent.mcp ?? {}).length > 0],
				["A2A", Object.keys(agent.a2a ?? {}).length > 0],
				["subagents", (agent.subagents?.length ?? 0) > 0],
				["custom system prompt", Boolean(agent.prompt?.trim())],
				["checkpoint overrides", Boolean(metadata.checkpoint_id)],
			]
				.filter(([, enabled]) => enabled)
				.map(([name]) => name);
			if (unsupported.length)
				throw new Error(`Aegra does not support: ${unsupported.join(", ")}`);
			let threadId = metadataRef.current.thread_id;
			if (!threadId) {
				threadId = await createAegraThread(abortController.signal);
				if (abortController.signal.aborted) return;
			}
			metadataRef.current = {
				...metadataRef.current,
				thread_id: threadId,
				stream_owner: "aegra",
			};
			setMetadata(metadataRef.current);
			const history = [
				...messages,
				{ id: `user-${Date.now()}`, type: "human", role: "user", content },
			];
			setMessages(history);
			clearContent();
			const response = await streamAegraThread(
				threadId,
				content,
				agent.model,
				agent.tools ?? [],
				abortController.signal,
			);
			await consumeAegraStream(
				response,
				(state) => {
					if (abortController.signal.aborted) return;
					if (state.runId) {
						metadataRef.current = {
							...metadataRef.current,
							run_id: state.runId,
						};
						setMetadata(metadataRef.current);
					}
					if (state.messages.length) {
						const hasHistory = state.messages.some((m) =>
							["human", "user"].includes(m.type),
						);
						setMessages(
							formatMessages(
								hasHistory ? state.messages : [...history, ...state.messages],
							),
						);
					}
				},
				abortController.signal,
			);
			if (!abortController.signal.aborted) setQuery("");
		} catch (error) {
			if (!abortController.signal.aborted) {
				const message = error instanceof Error ? error.message : String(error);
				setRunError({
					runId: metadataRef.current.run_id ?? "",
					message,
					recoverable: false,
				});
				toast.error(message);
				setQuery((current) => current || content);
			}
		} finally {
			if (aegraControllerRef.current === abortController) {
				aegraControllerRef.current = null;
				setController(null);
				setLoading(false);
				setLoadingMessage("");
			}
		}
	};

	const handleSubmit = async (argQuery?: string, images: File[] = []) => {
		if (aegraControllerRef.current) return;
		setLoadingMessage("Request submitted...");
		setLoading(true);
		// Clear any stale error surface from a previous failed run so it does
		// not persist into the new run.
		setRunError(null);
		setTtft(null);
		const now = Date.now();
		submitStartTimeRef.current = now;
		setSubmitStartTime(now);

		const queryToSubmit = argQuery || query;

		if (
			!metadataRef.current.thread_id ||
			metadataRef.current.stream_owner === "aegra" ||
			isAegraThread(metadataRef.current.thread_id)
		) {
			await handleAegraSubmit(queryToSubmit, images);
			return;
		}

		try {
			// Try unified handler (supports both sync and distributed modes)
			const { controller } = await handleSSEUnified(queryToSubmit, images);
			setController(controller);
		} catch (error) {
			// Fallback to legacy SSE handler if unified fails
			console.warn("Unified stream failed, falling back to legacy SSE:", error);
			const { controller } = await handleSSE(queryToSubmit, images);
			setController(controller);
		}

		setQuery("");
	};

	const clearContent = () => {
		if (responseRef.current) {
			responseRef.current = "";
		}
		toolCallMapRef.current.clear();
	};

	const getMetadata = () => {
		return {
			...metadata,
			assistant_id: agent.id,
			current_utc: new Date().toISOString(),
			timezone:
				savedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
			language: Intl.DateTimeFormat().resolvedOptions().locale,
		};
	};

	const resetMetadata = () => {
		metadataRef.current = {};
		setMetadata({});
	};

	const clearMessages = (index?: number) => {
		if (
			typeof index === "number" &&
			index >= 0 &&
			index < in_mem_messages.length
		) {
			in_mem_messages = in_mem_messages.slice(0, index);
		} else {
			in_mem_messages = [];
			resetMetadata();
		}
		setMessages(in_mem_messages);
		setFilesMap(new Map());
		setTodos([]);
		setViewMode("chat");
		setTtft(null);
		submitStartTimeRef.current = null;
		setSubmitStartTime(null);
	};

	const handleMessages = (payload: any, history: any[]) => {
		/**
		 * Tool Call Chunk Structure (US-001 findings):
		 *
		 * Each SSE payload for tool calls arrives as:
		 *   ["messages", [AIMessageChunk_dict, metadata]]
		 *
		 * The AIMessageChunk_dict contains:
		 *   - id: string (same id for all chunks of the same AI turn)
		 *   - tool_call_chunks: Array<{ id: string, name: string, args: string, index: number, type: string }>
		 *     - id: unique tool_call_id (e.g. "call_abc123") — same across all arg chunks for that call
		 *     - name: tool name (only present on first chunk, empty string on subsequent)
		 *     - args: partial JSON string (incrementally accumulated)
		 *     - index: 0-based index of the tool call within the AI turn
		 *   - tool_calls: Array<{ id, name, args }> — finalized tool calls (populated on completion)
		 *
		 * Arrival ordering:
		 *   1. First chunk: tool_call_chunks[0] has { id, name, args: "" or partial }
		 *   2. Subsequent chunks: same id, name="" (empty), args += next fragment
		 *   3. When multiple tools are called, each gets its own tool_call_chunks entry
		 *      with a distinct id and index
		 *   4. Chunks for different tool calls may interleave
		 *
		 * Key insight: Backend already sends individual tool_call_chunks with unique ids.
		 * The frontend currently only reads tool_call_chunks[0], losing multi-tool-call data.
		 */
		const streamMode = payload[0];

		if (streamMode === "error") {
			// Distributed permanent failure. payload[1] is the error object
			// ({ run_id, error, recoverable }) forwarded by convertEventToLegacy.
			// Surface a persistent, replayable error state instead of a transient
			// alert() so the user can recover without refreshing.
			const errorPayload = payload[1];
			const isErrorObject =
				typeof errorPayload === "object" && errorPayload !== null;
			const runId = isErrorObject
				? (errorPayload.run_id ?? metadataRef.current?.run_id ?? "")
				: (metadataRef.current?.run_id ?? "");
			const message = isErrorObject
				? (errorPayload.error ?? "The request failed permanently.")
				: String(errorPayload);
			const recoverable = isErrorObject
				? errorPayload.recoverable !== false
				: true;

			setRunError({ runId, message, recoverable });
			setLoading(false);
			setController(null);
			return;
		}

		// Handle MCP sandbox unreachable. This is a terminal, non-recoverable
		// failure: there is no DLQ entry to replay, so the banner hides Replay and
		// the copy has to tell the user what to do instead. The backend message
		// already reads "MCP sandbox unreachable: <detail>", so no title is set —
		// a title would repeat the phrase.
		if (streamMode === "mcp_sandbox_unreachable") {
			setLoading(false);
			setController(null);
			setRunError({
				runId: metadataRef.current?.run_id ?? "",
				message:
					typeof payload[1] === "string"
						? payload[1]
						: "The MCP sandbox server could not be reached. Send your message again to retry.",
				recoverable: false,
			});
			return;
		}

		// Handle aborted events from distributed workers
		if (streamMode === "aborted") {
			console.log("Stream aborted by server:", payload[1]?.reason);
			setLoading(false);
			setController(null);
			return;
		}

		// Handle metadata events (first event in distributed mode stream)
		// This captures thread_id early for multi-turn conversations
		if (streamMode === "metadata") {
			const metadataPayload = payload[1];
			setMetadata((prev: any) => ({
				...prev,
				thread_id: metadataPayload.thread_id,
				run_id: metadataPayload.run_id ?? prev?.run_id,
				assistant_id: metadataPayload.assistant_id,
				project_id: metadataPayload.project_id,
			}));
			return;
		}

		if (streamMode === "values") {
			const valuesData = payload[1];

			// Store files with message association
			if (valuesData.files && Object.keys(valuesData.files).length > 0) {
				// Associate files with the latest AI or tool message
				const latestAiMessage = history
					.slice()
					.reverse()
					.find((msg: any) =>
						["ai", "assistant", "tool"].includes(msg.type ?? msg.role),
					);

				if (latestAiMessage) {
					setFilesMap((prev) => {
						const newMap = new Map(prev);
						newMap.set(latestAiMessage.id, valuesData.files);
						return newMap;
					});
				}
			}

			// Store todos with message association
			if (valuesData.todos && Object.keys(valuesData.todos).length > 0) {
				// Associate todos with the latest AI or tool message
				setTodos(valuesData.todos);
			}

			return;
		}

		if (streamMode === "messages") {
			const response = payload[1][0];
			const responseMetadata = payload[1][1];

			// Extract agent_name from subagent messages (promoted from lc_agent_name by backend)
			// Ensure agent_name is explicitly on the response before passing to StreamMessageHandler
			if (response.agent_name === undefined) {
				response.agent_name = null;
			}
			setMetadata((prev: any) => ({
				...prev,
				thread_id: responseMetadata.thread_id,
			}));

			const expectedContent = formatContent(response.content);
			const existingIndex = history.findIndex(
				(msg: any) => msg.id === response.id,
			);

			// Calculate TTFT on first token
			if (existingIndex === -1 && submitStartTimeRef.current !== null) {
				const ttftValue = Date.now() - submitStartTimeRef.current;
				setTtft(ttftValue);
				submitStartTimeRef.current = null;
				setSubmitStartTime(null);
			}

			// Update streaming rate
			if (
				expectedContent &&
				(!response.tool_call_chunks || response.tool_call_chunks.length === 0)
			) {
				if (existingIndex === -1) {
					setStreamingRate({
						count: expectedContent.length,
						startTime: Date.now(),
						rate: null,
					});
				} else {
					setStreamingRate((prev: any) => {
						const now = Date.now();
						const startTime = prev?.startTime || now;
						const newCount = (prev?.count || 0) + expectedContent.length;
						const elapsed = (now - startTime) / 1000;

						return {
							count: newCount,
							startTime,
							rate: elapsed > 0.1 ? Math.round(newCount / elapsed / 4) : null,
						};
					});
				}
			}

			const streamHandler = new StreamMessageHandler(
				toolNameRef,
				toolCallMapRef,
				history,
			);

			// Handle Final Response & Tool Response
			streamHandler.processResponse(response, expectedContent, existingIndex);
			setLoadingMessage(`Calling ${streamHandler.toolNameRef.current} tool...`);

			// CRITICAL FIX: Apply formatMessages() to normalize streaming data
			// This ensures consistency with checkpoint reload behavior
			const normalizedHistory = formatMessages(streamHandler.history);
			// Sync in_mem_messages with normalized state so the next SSE event
			// operates on the same data that React renders (prevents divergence).
			// Spread into new array to avoid mutating React state directly.
			in_mem_messages = [...normalizedHistory];
			setMessagesState(normalizedHistory);
			// NOTE: Stream stop is now handled by the [DONE] signal in the event handler
			// The unified handler (handleSSEUnified) and legacy handler both check for [DONE]
			// Do NOT stop here based on streamStop() - wait for explicit [DONE] signal
		}
	};

	const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		setQuery(e.target.value);
	};

	const appendToQuery = useCallback((text: string) => {
		const quotedText = `> ${text}\n\n`;
		setQuery((prev) => (prev ? `${quotedText}${prev}` : quotedText));
		// Focus input and position cursor after the quoted text
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.focus();
				const cursorPosition = quotedText.length;
				inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
			}
		}, 0);
	}, []);

	const deleteThread = async (threadId: string) => {
		try {
			const response = await apiClient.delete(`/threads/${threadId}`, {
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${getAuthToken()}`,
				},
			});
			if (response.status >= 200 && response.status < 300) {
				return true;
			}
			return false;
		} catch (error: any) {
			console.error("Error deleting thread:", error);
			throw new Error(
				error.response?.data?.detail || "Failed to delete thread",
			);
		}
	};

	/**
	 * Replays a permanently-failed run via the backend DLQ replay endpoint.
	 * On success the failed run is re-enqueued under a new run_id; we clear the
	 * error surface and attach to the new distributed stream so its output
	 * renders live.
	 */
	const replayRun = async (runId: string) => {
		if (!runId) {
			toast.error("Cannot replay: missing run id.");
			return;
		}

		const threadId = metadata?.thread_id;

		try {
			const response = await apiClient.post(`/llm/dlq/${runId}/replay`);
			const data = response?.data ?? {};

			if (data.status === "not_found") {
				toast.error("Replay failed: run no longer available.");
				return;
			}

			// Clear the error surface now that a replay has been accepted.
			setRunError(null);
			toast("Replaying…");

			const newRunId = data.new_run_id;
			if (threadId && newRunId) {
				setLoading(true);
				setLoadingMessage("Replaying request...");
				await attachToDistributedStream({
					threadId,
					runId: newRunId,
				});
			}
		} catch (error: any) {
			console.error("Failed to replay run:", error);
			toast.error(
				error?.response?.data?.detail || "Failed to replay the request.",
			);
		}
	};

	// assistant_id is set at submission time in getMetadata() — no effect needed

	// File CRUD operations (wrapped in useCallback for stable references)
	const addFile = useCallback((path: string, content: string = "") => {
		const now = new Date().toISOString();
		const newFile = {
			content: content.split("\n"),
			created_at: now,
			modified_at: now,
		};
		setFilesMap((prev) => {
			const newMap = new Map(prev);
			const userFilesKey = "__user_files__";
			const userFiles = newMap.get(userFilesKey) || {};
			newMap.set(userFilesKey, { ...userFiles, [path]: newFile });
			return newMap;
		});
	}, []);

	const updateFileContent = useCallback((path: string, content: string) => {
		setFilesMap((prev) => {
			const newMap = new Map(prev);
			for (const [key, files] of newMap.entries()) {
				if (files && files[path]) {
					newMap.set(key, {
						...files,
						[path]: {
							...files[path],
							content: content.split("\n"),
							modified_at: new Date().toISOString(),
						},
					});
					return newMap;
				}
			}
			return newMap;
		});
	}, []);

	const removeFile = useCallback((path: string) => {
		setFilesMap((prev) => {
			const newMap = new Map(prev);
			for (const [key, files] of newMap.entries()) {
				if (files && files[path]) {
					const { [path]: _removed, ...rest } = files;
					if (Object.keys(rest).length === 0) {
						newMap.delete(key);
					} else {
						newMap.set(key, rest);
					}
					return newMap;
				}
			}
			return newMap;
		});
	}, []);

	const renameFile = useCallback((oldPath: string, newPath: string) => {
		setFilesMap((prev) => {
			const newMap = new Map(prev);
			for (const [key, files] of newMap.entries()) {
				if (files && files[oldPath]) {
					const { [oldPath]: fileData, ...rest } = files;
					newMap.set(key, {
						...rest,
						[newPath]: {
							...fileData,
							modified_at: new Date().toISOString(),
						},
					});
					return newMap;
				}
			}
			return newMap;
		});
	}, []);

	const getFilesForSubmission = useCallback((): Record<string, any> => {
		return getResolvedSubmissionFiles();
	}, [getResolvedSubmissionFiles]);

	return {
		responseRef,
		toolCallMapRef,
		handleSubmit,
		sseHandler,
		clearContent,
		query,
		setQuery,
		appendToQuery,
		inputRef,
		messages,
		setMessages,
		metadata,
		setMetadata,
		controller,
		setController,
		// state,
		// setState,
		// NEW
		handleTextareaResize,
		clearMessages,
		resetMetadata,
		abortQuery,
		deleteThread,
		// tools
		arcade,
		setArcade,
		streamingRate,
		filesMap,
		setFilesMap,
		submissionFiles,
		setSubmissionFiles,
		todos,
		setTodos,
		viewMode,
		setViewMode,
		ttft,
		submitStartTime,
		// File CRUD
		addFile,
		updateFileContent,
		removeFile,
		renameFile,
		getFilesForSubmission,
		attachToDistributedStream,
		runError,
		setRunError,
		replayRun,
	};
}
