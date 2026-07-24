/**
 * Orchestrator extension — hooks only.
 *
 * Serves the orchestration skills (resources_discover) and injects the
 * orchestration playbook (before_agent_start) into every session, workers
 * included. Worker spawning is delegated to the Paseo daemon; this extension
 * registers no tool, so there is no worker-nesting guard and no NIXPI_* env
 * machinery.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const EXTENSION_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(EXTENSION_DIR, "skills");
const PLAYBOOK_PATH = path.join(EXTENSION_DIR, "AGENTS.md");

function loadPlaybook(): string {
	try {
		return fs.readFileSync(PLAYBOOK_PATH, "utf-8");
	} catch {
		return "";
	}
}

export default function (pi: ExtensionAPI) {
	const playbook = loadPlaybook();

	// Skills and the playbook are served to every session, spawned workers
	// included: workers need the methodology (their role briefings reference
	// the skills by absolute path). Spawning itself is Paseo's job, so this
	// extension registers no tool.
	pi.on("resources_discover", () => ({ skillPaths: [SKILLS_DIR] }));
	pi.on("before_agent_start", async (event) => {
		if (!playbook) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${playbook}` };
	});
}
