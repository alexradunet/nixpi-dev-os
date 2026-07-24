---
project: 003-orchestrator-extension
closed: 2026-07-24
status: complete
---

# Closure: Package the orchestration as a single pi extension

## What was built

The orchestration (7 skills, 4 subagent roles, the AGENTS.md playbook, the
`subagent` delegation tool, and a model-registry seed template) now ships as one
pi extension at `pi_extensions/orchestrator/`, installed globally via the single
NixOS `extensionsPath` mechanism. The extension serves skills via
`resources_discover`, discovers bundled roles (a new `"bundled"` source, lowest
precedence), injects the generalized playbook via `before_agent_start`, and
injects `NIXPI_SKILLS_DIR` into spawned workers. The `skillsPath`/`rolesPath`
options, their activation scripts, `pi_skills/`, `.pi/agents/`, and the root
`AGENTS.md` were removed. This is the grill's end-state 3: any repo with the
extension installed is a self-contained orchestration hub.

## What was distilled

- `resources/lessons/pi-extension-skill-serving.md` — empirically verified pi
  mechanics: a directory in `skillPaths` recurses; `disable-model-invocation`
  works for served skills (slash command survives); `before_agent_start` injects
  per-turn without accumulating.
- `resources/lessons/stale-global-symlinks-after-rename.md` — activation creates
  global symlinks but never removes them; stale links shadow new behavior and
  must be deleted by hand after a rename/removal.
- `resources/subagent-orchestration.md` — updated during implementation to the
  extension layout (role location, `NIXPI_SKILLS_DIR`, the four local patches).

## What was left behind

- The architectural decisions (single extension over two; self-orchestrating
  repos; per-repo auto-seeded registry; `NIXPI_SKILLS_DIR` over a global skills
  symlink; playbook composes with a repo's own `AGENTS.md`) live in the archived
  `grill-2026-07-24.md` rather than a separate `areas/` decisions log. No ongoing
  area structure was warranted for a single project (YAGNI); the living
  architecture is in `resources/subagent-orchestration.md`.
- The vendored `index.ts` bulk (~1044 lines) and the dead `formatAgentList`
  helper are pre-existing and were deliberately left untouched to keep the file
  diff-able against upstream pi on version bumps.
- Per-repo opt-out and distribution via `pi install` were ruled out by the grill
  (YAGNI; the vector stays the NixOS `extensionsPath` symlink).
- Two reviews ran (qwen3.8-max-preview: APPROVED-WITH-NITS; glm-5.2: APPROVED);
  all nits were pre-existing or plan-prescribed, none blocking. Both are archived
  here.
