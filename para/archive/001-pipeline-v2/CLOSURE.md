---
project: 001-pipeline-v2
closed: 2026-07-24
status: complete
---

# Closure: Orchestration Pipeline v2

## What was built

Replaced the 4-phase orchestration pipeline (explore → plan → implement → review) with a 10-phase pipeline: grill (in-session, absorbs explore) → spec → domain-model → plan → tickets → implement ×N (parallel, TDD) → review-standards ×N (per-ticket) → integrate (conditional) → review-feature (two-axis) → domain-model-close (reconcile). All phases after grill are spawnable Paseo workers communicating through filesystem artifacts. 4 new skills (spec, domain-model, tickets, tdd), 5 new roles, 2 deleted roles, contract test (12/12 green), rewritten playbook. Implemented across 13 tracer-bullet tickets by 11 parallel workers (9 concurrent at peak), ~13 minutes total, 0 merge conflicts.

## What was distilled

- `para/resources/lessons/paseo-cwd-is-workspace.md` — Paseo 0.2.0-beta.4 invariant: agent cwd is workspace cwd; `--cwd` ignored; parallel git workers need parallel workspaces; workbench + ephemeral per-ticket layout.
- `para/resources/lessons/parallel-wave-orchestration.md` — frontier computation, wave structure, workspace layout, merge strategy, spawn mechanics, gotchas (branch name `/` collision, python f-string escaping, `--prompt-file` missing).

## What was left behind

- No CONTEXT.md was created (the project was about tooling, not domain logic; no domain terms emerged).
- The workbench workspace (wks_8814c80be4432d05) was auto-pruned by the daemon when its agents closed; no manual archive needed.
- All 12 ticket branch refs were deleted after merge.
