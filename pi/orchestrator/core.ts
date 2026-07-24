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
