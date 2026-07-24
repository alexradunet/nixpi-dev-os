---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 10
date: 2025-07-14
plan: step 11 — modify skills/janitor/SKILL.md
commit: 4f8b895
branch: 001-pv2-t10
---

# Implementation: janitor skill — trigger domain-model reconcile before archiving

## Steps completed

- [x] Step 11: Add reconcile step before "Archive the project" in `skills/janitor/SKILL.md` — verified: `grep -c "reconcile\|Domain flags"` → 5 (≥ 2 required)

## Files changed

- `pi/orchestrator/skills/janitor/SKILL.md` — inserted step 4 "Reconcile the domain model" before the archive step; renumbered steps 4–6 to 5–7. The new step checks for `CONTEXT.md` or `## Domain flags` in project artifacts, asks the orchestrator/user to run `domain-model` in reconcile mode (or `/domain-model reconcile` in-session), and confirms flags are merged before archiving. Flat-spawn rule preserved: janitor asks, never spawns.

## Verification results

```
$ grep -c "reconcile\|Domain flags" pi/orchestrator/skills/janitor/SKILL.md
5

$ git diff HEAD -- pi/orchestrator/index.ts | wc -l
0

$ node --test "pi/orchestrator/*.test.ts"
✔ worker-output-schema: core required, flags optional, closed shape
✔ role plan: valid frontmatter + referenced skill exists
✔ role implement: valid frontmatter + referenced skill exists
ℹ pass 3, fail 9
```

The 9 failures are pre-existing (missing roles/skills from other tickets: spec, domain-model, tickets, review-standards, review-feature, tdd). Baseline before this change: identical 3 pass / 9 fail. No regression.

## Issues encountered

The edit and commit (`4f8b895`) were already present in the worktree when this session started (uncommitted initially, then found committed). Content matches the plan exactly; verified and confirmed rather than re-applying.
