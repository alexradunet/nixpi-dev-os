import { StringDecoder } from "node:string_decoder";
import type { Message } from "@earendil-works/pi-ai";
import type { AgentConfig, AgentScope } from "./agents.ts";

/**
 * Pure core logic for the subagent tool: result classification, output caps,
 * exit/signal outcome, the project-agent trust gate, stream line splitting,
 * concurrency mapping. No runtime imports from @earendil-works/* or typebox —
 * this module is the unit-test seam (node --test runs it under bare node).
 */

export type ProjectAgentGateDecision =
	| { action: "proceed" }
	| { action: "confirm"; agents: AgentConfig[]; dir: string | null }
	| { action: "reject"; agents: AgentConfig[]; dir: string | null };

/**
 * Decide whether project-local agents may run. Trust boundary: headless
 * sessions cannot prompt, so they fail closed unless the caller explicitly
 * opted out with confirmProjectAgents: false.
 *
 * Example: decideProjectAgentGate({ agentScope: "both", confirmProjectAgents: true,
 *   hasUI: false, requestedAgentNames: ["impl"], agents, projectAgentsDir: dir })
 * → { action: "reject", ... }
 */
export function decideProjectAgentGate(opts: {
	agentScope: AgentScope;
	confirmProjectAgents: boolean;
	hasUI: boolean;
	requestedAgentNames: string[];
	agents: AgentConfig[];
	projectAgentsDir: string | null;
}): ProjectAgentGateDecision {
	if (opts.agentScope === "user" || !opts.confirmProjectAgents) return { action: "proceed" };
	const requested = new Set(opts.requestedAgentNames);
	const projectAgents = opts.agents.filter((a) => requested.has(a.name) && a.source === "project");
	if (projectAgents.length === 0) return { action: "proceed" };
	if (!opts.hasUI) return { action: "reject", agents: projectAgents, dir: opts.projectAgentsDir };
	return { action: "confirm", agents: projectAgents, dir: opts.projectAgentsDir };
}

/**
 * Split a byte stream into lines, buffering incomplete UTF-8 multibyte
 * sequences across chunk boundaries (Buffer.toString() per chunk would emit
 * U+FFFD at boundaries). push() per chunk, flush() once at stream end.
 */
export function createLineSplit(onLine: (line: string) => void) {
	const decoder = new StringDecoder("utf8");
	let buffer = "";
	return {
		push(chunk: Buffer): void {
			buffer += decoder.write(chunk);
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) onLine(line);
		},
		flush(): void {
			const tail = buffer + decoder.end();
			buffer = "";
			if (tail.trim()) onLine(tail);
		},
	};
}

export const STDERR_CAP_BYTES = 64 * 1024;

/**
 * Cap accumulated stderr, keeping the TAIL (errors land at the end) and
 * dropping the head with a marker. Byte-aware so the cut never splits a
 * multibyte character.
 */
export function capStderr(stderr: string, cap: number = STDERR_CAP_BYTES): string {
	const bytes = Buffer.byteLength(stderr, "utf8");
	if (bytes <= cap) return stderr;
	let tail = stderr.slice(-cap);
	while (Buffer.byteLength(tail, "utf8") > cap) tail = tail.slice(1);
	return `[stderr truncated: ${bytes - Buffer.byteLength(tail, "utf8")} bytes dropped from head]\n${tail}`;
}


/**
 * Map a subprocess close event to an exit outcome. code === null means the
 * process died by a signal (OOM killer, external pkill) - that is a failure,
 * not exit 0. Intentional aborts are handled separately by the caller.
 */
export function resolveExitOutcome(
	code: number | null,
	signal: string | null,
): { exitCode: number; errorMessage?: string } {
	if (code !== null) return { exitCode: code };
	if (signal) return { exitCode: 1, errorMessage: `Worker process killed by ${signal} (no exit code)` };
	return { exitCode: 1, errorMessage: "Worker process exited with neither an exit code nor a signal" };
}
