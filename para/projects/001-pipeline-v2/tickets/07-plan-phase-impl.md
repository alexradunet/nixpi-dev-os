---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 07
date: 2026-07-24
plan: 07-plan-phase
commit: b8d22f2
branch: 001-pv2-t07
---

# Implementation: Ticket 07 — plan phase, spec-aware planning (skill + role)

## Steps completed
- [x] Step 8: Make `skills/plan/SKILL.md` spec-aware — verified: `grep -c "spec.md\|architecture\|tickets phase"` prints `3`; `node --test` `role plan` block passes.
- [x] Step 13: Update `roles/plan.md` body (spec is primary input; architecture not work breakdown) — verified: `node --test` `role plan` block still passes; frontmatter unchanged.

## Files changed
- `pi/orchestrator/skills/plan/SKILL.md`
  - Context Detection table: new top row `spec.md` with `status: done` → **Feature plan** (Spec → requirements, seams, implementation decisions); grill row now reads as the fallback when there is no `spec.md`.
  - Phase 2 → For feature plans: heading now "(spec or grill summary input)"; new first bullet — when a spec exists it is the primary input, the plan focuses on architecture (modules, interfaces, schema, API contracts, testing strategy — the "how") and does not produce a work breakdown (that is the tickets phase); the spec's Testing Decisions section is the testing-strategy source.
  - Hard Rules, the `references/plan-template.md` reference, and the artifact path `para/projects/{project-id}/plan-{YYYY-MM-DD}.md` are unchanged.
- `pi/orchestrator/roles/plan.md`
  - Body: added one paragraph — when a spec exists (`para/projects/{project-id}/spec.md`) it is the primary input; focus the plan on architecture, not work breakdown (that is the tickets phase).
  - Frontmatter (`name`, `description`, `provider`, `thinking`, `workspace`), the flat-spawn prohibition, and the philosophy line are unchanged; `description` stays colon-free.

## Verification results

```
$ grep -c "spec.md\|architecture\|tickets phase" pi/orchestrator/skills/plan/SKILL.md
3

$ node --test "pi/orchestrator/*.test.ts"
ℹ tests 12
ℹ pass 3
ℹ fail 9
✔ role plan: valid frontmatter + referenced skill exists
```

The `role plan` block passes. Totals (pass 3, fail 9) are byte-identical to the pre-edit baseline (confirmed via `git stash` → run → `git stash pop`): the 9 failures are the intended RED owned by other tickets (spec, domain-model, tickets, review-standards, review-feature, skill dirs, tdd reference, playbook phase names, roles/ set). No regression introduced.

Scope guard: `git status` before commit showed only `pi/orchestrator/skills/plan/SKILL.md` and `pi/orchestrator/roles/plan.md`. `pi/orchestrator/index.ts` and `skills/plan/references/*` not modified (`git diff --stat` for both was empty).

## Issues encountered
None. Drift check (`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/plan/ pi/orchestrator/roles/plan.md`) was empty; both files matched the plan's expected structure, so the targeted edits applied cleanly. Work committed on branch `001-pv2-t07` (the per-ticket worktree branch off the pipeline-v2 line; non-main as required).
