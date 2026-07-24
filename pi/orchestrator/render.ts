/**
 * TUI rendering for the subagent tool: the tool-call preview (renderCall)
 * and the result view (renderResult), decomposed into one renderer per mode
 * with a single shared expanded per-result body (renderResultRow).
 */

import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import type { AgentScope } from "./agents.ts";
import { getFinalOutput, isFailedResult, type SingleResult, type SubagentDetails } from "./core.ts";
import { formatToolCall, formatUsageStats, getDisplayItems, type DisplayItem, type ThemeColor } from "./format.ts";

/**
 * Structural subset of pi-tui's Theme used by these renderers. The full
 * theme type resolves only inside pi's bundled runtime; this extension only
 * calls fg and bold.
 */
export interface RenderTheme {
	fg: (color: ThemeColor, text: string) => string;
	bold: (text: string) => string;
}

type MarkdownTheme = ReturnType<typeof getMarkdownTheme>;

/** Structural shape renderCall reads off the subagent tool parameters. */
export interface SubagentCallArgs {
	agentScope?: AgentScope;
	agent?: string;
	task?: string;
	tasks?: { agent: string; task: string }[];
	chain?: { agent: string; task: string }[];
}

const COLLAPSED_ITEM_COUNT = 10;

function renderDisplayItems(items: DisplayItem[], limit: number | undefined, theme: RenderTheme, expanded: boolean): string {
	const toShow = limit ? items.slice(-limit) : items;
	const skipped = limit && items.length > limit ? items.length - limit : 0;
	let text = "";
	if (skipped > 0) text += theme.fg("muted", `... ${skipped} earlier items\n`);
	for (const item of toShow) {
		if (item.type === "text") {
			const preview = expanded ? item.text : item.text.split("\n").slice(0, 3).join("\n");
			text += `${theme.fg("toolOutput", preview)}\n`;
		} else {
			text += `${theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme))}\n`;
		}
	}
	return text.trimEnd();
}

function aggregateUsage(results: SingleResult[]) {
	const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 };
	for (const r of results) {
		total.input += r.usage.input;
		total.output += r.usage.output;
		total.cacheRead += r.usage.cacheRead;
		total.cacheWrite += r.usage.cacheWrite;
		total.cost += r.usage.cost;
		total.turns += r.usage.turns;
	}
	return total;
}

/**
 * Shared expanded per-result body for all three modes: header row, optional
 * error row, task row, tool-call rows, final-output markdown, usage row.
 * Callers build the full header string (icon placement differs per mode).
 * This is the single place to change expanded per-result rendering.
 */
function renderResultRow(
	r: SingleResult,
	opts: { theme: RenderTheme; mdTheme: MarkdownTheme; header: string; showErrorMessage: boolean },
): Container {
	const { theme, mdTheme, header, showErrorMessage } = opts;
	const container = new Container();
	container.addChild(new Text(header, 0, 0));
	if (showErrorMessage && r.errorMessage)
		container.addChild(new Text(theme.fg("error", `Error: ${r.errorMessage}`), 0, 0));
	container.addChild(new Text(theme.fg("muted", "Task: ") + theme.fg("dim", r.task), 0, 0));
	for (const item of getDisplayItems(r.messages)) {
		if (item.type === "toolCall")
			container.addChild(
				new Text(theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme)), 0, 0),
			);
	}
	const finalOutput = getFinalOutput(r.messages);
	if (finalOutput) {
		container.addChild(new Spacer(1));
		container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme));
	}
	const usageStr = formatUsageStats(r.usage, r.model);
	if (usageStr) container.addChild(new Text(theme.fg("dim", usageStr), 0, 0));
	return container;
}

function renderSingleResult(r: SingleResult, expanded: boolean, theme: RenderTheme, mdTheme: MarkdownTheme): Text | Container {
	const isError = isFailedResult(r);
	const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
	let header = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}${theme.fg("muted", ` (${r.agentSource})`)}`;
	if (isError && r.stopReason) header += ` ${theme.fg("error", `[${r.stopReason}]`)}`;
	if (expanded) return renderResultRow(r, { theme, mdTheme, header, showErrorMessage: isError });

	const displayItems = getDisplayItems(r.messages);
	let text = header;
	if (isError && r.errorMessage) text += `\n${theme.fg("error", `Error: ${r.errorMessage}`)}`;
	else if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`;
	else {
		text += `\n${renderDisplayItems(displayItems, COLLAPSED_ITEM_COUNT, theme, false)}`;
		if (displayItems.length > COLLAPSED_ITEM_COUNT) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
	}
	const usageStr = formatUsageStats(r.usage, r.model);
	if (usageStr) text += `\n${theme.fg("dim", usageStr)}`;
	return new Text(text, 0, 0);
}

function renderChainResult(results: SingleResult[], expanded: boolean, theme: RenderTheme, mdTheme: MarkdownTheme): Text | Container {
	const successCount = results.filter((r) => r.exitCode === 0).length;
	const icon = successCount === results.length ? theme.fg("success", "✓") : theme.fg("error", "✗");
	const title = icon + " " + theme.fg("toolTitle", theme.bold("chain ")) + theme.fg("accent", `${successCount}/${results.length} steps`);

	if (expanded) {
		const container = new Container();
		container.addChild(new Text(title, 0, 0));
		for (const r of results) {
			const rIcon = r.exitCode === 0 ? theme.fg("success", "✓") : theme.fg("error", "✗");
			const header = `${theme.fg("muted", `─── Step ${r.step}: `) + theme.fg("accent", r.agent)} ${rIcon}`;
			container.addChild(new Spacer(1));
			container.addChild(renderResultRow(r, { theme, mdTheme, header, showErrorMessage: false }));
		}
		const usageStr = formatUsageStats(aggregateUsage(results));
		if (usageStr) {
			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0));
		}
		return container;
	}

	let text = title;
	for (const r of results) {
		const rIcon = r.exitCode === 0 ? theme.fg("success", "✓") : theme.fg("error", "✗");
		const displayItems = getDisplayItems(r.messages);
		text += `\n\n${theme.fg("muted", `─── Step ${r.step}: `)}${theme.fg("accent", r.agent)} ${rIcon}`;
		if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`;
		else text += `\n${renderDisplayItems(displayItems, 5, theme, false)}`;
	}
	const usageStr = formatUsageStats(aggregateUsage(results));
	if (usageStr) text += `\n\n${theme.fg("dim", `Total: ${usageStr}`)}`;
	text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
	return new Text(text, 0, 0);
}

function renderParallelResult(results: SingleResult[], expanded: boolean, theme: RenderTheme, mdTheme: MarkdownTheme): Text | Container {
	const running = results.filter((r) => r.exitCode === -1).length;
	const successCount = results.filter((r) => r.exitCode !== -1 && !isFailedResult(r)).length;
	const failCount = results.filter((r) => r.exitCode !== -1 && isFailedResult(r)).length;
	const isRunning = running > 0;
	const icon = isRunning
		? theme.fg("warning", "⏳")
		: failCount > 0
			? theme.fg("warning", "◐")
			: theme.fg("success", "✓");
	const status = isRunning
		? `${successCount + failCount}/${results.length} done, ${running} running`
		: `${successCount}/${results.length} tasks`;
	const title = `${icon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", status)}`;

	if (expanded && !isRunning) {
		const container = new Container();
		container.addChild(new Text(title, 0, 0));
		for (const r of results) {
			const rIcon = isFailedResult(r) ? theme.fg("error", "✗") : theme.fg("success", "✓");
			const header = `${theme.fg("muted", "─── ") + theme.fg("accent", r.agent)} ${rIcon}`;
			container.addChild(new Spacer(1));
			container.addChild(renderResultRow(r, { theme, mdTheme, header, showErrorMessage: false }));
		}
		const usageStr = formatUsageStats(aggregateUsage(results));
		if (usageStr) {
			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0));
		}
		return container;
	}

	// Collapsed view (or still running)
	let text = title;
	for (const r of results) {
		const rIcon =
			r.exitCode === -1
				? theme.fg("warning", "⏳")
				: isFailedResult(r)
					? theme.fg("error", "✗")
					: theme.fg("success", "✓");
		const displayItems = getDisplayItems(r.messages);
		text += `\n\n${theme.fg("muted", "─── ")}${theme.fg("accent", r.agent)} ${rIcon}`;
		if (displayItems.length === 0)
			text += `\n${theme.fg("muted", r.exitCode === -1 ? "(running...)" : "(no output)")}`;
		else text += `\n${renderDisplayItems(displayItems, 5, theme, expanded)}`;
	}
	if (!isRunning) {
		const usageStr = formatUsageStats(aggregateUsage(results));
		if (usageStr) text += `\n\n${theme.fg("dim", `Total: ${usageStr}`)}`;
	}
	if (!expanded) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
	return new Text(text, 0, 0);
}

export function renderCall(args: SubagentCallArgs, theme: RenderTheme, _context: unknown): Text {
	const scope: AgentScope = args.agentScope ?? "user";
	if (args.chain && args.chain.length > 0) {
		let text =
			theme.fg("toolTitle", theme.bold("subagent ")) +
			theme.fg("accent", `chain (${args.chain.length} steps)`) +
			theme.fg("muted", ` [${scope}]`);
		for (let i = 0; i < Math.min(args.chain.length, 3); i++) {
			const step = args.chain[i];
			// Clean up {previous} placeholder for display
			const cleanTask = step.task.replace(/\{previous\}/g, "").trim();
			const preview = cleanTask.length > 40 ? `${cleanTask.slice(0, 40)}...` : cleanTask;
			text +=
				"\n  " +
				theme.fg("muted", `${i + 1}.`) +
				" " +
				theme.fg("accent", step.agent) +
				theme.fg("dim", ` ${preview}`);
		}
		if (args.chain.length > 3) text += `\n  ${theme.fg("muted", `... +${args.chain.length - 3} more`)}`;
		return new Text(text, 0, 0);
	}
	if (args.tasks && args.tasks.length > 0) {
		let text =
			theme.fg("toolTitle", theme.bold("subagent ")) +
			theme.fg("accent", `parallel (${args.tasks.length} tasks)`) +
			theme.fg("muted", ` [${scope}]`);
		for (const t of args.tasks.slice(0, 3)) {
			const preview = t.task.length > 40 ? `${t.task.slice(0, 40)}...` : t.task;
			text += `\n  ${theme.fg("accent", t.agent)}${theme.fg("dim", ` ${preview}`)}`;
		}
		if (args.tasks.length > 3) text += `\n  ${theme.fg("muted", `... +${args.tasks.length - 3} more`)}`;
		return new Text(text, 0, 0);
	}
	const agentName = args.agent || "...";
	const preview = args.task ? (args.task.length > 60 ? `${args.task.slice(0, 60)}...` : args.task) : "...";
	let text =
		theme.fg("toolTitle", theme.bold("subagent ")) +
		theme.fg("accent", agentName) +
		theme.fg("muted", ` [${scope}]`);
	text += `\n  ${theme.fg("dim", preview)}`;
	return new Text(text, 0, 0);
}

export function renderResult(
	result: AgentToolResult<SubagentDetails>,
	{ expanded }: { expanded: boolean },
	theme: RenderTheme,
	_context: unknown,
): Text | Container {
	const details = result.details as SubagentDetails | undefined;
	if (!details || details.results.length === 0) {
		const text = result.content[0];
		return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
	}
	const mdTheme = getMarkdownTheme();
	if (details.mode === "single" && details.results.length === 1)
		return renderSingleResult(details.results[0], expanded, theme, mdTheme);
	if (details.mode === "chain") return renderChainResult(details.results, expanded, theme, mdTheme);
	if (details.mode === "parallel") return renderParallelResult(details.results, expanded, theme, mdTheme);
	const text = result.content[0];
	return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
}
