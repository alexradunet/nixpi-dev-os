import { test } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Extension root = the directory this test file lives in (pi/orchestrator).
const EXT = path.dirname(fileURLToPath(import.meta.url));
const ROLES = path.join(EXT, "roles");
const SKILLS = path.join(EXT, "skills");

// The pipeline-v2 contract (spec.md → Implementation Decisions). This set IS the
// executable specification of which phases are spawnable. plan writes the tickets
// itself — the separate tickets phase was merged into plan (one context does recon,
// design, and breakdown).
const SPAWNABLE = [
	"spec",
	"plan",
	"implement",
	"review-standards",
	"review-feature",
];

// role name -> skill dir its body must reference. review-standards and review-feature
// both run the single `review` skill (two modes). tdd/grill/teach/janitor/explore have
// no role (reference or in-session), so they are not here.
const ROLE_SKILL: Record<string, string> = {
	spec: "spec",
	plan: "plan",
	implement: "implement",
	"review-standards": "review",
	"review-feature": "review",
};

function read(p: string): string {
	return fs.readFileSync(p, "utf-8");
}

// Minimal flat-frontmatter parser: split each line on the first colon. Sufficient for
// these role briefings (no nested YAML), and deliberately independent of pi's parser.
function frontmatter(body: string, file: string): Record<string, string> {
	const m = body.match(/^---\n([\s\S]*?)\n---/);
	assert.ok(m, `${file}: missing frontmatter fence`);
	const out: Record<string, string> = {};
	for (const line of m![1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx < 0) continue;
		out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return out;
}

test("worker-output-schema: core required, flags optional, closed shape", () => {
	const schema = JSON.parse(read(path.join(EXT, "worker-output-schema.json")));
	assert.deepEqual(schema.required, ["status", "artifact_path", "summary"]);
	assert.ok(schema.properties.flags, "flags property missing");
	assert.ok(!schema.required.includes("flags"), "flags must be optional");
	assert.equal(schema.additionalProperties, false);
});

test("roles/ directory is exactly the spawnable set (explore removed)", () => {
	const files = fs
		.readdirSync(ROLES)
		.filter((f) => f.endsWith(".md"))
		.map((f) => f.replace(/\.md$/, ""))
		.sort();
	assert.deepEqual(files, [...SPAWNABLE].sort());
});

for (const role of SPAWNABLE) {
	test(`role ${role}: valid frontmatter + referenced skill exists`, () => {
		const body = read(path.join(ROLES, `${role}.md`));
		const fm = frontmatter(body, role);
		for (const key of ["name", "description", "provider", "thinking", "workspace"]) {
			assert.ok(fm[key] && fm[key].length > 0, `${role}: missing frontmatter key ${key}`);
		}
		// YAML gotcha (pi-role-yaml-frontmatter lesson): a description with ": " must be quoted.
		if (fm.description.includes(": ")) {
			assert.ok(
				fm.description.startsWith('"') && fm.description.endsWith('"'),
				`${role}: description contains ": " and must be double-quoted`,
			);
		}
		assert.ok(
			fm.workspace === "current" || fm.workspace === "worktree",
			`${role}: workspace must be current|worktree, got "${fm.workspace}"`,
		);
		const ref = `skills/${ROLE_SKILL[role]}/SKILL.md`;
		assert.ok(body.includes(ref), `${role}: body must reference ${ref}`);
		assert.ok(fs.existsSync(path.join(EXT, ref)), `${role}: referenced ${ref} does not exist`);
	});
}

test("every spawnable phase has a skill directory", () => {
	for (const skill of new Set(Object.values(ROLE_SKILL))) {
		assert.ok(fs.existsSync(path.join(SKILLS, skill, "SKILL.md")), `skills/${skill}/SKILL.md missing`);
	}
});

test("tdd reference skill exists (read by implement, has no role)", () => {
	assert.ok(fs.existsSync(path.join(SKILLS, "tdd", "SKILL.md")), "skills/tdd/SKILL.md missing");
});

test("playbook names every spawnable phase and still mentions explore (ad-hoc)", () => {
	const pb = read(path.join(EXT, "AGENTS.md"));
	for (const phase of SPAWNABLE) {
		assert.ok(pb.includes(phase), `playbook does not mention phase "${phase}"`);
	}
	assert.ok(/explore/i.test(pb), "playbook must still mention explore (ad-hoc)");
});

test("playbook enforces the main-checkout guard", () => {
	const pb = read(path.join(EXT, "AGENTS.md"));
	assert.ok(/main-checkout guard/i.test(pb), "playbook missing the main-checkout guard section");
});
