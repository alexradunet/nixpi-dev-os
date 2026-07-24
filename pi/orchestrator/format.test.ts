import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTokens, formatUsageStats, getDisplayItems } from "./format.ts";
import type { Message } from "@earendil-works/pi-ai";

// ---- formatTokens ----

describe("formatTokens", () => {
	it("under 1000 renders as plain digits", () => {
		assert.equal(formatTokens(999), "999");
	});

	it("1000-9999 renders with one decimal and k suffix", () => {
		assert.equal(formatTokens(1500), "1.5k");
		assert.equal(formatTokens(9999), "10.0k");
	});

	it("10000-999999 renders rounded k", () => {
		assert.equal(formatTokens(15000), "15k");
	});

	it("one million and above renders with one decimal and M suffix", () => {
		assert.equal(formatTokens(2500000), "2.5M");
	});
});

// ---- formatUsageStats ----

describe("formatUsageStats", () => {
	it("zero usage renders empty string", () => {
		assert.equal(formatUsageStats({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }), "");
	});

	it("mixed usage renders turns, tokens, cost parts in order with model last", () => {
		const stats = formatUsageStats(
			{ turns: 2, input: 1500, output: 500, cacheRead: 0, cacheWrite: 2000, cost: 0.0123, contextTokens: 40000 },
			"prov/model",
		);
		assert.equal(stats, "2 turns ↑1.5k ↓500 W2.0k $0.0123 ctx:40k prov/model");
	});

	it("singular turn omits the plural s", () => {
		assert.equal(formatUsageStats({ turns: 1, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }), "1 turn");
	});

	it("model alone renders just the model", () => {
		assert.equal(formatUsageStats({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }, "prov/model"), "prov/model");
	});
});

// ---- getDisplayItems ----

describe("getDisplayItems", () => {
	it("extracts assistant text and toolCall parts in order", () => {
		const messages = [
			{
				role: "assistant",
				content: [
					{ type: "text", text: "thinking out loud" },
					{ type: "toolCall", name: "bash", arguments: { command: "ls" } },
					{ type: "text", text: "done" },
				],
			} as Message,
		];
		assert.deepEqual(getDisplayItems(messages), [
			{ type: "text", text: "thinking out loud" },
			{ type: "toolCall", name: "bash", args: { command: "ls" } },
			{ type: "text", text: "done" },
		]);
	});

	it("skips non-assistant messages", () => {
		const messages = [
			{ role: "user", content: [{ type: "text", text: "hello" }] } as Message,
			{ role: "assistant", content: [{ type: "text", text: "hi" }] } as Message,
		];
		assert.deepEqual(getDisplayItems(messages), [{ type: "text", text: "hi" }]);
	});
});
