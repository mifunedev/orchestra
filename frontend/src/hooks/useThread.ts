import { useEffect, useState, useCallback } from "react";
import {
	searchAegraThreads,
	resolveThreadOwner,
	getAegraState,
} from "@/lib/services/threadService";
import { formatMessages } from "@/lib/utils/format";
import { latestHumanMessage } from "@/lib/utils/message";
import { AEGRA_FILES_SOURCE, aegraFiles } from "@/lib/utils/aegraStream";
import type { Todo } from "@/components/lists/TodoList";

const LIMIT = 20;

const toThreadRow = (
	thread: Awaited<ReturnType<typeof searchAegraThreads>>[number],
) => ({
	key: thread.thread_id,
	updated_at: thread.updated_at,
	value: { thread_id: thread.thread_id, title: thread.metadata?.thread_name },
});

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
	const [offset, setOffset] = useState(0);
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
				await resolveThreadOwner(threadId);
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
			} catch (err) {
				console.error("Failed to load thread:", err);
				setThreadError(
					err instanceof Error && err.message === "Thread unavailable in Aegra"
						? err.message
						: "Failed to load thread",
				);
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
		if (action === "list_threads") {
			const native = Object.keys(filter).length
				? []
				: await searchAegraThreads(LIMIT, 0);
			setThreads(native.map(toThreadRow));
			setOffset(native.length);
			setHasMoreThreads(native.length === LIMIT);
		} else if (action === "list_checkpoints") {
			setCheckpoints([]);
		} else if (action === "get_checkpoint") {
			setCheckpoint(null);
		}
	};

	const loadMoreThreads = async (filter: any = {}) => {
		if (isLoadingMoreThreads || !hasMoreThreads) {
			return;
		}

		try {
			setIsLoadingMoreThreads(true);

			const native = Object.keys(filter).length
				? []
				: await searchAegraThreads(LIMIT, offset);
			setThreads((prev) => [...prev, ...native.map(toThreadRow)]);
			setOffset((previous) => previous + native.length);
			setHasMoreThreads(native.length === LIMIT);
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
			setOffset(0);
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
		searchThreads: fetchThreads,
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
