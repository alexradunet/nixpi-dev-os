/**
 * Subprocess lifecycle for the subagent tool: worker arg building, 0o600
 * temp-file delivery of prompt and task, spawn + stream wiring, abort
 * escalation, JSON-event parse loop, temp-file cleanup.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type { Message } from "@earendil-works/pi-ai";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import type { AgentConfig } from "./agents.ts";
import {
	createLineSplit,
	capStderr,
	resolveExitOutcome,
	getFinalOutput,
	type SingleResult,
	type SubagentDetails,
	type UsageStats,
} from "./core.ts";

// Bundled skills/ next to this module; identical import.meta.url pattern to
// index.ts and agents.ts (all three live in pi/orchestrator/).
const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "skills");

export const MAX_PARALLEL_TASKS = 8;
export const MAX_CONCURRENCY = 4;

export type OnUpdateCallback = (partial: AgentToolResult<SubagentDetails>) => void;

async function writePromptToTempFile(
	agentName: string,
	prompt: string,
	kind: "prompt" | "task",
	existingDir: string | null = null,
): Promise<{ dir: string; filePath: string }> {
	const tmpDir = existingDir ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-subagent-")));
	const safeName = agentName.replace(/[^\w.-]+/g, "_");
	const filePath = path.join(tmpDir, `${kind}-${safeName}.md`);
	await withFileMutationQueue(filePath, async () => {
		await fs.promises.writeFile(filePath, prompt, { encoding: "utf-8", mode: 0o600 });
	});
	return { dir: tmpDir, filePath };
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) {
		return { command: process.execPath, args };
	}

	return { command: "pi", args };
}

function buildAgentArgs(agent: AgentConfig, effectiveModel: string | undefined): string[] {
	const args: string[] = ["--mode", "json", "-p", "--no-session"];
	if (effectiveModel) args.push("--model", effectiveModel);
	if (agent.thinking) args.push("--thinking", agent.thinking);
	if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));
	return args;
}

function emptyUsage(): UsageStats {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 };
}

function unknownAgentResult(agentName: string, task: string, agents: AgentConfig[], step: number | undefined): SingleResult {
	const available = agents.map((a) => `"${a.name}"`).join(", ") || "none";
	return {
		agent: agentName,
		agentSource: "unknown",
		task,
		exitCode: 1,
		messages: [],
		stderr: `Unknown agent: "${agentName}". Available agents: ${available}.`,
		usage: emptyUsage(),
		step,
	};
}

function freshResult(
	agentName: string,
	agent: AgentConfig,
	task: string,
	effectiveModel: string | undefined,
	step: number | undefined,
): SingleResult {
	return {
		agent: agentName,
		agentSource: agent.source,
		task,
		exitCode: 0,
		messages: [],
		stderr: "",
		usage: emptyUsage(),
		model: effectiveModel,
		step,
	};
}

function wireAbort(signal: AbortSignal, proc: ChildProcess): { wasAborted: () => boolean } {
	let aborted = false;
	const killProc = () => {
		aborted = true;
		proc.kill("SIGTERM");
		setTimeout(() => {
			if (!proc.killed) proc.kill("SIGKILL");
		}, 5000);
	};
	if (signal.aborted) killProc();
	else {
		signal.addEventListener("abort", killProc, { once: true });
		// Without this, killProc (holding proc) stays registered on the shared signal after normal completion.
		proc.on("close", () => signal.removeEventListener("abort", killProc));
	}
	return { wasAborted: () => aborted };
}

/**
 * Spawn the worker and wire its streams. Resolves the RAW close values;
 * exit/signal mapping (resolveExitOutcome) and result mutation belong to
 * runSingleAgent.
 */
function runWorkerProcess(opts: {
	invocation: { command: string; args: string[] };
	cwd: string;
	env: NodeJS.ProcessEnv;
	signal: AbortSignal | undefined;
	onLine: (line: string) => void;
	onStderr: (chunk: Buffer) => void;
}): Promise<{ code: number | null; closeSignal: string | null; spawnError?: string; wasAborted: boolean }> {
	const proc = spawn(opts.invocation.command, opts.invocation.args, {
		cwd: opts.cwd,
		shell: false,
		stdio: ["ignore", "pipe", "pipe"],
		env: opts.env,
	});
	const lineSplit = createLineSplit(opts.onLine);
	const abortState = opts.signal ? wireAbort(opts.signal, proc) : null;
	proc.stdout.on("data", (chunk: Buffer) => {
		lineSplit.push(chunk);
	});
	proc.stderr.on("data", (chunk: Buffer) => {
		opts.onStderr(chunk);
	});
	return new Promise((resolve) => {
		proc.on("close", (code, closeSignal) => {
			lineSplit.flush();
			resolve({ code, closeSignal, wasAborted: abortState?.wasAborted() ?? false });
		});
		proc.on("error", (err) => {
			resolve({ code: null, closeSignal: null, spawnError: err.message, wasAborted: abortState?.wasAborted() ?? false });
		});
	});
}

/**
 * JSON-mode events consumed by the parse loop. `tool_result_end` is not in
 * pi's documented AgentEvent union (pi docs/json.md); it comes from the
 * vendored subagent example (pi examples/extensions/subagent/index.ts) and is
 * kept for upstream parity.
 */
type PiJsonEvent = { type: string; message?: Message };

function processWorkerLine(line: string, currentResult: SingleResult, emitUpdate: () => void): void {
	if (!line.trim()) return;
	let event: PiJsonEvent;
	try {
		event = JSON.parse(line);
	} catch {
		return;
	}

	if (event.type === "message_end" && event.message) {
		const msg = event.message as Message;
		currentResult.messages.push(msg);

		if (msg.role === "assistant") {
			currentResult.usage.turns++;
			const usage = msg.usage;
			if (usage) {
				currentResult.usage.input += usage.input || 0;
				currentResult.usage.output += usage.output || 0;
				currentResult.usage.cacheRead += usage.cacheRead || 0;
				currentResult.usage.cacheWrite += usage.cacheWrite || 0;
				currentResult.usage.cost += usage.cost?.total || 0;
				currentResult.usage.contextTokens = usage.totalTokens || 0;
			}
			if (!currentResult.model && msg.model) currentResult.model = msg.model;
			if (msg.stopReason) currentResult.stopReason = msg.stopReason;
			if (msg.errorMessage) currentResult.errorMessage = msg.errorMessage;
		}
		emitUpdate();
	}

	if (event.type === "tool_result_end" && event.message) {
		currentResult.messages.push(event.message as Message);
		emitUpdate();
	}
}

function emitProgressUpdate(
	currentResult: SingleResult,
	onUpdate: OnUpdateCallback | undefined,
	makeDetails: (results: SingleResult[]) => SubagentDetails,
): void {
	if (!onUpdate) return;
	onUpdate({
		content: [{ type: "text", text: getFinalOutput(currentResult.messages) || "(running...)" }],
		details: makeDetails([currentResult]),
	});
}

/** Map the raw worker outcome onto the result: spawn error wins, then exit/signal. */
function applyWorkerOutcome(
	outcome: { code: number | null; closeSignal: string | null; spawnError?: string },
	currentResult: SingleResult,
): void {
	if (outcome.spawnError) {
		currentResult.errorMessage = `Failed to spawn worker: ${outcome.spawnError}`;
		currentResult.exitCode = 1;
		return;
	}
	const resolved = resolveExitOutcome(outcome.code, outcome.closeSignal);
	if (resolved.errorMessage) currentResult.errorMessage = resolved.errorMessage;
	currentResult.exitCode = resolved.exitCode;
}

function cleanupTempFiles(tmpFiles: string[], tmpDir: string | null): void {
	for (const f of tmpFiles)
		try {
			fs.unlinkSync(f);
		} catch {
			/* ignore */
		}
	if (tmpDir)
		try {
			fs.rmdirSync(tmpDir);
		} catch {
			/* ignore */
		}
}

export async function runSingleAgent(
	defaultCwd: string,
	agents: AgentConfig[],
	agentName: string,
	task: string,
	cwd: string | undefined,
	modelOverride: string | undefined,
	step: number | undefined,
	signal: AbortSignal | undefined,
	onUpdate: OnUpdateCallback | undefined,
	makeDetails: (results: SingleResult[]) => SubagentDetails,
): Promise<SingleResult> {
	const agent = agents.find((a) => a.name === agentName);
	if (!agent) return unknownAgentResult(agentName, task, agents, step);

	const effectiveModel = modelOverride?.trim() || agent.model;
	const args = buildAgentArgs(agent, effectiveModel);
	const currentResult = freshResult(agentName, agent, task, effectiveModel, step);
	let tmpDir: string | null = null;
	const tmpFiles: string[] = [];
	const emitUpdate = () => emitProgressUpdate(currentResult, onUpdate, makeDetails);

	try {
		if (agent.systemPrompt.trim()) {
			const tmp = await writePromptToTempFile(agent.name, agent.systemPrompt, "prompt");
			tmpDir = tmp.dir;
			tmpFiles.push(tmp.filePath);
			args.push("--append-system-prompt", tmp.filePath);
		}

		// The task goes through a 0o600 temp file like the system prompt: argv is
		// world-readable (ps, /proc/<pid>/cmdline), the task is not public. pi's
		// @file positional includes the file contents in the initial message.
		const taskFile = await writePromptToTempFile(agent.name, `Task: ${task}`, "task", tmpDir);
		tmpDir = taskFile.dir;
		tmpFiles.push(taskFile.filePath);
		args.push(`@${taskFile.filePath}`);

		const stderrDecoder = new StringDecoder("utf8");
		const outcome = await runWorkerProcess({
			invocation: getPiInvocation(args),
			cwd: cwd ?? defaultCwd,
			env: { ...process.env, NIXPI_WORKER: "1", NIXPI_SKILLS_DIR: SKILLS_DIR },
			signal,
			onLine: (line) => processWorkerLine(line, currentResult, emitUpdate),
			onStderr: (chunk) => {
				currentResult.stderr = capStderr(currentResult.stderr + stderrDecoder.write(chunk));
			},
		});
		applyWorkerOutcome(outcome, currentResult);
		if (outcome.wasAborted) throw new Error("Subagent was aborted");
		return currentResult;
	} finally {
		cleanupTempFiles(tmpFiles, tmpDir);
	}
}
