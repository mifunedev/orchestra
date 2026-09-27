import { readFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const packageVersion = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"),
).version;

const loadDefinedVersion = async () => {
	vi.resetModules();
	const { default: config } = await import("../../../vite.config");
	return JSON.parse(
		(config as { define: Record<string, string> }).define[
			"import.meta.env.VITE_APP_VERSION"
		],
	);
};

describe("VITE_APP_VERSION default", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("uses the package.json version when unset", async () => {
		vi.stubEnv("VITE_APP_VERSION", "");
		expect(await loadDefinedVersion()).toBe(packageVersion);
	});

	it("uses VITE_APP_VERSION when set", async () => {
		vi.stubEnv("VITE_APP_VERSION", "9.8.7");
		expect(await loadDefinedVersion()).toBe("9.8.7");
	});
});
