import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for the Orchestra frontend.
 *
 * baseURL is the externally-provided Vite dev server (http://localhost:5173).
 * No webServer block — the stack is started externally before tests run.
 *
 * Resiliency specs are authored with test.fail() at baseline so they pass CI
 * today even though the resilient behaviours are not yet implemented.  Once a
 * fix lands, remove the corresponding test.fail() annotation and the test will
 * become a hard failure on regression (the GREEN signal).
 */
export default defineConfig({
	testDir: "./e2e",

	/* CI runs the full stack (postgres + redis + api + worker + vite) on a single
	 * runner. Unbounded parallel Playwright workers starve the Vite dev server and
	 * the React app misses its 30s mount window (the chat input/submit never
	 * appears in time). Serialize in CI and retry to absorb cold-start/contention;
	 * locally (no CI env) keep the default parallelism. */
	fullyParallel: false,
	workers: process.env.CI ? 1 : undefined,
	retries: process.env.CI ? 2 : 0,
	timeout: process.env.CI ? 60_000 : 30_000,

	/* Artifacts on failure (screenshots, traces, videos) */
	outputDir: "./e2e/.artifacts/results/",
	reporter: [
		["list"],
		["html", { outputFolder: "./e2e/.artifacts/report", open: "never" }],
	],

	use: {
		baseURL: "http://localhost:5173",

		/* Capture screenshot + trace on every failure */
		screenshot: "only-on-failure",
		trace: "on-first-retry",
	},

	projects: [
		{
			name: "desktop",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "mobile",
			use: {
				...devices["Pixel 5"],
				viewport: { width: 414, height: 896 },
			},
		},
	],
});
