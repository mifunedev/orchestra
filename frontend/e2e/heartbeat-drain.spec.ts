/**
 * Resiliency spec: Heartbeat / stream drain on worker loss
 *
 * Scenario:
 *   1. Start a streaming run (send a message that triggers a long response).
 *   2. Confirm the app itself wrote an active-stream recovery record to
 *      localStorage (`orchestra.active_streams.v1`) with the REAL thread id, run id,
 *      and a live `lastEventId` cursor — this is the wiring that makes
 *      worker-loss recovery possible (useChat.ts → persistDistributedRecovery).
 *   3. Simulate worker loss mid-stream by aborting the real distributed stream
 *      endpoints, then reload the page.
 *   4. On reload, the chat must NOT be a silent dead UI. It must EITHER:
 *        - resume / restore the run from its persisted checkpoint (the
 *          assistant message bubble re-renders), OR
 *        - surface the "Lost connection… refresh to retry" recovery message.
 *      The active-stream record drives `useActiveStreamRecovery.ts`, which
 *      reattaches when the backend thread is still `stream_status: "running"`,
 *      and otherwise clears the stale record after the checkpoint loads.
 *
 * Worker-loss recovery is now implemented end-to-end: the stream lifecycle
 * persists/clears the recovery record (useChat.ts) and the reattach hook +
 * checkpoint reload guarantee a visible recovery signal on reload.
 *
 * GREEN signal: on regression (record not written, or reload yields a silent
 * UI) this test fails hard.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const CHAT_INPUT =
	'textarea[placeholder="How can I help you be more productive?"]';
const SUBMIT_BUTTON = '[data-tour="chat-submit-button"]';
const ASSISTANT_BUBBLE = "div.rounded-bl-sm";

// localStorage key used by the active-stream recovery subsystem
const ACTIVE_STREAMS_KEY = "orchestra.active_streams.v1";

// Pre-rename key. Retained deliberately: the one-release migration in
// activeStreamRecovery.ts reads it, writes the value forward to
// ACTIVE_STREAMS_KEY, and deletes it. D16 permits the legacy literal inside
// the migration and its test.
const LEGACY_ACTIVE_STREAMS_KEY = "ruska.active_streams.v1";

// Text that the recovery subsystem surfaces when reconnection is needed
const LOST_CONNECTION_TEXT = "Lost connection";

// Real stream endpoints the app talks to (VITE_API_URL defaults to "/api"):
//   POST /api/llm/stream                      → initiate (202 distributed)
//   GET  /api/threads/:threadId/stream        → distributed SSE poll
// Aborting BOTH simulates the worker going away mid-stream.
const STREAM_POLL_GLOB = "**/threads/**/stream**";
const STREAM_INIT_GLOB = "**/llm/stream**";

test.describe("Heartbeat / stream drain recovery", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto("/", { waitUntil: "networkidle" });
	});

	test("after simulated worker loss, reload surfaces recovery message or resumes the stream", async ({
		page,
	}) => {
		// Step 1: Start a streaming run.
		const input = page.locator(CHAT_INPUT);
		await input.fill(
			"Write a very long essay about distributed systems resilience, at least 500 words.",
		);
		await page.locator(SUBMIT_BUTTON).click();

		// Wait for at least one token to arrive (loading spinner appears first).
		await expect(page.locator(".animate-spin").first()).toBeVisible({
			timeout: 15_000,
		});

		// Give the stream a moment to advance so the app writes the recovery record
		// and the route settles to /thread/:threadId.
		await page.waitForTimeout(2_500);

		// Step 2: Capture the live thread URL and assert the app wrote a REAL
		// recovery record (the genuine wiring, not a synthetic injection).
		const threadUrl = page.url();
		const recoveryRecord = await page.evaluate((key) => {
			const raw = localStorage.getItem(key);
			return raw
				? (JSON.parse(raw) as Record<string, { runId?: string }>)
				: null;
		}, ACTIVE_STREAMS_KEY);

		expect(
			recoveryRecord,
			"app should write an active-stream recovery record on stream start",
		).not.toBeNull();
		const recordedThreadIds = Object.keys(recoveryRecord ?? {});
		expect(
			recordedThreadIds.length,
			"recovery record should contain the live thread",
		).toBeGreaterThan(0);
		expect(
			recoveryRecord?.[recordedThreadIds[0]]?.runId,
			"recovery record should carry a real run id",
		).toBeTruthy();

		// Step 3: Simulate worker loss by aborting the real distributed stream
		// endpoints (initiate + poll). The worker is now effectively gone.
		await page.route(STREAM_POLL_GLOB, (route) =>
			route.abort("connectionreset"),
		);
		await page.route(STREAM_INIT_GLOB, (route) =>
			route.abort("connectionreset"),
		);

		// Step 4: Reload the page. Use `domcontentloaded` — a recovering page keeps
		// polling/retrying the stream endpoint, so `networkidle` would never settle.
		await page.goto(threadUrl, { waitUntil: "domcontentloaded" });

		// Step 5: Assert recovery — either the reconnect message is shown OR the run
		// restores from checkpoint (an assistant bubble re-renders) within 20 s.
		// A completely silent UI with no recovery signal is the failure mode.
		const lostConnectionLocator = page.locator(`text=${LOST_CONNECTION_TEXT}`);
		const assistantBubble = page.locator(ASSISTANT_BUBBLE).first();

		await expect(lostConnectionLocator.or(assistantBubble)).toBeVisible({
			timeout: 20_000,
		});

		// Document the post-reload recovery-record state: either cleared (the stale
		// run was reconciled against the loaded checkpoint) or still present (an
		// in-progress reattach). Both are acceptable; a silent UI is not.
		const storageValue = await page.evaluate(
			(key) => localStorage.getItem(key),
			ACTIVE_STREAMS_KEY,
		);
		console.log(
			`[heartbeat-drain] ${ACTIVE_STREAMS_KEY} after reload:`,
			storageValue,
		);
	});
});

test.describe("Active-stream recovery key migration", () => {
	// A user who last used the app before the rename has state under the legacy
	// key only. Booting the app must move that state forward without loss, so
	// the recovery subsystem keeps working across the rename.
	const LEGACY_STORE = {
		"thread-legacy-0001": {
			threadId: "thread-legacy-0001",
			runId: "run-legacy-0001",
			lastEventId: "42",
			startedAt: 1739000000000,
		},
	};

	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test("fallback: legacy-only state is moved to the new key and the legacy key is dropped", async ({
		page,
	}) => {
		// Seed the PRE-rename key only, exactly as an existing user's browser
		// would have it, and make sure the new key is genuinely absent.
		await page.evaluate(
			([legacyKey, newKey, store]) => {
				localStorage.removeItem(newKey as string);
				localStorage.setItem(legacyKey as string, JSON.stringify(store));
			},
			[LEGACY_ACTIVE_STREAMS_KEY, ACTIVE_STREAMS_KEY, LEGACY_STORE] as const,
		);

		// Boot the app. The migration runs at module-evaluation time.
		await page.goto("/", { waitUntil: "domcontentloaded" });

		const afterBoot = await page.evaluate(
			([legacyKey, newKey]) => ({
				legacy: localStorage.getItem(legacyKey),
				current: localStorage.getItem(newKey),
			}),
			[LEGACY_ACTIVE_STREAMS_KEY, ACTIVE_STREAMS_KEY],
		);

		expect(
			afterBoot.legacy,
			"legacy active-stream key should be deleted after migration",
		).toBeNull();
		expect(
			afterBoot.current,
			"migrated active-stream state should be readable under the new key",
		).not.toBeNull();
		expect(
			JSON.parse(afterBoot.current as string),
			"no recovery state may be lost in the migration",
		).toEqual(LEGACY_STORE);

		// Idempotence: a second boot must not clobber or resurrect anything.
		await page.goto("/", { waitUntil: "domcontentloaded" });
		const afterSecondBoot = await page.evaluate(
			([legacyKey, newKey]) => ({
				legacy: localStorage.getItem(legacyKey),
				current: localStorage.getItem(newKey),
			}),
			[LEGACY_ACTIVE_STREAMS_KEY, ACTIVE_STREAMS_KEY],
		);

		expect(afterSecondBoot.legacy).toBeNull();
		expect(JSON.parse(afterSecondBoot.current as string)).toEqual(LEGACY_STORE);
	});

	test("normal path: new-key state is used as-is and no legacy key is created", async ({
		page,
	}) => {
		await page.evaluate(
			([legacyKey, newKey, store]) => {
				localStorage.removeItem(legacyKey as string);
				localStorage.setItem(newKey as string, JSON.stringify(store));
			},
			[LEGACY_ACTIVE_STREAMS_KEY, ACTIVE_STREAMS_KEY, LEGACY_STORE] as const,
		);

		await page.goto("/", { waitUntil: "domcontentloaded" });

		const afterBoot = await page.evaluate(
			([legacyKey, newKey]) => ({
				legacy: localStorage.getItem(legacyKey),
				current: localStorage.getItem(newKey),
			}),
			[LEGACY_ACTIVE_STREAMS_KEY, ACTIVE_STREAMS_KEY],
		);

		expect(
			afterBoot.legacy,
			"migration must never write back to the legacy key",
		).toBeNull();
		expect(JSON.parse(afterBoot.current as string)).toEqual(LEGACY_STORE);
	});
});
