type StorageKeyMigration = readonly [oldKey: string, newKey: string];

/**
 * One-release localStorage key migrations for the Enso -> Orchestra rename.
 *
 * Each entry moves a value from the legacy key to the Orchestra key. Every
 * migration is idempotent and never throws: if localStorage is unavailable or
 * the stored value cannot be touched, the app degrades to "no stored state"
 * rather than crashing at boot.
 *
 * Keys owned by a single module (for example the active-stream recovery key)
 * migrate themselves at the top of that module instead of appearing here.
 */
export const STORAGE_KEY_MIGRATIONS: readonly StorageKeyMigration[] = [
	["enso:auth:token", "orchestra:auth:token"],
	["enso:auth:user", "orchestra:auth:user"],
	["enso:remix_agent_id", "orchestra:remix_agent_id"],
	["enso:chat:payload:memory", "orchestra:chat:payload:memory"],
	["enso:chat:payload:system", "orchestra:chat:payload:system"],
	["enso:tool:search", "orchestra:tool:search"],
	["enso:checkbox:pii_analyze", "orchestra:checkbox:pii_analyze"],
	["enso:checkbox:pii_anonymize", "orchestra:checkbox:pii_anonymize"],
];

/**
 * Move a stored value from `oldKey` to `newKey`, then drop `oldKey`.
 *
 * - No legacy value: nothing happens.
 * - Both keys present: the value already at `newKey` wins (it is the newer
 *   write) and the legacy key is dropped.
 * - localStorage unavailable or throwing: the call is a no-op.
 *
 * Safe to call repeatedly; the second call finds no legacy key and returns.
 */
export function migrateStorageKey(oldKey: string, newKey: string): void {
	if (oldKey === newKey) return;

	try {
		if (typeof window === "undefined") return;
		const storage = window.localStorage;
		if (!storage) return;

		const legacyValue = storage.getItem(oldKey);
		if (legacyValue === null) return;

		if (storage.getItem(newKey) === null) {
			storage.setItem(newKey, legacyValue);
		}

		storage.removeItem(oldKey);
	} catch {
		// localStorage blocked, full, or otherwise unusable: skip the migration.
	}
}

/** Apply every migration in {@link STORAGE_KEY_MIGRATIONS}. Idempotent. */
export function runStorageMigrations(): void {
	for (const [oldKey, newKey] of STORAGE_KEY_MIGRATIONS) {
		migrateStorageKey(oldKey, newKey);
	}
}

// Runs at module-evaluation time. ES modules evaluate depth-first in import
// order, so importing this module first in the entrypoint guarantees the
// migrations complete before any other application module body evaluates --
// and therefore before any consumer can read a migrated key.
runStorageMigrations();
