import { useEffect, useState, useCallback } from "react";
import {
	searchThreads,
	searchAegraThreads,
	resolveThreadOwner,
	getAegraState,
} from "@/lib/services/threadService";
import { formatMessages } from "@/lib/utils/format";
import { latestHumanMessage } from "@/lib/utils/message";
import { AEGRA_FILES_SOURCE, aegraFiles } from "@/lib/utils/aegraStream";
import type { Todo } from "@/components/lists/TodoList";

const LIMIT = 20;

export type ThreadData = {
	checkpoints: any[];
	messages: any[];
	metadata: any;
	todos: Todo[];
	filesMap: Map<string, any>;
	model: string;
};

export type ThreadContextType = {
	threads: any[];
	setThreads: (threads: any[]) => void;
	checkpoints: any[];
	setCheckpoints: (checkpoints: any[]) => void;
	checkpoint: any;
	setCheckpoint: (checkpoint: any) => void;
	searchThreads: (
		action: "list_threads" | "list_checkpoints" | "get_checkpoint",
		metadata: { thread_id?: string; checkpoint_id?: string },
	) => void;
	useListThreadsEffect: (trigger?: boolean) => void;
	useListCheckpointsEffect: (
		trigger?: boolean,
		metadata?: { thread_id?: string },
	) => void;
	loadMoreThreads: (filter?: any) => Promise<void>;
	hasMoreThreads: boolean;
	isLoadingMoreThreads: boolean;
	loadThread: (threadId: string) => Promise<ThreadData | null>;
	threadLoading: boolean;
	threadError: string | null;
	useLoadThreadEffect: (
		threadId: string | undefined,
		callbacks: {
			setCheckpoints: (checkpoints: any[]) => void;
			setMessages: (messages: any[]) => void;
			setMetadata: (metadata: any) => void;
			setFilesMap: (filesMap: Map<string, any>) => void;
			setTodos: (todos: Todo[]) => void;
			setModel: (model: string) => void;
		},
		options?: {
			enabled?: boolean;
		},
	) => void;
};

export default function useThread(): ThreadContextType {
	const [threads, setThreads] = useState<any[]>([]);
	const [checkpoints, setCheckpoints] = useState<any[]>([]);
	const [checkpoint, setCheckpoint] = useState<any>(null);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMoreThreads, setHasMoreThreads] = useState<boolean>(true);
	const [isLoadingMoreThreads, setIsLoadingMoreThreads] =
		useState<boolean>(false);
	const [threadLoading, setThreadLoading] = useState<boolean>(false);
	const [threadError, setThreadError] = useState<string | null>(null);

	const loadThread = useCallback(
		async (threadId: string): Promise<ThreadData | null> => {
			if (!threadId) return null;

			setThreadLoading(true);
			setThreadError(null);

			try {
				if ((await resolveThreadOwner(threadId)) === "aegra") {
					const state = await getAegraState(threadId);
					const messages = formatMessages(state.values?.messages ?? []);
					const files = aegraFiles(state.values?.files);
					return {
						checkpoints: [],
						messages,
						metadata: {
							...state.metadata,
							thread_id: threadId,
							stream_owner: "aegra",
						},
						todos: [],
						filesMap:
							files && Object.keys(files).length
								? new Map([[AEGRA_FILES_SOURCE, files]])
								: new Map(),
						model: latestHumanMessage(messages)?.model,
					};
				}
				// Load checkpoints directly for this specific thread
				// Backend returns checkpoints when thread_id is passed
				const checkpointsData = await searchThreads("list_checkpoints", {
					thread_id: threadId,
				});

				if (!checkpointsData || checkpointsData.length === 0) {
					setThreadError("No checkpoints found for thread");
					return null;
				}

				// Get thread data from the first checkpoint
				const latestCheckpoint = checkpointsData[0];
				const threadData = latestCheckpoint.metadata || {};

				// Extract todos (backend sends as array)
				const todos: Todo[] = Array.isArray(threadData.todos)
					? threadData.todos
					: [];

				// Restore thread-scoped files from the backend checkpoint metadata
				const filesMap = new Map<string, any>();
				if (
					threadData.files &&
					typeof threadData.files === "object" &&
					Object.keys(threadData.files).length > 0
				) {
					filesMap.set("thread", threadData.files);
				}

				// Format messages
				const messages = formatMessages(checkpointsData[0].values.messages);

				// Build metadata including thread_id
				const metadata = {
					...threadData,
					thread_id: threadId,
					stream_owner: "legacy",
				};

				return {
					checkpoints: checkpointsData,
					messages,
					metadata,
					todos,
					filesMap,
					model: latestHumanMessage(messages)?.model,
				};
			} catch (err) {
				console.error("Failed to load thread:", err);
				setThreadError("Failed to load thread");
				return null;
			} finally {
				setThreadLoading(false);
			}
		},
		[],
	);

	const useLoadThreadEffect = (
		threadId: string | undefined,
		callbacks: {
			setCheckpoints: (checkpoints: any[]) => void;
			setMessages: (messages: any[]) => void;
			setMetadata: (metadata: any) => void;
			setFilesMap: (filesMap: Map<string, any>) => void;
			setTodos: (todos: Todo[]) => void;
			setModel: (model: string) => void;
		},
		options: {
			enabled?: boolean;
		} = {},
	) => {
		const enabled = options.enabled ?? true;

		useEffect(() => {
			if (!enabled) {
				setThreadLoading(false);
				setThreadError(null);
				return;
			}

			if (threadId) {
				setThreadLoading(true);
				setThreadError(null);
			}

			let isActive = true;

			const fetchThread = async () => {
				if (!threadId) return;

				const data = await loadThread(threadId);
				if (!isActive || !data) {
					return;
				}

				if (data) {
					callbacks.setCheckpoints(data.checkpoints);
					callbacks.setMessages(data.messages);
					callbacks.setMetadata(data.metadata);
					callbacks.setFilesMap(data.filesMap);
					// Always set todos to clear stale data when switching threads
					callbacks.setTodos(data.todos);
					callbacks.setModel(data.model);
				}
			};

			fetchThread();

			return () => {
				isActive = false;
			};
		}, [threadId, enabled]);
	};

	const fetchThreads = async (
		action: "list_threads" | "list_checkpoints" | "get_checkpoint",
		filter: {
			thread_id?: string;
			checkpoint_id?: string;
			metadata?: { assistant_id?: string; project_id?: string };
		} = {},
	) => {
		// Always pass limit and offset (defaults: 20, 0) to searchThreads
		if (action !== "list_threads" && filter.thread_id) {
			if ((await resolveThreadOwner(filter.thread_id)) === "aegra") {
				if (action === "list_checkpoints") setCheckpoints([]);
				return;
			}
		}
		const data = await searchThreads(action, filter, LIMIT, 0);

		if (action === "list_threads") {
			let native: Awaited<ReturnType<typeof searchAegraThreads>> = [];
			if (Object.keys(filter).length === 0) {
				try {
					native = await searchAegraThreads();
				} catch (error) {
					console.error("Failed to list native threads:", error);
				}
			}
			setThreads([
				...data,
				...native.map((thread) => ({
					key: thread.thread_id,
					updated_at: thread.updated_at,
					value: {
						thread_id: thread.thread_id,
						title: thread.metadata?.thread_name,
					},
				})),
			]);
			// Extract cursor from last thread for pagination
			if (data.length > 0) {
				const lastThread = data[data.length - 1];
				setCursor(lastThread.updated_at);
			}
			// Set hasMore based on whether we got a full page
			setHasMoreThreads(data.length === LIMIT);
		} else if (action === "list_checkpoints") {
			setCheckpoints(data);
		} else if (action === "get_checkpoint") {
			setCheckpoint(data);
		}
	};

	const loadMoreThreads = async (filter: any = {}) => {
		if (isLoadingMoreThreads || !hasMoreThreads) {
			return;
		}

		try {
			setIsLoadingMoreThreads(true);

			// Build filter with cursor for pagination
			const paginationFilter = { ...filter };
			if (cursor) {
				// Use cursor-based pagination: fetch threads older than cursor
				paginationFilter.updated_at = { $lt: cursor };
			}

			// Fetch threads with limit (offset=0 since we use cursor-based pagination)
			const newThreads = await searchThreads(
				"list_threads",
				paginationFilter,
				LIMIT,
				0,
			);

			setThreads((prev) => [...prev, ...newThreads]);

			// Extract cursor from last thread for next page
			if (newThreads.length > 0) {
				const lastThread = newThreads[newThreads.length - 1];
				setCursor(lastThread.updated_at);
			}

			setHasMoreThreads(newThreads.length === LIMIT);
		} catch (error) {
			console.error("Error loading more threads:", error);
		} finally {
			setIsLoadingMoreThreads(false);
		}
	};

	const useListThreadsEffect = (
		trigger?: boolean,
		filter: { metadata?: { [key: string]: any } } = {},
	) => {
		useEffect(() => {
			// Reset pagination state for fresh load
			setCursor(null);
			setHasMoreThreads(true);
			// Don't clear threads immediately - let fetchThreads replace them
			// This prevents breaking checkpoint fetching that may run concurrently
			fetchThreads("list_threads", filter);
		}, [trigger]);
	};

	const useListCheckpointsEffect = (
		trigger?: boolean,
		metadata: { thread_id?: string } = {},
	) => {
		useEffect(() => {
			fetchThreads("list_checkpoints", metadata);
		}, [trigger]);
	};

	return {
		threads,
		setThreads,
		checkpoints,
		setCheckpoints,
		checkpoint,
		setCheckpoint,
		searchThreads,
		useListThreadsEffect,
		useListCheckpointsEffect,
		loadMoreThreads,
		hasMoreThreads,
		isLoadingMoreThreads,
		loadThread,
		threadLoading,
		threadError,
		useLoadThreadEffect,
	};
}
