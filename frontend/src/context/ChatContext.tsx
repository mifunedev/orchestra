import {
	useContext,
	createContext,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import debug from "debug";
import useConfigHook from "@/hooks/useConfigHook";
import useImageHook from "@/hooks/useImageHook";
import useChat from "@/hooks/useChat";
import useThread from "@/hooks/useThread";
import useModel from "@/hooks/useModel";
import useFileSystem, { type FileData } from "@/hooks/useFileSystem";
import useMessageQueue from "@/hooks/useMessageQueue";
import { useMountEffect } from "@/hooks/useMountEffect";
import MemoryService from "@/lib/services/memoryService";
import {
	getSettings,
	patchDefaults,
	type PersistedContextFile,
} from "@/lib/services/userSettingsService";
import { getAuthToken } from "@/lib/utils/auth";
import { toast } from "sonner";

export type {
	FileData,
	FileSystemState,
	FileSystemActions,
} from "@/hooks/useFileSystem";

const CONTEXT_FILES_KEY = "__context_files__";
export const PERSISTENT_SETTINGS_SOURCE = "__persistent_settings__";
export const MEMORY_FILES_SOURCE = "__memory_files__";
export const USER_FILES_SOURCE = "__user_files__";
export const BACKEND_SYNC_SOURCE = "__backend_sync__";

const logger = debug("hooks:chat-context");

/**
 * One fixed id for the persistent-context autosave failure toast.
 *
 * Sonner keyed by `id` replaces in place rather than stacking, so a run of
 * failing autosaves renders exactly one toast instead of one per keystroke.
 *
 * Deliberately applied to autosave failures ONLY. `savePersistentContextFiles`
 * is shared with the manual Save button, and a user-initiated toast must never
 * be deduped away by an unrelated background save.
 */
export const PERSISTENT_CONTEXT_SAVE_TOAST_ID = "context-files-save";

/** Backoff schedule for retrying a failed autosave: 2s, 4s, 8s, ... capped at 30s. */
const PERSISTENT_SAVE_BACKOFF_BASE_MS = 2_000;
const PERSISTENT_SAVE_BACKOFF_MAX_MS = 30_000;

const persistentSaveCooldownMs = (failureCount: number): number =>
	Math.min(
		PERSISTENT_SAVE_BACKOFF_MAX_MS,
		PERSISTENT_SAVE_BACKOFF_BASE_MS * 2 ** (failureCount - 1),
	);

const DURABLE_SOURCES = new Set<string>([
	PERSISTENT_SETTINGS_SOURCE,
	USER_FILES_SOURCE,
]);

const NON_THREAD_SCOPED_SOURCES = new Set<string>([
	PERSISTENT_SETTINGS_SOURCE,
	MEMORY_FILES_SOURCE,
	USER_FILES_SOURCE,
	BACKEND_SYNC_SOURCE,
]);

const normalizeFileContent = (
	content: string[] | string | undefined,
): string[] => {
	if (Array.isArray(content)) {
		return content;
	}
	if (typeof content === "string") {
		return content.split("\n");
	}
	return [];
};

type NormalizableFileData = {
	content?: string[] | string;
	created_at?: string | null;
	modified_at?: string | null;
	source?: string;
};

const normalizeFileData = (
	fileData: NormalizableFileData,
	source?: string,
): FileData => {
	const now = new Date().toISOString();
	return {
		content: normalizeFileContent(fileData.content),
		created_at: fileData.created_at || now,
		modified_at: fileData.modified_at || now,
		...(source ? { source } : {}),
	};
};

const fileDataEqual = (
	left: FileData | undefined,
	right: FileData,
): boolean => {
	if (!left) {
		return false;
	}

	return (
		left.created_at === right.created_at &&
		left.modified_at === right.modified_at &&
		left.content.length === right.content.length &&
		left.content.every((line, index) => line === right.content[index]) &&
		left.source === right.source
	);
};

const fileRecordsEqual = (
	left: Record<string, FileData>,
	right?: Record<string, FileData>,
): boolean => {
	if (!right) {
		return false;
	}

	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every((path) => {
		const leftFile = left[path];
		const rightFile = right[path];
		if (!rightFile) {
			return false;
		}

		return (
			leftFile.created_at === rightFile.created_at &&
			leftFile.modified_at === rightFile.modified_at &&
			leftFile.content.length === rightFile.content.length &&
			leftFile.content.every((line, index) => line === rightFile.content[index])
		);
	});
};

const mergeFileMaps = (
	...maps: Map<string, FileData>[]
): Map<string, FileData> => {
	const next = new Map<string, FileData>();
	for (const map of maps) {
		map.forEach((file, path) => {
			next.set(path, file);
		});
	}
	return next;
};

const buildPersistentPayload = (
	settingsFiles: Map<string, FileData>,
	baselineOverrides: Map<string, FileData>,
	persistentDeletedPaths: Set<string>,
) => {
	const files: Record<string, PersistedContextFile> = {};
	const persistedFiles = mergeFileMaps(settingsFiles, baselineOverrides);

	persistedFiles.forEach((file, path) => {
		if (!shouldPersistPath(path, file, persistentDeletedPaths)) {
			return;
		}

		files[path] = {
			content: [...file.content],
			created_at: file.created_at,
			modified_at: file.modified_at,
		};
	});

	return {
		files,
		deleted_files: Array.from(persistentDeletedPaths).sort(),
	};
};

const buildVisibleWorkspaceFiles = ({
	memoryFiles,
	settingsFiles,
	backendSyncFiles,
	baselineOverrides,
	threadScopedFiles,
	persistentDeletedPaths,
}: {
	memoryFiles: Map<string, FileData>;
	settingsFiles: Map<string, FileData>;
	backendSyncFiles: Map<string, FileData>;
	baselineOverrides: Map<string, FileData>;
	threadScopedFiles: Map<string, FileData>;
	persistentDeletedPaths: Set<string>;
}): Map<string, FileData> => {
	const next = new Map<string, FileData>();

	const mergeWithDeleteFilter = (
		files: Map<string, FileData>,
		filterDeleted = false,
	) => {
		files.forEach((file, path) => {
			if (filterDeleted && persistentDeletedPaths.has(path)) {
				return;
			}
			next.set(path, file);
		});
	};

	mergeWithDeleteFilter(memoryFiles, true);
	mergeWithDeleteFilter(settingsFiles, true);
	mergeWithDeleteFilter(backendSyncFiles);
	mergeWithDeleteFilter(baselineOverrides);
	mergeWithDeleteFilter(threadScopedFiles);

	return next;
};

const isPathDescendant = (path: string, prefix: string): boolean => {
	const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
	return path.startsWith(normalizedPrefix);
};

const isThreadScopedSource = (source?: string): boolean =>
	Boolean(source && !NON_THREAD_SCOPED_SOURCES.has(source));

const isDurableSource = (source?: string): boolean =>
	Boolean(source && DURABLE_SOURCES.has(source));

const isPromotableTransientSource = (source?: string): boolean =>
	source === MEMORY_FILES_SOURCE ||
	source === BACKEND_SYNC_SOURCE ||
	isThreadScopedSource(source);

const shouldPersistPath = (
	path: string,
	file: FileData,
	deletedPaths: Set<string>,
): boolean => isDurableSource(file.source) && !deletedPaths.has(path);

const promoteToUserFile = (
	file: FileData,
	overrides: Partial<FileData> = {},
): FileData => ({
	...file,
	...overrides,
	source: USER_FILES_SOURCE,
});

type SavePersistentContextFilesOptions = {
	reason?: "manual" | "autosave";
	showSuccessToast?: boolean;
	force?: boolean;
};

export const ChatContext = createContext({});

export default function ChatProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const modelsHooks = useModel();
	const chatHooks = useChat();
	const imageHooks = useImageHook();
	const configHooks = useConfigHook();
	const threadHooks = useThread();
	const fileSystemHooks = useFileSystem();

	const queueHooks = useMessageQueue({
		isStreaming: !!chatHooks.controller,
		executeSubmit: chatHooks.handleSubmit,
	});

	const prevFilesMapRef = useRef<Map<string, unknown>>(new Map());
	const autosaveSkipCountRef = useRef(0);
	const lastSavedPersistentSignatureRef = useRef<string | null>(null);
	const persistentContextLoadedRef = useRef(false);
	const persistentSaveTimerRef = useRef<number | null>(null);
	const persistentSaveInFlightRef = useRef(false);
	const persistentSaveFailureRef = useRef<{ count: number; at: number }>({
		count: 0,
		at: 0,
	});
	const providerUnmountedRef = useRef(false);
	const isAuthenticated = Boolean(getAuthToken());

	const { filesMap } = chatHooks;
	const {
		fileSystem,
		dirtyFiles,
		markClean,
		clearFileSystem: baseClearFileSystem,
		createFile: baseCreateFile,
		updateFile: baseUpdateFile,
		deleteFiles: baseDeleteFiles,
		renameFile: baseRenameFile,
		syncFiles,
	} = fileSystemHooks;
	const { setFilesMap, setSubmissionFiles } = chatHooks;

	const fileSystemRef = useRef(fileSystem);
	const dirtyFilesRef = useRef(dirtyFiles);
	const isStreamingRef = useRef(!!chatHooks.controller);
	const settingsFilesRef = useRef(new Map<string, FileData>());
	const memoryFilesRef = useRef(new Map<string, FileData>());
	const baselineOverridesRef = useRef(new Map<string, FileData>());
	const backendSyncFilesRef = useRef(new Map<string, FileData>());
	const threadScopedFilesRef = useRef(new Map<string, FileData>());
	const persistentDeletedPathsRef = useRef(new Set<string>());
	const pendingPersistentFlushRef = useRef(false);

	const [settingsFiles, setSettingsFiles] = useState<Map<string, FileData>>(
		() => new Map(),
	);
	const [memoryFiles, setMemoryFiles] = useState<Map<string, FileData>>(
		() => new Map(),
	);
	const [baselineOverrides, setBaselineOverrides] = useState<
		Map<string, FileData>
	>(() => new Map());
	const [backendSyncFiles, setBackendSyncFiles] = useState<
		Map<string, FileData>
	>(() => new Map());
	const [threadScopedFiles, setThreadScopedFiles] = useState<
		Map<string, FileData>
	>(() => new Map());
	const [persistentDeletedPaths, setPersistentDeletedPaths] = useState<
		Set<string>
	>(() => new Set());

	fileSystemRef.current = fileSystem;
	dirtyFilesRef.current = dirtyFiles;
	isStreamingRef.current = !!chatHooks.controller;
	settingsFilesRef.current = settingsFiles;
	memoryFilesRef.current = memoryFiles;
	baselineOverridesRef.current = baselineOverrides;
	backendSyncFilesRef.current = backendSyncFiles;
	threadScopedFilesRef.current = threadScopedFiles;
	persistentDeletedPathsRef.current = persistentDeletedPaths;

	const runWithPersistentSyncSuspended = useCallback((callback: () => void) => {
		autosaveSkipCountRef.current += 1;
		callback();
	}, []);

	const hydrateFilesMap = useCallback(
		(nextFilesMap: Map<string, any>) => {
			autosaveSkipCountRef.current += 1;
			setFilesMap(nextFilesMap);
		},
		[setFilesMap],
	);

	const getVisibleWorkspaceFiles = useCallback(() => {
		return buildVisibleWorkspaceFiles({
			memoryFiles: memoryFilesRef.current,
			settingsFiles: settingsFilesRef.current,
			backendSyncFiles: backendSyncFilesRef.current,
			baselineOverrides: baselineOverridesRef.current,
			threadScopedFiles: threadScopedFilesRef.current,
			persistentDeletedPaths: persistentDeletedPathsRef.current,
		});
	}, []);

	const removePathsFromAllSources = useCallback((paths: string[]) => {
		const pathsToRemove = new Set(paths);
		if (pathsToRemove.size === 0) {
			return;
		}

		setSettingsFiles((prev) => {
			let changed = false;
			const next = new Map(prev);
			pathsToRemove.forEach((path) => {
				changed = next.delete(path) || changed;
			});
			if (!changed) {
				return prev;
			}
			return next;
		});
		setMemoryFiles((prev) => {
			let changed = false;
			const next = new Map(prev);
			pathsToRemove.forEach((path) => {
				changed = next.delete(path) || changed;
			});
			if (!changed) {
				return prev;
			}
			return next;
		});
		setBaselineOverrides((prev) => {
			let changed = false;
			const next = new Map(prev);
			pathsToRemove.forEach((path) => {
				changed = next.delete(path) || changed;
			});
			if (!changed) {
				return prev;
			}
			return next;
		});
		setBackendSyncFiles((prev) => {
			let changed = false;
			const next = new Map(prev);
			pathsToRemove.forEach((path) => {
				changed = next.delete(path) || changed;
			});
			if (!changed) {
				return prev;
			}
			return next;
		});
		setThreadScopedFiles((prev) => {
			let changed = false;
			const next = new Map(prev);
			pathsToRemove.forEach((path) => {
				changed = next.delete(path) || changed;
			});
			if (!changed) {
				return prev;
			}
			return next;
		});
	}, []);

	const addPersistentDeletion = useCallback((path: string) => {
		setPersistentDeletedPaths((prev) => {
			if (prev.has(path)) {
				return prev;
			}

			const next = new Set(prev);
			next.add(path);
			return next;
		});
	}, []);

	const addPersistentDeletions = useCallback((paths: string[]) => {
		const pathsToAdd = paths.filter(Boolean);
		if (pathsToAdd.length === 0) {
			return;
		}

		setPersistentDeletedPaths((prev) => {
			const next = new Set(prev);
			let changed = false;
			pathsToAdd.forEach((path) => {
				if (!next.has(path)) {
					next.add(path);
					changed = true;
				}
			});
			return changed ? next : prev;
		});
	}, []);

	const removePersistentDeletion = useCallback((path: string) => {
		setPersistentDeletedPaths((prev) => {
			if (!prev.has(path)) {
				return prev;
			}

			const next = new Set(prev);
			next.delete(path);
			return next;
		});
	}, []);

	const loadPersistentContextFiles = useCallback(async () => {
		if (!isAuthenticated) {
			persistentContextLoadedRef.current = true;
			lastSavedPersistentSignatureRef.current = JSON.stringify(
				buildPersistentPayload(
					settingsFilesRef.current,
					baselineOverridesRef.current,
					persistentDeletedPathsRef.current,
				),
			);
			return;
		}

		try {
			const [settings, memoryFilesResponse] = await Promise.all([
				getSettings(),
				MemoryService.getFiles(),
			]);
			const persistedFiles = settings.defaults.files || {};
			const persistedDeletedFiles = new Set(
				settings.defaults.deleted_files || [],
			);
			const nextSettingsFiles = new Map<string, FileData>();
			const nextMemoryFiles = new Map<string, FileData>();
			const currentPersistentSignature = JSON.stringify(
				buildPersistentPayload(
					settingsFilesRef.current,
					baselineOverridesRef.current,
					persistentDeletedPathsRef.current,
				),
			);
			const hasLocalUnsavedPersistentChanges =
				persistentContextLoadedRef.current &&
				currentPersistentSignature !== lastSavedPersistentSignatureRef.current;

			Object.entries(persistedFiles).forEach(([path, fileData]) => {
				nextSettingsFiles.set(
					path,
					normalizeFileData(fileData, PERSISTENT_SETTINGS_SOURCE),
				);
			});

			Object.entries(memoryFilesResponse || {}).forEach(([path, fileData]) => {
				nextMemoryFiles.set(
					path,
					normalizeFileData(fileData, MEMORY_FILES_SOURCE),
				);
			});

			const nextLastSavedSignature = JSON.stringify(
				buildPersistentPayload(
					nextSettingsFiles,
					new Map(),
					persistedDeletedFiles,
				),
			);

			logger(
				"hydrate settings=%d memory=%d deleted=%d preserve_local=%o",
				nextSettingsFiles.size,
				nextMemoryFiles.size,
				persistedDeletedFiles.size,
				hasLocalUnsavedPersistentChanges,
			);

			autosaveSkipCountRef.current += 1;
			setMemoryFiles(nextMemoryFiles);
			if (!hasLocalUnsavedPersistentChanges) {
				setSettingsFiles(nextSettingsFiles);
				setPersistentDeletedPaths(persistedDeletedFiles);
				lastSavedPersistentSignatureRef.current = nextLastSavedSignature;
			}
			persistentContextLoadedRef.current = true;
		} catch (error) {
			persistentContextLoadedRef.current = true;
			console.error("Failed to load persistent context files:", error);
		}
	}, [isAuthenticated]);

	useMountEffect(() => {
		void loadPersistentContextFiles();
	});

	useEffect(() => {
		const nextVisibleFiles = buildVisibleWorkspaceFiles({
			memoryFiles,
			settingsFiles,
			backendSyncFiles,
			baselineOverrides,
			threadScopedFiles,
			persistentDeletedPaths,
		});

		syncFiles(nextVisibleFiles, {
			openNewTabs: true,
			resetDirtyFiles: false,
		});
	}, [
		memoryFiles,
		settingsFiles,
		backendSyncFiles,
		baselineOverrides,
		threadScopedFiles,
		persistentDeletedPaths,
		syncFiles,
	]);

	useEffect(() => {
		if (filesMap === prevFilesMapRef.current) {
			return;
		}
		prevFilesMapRef.current = filesMap;

		const nextThreadFiles = new Map<string, FileData>();
		const nextDurableFiles = new Map<string, FileData>();
		filesMap.forEach(
			(messageFiles: Record<string, unknown>, messageId: string) => {
				if (messageId === CONTEXT_FILES_KEY) {
					return;
				}
				if (!messageFiles || typeof messageFiles !== "object") {
					return;
				}

				Object.entries(messageFiles).forEach(
					([path, data]: [string, unknown]) => {
						if (dirtyFilesRef.current.has(path)) {
							return;
						}
						const fileData = data as {
							content?: string | string[];
							created_at?: string;
							modified_at?: string;
						};
						const normalizedFile = normalizeFileData(fileData, messageId);
						if (isStreamingRef.current) {
							nextDurableFiles.set(path, promoteToUserFile(normalizedFile));
							return;
						}

						nextThreadFiles.set(path, normalizedFile);
					},
				);
			},
		);

		if (nextDurableFiles.size > 0) {
			setBaselineOverrides((prev) => {
				let changed = false;
				const next = new Map(prev);

				nextDurableFiles.forEach((file, path) => {
					if (fileDataEqual(next.get(path), file)) {
						return;
					}

					next.set(path, file);
					changed = true;
				});

				return changed ? next : prev;
			});
			nextDurableFiles.forEach((_file, path) => {
				removePersistentDeletion(path);
			});
		}

		setThreadScopedFiles(nextThreadFiles);
	}, [filesMap, removePersistentDeletion]);

	const messagesLength = chatHooks.messages.length;
	const isStreaming = !!chatHooks.controller;
	const prevFileSystemRef = useRef<Map<string, FileData>>(new Map());

	useEffect(() => {
		if (fileSystem === prevFileSystemRef.current) {
			return;
		}
		prevFileSystemRef.current = fileSystem;

		const contextFiles: Record<string, FileData> = {};
		fileSystem.forEach((data, path) => {
			contextFiles[path] = {
				content: [...data.content],
				created_at: data.created_at,
				modified_at: data.modified_at,
			};
		});
		setSubmissionFiles(
			contextFiles,
			Array.from(fileSystem.values()).some(
				(file) => file.source === USER_FILES_SOURCE,
			),
		);

		const hasContextFiles = Object.keys(contextFiles).length > 0;
		const prevContextFiles = filesMap.get(CONTEXT_FILES_KEY) as
			| Record<string, FileData>
			| undefined;

		if (!hasContextFiles) {
			if (!filesMap.has(CONTEXT_FILES_KEY)) {
				return;
			}
			const next = new Map(filesMap);
			next.delete(CONTEXT_FILES_KEY);
			setFilesMap(next);
			return;
		}

		if (fileRecordsEqual(contextFiles, prevContextFiles)) {
			return;
		}

		const next = new Map(filesMap);
		next.delete(CONTEXT_FILES_KEY);
		next.set(CONTEXT_FILES_KEY, contextFiles);
		setFilesMap(next);
	}, [fileSystem, filesMap, setFilesMap, setSubmissionFiles]);

	const { clearQueue } = queueHooks;

	useEffect(() => {
		if (messagesLength === 0) {
			clearQueue();
		}
	}, [messagesLength, clearQueue]);

	const getPersistentPayloadSnapshot = useCallback(() => {
		const payload = buildPersistentPayload(
			settingsFilesRef.current,
			baselineOverridesRef.current,
			persistentDeletedPathsRef.current,
		);

		return {
			payload,
			signature: JSON.stringify(payload),
		};
	}, []);

	const { signature: persistentPayloadSignature } =
		getPersistentPayloadSnapshot();
	const hasUnsavedPersistentChanges =
		isAuthenticated &&
		persistentContextLoadedRef.current &&
		persistentPayloadSignature !== lastSavedPersistentSignatureRef.current;

	const savePersistentContextFiles = useCallback(
		async function savePersistentContextFiles(
			options: SavePersistentContextFilesOptions = {},
		): Promise<boolean> {
			const { reason = "autosave", showSuccessToast = false } = options;

			// Re-arm a real autosave attempt `delayMs` from now. Used whenever a
			// save is declined or fails: the only other autosave trigger is a
			// payload-signature change, so a user who edits, sees the failure, and
			// then stops typing would otherwise be stranded with unsaved edits and
			// no pending timer.
			//
			// This arms the timer ref asynchronously (from the promise `catch`),
			// outside the render that scheduled it, so it cannot rely on the
			// autosave effect's cleanup — several of that effect's branches return
			// early and register no cleanup at all. The mount-scoped teardown effect
			// below owns the unconditional clear; the guard here is the second line
			// of defence for a timer that already escaped.
			const rearmAutosave = (delayMs: number) => {
				if (providerUnmountedRef.current) {
					return;
				}
				if (persistentSaveTimerRef.current) {
					window.clearTimeout(persistentSaveTimerRef.current);
				}
				persistentSaveTimerRef.current = window.setTimeout(() => {
					persistentSaveTimerRef.current = null;
					// `isAuthenticated` in this closure is stale by the time the timer
					// fires; re-read the live token so a logged-out user stops PATCHing.
					if (providerUnmountedRef.current || !getAuthToken()) {
						return;
					}
					void savePersistentContextFiles({
						reason: "autosave",
						showSuccessToast: false,
					});
				}, delayMs);
			};

			if (!isAuthenticated || !persistentContextLoadedRef.current) {
				return false;
			}

			if (reason !== "manual" && isStreamingRef.current) {
				pendingPersistentFlushRef.current = true;
				logger("autosave suppressed reason=%s cause=streaming", reason);
				return false;
			}

			if (persistentSaveInFlightRef.current) {
				if (reason !== "manual") {
					pendingPersistentFlushRef.current = true;
					logger("autosave suppressed reason=%s cause=in_flight", reason);
				}
				return false;
			}

			// Backoff guard. Must sit before the timer clear below: clearing first
			// would cancel the very autosave we are declining to run.
			if (reason !== "manual" && persistentSaveFailureRef.current.count > 0) {
				const { count, at } = persistentSaveFailureRef.current;
				const remainingMs = at + persistentSaveCooldownMs(count) - Date.now();
				if (remainingMs > 0) {
					pendingPersistentFlushRef.current = true;
					rearmAutosave(remainingMs);
					logger(
						"autosave suppressed reason=%s cause=backoff failures=%d retry_in_ms=%d",
						reason,
						count,
						remainingMs,
					);
					return false;
				}
			}

			if (persistentSaveTimerRef.current) {
				window.clearTimeout(persistentSaveTimerRef.current);
				persistentSaveTimerRef.current = null;
			}

			const { payload, signature } = getPersistentPayloadSnapshot();
			if (signature === lastSavedPersistentSignatureRef.current) {
				return false;
			}

			const dirtyPaths = Array.from(dirtyFilesRef.current);
			logger(
				"persistent save start reason=%s files=%d deleted=%d dirty=%d",
				reason,
				Object.keys(payload.files).length,
				payload.deleted_files.length,
				dirtyPaths.length,
			);

			persistentSaveInFlightRef.current = true;
			try {
				await patchDefaults(payload);

				const nextPersistedFiles = new Map<string, FileData>();
				Object.entries(payload.files).forEach(([path, fileData]) => {
					nextPersistedFiles.set(
						path,
						normalizeFileData(fileData, PERSISTENT_SETTINGS_SOURCE),
					);
				});

				setSettingsFiles(nextPersistedFiles);
				setBaselineOverrides(new Map());
				setPersistentDeletedPaths(new Set(payload.deleted_files));
				lastSavedPersistentSignatureRef.current = signature;
				pendingPersistentFlushRef.current = false;
				persistentSaveFailureRef.current = { count: 0, at: 0 };
				dirtyPaths.forEach((path) => {
					markClean(path);
				});

				if (showSuccessToast) {
					toast.success("Changes saved");
				}

				logger(
					"persistent save success reason=%s files=%d deleted=%d",
					reason,
					nextPersistedFiles.size,
					payload.deleted_files.length,
				);
				return true;
			} catch (error) {
				console.error("Failed to persist context files:", error);

				// NOTE: `lastSavedPersistentSignatureRef` is deliberately NOT advanced
				// here. It doubles as the dirty indicator and the autosave-skip guard,
				// so advancing it would mark still-unsaved text as saved and silently
				// drop the user's edits. The backoff ref below is what stops the loop.
				const failureCount = persistentSaveFailureRef.current.count + 1;
				persistentSaveFailureRef.current = {
					count: failureCount,
					at: Date.now(),
				};
				logger(
					"persistent save failure reason=%s failures=%d",
					reason,
					failureCount,
				);

				if (reason === "manual") {
					// User-initiated: never deduped, never suppressed.
					toast.error("Failed to save context files");
				} else {
					toast.error("Failed to save context files", {
						id: PERSISTENT_CONTEXT_SAVE_TOAST_ID,
						description: "Your edits are still here — retrying automatically.",
					});
				}

				// Re-armed for BOTH reasons. A failed manual save leaves exactly the
				// stranded state the backoff exists to prevent: the click consumed the
				// dirty signature, so nothing else will retry until the user types
				// again. One shared counter is deliberate — it tracks the health of the
				// PATCH endpoint, not which trigger issued it, and manual saves bypass
				// the cooldown anyway, so escalation never blocks the escape hatch.
				pendingPersistentFlushRef.current = true;
				rearmAutosave(persistentSaveCooldownMs(failureCount));

				return false;
			} finally {
				persistentSaveInFlightRef.current = false;
			}
		},
		[getPersistentPayloadSnapshot, isAuthenticated, markClean],
	);

	// Mount-scoped teardown. The autosave effect below cannot own this: React
	// only runs the cleanup that the MOST RECENT run of an effect returned, and
	// that effect returns early — with no cleanup — when unauthenticated, when
	// the skip counter fires, when the signature is unchanged, and while
	// streaming. A retry armed from the promise `catch` after one of those runs
	// would survive unmount and keep PATCHing an unmounted tree forever.
	useEffect(() => {
		providerUnmountedRef.current = false;
		return () => {
			providerUnmountedRef.current = true;
			if (persistentSaveTimerRef.current) {
				window.clearTimeout(persistentSaveTimerRef.current);
				persistentSaveTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!isAuthenticated || !persistentContextLoadedRef.current) {
			return;
		}

		if (autosaveSkipCountRef.current > 0) {
			autosaveSkipCountRef.current -= 1;
			logger(
				"autosave skipped cause=sync_skip remaining=%d",
				autosaveSkipCountRef.current,
			);
			if (autosaveSkipCountRef.current > 0) {
				return;
			}
		}

		if (
			persistentPayloadSignature === lastSavedPersistentSignatureRef.current
		) {
			return;
		}

		if (isStreaming) {
			pendingPersistentFlushRef.current = true;
			logger("autosave queued cause=streaming");
			return;
		}

		if (persistentSaveTimerRef.current) {
			window.clearTimeout(persistentSaveTimerRef.current);
		}

		logger("autosave scheduled delay_ms=500");
		persistentSaveTimerRef.current = window.setTimeout(() => {
			persistentSaveTimerRef.current = null;
			void savePersistentContextFiles({
				reason: "autosave",
				showSuccessToast: false,
			});
		}, 500);

		return () => {
			if (persistentSaveTimerRef.current) {
				window.clearTimeout(persistentSaveTimerRef.current);
			}
		};
	}, [
		isAuthenticated,
		isStreaming,
		persistentPayloadSignature,
		savePersistentContextFiles,
	]);

	const previousStreamingRef = useRef(isStreaming);

	useEffect(() => {
		const wasStreaming = previousStreamingRef.current;
		previousStreamingRef.current = isStreaming;

		if (isStreaming || !wasStreaming || !pendingPersistentFlushRef.current) {
			return;
		}

		logger("autosave flush after streaming");
		void savePersistentContextFiles({
			reason: "autosave",
			showSuccessToast: false,
		});
	}, [isStreaming, savePersistentContextFiles]);

	const createFile = useCallback(
		(path: string, content?: string) => {
			const fileData = normalizeFileData(
				{
					content: content ?? "",
				},
				USER_FILES_SOURCE,
			);

			baseCreateFile(path, content);
			setBaselineOverrides((prev) => {
				const next = new Map(prev);
				next.set(path, fileData);
				return next;
			});
			removePersistentDeletion(path);
			logger("ownership create durable path=%s", path);
		},
		[baseCreateFile, removePersistentDeletion],
	);

	const updateFile = useCallback(
		(path: string, content: string) => {
			const existing = fileSystemRef.current.get(path);
			if (!existing) {
				return;
			}

			const nextFile = {
				...existing,
				content: content.split("\n"),
				modified_at: new Date().toISOString(),
			};

			baseUpdateFile(path, content);

			if (existing.source === PERSISTENT_SETTINGS_SOURCE) {
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.set(path, {
						...promoteToUserFile(nextFile),
					});
					return next;
				});
				removePersistentDeletion(path);
				logger(
					"ownership promote path=%s from=%s to=%s action=edit",
					path,
					existing.source,
					USER_FILES_SOURCE,
				);
				return;
			}

			if (existing.source === USER_FILES_SOURCE) {
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.set(path, {
						...nextFile,
						source: USER_FILES_SOURCE,
					});
					return next;
				});
				return;
			}

			if (existing.source === MEMORY_FILES_SOURCE) {
				setMemoryFiles((prev) => {
					const next = new Map(prev);
					next.delete(path);
					return next;
				});
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.set(path, promoteToUserFile(nextFile));
					return next;
				});
				removePersistentDeletion(path);
				logger(
					"ownership promote path=%s from=%s to=%s action=edit",
					path,
					existing.source,
					USER_FILES_SOURCE,
				);
				return;
			}

			if (existing.source === BACKEND_SYNC_SOURCE) {
				setBackendSyncFiles((prev) => {
					const next = new Map(prev);
					next.delete(path);
					return next;
				});
			}

			if (isThreadScopedSource(existing.source)) {
				setThreadScopedFiles((prev) => {
					const next = new Map(prev);
					next.delete(path);
					return next;
				});
			}

			if (isPromotableTransientSource(existing.source)) {
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.set(path, promoteToUserFile(nextFile));
					return next;
				});
				removePersistentDeletion(path);
				logger(
					"ownership promote path=%s from=%s to=%s action=edit",
					path,
					existing.source,
					USER_FILES_SOURCE,
				);
			}
		},
		[baseUpdateFile, removePersistentDeletion],
	);

	const deletePath = useCallback(
		(path: string) => {
			const matches = Array.from(getVisibleWorkspaceFiles().keys()).filter(
				(currentPath) =>
					currentPath === path || isPathDescendant(currentPath, path),
			);

			if (matches.length === 0) {
				return;
			}

			const durableMatches = matches.filter((matchedPath) => {
				const existing = fileSystemRef.current.get(matchedPath);
				if (!existing || !isDurableSource(existing.source)) {
					return false;
				}

				logger(
					"ownership delete durable path=%s source=%s",
					matchedPath,
					existing.source,
				);
				return true;
			});

			baseDeleteFiles(matches);
			removePathsFromAllSources(matches);
			addPersistentDeletions(durableMatches);
		},
		[
			addPersistentDeletions,
			baseDeleteFiles,
			getVisibleWorkspaceFiles,
			removePathsFromAllSources,
		],
	);

	const deleteFile = useCallback(
		(path: string) => {
			deletePath(path);
		},
		[deletePath],
	);

	const renameFile = useCallback(
		(oldPath: string, newPath: string) => {
			const existing = fileSystemRef.current.get(oldPath);
			if (!existing) {
				return;
			}

			baseRenameFile(oldPath, newPath);

			const renamedFile = {
				...existing,
				modified_at: new Date().toISOString(),
			};

			if (existing.source === PERSISTENT_SETTINGS_SOURCE) {
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.delete(oldPath);
					next.set(newPath, promoteToUserFile(renamedFile));
					return next;
				});
				addPersistentDeletion(oldPath);
				removePersistentDeletion(newPath);
				logger(
					"ownership promote path=%s from=%s to=%s action=rename",
					oldPath,
					existing.source,
					USER_FILES_SOURCE,
				);
				return;
			}

			if (existing.source === USER_FILES_SOURCE) {
				setBaselineOverrides((prev) => {
					const next = new Map(prev);
					next.delete(oldPath);
					next.set(newPath, {
						...renamedFile,
						source: USER_FILES_SOURCE,
					});
					return next;
				});
				addPersistentDeletion(oldPath);
				removePersistentDeletion(newPath);
				return;
			}

			if (existing.source === MEMORY_FILES_SOURCE) {
				setMemoryFiles((prev) => {
					const next = new Map(prev);
					next.delete(oldPath);
					return next;
				});
				addPersistentDeletion(oldPath);
			}

			if (existing.source === BACKEND_SYNC_SOURCE) {
				setBackendSyncFiles((prev) => {
					const next = new Map(prev);
					next.delete(oldPath);
					return next;
				});
			}

			if (isThreadScopedSource(existing.source)) {
				setThreadScopedFiles((prev) => {
					const next = new Map(prev);
					next.delete(oldPath);
					return next;
				});
			}

			setBaselineOverrides((prev) => {
				const next = new Map(prev);
				next.delete(oldPath);
				next.set(newPath, promoteToUserFile(renamedFile));
				return next;
			});
			removePersistentDeletion(newPath);
			if (isPromotableTransientSource(existing.source)) {
				logger(
					"ownership promote path=%s from=%s to=%s action=rename",
					oldPath,
					existing.source,
					USER_FILES_SOURCE,
				);
			}
		},
		[addPersistentDeletion, baseRenameFile, removePersistentDeletion],
	);

	const clearThreadScopedFiles = useCallback(() => {
		setThreadScopedFiles(new Map());
		hydrateFilesMap(new Map());
	}, [hydrateFilesMap]);

	const clearBackendSyncFiles = useCallback(() => {
		setBackendSyncFiles(new Map());
	}, []);

	const clearFileSystem = useCallback(() => {
		setSettingsFiles(new Map());
		setMemoryFiles(new Map());
		setBaselineOverrides(new Map());
		setBackendSyncFiles(new Map());
		setThreadScopedFiles(new Map());
		setPersistentDeletedPaths(new Set());
		baseClearFileSystem();
		hydrateFilesMap(new Map());
	}, [baseClearFileSystem, hydrateFilesMap]);

	const fromBackendFormat = useCallback((data: Record<string, string>) => {
		if (!data || Object.keys(data).length === 0) {
			setBackendSyncFiles(new Map());
			return;
		}

		const nextFiles = new Map<string, FileData>();
		Object.entries(data).forEach(([path, content]) => {
			nextFiles.set(
				path,
				normalizeFileData(
					{
						content,
					},
					BACKEND_SYNC_SOURCE,
				),
			);
		});

		setBackendSyncFiles(nextFiles);
	}, []);

	return (
		<ChatContext.Provider
			value={{
				...chatHooks,
				...configHooks,
				...imageHooks,
				...threadHooks,
				...modelsHooks,
				...fileSystemHooks,
				...queueHooks,
				createFile,
				updateFile,
				deleteFile,
				deletePath,
				renameFile,
				clearFileSystem,
				fromBackendFormat,
				deletedFiles: Array.from(persistentDeletedPaths),
				hasUnsavedPersistentChanges,
				savePersistentContextFiles,
				setFilesMap: hydrateFilesMap,
				loadPersistentContextFiles,
				runWithPersistentSyncSuspended,
				clearThreadScopedFiles,
				clearBackendSyncFiles,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
}

export function useChatContext(): any {
	return useContext(ChatContext);
}
