import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/utils/apiClient";
import { resolveThreadOwner } from "@/lib/services/threadService";

vi.mock("@/lib/utils/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/lib/utils/auth", () => ({ getAuthToken: () => "token" }));

describe("native thread ownership", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("checks authorized native search pages and never reads the old thread", async () => {
		const page = Array.from({ length: 100 }, (_, index) => ({
			thread_id: `native-${index}`,
		}));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => page })
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [{ thread_id: "target" }],
			});
		vi.stubGlobal("fetch", fetchMock);
		await expect(resolveThreadOwner("target")).resolves.toBe("aegra");
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			limit: 100,
			offset: 100,
		});
		expect(apiClient.get).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("rejects legacy-only ids without a legacy lookup", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
		);
		await expect(resolveThreadOwner("old-only")).rejects.toThrow(
			"Thread unavailable in Aegra",
		);
		expect(apiClient.get).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});
