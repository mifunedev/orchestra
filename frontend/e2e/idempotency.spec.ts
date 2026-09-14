/**
 * Resiliency spec: Double-submit idempotency
 *
 * Sending a message twice in rapid succession (two clicks / two Enter presses
 * before the first response arrives) must produce exactly ONE assistant run —
 * not two.  A short-window content dedup guard in useMessageQueue rejects the
 * duplicate submit so only a single run is kicked off.
 *
 * Oracle: each accepted submit renders exactly one user message bubble
 * (`div.rounded-br-sm`).  Counting user bubbles measures the number of runs
 * directly and is independent of whether/how the assistant reply renders (a
 * single assistant turn emits several `rounded-bl-sm` part elements, so the
 * assistant-bubble count cannot distinguish one run from two).  After a
 * deduped double-submit there must be exactly ONE user bubble.
 *
 * The chat list is virtualized (ChatMessages.tsx useVirtualizer): a long
 * streaming reply scrolls row 0 (the user bubble) out of the virtual window
 * and unmounts it, so the count must be taken with the list scrolled to the
 * top.  `countUserBubbles` scrolls to top, lets the virtualizer re-mount, then
 * counts.
 */

import { test, expect, Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

// Selector constants derived from verified live selectors in the briefing
const CHAT_INPUT =
	'textarea[placeholder="How can I help you be more productive?"]';
const SUBMIT_BUTTON = '[data-tour="chat-submit-button"]';
// User (human) message bubble class — one per accepted submit (ChatMessages.tsx:100)
const USER_BUBBLE = "div.rounded-br-sm";

/**
 * Scroll the virtualized chat list to the top so row 0 (the user bubble) is
 * mounted, then return the number of user bubbles. Without scrolling to top a
 * long streaming reply can unmount row 0 and yield a false 0 count.
 */
async function countUserBubbles(page: Page): Promise<number> {
	await page.evaluate(() => {
		const scroller = document.querySelector("div.overflow-auto");
		if (scroller) scroller.scrollTop = 0;
	});
	// Give the virtualizer a frame to re-mount the top rows
	await page.waitForTimeout(300);
	return page.locator(USER_BUBBLE).count();
}

test.describe("Double-submit idempotency", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		// Navigate straight to /chat (the authed default route) to avoid the
		// "/" -> "/chat" redirect race that can delay the input mount.  Use
		// domcontentloaded (not networkidle) — the chat page holds a long-lived
		// streaming connection, so the network never goes idle and networkidle
		// would abort the navigation.
		await page.goto("/chat", { waitUntil: "domcontentloaded" });
		await page
			.locator(CHAT_INPUT)
			.waitFor({ state: "visible", timeout: 30_000 });
	});

	test("typing a message and submitting twice produces exactly one user bubble", async ({
		page,
	}) => {
		// Type a short deterministic message
		const input = page.locator(CHAT_INPUT);
		await input.fill("ping idempotency test");

		// Submit twice as fast as possible (force-click to bypass actionability
		// waits and devtools overlay so the two clicks land in rapid succession).
		const submitBtn = page.locator(SUBMIT_BUTTON);
		await submitBtn.click({ force: true });
		// Second click immediately — no await between dispatch and re-fire
		await submitBtn.click({ force: true });

		// Wait for the first user bubble to render
		await expect(page.locator(USER_BUBBLE).first()).toBeVisible({
			timeout: 30_000,
		});

		// Allow up to 5 s for a second run to materialise (it shouldn't)
		await page.waitForTimeout(5_000);

		// RESILIENT OUTCOME: exactly one user bubble (one accepted run)
		expect(await countUserBubbles(page)).toBe(1);
	});

	test("pressing Enter twice rapidly produces exactly one user bubble", async ({
		page,
	}, testInfo) => {
		// Enter-to-submit is intentionally disabled on mobile (ChatInput.tsx:157
		// gates handleEnqueue on `!isLikelyMobile()`), so the double-Enter path
		// does not exist on touch devices — there is nothing to dedup there.
		test.skip(
			testInfo.project.name === "mobile",
			"Enter-to-submit is disabled on mobile by design (ChatInput.tsx:157)",
		);

		const input = page.locator(CHAT_INPUT);
		await input.fill("ping idempotency enter");

		// Two Enter presses with no gap
		await input.press("Enter");
		await input.press("Enter");

		await expect(page.locator(USER_BUBBLE).first()).toBeVisible({
			timeout: 30_000,
		});

		await page.waitForTimeout(5_000);

		expect(await countUserBubbles(page)).toBe(1);
	});
});
