---
phase: ticket
status: ready
project: 001-pipeline-v2
ticket: 01
blocked-by: []
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test

## What to build

Lay the foundation every other ticket builds on. Extend the worker output schema with
an optional, backward-compatible `flags` field, then create the contract test that is
the executable specification of the whole pipeline-v2 rebuild. The test starts RED: it
runs cleanly and reports the missing roles, skills, and playbook phases that later
tickets fill in. After this ticket, `node --test "pi/orchestrator/*.test.ts"` runs and
reports `tests 12, pass 3, fail 9` — the 3 passing are the schema test and the
already-valid `plan` and `implement` role tests.

## Acceptance criteria

- [ ] `worker-output-schema.json` has a `flags` array property; `required` is still exactly `["status", "artifact_path", "summary"]`; `additionalProperties` is still `false`.
- [ ] `node -e "const s=require('./pi/orchestrator/worker-output-schema.json'); console.log(s.required.join(','), 'flags' in s.properties, s.additionalProperties)"` prints `status,artifact_path,summary true false`.
- [ ] `pi/orchestrator/orchestrator.test.ts` exists with the exact content below (erasable TS only).
- [ ] `node --test "pi/orchestrator/*.test.ts"` RUNS (parses) and reports `tests 12, pass 3, fail 9` (non-zero exit expected — this is the intended RED).
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message (e.g. `test(orchestrator): add pipeline-v2 contract test`).

## Blocked by

None — can start immediately.

---

## Plan steps to execute (in full)

### Step 1: Extend the worker output schema (add optional `flags`)

Edit `pi/orchestrator/worker-output-schema.json`. Add a `flags` property after
`summary` and leave `required` unchanged (so `flags` is optional and existing workers
still validate):

```json
		"summary": {
			"type": "string",
			"description": "One-paragraph summary of what was produced"
		},
		"flags": {
			"type": "array",
			"items": { "type": "string" },
			"description": "Optional signals to the orchestrator: domain-term contradictions, shared blast radius, etc. Backward-compatible: workers that omit it still validate."
		}
```

Keep `"required": ["status", "artifact_path", "summary"]` and
`"additionalProperties": false` exactly as they are.

**Verify**: `node -e "const s=require('./pi/orchestrator/worker-output-schema.json'); console.log(s.required.join(','), 'flags' in s.properties, s.additionalProperties)"`
→ prints `status,artifact_path,summary true false`.

### Step 2: Create the pipeline-v2 contract test (RED)

Create `pi/orchestrator/orchestrator.test.ts` with exactly this content (erasable TS
only — verified to run under Node 24 type-stripping):

```ts
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
// executable specification of which phases are spawnable.
const SPAWNABLE = [
	"spec",
	"domain-model",
	"plan",
	"tickets",
	"implement",
	"review-standards",
	"review-feature",
];

// role name -> skill dir its body must reference. review-standards and review-feature
// both run the single `review` skill (two modes). tdd/grill/teach/janitor/explore have
// no role (reference or in-session), so they are not here.
const ROLE_SKILL: Record<string, string> = {
	spec: "spec",
	"domain-model": "domain-model",
	plan: "plan",
	tickets: "tickets",
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
```

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the suite RUNS and reports
`tests 12, pass 3, fail 9` (exit non-zero is expected now). The 3 passing are the schema
test and the already-valid `plan` and `implement` role tests; the 9 failures name the
missing roles, skills, and playbook phases. This is the intended RED. If the suite fails
to *parse* (a type or syntax error), fix the test before continuing — it must run.

---

## How to work (read first)

You are an implement worker. You implement; you never spawn. Never run `paseo run` or
`paseo send`, and never create agents.

### Pre-edit identity check (mandatory before any file edit)
1. `pwd` matches the assigned worktree path.
2. `git branch --show-current` is non-main (branch `001-pipeline-v2`).
3. `git worktree list` confirms this worktree's identity.
4. `git status --short` is clean.
Stop and report if any check fails.

### Drift check (run first)
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/`
If `worker-output-schema.json` or the roles/skills layout changed since the plan was
written, compare against the excerpts above before proceeding; on a mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...` — never the
`~/.pi/...` symlink.

### Repo conventions
- Tests run headless with one command on Node 24: `node --test "pi/orchestrator/*.test.ts"`.
  Do not pass a bare directory to `node --test` (broken on Node 24). Node 24 runs `.ts`
  via type-stripping, so the test file uses erasable syntax only (type annotations OK;
  no enums, namespaces, parameter properties). The test content above already complies.

### Git workflow
- Branch: `001-pipeline-v2`. You never create/remove/switch worktrees.
- Conventional commits. Commit and report only; never push or open a PR.

### Scope guard
Touch ONLY `pi/orchestrator/worker-output-schema.json` and the new
`pi/orchestrator/orchestrator.test.ts`. `pi/orchestrator/index.ts` must NOT change. If
you believe a code change is needed, STOP and report.

### STOP conditions
Stop and report (do not improvise) if: the schema doesn't match the excerpt (drift);
`index.ts` appears to need a change; the test file fails to *parse* under `node --test`
after a reasonable fix (confirm erasable-only TS, then report the exact error); a
verification fails twice after a reasonable fix; identity checks fail.

### Current `worker-output-schema.json` (in full, for reference)

```json
{
	"type": "object",
	"properties": {
		"status": {
			"type": "string",
			"enum": ["done", "stopped", "blocked"],
			"description": "done: artifact written; stopped: halted on a STOP condition; blocked: cannot proceed"
		},
		"artifact_path": {
			"type": "string",
			"description": "Absolute path to the artifact file this worker wrote"
		},
		"summary": {
			"type": "string",
			"description": "One-paragraph summary of what was produced"
		}
	},
	"required": ["status", "artifact_path", "summary"],
	"additionalProperties": false
}
```
