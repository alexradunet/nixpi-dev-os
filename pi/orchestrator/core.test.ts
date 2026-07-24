import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	decideProjectAgentGate,
	resolveExitOutcome,
	createLineSplit,
	capStderr,
	mapWithConcurrencyLimit,
	getFinalOutput,
	isFailedResult,
	getResultOutput,
	truncateParallelOutput,
	PER_TASK_OUTPUT_CAP,
} from "./core.ts";
import type { AgentConfig } from "./agents.ts";
import type { Message } from "@earendil-works/pi-ai";

// ---- mapWithConcurrencyLimit ----

describe("mapWithConcurrencyLimit", () => {
	it("empty input returns empty array", async () => {
		const result = await mapWithConcurrencyLimit([], 2, (x) => Promise.resolve(x));
		assert.equal(result.length, 0);
	});

	it("results preserve input order", async () => {
		const items = [3, 1, 4, 1, 5];
		const result = await mapWithConcurrencyLimit(items, 2, (x) => Promise.resolve(x * 10));
		assert.deepEqual(result, [30, 10, 40, 10, 50]);
	});

	it("concurrency cap honored", async () => {
		let maxInFlight = 0;
		let currentInFlight = 0;
		const limit = 3;
		const items = Array.from({ length: 10 }, (_, i) => i);

		await mapWithConcurrencyLimit(
			items,
			limit,
			async (i) => {
				currentInFlight++;
				if (currentInFlight > maxInFlight) maxInFlight = currentInFlight;
				await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
				currentInFlight--;
				return i;
			},
		);
		assert.ok(maxInFlight <= limit, `max in-flight ${maxInFlight} exceeded cap ${limit}`);
	});

	it("concurrency 0 behaves as 1", async () => {
		let maxInFlight = 0;
		let currentInFlight = 0;
		await mapWithConcurrencyLimit([1, 2, 3], 0, async (i) => {
			currentInFlight++;
			if (currentInFlight > maxInFlight) maxInFlight = currentInFlight;
			await new Promise((r) => setTimeout(r, 5));
			currentInFlight--;
			return i;
		});
		assert.ok(maxInFlight <= 1, `with concurrency 0, max in-flight was ${maxInFlight}`);
	});
});

// ---- isFailedResult ----

describe("isFailedResult", () => {
	it("exitCode 1 → true", () => {
		assert.equal(isFailedResult({ exitCode: 1 } as any), true);
	});

	it("stopReason error with exitCode 0 → true", () => {
		assert.equal(isFailedResult({ exitCode: 0, stopReason: "error" } as any), true);
	});

	it("stopReason aborted → true", () => {
		assert.equal(isFailedResult({ exitCode: 0, stopReason: "aborted" } as any), true);
	});

	it("exitCode 0 / stopReason end → false", () => {
		assert.equal(isFailedResult({ exitCode: 0, stopReason: "end" } as any), false);
	});

	it("exitCode 0 / no stopReason → false", () => {
		assert.equal(isFailedResult({ exitCode: 0 } as any), false);
	});
});

// ---- getResultOutput ----

describe("getResultOutput", () => {
	it("failed result prefers errorMessage", () => {
		const r = {
			exitCode: 1,
			errorMessage: "boom",
			stderr: "stderr text",
			messages: [{ role: "assistant", content: [{ type: "text", text: "final output" }] } as Message],
		};
		assert.equal(getResultOutput(r as any), "boom");
	});

	it("failed result falls back to stderr when no errorMessage", () => {
		const r = {
			exitCode: 1,
			errorMessage: undefined,
			stderr: "something went wrong",
			messages: [],
		};
		assert.equal(getResultOutput(r as any), "something went wrong");
	});

	it("failed result falls back to final assistant text", () => {
		const r = {
			exitCode: 1,
			errorMessage: undefined,
			stderr: "",
			messages: [{ role: "assistant", content: [{ type: "text", text: "partial output" }] } as Message],
		};
		assert.equal(getResultOutput(r as any), "partial output");
	});

	it("failed result falls back to '(no output)'", () => {
		const r = {
			exitCode: 1,
			errorMessage: undefined,
			stderr: "",
			messages: [],
		};
		assert.equal(getResultOutput(r as any), "(no output)");
	});

	it("successful result returns final assistant text", () => {
		const msgs: Message[] = [
			{ role: "user", content: [{ type: "text", text: "hi" }] },
			{ role: "assistant", content: [{ type: "text", text: "hello world" }] },
		];
		const r = { exitCode: 0, messages: msgs };
		assert.equal(getResultOutput(r as any), "hello world");
	});

	it("successful result with no assistant → '(no output)'", () => {
		const r = { exitCode: 0, messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] };
		assert.equal(getResultOutput(r as any), "(no output)");
	});
});

// ---- getFinalOutput ----

describe("getFinalOutput", () => {
	it("returns LAST assistant message text", () => {
		const msgs: Message[] = [
			{ role: "assistant", content: [{ type: "text", text: "first" }] } as Message,
			{ role: "user", content: [] },
			{ role: "assistant", content: [{ type: "text", text: "last one" }] } as Message,
		];
		assert.equal(getFinalOutput(msgs), "last one");
	});

	it("skips non-assistant messages", () => {
		const msgs: Message[] = [
			{ role: "user", content: [{ type: "text", text: "hi" }] },
			{ role: "assistant", content: [{ type: "text", text: "bye" }] } as Message,
		];
		assert.equal(getFinalOutput(msgs), "bye");
	});

	it("no assistant message → empty string", () => {
		const msgs: Message[] = [{ role: "user", content: [{ type: "text", text: "hi" }] }];
		assert.equal(getFinalOutput(msgs), "");
	});
});

// ---- truncateParallelOutput ----

describe("truncateParallelOutput", () => {
	it("under PER_TASK_OUTPUT_CAP → unchanged", () => {
		const small = "a".repeat(PER_TASK_OUTPUT_CAP - 1);
		assert.equal(truncateParallelOutput(small), small);
	});

	it("over cap → truncated with marker", () => {
		const big = "abc".repeat(100_000);
		const result = truncateParallelOutput(big);
		assert.ok(result.includes("[Output truncated:"), "Expected truncation marker in result, got: " + result.slice(0, 60));
		assert.ok(Buffer.byteLength(result, "utf8") <= PER_TASK_OUTPUT_CAP + 200);
	});

	it("multibyte input not split mid-character", () => {
		// Create a string over the cap with multibyte characters
		const emoji = "🌍"; // 4 bytes each
		const base = "a".repeat(PER_TASK_OUTPUT_CAP + 1000);
		const input = base + emoji.repeat(50);
		const result = truncateParallelOutput(input);
		// Should parse as valid UTF-8 without U+FFFD
		assert.ok(!result.includes("\uFFFD"), "Result contains replacement character U+FFFD");
	});
});

// ---- resolveExitOutcome [WS2 signal death] ----

describe("resolveExitOutcome", () => {
	it("(0, null) → exitCode 0, no errorMessage", () => {
		const o = resolveExitOutcome(0, null);
		assert.equal(o.exitCode, 0);
		assert.equal(o.errorMessage, undefined);
	});

	it("(1, null) → exitCode 1", () => {
		const o = resolveExitOutcome(1, null);
		assert.equal(o.exitCode, 1);
	});

	it("(null, 'SIGKILL') → exitCode 1 with errorMessage containing SIGKILL", () => {
		const o = resolveExitOutcome(null, "SIGKILL");
		assert.equal(o.exitCode, 1);
		assert.ok(o.errorMessage?.includes("SIGKILL"));
	});

	it("(null, null) → exitCode 1 with message", () => {
		const o = resolveExitOutcome(null, null);
		assert.equal(o.exitCode, 1);
		assert.ok(o.errorMessage);
	});
});

// ---- createLineSplit [WS2 multibyte] ----

describe("createLineSplit", () => {
	it("multibyte char split across chunks survives intact", () => {
		const lines: string[] = [];
		const s = createLineSplit((l) => lines.push(l));
		const full = Buffer.from("héllo wörld\nsecond\n", "utf8");
		s.push(full.subarray(0, 2));
		s.push(full.subarray(2));
		s.flush();
		assert.deepEqual(lines, ["héllo wörld", "second"]);
	});

	it("unterminated tail emitted on flush()", () => {
		const lines: string[] = [];
		const s = createLineSplit((l) => lines.push(l));
		s.push(Buffer.from("hello wor", "utf8"));
		s.flush();
		assert.deepEqual(lines, ["hello wor"]);
	});

	it("empty chunks are no-ops", () => {
		const lines: string[] = [];
		const s = createLineSplit((l) => lines.push(l));
		s.push(Buffer.alloc(0));
		s.flush();
		assert.deepEqual(lines, []);
	});

	it("multiple lines in one chunk emitted in order", () => {
		const lines: string[] = [];
		const s = createLineSplit((l) => lines.push(l));
		s.push(Buffer.from("a\nb\nc\nd\n", "utf8"));
		s.flush();
		assert.deepEqual(lines, ["a", "b", "c", "d"]);
	});
});

// ---- capStderr [WS2 stderr bound] ----

describe("capStderr", () => {
	it("under cap → unchanged", () => {
		const text = "short text";
		assert.equal(capStderr(text, 1024), text);
	});

	it("over cap → starts with truncation marker", () => {
		const big = "x".repeat(200_000);
		const result = capStderr(big, 64 * 1024);
		assert.ok(result.startsWith("[stderr truncated:"), `Expected truncation marker, got: ${result.slice(0, 60)}`);
	});

	it("keeps the tail — last N chars match input's tail", () => {
		const big = "y".repeat(200_000);
		const cap = 64 * 1024;
		const result = capStderr(big, cap);
		const originalTail = big.slice(-cap);
		// The tail portion should appear at the end of the result (after the marker)
		const afterMarker = result.indexOf("\n") + 1;
		const resultTail = result.slice(afterMarker);
		assert.ok(resultTail.endsWith(originalTail.slice(0, cap)), "Tail doesn't match input tail");
	});

	it("byte length ≤ cap + marker", () => {
		const big = "z".repeat(500_000);
		const cap = 64 * 1024;
		const result = capStderr(big, cap);
		assert.ok(Buffer.byteLength(result, "utf8") <= cap + 200, `Byte length ${Buffer.byteLength(result)} exceeds cap + marker`);
	});
});

// ---- decideProjectAgentGate [WS1 fail-closed] ----

describe("decideProjectAgentGate", () => {
	const projAgent = { name: "impl", description: "impl", source: "project" } as unknown as AgentConfig;
	const userAgent = { name: "leader", description: "leader", source: "user" } as unknown as AgentConfig;
	const agents = [projAgent, userAgent];
	const dir = "/repo/.pi/agents";

	it('scope "user" → proceed', () => {
		const d = decideProjectAgentGate({
			agentScope: "user",
			confirmProjectAgents: true,
			hasUI: false,
			requestedAgentNames: ["impl"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "proceed");
	});

	it('scope "both" with no project-sourced agents requested → proceed', () => {
		const d = decideProjectAgentGate({
			agentScope: "both",
			confirmProjectAgents: true,
			hasUI: false,
			requestedAgentNames: ["leader"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "proceed");
	});

	it('scope "both" + project agent + hasUI true + confirm true → confirm', () => {
		const d = decideProjectAgentGate({
			agentScope: "both",
			confirmProjectAgents: true,
			hasUI: true,
			requestedAgentNames: ["impl"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "confirm");
		assert.equal(d.agents[0].name, "impl");
		assert.equal(d.dir, dir);
	});

	it("scope \"both\" + project agent + hasUI false + confirm true → reject (fail-closed)", () => {
		const d = decideProjectAgentGate({
			agentScope: "both",
			confirmProjectAgents: true,
			hasUI: false,
			requestedAgentNames: ["impl"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "reject");
		assert.equal(d.agents[0].name, "impl");
		assert.equal(d.dir, dir);
	});

	it('scope "both" + project agent + hasUI false + confirm false → proceed (opt-out)', () => {
		const d = decideProjectAgentGate({
			agentScope: "both",
			confirmProjectAgents: false,
			hasUI: false,
			requestedAgentNames: ["impl"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "proceed");
	});

	it('scope "project" variant → reject when headless', () => {
		const d = decideProjectAgentGate({
			agentScope: "project",
			confirmProjectAgents: true,
			hasUI: false,
			requestedAgentNames: ["impl"],
			agents,
			projectAgentsDir: dir,
		});
		assert.equal(d.action, "reject");
	});
});
