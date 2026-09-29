import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { formatMessages } from "@/lib/utils/format";
import {
	createAegraThread,
	streamAegraThread,
	searchAegraThreads,
} from "@/lib/services/threadService";
import {
	AEGRA_FILES_SOURCE,
	consumeAegraStream,
} from "@/lib/utils/aegraStream";
import { useAgentContext } from "@/context/AgentContext";
import type { Todo } from "@/components/lists/TodoList";
import { toast } from "sonner";
import { getSettings } from "@/lib/services/userSettingsService";
import { useMountEffect } from "@/hooks/useMountEffect";

type StreamMode = "messages" | "values" | "updates" | "debug" | "tasks";

export type RunError = {
	runId: string;
	message: string;
	recoverable: boolean;
};

export type ChatContextType = {
	responseRef: React.RefObject<string>;
	toolCallMapRef: React.RefObject<Map<string, { name: string; args: string }>>;
	query: string;
	setQuery: (query: string) => void;
	appendToQuery: (text: string) => void;
	inputRef: React.RefObject<HTMLTextAreaElement>;
	handleSubmit: (query?: string, images?: File[]) => Promise<void>;
	preflightSubmit: (images?: File[]) => boolean;
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
	metadata: { [key: string]: any };
	setMetadata: (metadata: { [key: string]: any }) => void;
	abortQuery: () => void;
	deleteThread: (threadId: string) => Promise<never>;
	handleTextareaResize: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	clearMessages: () => void;
	resetMetadata: () => void;
	arcade: { tools: string[]; toolkit: string[] };
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
	runError: RunError | null;
	setRunError: (error: RunError | null) => void;
	replayRun: (runId: string) => Promise<void>;
};

export default function useChat(): ChatContextType {
	const { setLoading, setLoadingMessage } = useAppContext();
	const { agent } = useAgentContext();
	const responseRef = useRef("");
	const toolCallMapRef = useRef(
		new Map<string, { name: string; args: string }>(),
	);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const [query, setQuery] = useState("");
	const [messages, setMessages] = useState<any[]>([]);
	const [metadata, setMetadataState] = useState<any>(() => {
		const projectId = localStorage.getItem("current_project_id");
		return {
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			language: navigator.language,
			current_utc: undefined,
			...(projectId ? { project_id: projectId } : {}),
		};
	});
	const metadataRef = useRef<any>(metadata);
	metadataRef.current = metadata;
	const setMetadata = useCallback((update: any) => {
		const previous = metadataRef.current;
		const change = typeof update === "function" ? update(previous) : update;
		const next = { ...change };
		if (
			typeof update === "function" &&
			next.thread_id !== previous.thread_id &&
			change.stream_owner === previous.stream_owner
		)
			delete next.stream_owner;
		metadataRef.current = next;
		setMetadataState(next);
	}, []);
	const [controller, setController] = useState<AbortController | null>(null);
	const activeController = useRef<AbortController | null>(null);
	const [runError, setRunError] = useState<RunError | null>(null);
	const [streamingRate] = useState<{
		count: number;
		startTime: number;
		rate: number | null;
	} | null>(null);
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
	const hasExplicitAttachmentsRef = useRef(false);

	useMountEffect(() => {
		getSettings().catch(() => {});
	});

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
	const getFilesForSubmission = useCallback((): Record<string, any> => {
		if (submissionFiles) return submissionFiles;
		const files: Record<string, any> = {};
		filesMap.forEach((entry) => Object.assign(files, entry));
		return files;
	}, [submissionFiles, filesMap]);
	const clearContent = () => {
		responseRef.current = "";
		toolCallMapRef.current.clear();
	};
	const resetMetadata = () => setMetadata({});
	const clearMessages = () => {
		setMessages([]);
		resetMetadata();
		setFilesMap(new Map());
		setTodos([]);
		setViewMode("chat");
		setTtft(null);
		setSubmitStartTime(null);
	};
	const abortQuery = () => {
		activeController.current?.abort();
		activeController.current = null;
		setController(null);
		setLoading(false);
		setLoadingMessage("");
	};
	const rejectSubmission = (message: string) => {
		setRunError({
			runId: metadataRef.current.run_id ?? "",
			message,
			recoverable: false,
		});
		toast.error(message);
		setLoading(false);
		setLoadingMessage("");
	};
	const preflightSubmit = (images: File[] = []) => {
		const unsupported = [
			["files", images.length > 0 || hasExplicitAttachmentsRef.current],
			["public assistants", agent.public],
			["MCP", Object.keys(agent.mcp ?? {}).length > 0],
			["A2A", Object.keys(agent.a2a ?? {}).length > 0],
			["subagents", (agent.subagents?.length ?? 0) > 0],
			["custom system prompt", Boolean(agent.prompt?.trim())],
			["checkpoint overrides", Boolean(metadataRef.current.checkpoint_id)],
		]
			.filter(([, enabled]) => enabled)
			.map(([name]) => name);
		if (!unsupported.length) return true;
		rejectSubmission(`Aegra does not support: ${unsupported.join(", ")}`);
		return false;
	};
	const handleSubmit = async (argQuery?: string, images: File[] = []) => {
		if (activeController.current) return;
		setRunError(null);
		const content = argQuery || query;
		if (!preflightSubmit(images)) {
			setQuery((current) => current || content);
			return;
		}
		const existingThreadId = metadataRef.current.thread_id;
		if (existingThreadId && metadataRef.current.stream_owner !== "aegra") {
			try {
				if (metadataRef.current.stream_owner === "legacy")
					throw new Error("Thread is unavailable in Aegra");
				let found = false;
				for (let offset = 0; !found; offset += 100) {
					const page = await searchAegraThreads(100, offset);
					found = page.some((thread) => thread.thread_id === existingThreadId);
					if (!found && page.length < 100)
						throw new Error("Thread is unavailable in Aegra");
				}
				setMetadata({ ...metadataRef.current, stream_owner: "aegra" });
			} catch (error) {
				rejectSubmission(
					error instanceof Error ? error.message : String(error),
				);
				setQuery((current) => current || content);
				return;
			}
		}
		const abortController = new AbortController();
		activeController.current = abortController;
		setController(abortController);
		setLoadingMessage("Request submitted...");
		setLoading(true);
		setTtft(null);
		setSubmitStartTime(Date.now());
		try {
			let threadId = metadataRef.current.thread_id;
			if (!threadId) {
				threadId = await createAegraThread(abortController.signal);
				if (abortController.signal.aborted) return;
			}
			setMetadata({
				...metadataRef.current,
				thread_id: threadId,
				stream_owner: "aegra",
			});
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
					if (
						abortController.signal.aborted ||
						metadataRef.current.thread_id !== threadId
					)
						return;
					const files = state.files;
					if (files) {
						setFilesMap((previous) => {
							const next = new Map(previous);
							if (Object.keys(files).length)
								next.set(AEGRA_FILES_SOURCE, files);
							else next.delete(AEGRA_FILES_SOURCE);
							return next;
						});
					}
					if (state.runId)
						setMetadata({ ...metadataRef.current, run_id: state.runId });
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
				rejectSubmission(
					error instanceof Error ? error.message : String(error),
				);
				setQuery((current) => current || content);
			}
		} finally {
			if (activeController.current === abortController) {
				activeController.current = null;
				setController(null);
				setLoading(false);
				setLoadingMessage("");
			}
		}
	};
	const appendToQuery = useCallback((text: string) => {
		const quotedText = `> ${text}\n\n`;
		setQuery((prev) => (prev ? `${quotedText}${prev}` : quotedText));
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.focus();
				inputRef.current.setSelectionRange(
					quotedText.length,
					quotedText.length,
				);
			}
		}, 0);
	}, []);
	const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		e.target.style.height = "auto";
		e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
		setQuery(e.target.value);
	};
	const deleteThread = async (_threadId: string): Promise<never> => {
		throw new Error("Native thread deletion is unavailable");
	};
	const replayRun = async (_runId: string) => {
		toast.error("Run replay is unavailable for Aegra threads.");
	};
	const attachToDistributedStream = async (_options: {
		threadId: string;
		runId: string;
		lastEventId?: string | null;
		route?: string;
	}) => {
		throw new Error("Legacy stream recovery is unavailable for Aegra threads");
	};
	const sseHandler = (
		_payload: any,
		_messages: any[],
		_streamMode: StreamMode | Array<StreamMode>,
	) => {};
	const addFile = useCallback((path: string, content = "") => {
		const now = new Date().toISOString();
		setFilesMap((prev) => {
			const next = new Map(prev);
			next.set("__user_files__", {
				...next.get("__user_files__"),
				[path]: {
					content: content.split("\n"),
					created_at: now,
					modified_at: now,
				},
			});
			return next;
		});
	}, []);
	const updateFileContent = useCallback((path: string, content: string) => {
		setFilesMap((prev) => {
			const next = new Map(prev);
			for (const [key, files] of next) {
				if (files?.[path]) {
					next.set(key, {
						...files,
						[path]: {
							...files[path],
							content: content.split("\n"),
							modified_at: new Date().toISOString(),
						},
					});
					break;
				}
			}
			return next;
		});
	}, []);
	const removeFile = useCallback((path: string) => {
		setFilesMap((prev) => {
			const next = new Map(prev);
			for (const [key, files] of next) {
				if (files?.[path]) {
					const { [path]: _removed, ...rest } = files;
					if (Object.keys(rest).length) next.set(key, rest);
					else next.delete(key);
					break;
				}
			}
			return next;
		});
	}, []);
	const renameFile = useCallback((oldPath: string, newPath: string) => {
		setFilesMap((prev) => {
			const next = new Map(prev);
			for (const [key, files] of next) {
				if (files?.[oldPath]) {
					const { [oldPath]: fileData, ...rest } = files;
					next.set(key, {
						...rest,
						[newPath]: { ...fileData, modified_at: new Date().toISOString() },
					});
					break;
				}
			}
			return next;
		});
	}, []);
	return {
		responseRef,
		toolCallMapRef,
		query,
		setQuery,
		appendToQuery,
		inputRef,
		handleSubmit,
		preflightSubmit,
		sseHandler,
		clearContent,
		messages,
		setMessages,
		controller,
		setController,
		metadata,
		setMetadata,
		abortQuery,
		deleteThread,
		handleTextareaResize,
		clearMessages,
		resetMetadata,
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
