import type { ActiveStreamRecoveryRecord } from "@/lib/entities/stream";
import { migrateStorageKey } from "@/lib/utils/storageMigrations";

export const LEGACY_ACTIVE_STREAM_STORAGE_KEY = "ruska.active_streams.v1";
export const ACTIVE_STREAM_STORAGE_KEY = "orchestra.active_streams.v1";

// Runs at module-evaluation time, before any exported reader below can be
// called. A caller cannot skip it, and a second evaluation is a no-op.
migrateStorageKey(
	LEGACY_ACTIVE_STREAM_STORAGE_KEY,
	ACTIVE_STREAM_STORAGE_KEY,
);

type ActiveStreamRecoveryStore = Record<string, ActiveStreamRecoveryRecord>;

function isBrowser(): boolean {
	return (
		typeof window !== "undefined" && typeof window.localStorage !== "undefined"
	);
}

function readStore(): ActiveStreamRecoveryStore {
	if (!isBrowser()) {
		return {};
	}

	try {
		const raw = window.localStorage.getItem(ACTIVE_STREAM_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(store: ActiveStreamRecoveryStore): void {
	if (!isBrowser()) {
		return;
	}

	try {
		window.localStorage.setItem(
			ACTIVE_STREAM_STORAGE_KEY,
			JSON.stringify(store),
		);
	} catch (error) {
		console.warn("Failed to persist active stream recovery state:", error);
	}
}

export function getActiveStreamRecovery(
	threadId: string,
): ActiveStreamRecoveryRecord | null {
	const store = readStore();
	return store[threadId] ?? null;
}

export function upsertActiveStreamRecovery(
	record: ActiveStreamRecoveryRecord,
): void {
	const store = readStore();
	store[record.threadId] = record;
	writeStore(store);
}

export function updateActiveStreamRecovery(
	threadId: string,
	updates: Partial<ActiveStreamRecoveryRecord>,
): void {
	const existing = getActiveStreamRecovery(threadId);
	if (!existing) {
		return;
	}

	upsertActiveStreamRecovery({
		...existing,
		...updates,
		threadId,
	});
}

export function removeActiveStreamRecovery(threadId: string): void {
	const store = readStore();
	if (!(threadId in store)) {
		return;
	}

	delete store[threadId];
	writeStore(store);
}
