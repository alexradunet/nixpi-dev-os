# Lesson: activation creates global symlinks but never removes them

From project `003-orchestrator-extension` (2026-07-24).

## What happened

The project renamed `pi_extensions/subagent/` to `pi_extensions/orchestrator/`,
moved the skills out of `pi_skills/`, and bundled the roles, deleting the
`skillsPath`/`rolesPath` activation scripts. After the merge, the old global
symlinks were still there: `~/.pi/agent/extensions/subagent`, the seven
`~/.pi/agent/skills/*`, and the four `~/.pi/agent/agents/*.md`, all dangling
(their targets no longer existed).

This was not just cosmetic. Role discovery precedence is `bundled < user < project`,
and `~/.pi/agent/agents/` is the *user* scope. So the stale role symlinks shadowed
the new bundled roles: in default scope the four roles surfaced tagged `(user)`,
not `(bundled)`. The new behavior only appears once the stale links are gone.

## The rule

NixOS activation symlinks each source into pi's global instance but has no
removal step. Renaming or deleting a tracked extension/skill/role leaves a
dangling global symlink behind, and pi will still try to load it. After any
rename or removal of orchestration config, manually delete the stale global
symlinks, then confirm the new link resolves. Dangling links can shadow new
behavior, not just fail loudly.

## The fix used

Post-merge, before the rebuild: `rm -f` the stale `extensions/subagent`,
`skills/*`, and `agents/*.md` symlinks (and the untracked `.pi/skills` in the
main checkout). The rebuild's activation then creates the single
`~/.pi/agent/extensions/orchestrator` link. See also
`untracked-config-breaks-worktrees.md` for the related tracking + main-checkout
gotcha.
