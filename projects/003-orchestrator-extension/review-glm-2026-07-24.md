---
phase: review
status: done
project: 003-orchestrator-extension
date: 2026-07-24
reviewer: glm-5.2
plan: plan-2026-07-24.md
implement: implement-2026-07-24.md
commit: 1d3fb6b
branch: 003-orchestrator-extension
verdict: approved
---

# Review: Package the orchestration as a single pi extension (`pi_extensions/orchestrator/`)

Independent second-opinion review (glm-5.2). I did not read the other review
artifact on this branch; I judged the work on its own merits against the plan
and the repo standards in `AGENTS.md`. All verification commands below were run
by me against the live worktree, not transcribed from the implement report.

## Verdict: APPROVED

The implementation is a faithful, complete realization of the plan. All four
reviewer-focus design decisions (D1, D2, D4, generalized playbook) hold and are
verified below — two of them (D2 precedence, bundled discovery) verified
deterministically with a throwaway extension that calls `discoverAgents`
directly, removing model-driven param passing from the equation. Every Done
criterion holds. No out-of-scope file was touched. No code defect found.

## Plan conformance

| Step / focus | Status | Note |
|---|---|---|
| Step 0 (identity + drift) | pass | branch `003-orchestrator-extension`, worktree confirmed, `git status` clean; diff vs `180c348` confined to in-scope paths. |
| Step 1 (pi mechanism checks) | pass | implement report records V1 (directory discovery) + V2 (`disable-model-invocation` hides from auto-invoke, slash command still works) passing with the budget model. I confirmed all 7 skills carry `disable-model-invocation: true`. |
| Step 2 (moves, Commit A `f0e7991`) | pass | 11 skill files are pure `R100` renames (verbatim, content-identical — I diffed each against `180c348`); `pi_skills/` and `.pi/agents/` gone from the worktree. |
| Step 3 (bundled discovery in `agents.ts`, Commit B `b8b941d`) | pass | `"bundled"` at all 3 type sites (`agents.ts:21`, `:30`, `:112`); `import.meta.url` resolves `roles/` (`agents.ts:108`); `findNearestProjectAgentsDir` + `getAgentDir` still present. |
| Step 4 (`index.ts` hooks + env, Commit B) | pass | `resources_discover` (L482) + `before_agent_start` (L483) register **before** the `NIXPI_WORKER` guard (L489); `NIXPI_SKILLS_DIR: SKILLS_DIR` in spawn env (L353); tool still named `subagent` (L491). |
| Step 5 (4 roles generalized, Commit B) | pass | all 4 reference `$NIXPI_SKILLS_DIR/{name}/SKILL.md`; no `~/.pi/agent/skills`, no `nixpi-dev-os`; frontmatter byte-identical (git diff shows body-only). |
| Step 6 (orchestrator `AGENTS.md`, Commit B) | pass | 0 project-specific paths; `composes with`, `pi --list-models --offline`, `NIXPI_SKILLS_DIR` all present. |
| Step 7 (registry template, Commit B) | pass | all four sections (`Complexity rubric`, `Active models`, `Phase defaults`, `Notes`) present; mirrors `resources/model-registry.md` structure. |
| Step 8 (NixOS config, Commit C `a4c2943`) | pass | `skillsPath`/`rolesPath`/`pi-skills`/`pi-roles` gone; `extensionsPath` option (L20) + `pi-extensions` script (L153) kept; `nixfmt --check` exit 0; `nix eval …toplevel.drvPath` → `/nix/store/fi1ww9c5…nixos-system-nixos-…drv`, exit 0. |
| Step 9 (delete root `AGENTS.md`; docs, Commit D `1d3fb6b`) | pass | root `AGENTS.md` gone; `README.md` + `resources/subagent-orchestration.md` have no `pi_skills/`/`.pi/agents`/`pi_extensions/subagent`/`skillsPath`/`rolesPath`/`~/.pi/agent/skills`/`~/.pi/agent/agents` refs. |
| Step 10 (smoke tests) | pass | (1) `Reply with exactly: ok` → `ok`. (2) pipeline phases → idea/grill/explore/plan/implement/review/teach/janitor (playbook injected). (3) see D2 below — deterministic proof supersedes the model-driven variant. |
| Step 11 (reconciliation) | pass | `git status` clean; 22 orchestrator files tracked; 4 logical commits present. |
| **D1 — narrowed nesting guard** | pass | see "D1" below. |
| **D2 — `"bundled"` source + precedence** | pass | see "D2" below (deterministically verified). |
| **D4 — role generalization** | pass | see "D4" below. |
| **Generalized `AGENTS.md`** | pass | see "Generalized playbook" below. |
| Out-of-scope discipline | pass | `resources/model-registry.md`, `resources/lessons/`, `archive/`, `hardware-configuration.nix`, `flake.lock`, Paseo blocks — all untouched (verified by `git diff --name-only`). |

## Reviewer-focus findings

### D1 — narrowed nesting guard (no recursion; workers get methodology)

`pi_extensions/orchestrator/index.ts:478-489`:

```ts
export default function (pi: ExtensionAPI) {
	const playbook = loadPlaybook();
	pi.on("resources_discover", () => ({ skillPaths: [SKILLS_DIR] }));
	pi.on("before_agent_start", async (event) => {
		if (!playbook) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${playbook}` };
	});
	// Nesting guard: workers are plain pi sessions and must not re-register the spawner tool.
	if (process.env.NIXPI_WORKER === "1") return;
	pi.registerTool({ name: "subagent", … });
```

- The two hooks register for **every** session unconditionally; the worker gate
  (`NIXPI_WORKER === "1"`) sits **after** them and gates **only** `registerTool`.
  Workers spawn with `NIXPI_WORKER=1` (`index.ts:353`), so a worker loads the
  extension, registers the hooks, hits the guard, and **never** registers the
  `subagent` tool → it has no spawner tool available → no recursion. ✅
- Workers receive the methodology: `resources_discover` serves all 7 skills, and
  `before_agent_start` appends the playbook. Smoke test 2 (pipeline phases in
  the reply) confirms the playbook reaches a non-worker session; the same hook
  fires in workers (the guard is after it, not around it). ✅
- Multi-turn accumulation of the playbook is not directly observable in
  single-turn `-p --no-session` runs (the plan acknowledges this). The handler
  appends to `event.systemPrompt` — the per-turn base prompt pi rebuilds each
  turn (verified during planning against pi 0.81.1 source), not a persistent
  string — so it cannot accumulate. Code logic matches the verified design. ✅

### D2 — `"bundled"` source + precedence (deterministically verified)

Beyond the static checks (`"bundled"` at `agents.ts:21`, `:30`, `:112`;
`import.meta.url` at `:108`), I ran a throwaway extension that imports
`discoverAgents` and writes the result to a file, removing model-driven
param-passing from the test:

```
SCOPE=project: review(bundled), implement(bundled), plan(bundled), explore(bundled) | projectDir=null
SCOPE=user:    review(user), implement(user), plan(user), explore(user)
SCOPE=both:    review(user), implement(user), plan(user), explore(user)
```

Then a second throwaway with a project-local `/tmp/prec-test/.pi/agents/review.md`:

```
both-scope review source: project (expect 'project')
all both-scope: review(project), implement(user), plan(user), explore(user)
```

- `scope=project` with no `.pi/agents` in cwd → all 4 roles tagged `(bundled)`,
  `projectAgentsDir=null`. Bundled discovery from `roles/` works. ✅
- `scope=user`/`scope=both` → `(user)` tags because the stale
  `~/.pi/agent/agents/*.md` symlinks (still pointing at the main checkout's
  un-merged `.pi/agents/`) override bundled by name. This is the precedence
  `user > bundled` working **as designed**; the `(user)` tags are the transient
  pre-rebuild state the plan/implement report describe. ✅
- The project-local `review.md` test proves the full chain: with scope `both`,
  `review` resolves to `(project)` (project wins over both user and bundled);
  the other three (no project file) fall back to `(user)` (user wins over
  bundled). So `bundled < user < project` is confirmed end-to-end. ✅
- Type widening is complete: `AgentConfig.source` (`agents.ts:21`),
  `loadAgentsFromDir` source param (`:30`), the `loadAgentsFromDir(bundledDir,
  "bundled")` call (`:112`), and `SingleResult.agentSource` (`index.ts:158`,
  now `"user" | "project" | "bundled" | "unknown"`). ✅

### D4 — role generalization

- All 4 roles reference `$NIXPI_SKILLS_DIR/{name}/SKILL.md` (and `plan.md`
  references `$NIXPI_SKILLS_DIR/plan/references/` too). `grep -l
  NIXPI_SKILLS_DIR roles/*.md | wc -l` → 4. ✅
- Bodies say "orchestration pipeline (see the orchestration playbook in your
  system prompt)" and "the repo philosophy / code standards in the orchestration
  playbook" — no dangling `~/.pi/agent/skills` or `nixpi-dev-os` references
  (`grep` clean). ✅
- Frontmatter byte-identical: `git show 180c348:.pi/agents/<role>.md` vs
  `pi_extensions/orchestrator/roles/<role>.md` — the `---` block matches exactly
  for all 4 (I diffed the first 6 lines of each). The diffs for `implement.md`
  and `review.md` show `rename from`/`rename to` with body-only `+`/`-` lines
  starting after the closing `---`. `explore.md` and `plan.md` render as
  delete+add in `git diff --name-status` (git's 50% rename-split heuristic —
  their bodies changed more relative to file size) but the frontmatter is still
  byte-identical, so the YAML hazard is avoided. ✅

### Generalized playbook

`diff <(git show 180c348:AGENTS.md) pi_extensions/orchestrator/AGENTS.md` shows
**only** the intended generalizations: title rename; the new "composes with"
intro paragraph; `.pi/agents` → `roles/`; `pi_skills/{name}/SKILL.md` →
`skills/{name}/SKILL.md inside the extension` (+ `resources_discover` +
`disable-model-invocation` notes); `~/.pi/agent/skills/{name}/SKILL.md` →
`$NIXPI_SKILLS_DIR/{name}/SKILL.md`; the global-install paragraph rewritten to
the single `extensionsPath` symlink; `../nixpi-dev-os-{NNN}-{slug}` →
`../<repo-dir>-{NNN}-{slug}`; and the new "Model registry (per-repo,
auto-seeded)" section. Every methodology block from the old root playbook is
retained verbatim — Philosophy, Code standards (Size/Names/Comments/Types/
Structure/Errors/Tests/Formatting), Writing standards, Your job, The pipeline,
Decision threshold, On session start, When the user describes a new idea, Skills
and roles, When the user says "go", When the user comes back, Model
recommendation, Teaching moments, PARA, What you never do. `grep -c
'nixpi-dev-os\|nixos_dev_env\|extensionsPath\|skillsPath\|rolesPath\|pi_skills/'
orchestrator/AGENTS.md` → 0. ✅

## Standards findings

- `[hard]` **none.** No documented repo rule is broken by this diff.
- `[judgement]` `pi_extensions/orchestrator/index.ts:239,369,511` (and
  `agents.ts`) — three `any` usages appear in the added lines of the rename diff.
  Verified pre-existing in `180c348:pi_extensions/subagent/index.ts` (lines 74,
  204, 346) and **not** touched by this change (`diff` of old vs new shows no
  `any`-bearing line changed). The plan explicitly scopes edits to four regions;
  fixing pre-existing `any` would be out of scope. Noting for completeness, not
  as a finding against this work.

## Suggestions (non-blocking)

- None that warrant code change. The operational items below are for the
  merging lead, all already covered by the plan's Maintenance notes — I list
  them because my testing confirmed they are required, not optional.

## Notes for the merging lead (operational, non-blocking)

1. **Stale `~/.pi/agent/agents/*.md` symlinks must be removed post-rebuild.**
   They currently point at the main checkout's un-merged `.pi/agents/` and, by
   design (`user > bundled`), override the bundled roles — so default scope
   today shows `(user)` tags. My deterministic test proves bundled discovery
   works underneath (`scope=project` → all 4 `(bundled)`). The `(bundled)` tags
   surface in default scope only after the lead runs the cleanup checklist from
   the plan's Maintenance notes (`rm -f ~/.pi/agent/agents/{explore,plan,
   implement,review}.md`, plus the `~/.pi/agent/extensions/subagent` and
   `~/.pi/agent/skills/*` stale links). This is a rebuild-time concern, not a
   code defect.
2. **Auto-seed template path is post-rebuild only.** `orchestrator/AGENTS.md`
   instructs the agent to `cat ~/.pi/agent/extensions/orchestrator/
   model-registry-template.md` (D5's stable global symlink path). That symlink is
   created by the `pi-extensions` activation script, so it is live only after
   rebuild. Correct in steady state; before rebuild the `cat` would return
   nothing. Not a code defect — the instruction assumes the extension is
   installed, which is the distribution model.
3. **Git rename display.** `explore.md`/`plan.md` render as delete+add rather
   than rename in `git log`/`git diff --name-status` because body edits pushed
   them under the 50% similarity threshold; `implement.md`/`review.md` stayed
   as renames. Cosmetic only — the frontmatter is byte-identical and the moves
   were done with `git mv`. No action.

## Summary

High-confidence APPROVED. The change does exactly what the plan specified,
nothing more: three NixOS install mechanisms collapse into one extension, the
playbook is injected per-turn (no accumulation path), workers get the
methodology but cannot recurse, the `"bundled"` source layer composes under user
and project with correct precedence (proven deterministically), and the
generalized `AGENTS.md` sheds every project-specific path while retaining all
methodology. The only items needing human action are the post-rebuild stale-
symlink cleanup already documented in the plan — my testing confirms those are
required for the `(bundled)` tags to surface in default scope. No concerns for
the lead beyond executing the documented Maintenance checklist.
