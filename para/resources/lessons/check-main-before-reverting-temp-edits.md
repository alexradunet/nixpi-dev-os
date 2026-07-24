# Lesson: check the main checkout before reverting "temporary" edits

From project `005-harness-review` (2026-07-24).

## What happened

While implementation ran in a worktree, the orchestrator made a temporary edit
in the main checkout (`roles/implement.md` `thinking: medium → low`) to control
a spawned worker's thinking, intending to revert it after. Meanwhile the user
committed that exact change to `main` (deciding to keep `low`), plus a playbook
tweak. After the worker returned, the orchestrator "reverted" the file —
silently undoing the user's committed choice and leaving the main checkout
dirty. Separately, the user's two commits meant `main` had diverged from the
worktree's fork point, so the merge was not a fast-forward (it stayed clean
only because the touched regions did not overlap).

## The rule

Two checks, both cheap:

- Before reverting any "temporary" edit in the main checkout, run `git status`
  and `git log` on it first. The user may have committed it; your revert then
  contradicts their decision. If they committed it, restore with
  `git checkout -- <file>`, do not re-apply your revert.
- Before merging a worktree branch, check whether `main` moved since the fork
  (`git log <fork>..main`). The user often works in parallel. A moved `main`
  means a merge commit (and possible conflict resolution), not a fast-forward —
  verify the touched regions do not overlap before promising a clean merge.
