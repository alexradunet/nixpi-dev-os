---
project: 002-pi-orchestrator
closed: 2026-07-24
status: complete
---

# Closure: Replace herdr with a pi-native subagent orchestrator

## What was built

Worker orchestration now runs through pi's own `subagent` tool (a patched copy of the official example at `pi_extensions/subagent/`) instead of an external herdr daemon. Delegations are one-shot `pi` subprocesses configured by role files; four phases are spawnable (explore, plan, implement, review) and three run in-session (grill, teach, janitor). herdr was removed entirely: binary, integration file, bridge extension, flake input/activation, and stale global symlinks.

## What was distilled

- `resources/subagent-orchestration.md` — how delegation works, role format, worktree contract, adding roles, pi-bump re-sync, and why subprocess one-shot won.
- `resources/lessons/untracked-config-breaks-worktrees.md` — config the workflow depends on must be git-tracked; activation reads the main checkout.
- `resources/lessons/pi-role-yaml-frontmatter.md` — pi parses role frontmatter as strict YAML; colons in descriptions must be quoted.
- `resources/model-registry.md` — updated with the spawned-vs-in-session phase split (done during implementation).

## What was left behind

- The herdr bridge and its test suite were deleted, not archived as code; the archived grill/plan/impl/review artifacts record the reasoning and the exact patch surface.
- The `parallel` and `chain` modes ship in the vendored example but are unused; the workflow stays one worker at a time. Revisit only if a concrete need appears.
- A stashed `pane-manager.js` change (a herdr global-skill fallback) was dropped as obsolete, since the file it modified no longer exists.
