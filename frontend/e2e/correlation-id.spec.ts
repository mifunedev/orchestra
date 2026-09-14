/**
 * Resiliency spec: Correlation / request ID surfaced on error
 *
 * When a run fails permanently, the UI must display a correlation / request
 * reference identifier on the error surface so users can include it in bug
 * reports and operators can trace the request in worker logs (the same
 * run_id is bound as the worker's correlation ID — see
 * backend/src/utils/correlation.py).
 *
 * Driven by the same deterministic flow as dlq-replay.spec.ts: the
 * "__DLQ_TRIGGER__" sentinel forces a permanent failure on the distributed
 * stream path (/llm/stream), surfacing the recoverable error banner that
 * carries the run_id. No /api/runs mock — the chat never calls that endpoint.
 */

import { test, expect, Page, Locator } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const CHAT_INPUT =
	'textarea[placeholder="How can I help you be more productive?"]';
const SUBMIT_BUTTON = '[data-tour="chat-submit-button"]';

// UUID / correlation-ID pattern: any run of hex + hyphens of reasonable length.
const CORRELATION_ID_PATTERN = /[0-9a-f-]{8,}/i;

// Any visible error surface (banner / alert / failure text).
const ERROR_STATE_SELECTORS = [
	"[data-testid='message-error']",
	"[role='alert']",
	"text=failed",
	"text=error",
];

// A labelled correlation / request ID reference on the error surface.
const CORRELATION_ID_SELECTORS = [
	"[data-correlation-id]",
	"[data-testid='correlation-id']",
	":text-matches('(Request|Correlation|Trace)[:\\s]+[0-9a-f-]{8,}', 'i')",
];

// Compose selectors (which may mix CSS and Playwright text engines) into a
// single OR'd locator via Locator.or(), the supported cross-engine union.
function anyOf(page: Page, selectors: string[]): Locator {
	return selectors
		.map((selector) => page.locator(selector))
		.reduce((acc, locator) => acc.or(locator));
}

test.describe("Correlation ID on error surface", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto("/", { waitUntil: "networkidle" });
	});

	test("a permanently-failing run surfaces a labelled correlation/request ID", async ({
		page,
	}) => {
		// Deterministically force a permanent failure via the DLQ trigger sentinel.
		const input = page.locator(CHAT_INPUT);
		await input.fill(
			"__DLQ_TRIGGER__: force permanent failure for correlation-id test",
		);
		await page.locator(SUBMIT_BUTTON).click();

		// (a) An error surface must appear (the run did not silently hang).
		const errorLocators = anyOf(page, ERROR_STATE_SELECTORS);
		await expect(errorLocators.first()).toBeVisible({ timeout: 30_000 });

		// (b) A labelled correlation / request ID must be visible on that surface.
		const correlationId = anyOf(page, CORRELATION_ID_SELECTORS);
		await expect(correlationId.first()).toBeVisible({ timeout: 10_000 });

		// The visible ID value must look like a real correlation token.
		const idValue =
			(await correlationId.first().getAttribute("data-correlation-id")) ??
			(await correlationId.first().textContent());
		expect(idValue ?? "").toMatch(CORRELATION_ID_PATTERN);
	});
});
