---
source: 001-pipeline-v2
date: 2026-07-24
tags: [paseo, workspace, worktree, orchestration]
---

# Paseo: agent cwd is the workspace cwd (0.2.0-beta.4)

An agent's working directory is always its workspace's working directory. `paseo run --cwd` is silently ignored. `--worktree-*` flags require `--new-workspace worktree`, so a managed worktree always creates a new workspace.

**Consequence:** you cannot decouple an agent's checkout from its workspace. Parallel git workers need parallel checkouts, which need parallel workspaces. There is no way to run concurrent implement workers inside a single Paseo workspace to keep the Workspaces panel tidy.

**What works:** one project workbench workspace (hosts sequential foreground phases + acts as merge home) plus one ephemeral worktree workspace per parallel ticket. Archive each ticket workspace after its branch merges. `paseo workspace ls` shows only active workspaces, and the daemon auto-archives a workspace when its last agent closes, so a finished wave collapses to just the workbench entry on its own.

**Probe evidence (four combinations tested):**

| Flags | Resulting cwd |
|---|---|
| `--workspace`(worktree) `--cwd` | locked to workspace |
| `--cwd` only | locked to inherited workspace |
| `--workspace`(local) `--cwd` | locked to workspace |
| `--worktree-*` without `--new-workspace` | rejected: "Worktree options require --new-workspace worktree" |

**Cleanup:** probe or manual worktrees left behind outside Paseo are removed with `git worktree remove` + `git branch -d`. Paseo-managed worktrees are cleaned by `paseo workspace archive`.
