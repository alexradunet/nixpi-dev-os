# Lesson: untracked config breaks worktree workflows

From project `002-pi-orchestrator` (2026-07-24).

## What happened

The implementation plan assumed `.pi/agents/` (the orchestration role files) existed in the worktree. It did not. The roles were never `git add`-ed, so they were absent from any worktree built from HEAD, and edits to them could not be committed or reviewed on a branch. `pi_skills/` and `pi/` were tracked; only `.pi/` was missed.

## The rule

Any config that the workflow depends on must be git-tracked. Worktrees are built from committed state; untracked files simply are not there. "It works in my checkout" is not evidence a file is tracked, check `git ls-files <path>`.

## The wrinkle: activation reads the main checkout

NixOS activation symlinks roles/extensions/skills from absolute paths in the **main** checkout (`/home/balaur/projects/nixpi-dev-os/...`), not from whatever worktree you rebuild in. So orchestration config has two requirements at once:

- **Tracked** (so it exists in worktrees and is reviewable), and
- **Present in the main checkout** (so activation symlinks the live version).

A branch that edits such config only affects the running system after it is merged to main and a rebuild runs.

## The fix used

A prep commit on `main` tracking the existing files unchanged, then `git rebase main` in the worktree so the branch could edit them normally. Cheap, and it corrected the underlying oversight permanently.
