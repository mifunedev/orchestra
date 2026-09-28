import { describe, it, expect } from "vitest";
import { consumeAegraStream } from "@/lib/utils/aegraStream";
import { formatMessages } from "@/lib/utils/format";

const response = (events: [string, any][]) =>
	new Response(
		new ReadableStream({
			start(controller) {
				const bytes = new TextEncoder().encode(
					events
						.map(
							([event, data]) =>
								`event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`,
						)
						.join(""),
				);
				for (let i = 0; i < bytes.length; i += 7)
					controller.enqueue(bytes.slice(i, i + 7));
				controller.close();
			},
		}),
	);

describe("native Aegra stream", () => {
	it("maps metadata, chunks, tool updates and final values without duplicate reply", async () => {
		const states: any[] = [];
		const call = {
			id: "ai-tool",
			type: "ai",
			content: "",
			tool_calls: [
				{ id: "call", name: "get_weather", args: { location: "Oslo" } },
			],
		};
		const tool = {
			id: "tool",
			type: "tool",
			tool_call_id: "call",
			name: "get_weather",
			content: "72°F",
		};
		const reply = { id: "reply", type: "ai", content: "Sunny ☀" };
		await consumeAegraStream(
			response([
				["metadata", { run_id: "run" }],
				["updates", { agent: { messages: [call] } }],
				["updates", { tools: { messages: [tool] } }],
				["messages", [{ ...reply, content: "Sunny " }, {}]],
				["messages", [{ ...reply, content: "☀" }, {}]],
				["values", { messages: [call, tool, reply] }],
				["end", {}],
			]),
			(state) => states.push(state),
		);
		expect(states.some((s) => s.runId === "run")).toBe(true);
		const final = states.at(-1);
		expect(final.done).toBe(true);
		expect(final.messages).toEqual([call, tool, reply]);
		expect(formatMessages(final.messages).map((m: any) => m.role)).toEqual([
			"tool_input",
			"tool",
			"assistant",
		]);
		expect(
			states.some((s) => s.messages.some((m: any) => m.content === "Sunny ")),
		).toBe(true);
	});
	it("replaces messages from native Overwrite updates and preserves subsequent tool events", async () => {
		const human = { id: "user", type: "human", content: "Weather?" };
		const call = {
			id: "call-message",
			type: "ai",
			content: "",
			tool_calls: [{ id: "call", name: "get_weather", args: {} }],
		};
		const tool = {
			id: "tool",
			type: "tool",
			tool_call_id: "call",
			content: "Sunny",
		};
		const reply = { id: "reply", type: "ai", content: "It is sunny." };
		const states: any[] = [];
		await consumeAegraStream(
			response([
				[
					"values",
					{ messages: [{ id: "stale", type: "human", content: "old" }] },
				],
				[
					"updates",
					{
						"PatchToolCallsMiddleware.before_agent": {
							messages: { value: [human] },
						},
					},
				],
				["updates", { agent: { messages: [call] } }],
				["updates", { tools: { messages: [tool] } }],
				["messages", [reply, {}]],
				["end", {}],
			]),
			(state) => states.push(state),
		);
		expect(states[1].messages).toEqual([human]);
		expect(states.at(-1)).toMatchObject({
			messages: [human, call, tool, reply],
			done: true,
		});
		expect(
			formatMessages(states.at(-1).messages).map((m: any) => m.role),
		).toEqual(["user", "tool_input", "tool", "assistant"]);
	});
	it.each([
		null,
		{},
		{ value: null },
		{ value: "not messages" },
		"ignored",
		42,
	])(
		"ignores non-message update payload %j without losing tool results",
		async (messages) => {
			const tool = {
				id: "tool",
				type: "tool",
				tool_call_id: "call",
				content: "Sunny",
			};
			let latest: any;
			await consumeAegraStream(
				response([
					[
						"updates",
						{ middleware: { messages }, tools: { messages: [tool] } },
					],
					["end", {}],
				]),
				(state) => {
					latest = state;
				},
			);
			expect(latest).toMatchObject({ messages: [tool], done: true });
		},
	);
	it("normalizes native chunk types and accumulates fragmented tool arguments", async () => {
		let latest: any;
		await consumeAegraStream(
			response([
				[
					"messages",
					[
						{
							id: "a",
							type: "AIMessageChunk",
							content: "",
							tool_call_chunks: [
								{
									index: 0,
									id: "call",
									name: "get_weather",
									args: '{"location":',
								},
							],
						},
						{},
					],
				],
				[
					"messages",
					[
						{
							id: "a",
							type: "AIMessageChunk",
							content: "",
							tool_call_chunks: [{ index: 0, args: '"Oslo"}' }],
						},
						{},
					],
				],
				["end", {}],
			]),
			(state) => {
				latest = state;
			},
		);
		expect(formatMessages(latest.messages)[0]).toMatchObject({
			role: "tool_input",
			name: "get_weather",
			input: { location: "Oslo" },
		});
	});
	it("accepts native EOF after final values", async () => {
		let latest: any;
		await consumeAegraStream(
			response([
				["values", { messages: [{ id: "a", type: "ai", content: "done" }] }],
			]),
			(state) => {
				latest = state;
			},
		);
		expect(latest.done).toBe(true);
	});
	it("rejects native error and truncated streams", async () => {
		await expect(
			consumeAegraStream(
				response([["error", { message: "denied" }]]),
				() => {},
			),
		).rejects.toThrow("denied");
		await expect(
			consumeAegraStream(response([["metadata", { run_id: "r" }]]), () => {}),
		).rejects.toThrow();
	});
});
