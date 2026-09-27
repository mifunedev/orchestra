import { afterEach, describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "@/lib/entities/stream";
import { FetchStreamReader } from "@/lib/utils/fetchStreamReader";

const runId = "c89a81db-50f8-4b4c-97cb-fabf61dd7c7a";

const observedRunFrames = [
	`event: metadata\ndata: {"run_id":"${runId}","attempt":1}\nid: ${runId}_event_1\n\n`,
	`event: values\ndata: {"message":"observed"}\nid: ${runId}_event_2\n\n`,
	`event: updates\ndata: {"respond":{"result":"probe:observed"}}\nid: ${runId}_event_3\n\n`,
	`event: values\ndata: {"message":"observed","result":"probe:observed"}\nid: ${runId}_event_4\n\n`,
	`event: end\ndata: {"status":"success"}\nid: ${runId}_event_5\n\n`,
];

const observedCancelledFrame = 'event: end\ndata: {"status":"interrupted"}\n\n';

type AegraFrame = { event: string; data: unknown; id: string | null };

function decodeObservedFrames(frames: string[]): AegraFrame[] {
	return frames.map((frame) => {
		const lines = frame.trim().split("\n");
		return {
			event: lines.find((line) => line.startsWith("event: "))!.slice(7),
			data: JSON.parse(
				lines.find((line) => line.startsWith("data: "))!.slice(6),
			),
			id: lines.find((line) => line.startsWith("id: "))?.slice(4) ?? null,
		};
	});
}

async function consumeWithCurrentReader(frames: string[]): Promise<{
	events: StreamEvent[];
	cursor: string | null;
}> {
	const bytes = new TextEncoder().encode(frames.join(""));
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(bytes);
						controller.close();
					},
				}),
				{ headers: { "Content-Type": "text/event-stream" } },
			),
		),
	);
	const reader = new FetchStreamReader("http://probe.invalid/stream");
	const events: StreamEvent[] = [];
	reader.onEvent((event) => events.push(event));
	await reader.start();
	return { events, cursor: reader.lastEventId };
}

afterEach(() => vi.unstubAllGlobals());

describe("Aegra 0.10.7 observed SSE vs Orchestra StreamEvent", () => {
	it("captures named events, JSON object data, and event cursor from a completed live run", () => {
		const frames = decodeObservedFrames(observedRunFrames);
		expect(frames.map(({ event }) => event)).toEqual([
			"metadata",
			"values",
			"updates",
			"values",
			"end",
		]);
		expect(frames.map(({ id }) => id)).toEqual(
			[1, 2, 3, 4, 5].map((index) => `${runId}_event_${index}`),
		);
		expect(frames[0].data).toEqual({ run_id: runId, attempt: 1 });
		expect(frames[3].data).toEqual({
			message: "observed",
			result: "probe:observed",
		});
		expect(frames[4].data).toEqual({ status: "success" });
		expect(frames.every(({ data }) => data !== "[DONE]")).toBe(true);
	});

	it("requires a mapping before metadata, values, updates, and end can satisfy StreamEvent", () => {
		const [metadata, values, updates, , end] =
			decodeObservedFrames(observedRunFrames);
		const currentMetadata: StreamEvent = {
			type: "metadata",
			data: {
				thread_id: "thread-id",
				run_id: runId,
				assistant_id: null,
				project_id: null,
			},
		};
		const currentValues: StreamEvent = {
			type: "values",
			data: { messages: [] },
		};
		const currentTerminal: StreamEvent = { type: "done" };
		expect(metadata.data).not.toHaveProperty("thread_id");
		expect(metadata.data).not.toHaveProperty("assistant_id");
		expect(values.data).not.toHaveProperty("messages");
		expect(updates.event).not.toBe(currentValues.type);
		expect(end.event).not.toBe(currentTerminal.type);
		expect(currentMetadata.data).toHaveProperty("thread_id");
	});

	it("drops all observed native frames through the current tuple-only reader", async () => {
		const received = await consumeWithCurrentReader(observedRunFrames);
		expect(received.events).toEqual([]);
		expect(received.cursor).toBeNull();
	});

	it("does not misidentify a cancelled Aegra end as Orchestra done or aborted", async () => {
		expect(decodeObservedFrames([observedCancelledFrame])).toEqual([
			{ event: "end", data: { status: "interrupted" }, id: null },
		]);
		expect(
			(await consumeWithCurrentReader([observedCancelledFrame])).events,
		).toEqual([]);
	});
});
