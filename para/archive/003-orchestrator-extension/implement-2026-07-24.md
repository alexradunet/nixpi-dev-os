---
phase: implement
status: done
project: 003-orchestrator-extension
date: 2026-07-24
plan: plan-2026-07-24.md
commit: 1d3fb6b
branch: 003-orchestrator-extension
---

# Implementation: Package the orchestration as a single pi extension

Collapsed the three NixOS install mechanisms (extensionsPath, skillsPath,
rolesPath) into one pi extension at `pi_extensions/orchestrator/`. The
extension serves skills via `resources_discover`, discovers bundled roles,
injects the generalized playbook via `before_agent_start`, and injects
`NIXPI_SKILLS_DIR` into spawned workers.

## Steps completed

- [x] Step 0: Identity + drift check, read sources — verified: `pwd` = worktree,
      branch `003-orchestrator-extension`, `git status` clean; drift check
      `git diff --stat 180c348..HEAD` on in-scope paths = empty (only grill+plan
      artifacts added by the lead). All "Current state" excerpts matched live code.
- [x] Step 1: Empirical mechanism checks — verified below.
- [x] Step 2: Rename + move skills/roles (Commit A `f0e7991`) — verified: 20
      renames (`R`) in `git status`; `pi_skills`/`.pi/agents` gone.
- [x] Step 3: Bundled role discovery in `agents.ts` — verified: 3 `"bundled"`
      type sites, 1 `import.meta.url` resolving `roles`.
- [x] Step 4: Serve skills / inject playbook / `NIXPI_SKILLS_DIR` in `index.ts`
      — verified below.
- [x] Step 5: Update 4 roles — verified: 4 roles reference `NIXPI_SKILLS_DIR`,
      no `~/.pi/agent/skills`, no `nixpi-dev-os`, frontmatter byte-identical.
- [x] Step 6: Generalized playbook `orchestrator/AGENTS.md` — verified: 0
      project-specific paths; compose + auto-seed + `NIXPI_SKILLS_DIR` present.
- [x] Step 7: Registry seed template — verified: all four sections present.
      (Steps 3–7 committed together as Commit B `b8b941d`.)
- [x] Step 8: Drop `skillsPath`/`rolesPath` (Commit C `a4c2943`) — verified:
      grep clean, `nixfmt --check` exit 0, `nix eval` printed a `.drv` path.
- [x] Step 9: Delete root `AGENTS.md`, update docs (Commit D `1d3fb6b`) —
      verified: root `AGENTS.md` gone, docs grep clean.
- [x] Step 10: Live smoke tests — verified below (all three passed).
- [x] Step 11: Final reconciliation — verified: `git status` clean, all 22
      orchestrator files tracked, four logical commits present.

## Files changed

- `pi_extensions/subagent/` → `pi_extensions/orchestrator/` (renamed; `index.ts`
  and `agents.ts` edited).
- `pi_extensions/orchestrator/index.ts` — `node:url` import; `EXTENSION_DIR`/
  `SKILLS_DIR`/`PLAYBOOK_PATH` + `loadPlaybook()`; `SingleResult.agentSource`
  gains `"bundled"`; worker env gains `NIXPI_SKILLS_DIR`; factory registers
  `resources_discover` + `before_agent_start` for every session, then gates only
  the `subagent` tool behind `NIXPI_WORKER`.
- `pi_extensions/orchestrator/agents.ts` — `node:url` import; `source` and
  `loadAgentsFromDir` gain `"bundled"`; `discoverAgents` loads bundled `roles/`
  (via `import.meta.url`) as the base layer for every scope.
- `pi_extensions/orchestrator/AGENTS.md` — new generalized playbook (cwd-relative,
  composes with repo-local `AGENTS.md`).
- `pi_extensions/orchestrator/model-registry-template.md` — new seed template.
- `pi_extensions/orchestrator/skills/` — 7 skills moved verbatim from `pi_skills/`
  (0-line diffs).
- `pi_extensions/orchestrator/roles/{explore,plan,implement,review}.md` — moved
  from `.pi/agents/`; bodies generalized to `$NIXPI_SKILLS_DIR` + "orchestration
  playbook"; frontmatter unchanged.
- `nixos_dev_env/configuration.nix` — removed `skillsPath`/`rolesPath` options and
  the `pi-skills`/`pi-roles` activation scripts; kept `extensionsPath`/`pi-extensions`.
- `nixos_dev_env/flake.nix` — removed the `nixpi.skillsPath`/`nixpi.rolesPath` lines.
- `AGENTS.md` (root) — deleted.
- `README.md`, `resources/subagent-orchestration.md` — updated to the extension layout.

## Verification results

### Step 1 — pi mechanisms (budget model `qwen-token-plan/qwen3.6-flash`)

- **V1 (directory discovery):** throwaway extension returning
  `skillPaths: [<ext>/skills]`; prompt "use skill alpha" → model replied
  `pineapple`. Directory form works; **no glob fallback needed**.
- **V2 (disable-model-invocation):** with `disable-model-invocation: true`,
  "list every skill name" → model listed only `find-skills` (alpha hidden from
  auto-invoke). `/skill:alpha` still loaded the skill (model recognized "alpha");
  `/skill:alpha Use this skill now.` → `pineapple`. Slash-command access works.

### Step 4 — index.ts

`grep` shows `resources_discover` (L482), `before_agent_start` (L483),
`NIXPI_SKILLS_DIR: SKILLS_DIR` (L353), `name: "subagent"` (L491, unchanged), and
the nesting guard `if (process.env.NIXPI_WORKER === "1") return;` (L489) now
**after** both `pi.on(...)` registrations.

### Step 8 — NixOS config

`nixfmt --check` exit 0. `nix eval
./nixos_dev_env#nixosConfigurations.nixos.config.system.build.toplevel.drvPath`
→ `/nix/store/fi1ww9c5g4f3l9570y31gabz63bg4laf-nixos-system-nixos-26.11.20260719.241313f.drv`,
exit 0 (benign untrusted-substituter warnings ignored per plan).

### Step 10 — live smoke tests (isolated via `--no-extensions`)

1. **Loads:** `pi --no-extensions -e ./pi_extensions/orchestrator/index.ts ... "Reply with exactly: ok"` → `ok`.
2. **Playbook injected:** asked for the pipeline phases → model listed
   grill, explore, plan, implement, review, teach, janitor (bundled `AGENTS.md` appended).
3. **Bundled roles discovered:** default scope listed
   `review, implement, plan, explore` tagged `(user)` — the stale global
   `~/.pi/agent/agents/*.md` symlinks (still live on this un-rebuilt system)
   override bundled by design (precedence user > bundled). Re-ran with
   `agentScope: "project"` (user scope excluded, no project agents dir in the
   worktree) → `review (bundled), implement (bundled), plan (bundled), explore (bundled)`,
   confirming bundled discovery in isolation and clean YAML parse. The `(user)`
   tagging disappears once the lead removes the stale symlinks post-rebuild
   (Maintenance notes).

### Step 11 — reconciliation

`git status --short` clean. `git ls-files pi_extensions/orchestrator/` lists all
22 files (AGENTS.md, agents.ts, index.ts, model-registry-template.md, 4 roles,
7 SKILL.md + plan/teach references). `git log --oneline -5` shows the four
logical commits (A `f0e7991`, B `b8b941d`, C `a4c2943`, D `1d3fb6b`).

## STOP conditions / escape hatches

None triggered. No STOP condition occurred; no escape hatch was used (V1 passed,
so the glob fallback was not needed; all Step 10 smoke tests ran live, so none
were deferred to review).

Two benign observations, both consistent with the plan:
- `git mv` left empty `pi_skills/`, `.pi/agents/`, `.pi/` directories on the
  filesystem (git tracks no empty dirs). Confirmed nothing tracked remained
  (`git ls-files .pi pi_skills` empty) and removed them with `rmdir`.
- Playbook accumulation STOP condition: not observable in single-turn
  `-p --no-session` runs. The handler appends to `event.systemPrompt` (the
  per-turn base prompt), not a persistent string, so it cannot accumulate;
  Step 10 test 2 showed a single playbook injection. This matches the
  planning-phase verification.

## Done criteria checklist

- [x] PASS — `pi_extensions/orchestrator/` contains index.ts, agents.ts, AGENTS.md,
      model-registry-template.md, 4 roles, 7 skills (+ plan/teach references), all tracked.
- [x] PASS — `pi_skills/` and `.pi/agents/` no longer exist in the worktree.
- [x] PASS — root `AGENTS.md` deleted (`git rm`).
- [x] PASS — no `~/.pi/agent/skills` in the extension; all 4 roles reference `$NIXPI_SKILLS_DIR`.
- [x] PASS — `index.ts` registers `resources_discover` + `before_agent_start`,
      injects `NIXPI_SKILLS_DIR`, keeps tool named `subagent`, gates only the tool.
- [x] PASS — `agents.ts` loads bundled `roles/` via `import.meta.url` as base layer;
      `"bundled"` at all three type sites.
- [x] PASS — no `skillsPath`/`rolesPath`/`pi-skills`/`pi-roles` in `nixos_dev_env/`;
      `extensionsPath` + `pi-extensions` remain; `nix eval` succeeded.
- [x] PASS — no stale paths in `README.md` / `resources/subagent-orchestration.md`.
- [x] PASS — orchestrator `AGENTS.md` has 0 project-specific paths; compose note,
      auto-seed section, and `NIXPI_SKILLS_DIR` all present.
- [x] PASS — no out-of-scope file modified (diff vs `180c348` touches only in-scope
      paths; `resources/model-registry.md`, `resources/lessons/`, `archive/`,
      `hardware-configuration.nix`, `flake.lock`, Paseo blocks untouched).
- [x] PASS — Step 1 mechanism checks passed (directory form; no fallback);
      Step 10 smoke tests passed live.
