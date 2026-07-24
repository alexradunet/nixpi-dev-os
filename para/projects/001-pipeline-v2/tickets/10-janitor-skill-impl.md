---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 10
date: 2026-07-24
plan: 10-janitor-skill
commit: 4f8b895
branch: 001-pv2-t10
---

# Implementation: Ticket 10 — janitor skill triggers domain-model reconcile before archiving

## Steps completed
- [x] Step 11: Add a "Reconcile the domain model" step before "Archive the project" in `skills/janitor/SKILL.md`, renumbering the steps that follow — verified: `grep -c "reconcile\|Domain flags" pi/orchestrator/skills/janitor/SKILL.md` prints `5` (≥2); `node --test "pi/orchestrator/*.test.ts"` shows no regression (results byte-identical to the pre-edit baseline).

## Files changed
- `pi/orchestrator/skills/janitor/SKILL.md` — inserted new `### 4. Reconcile the domain model` before the archive step; renumbered `Archive the project` → 5, `Archive the Paseo workspace` → 6, `Write a closure note` → 7. Frontmatter (`disable-model-invocation: true`) untouched. +14/-3.

The new step: if the project produced a `CONTEXT.md` or any artifact with a `## Domain flags` section, ask the orchestrator (or user) to run the `domain-model` worker in `reconcile` mode, or run `/domain-model reconcile` in-session, and confirm the flags are merged into the glossary before archiving. The janitor is in-session, so it asks rather than spawns; the flat-spawn rule stays intact. Skip the step when neither marker is present.

## Verification results

```
$ grep -c "reconcile\|Domain flags" pi/orchestrator/skills/janitor/SKILL.md
5

$ git status --short pi/orchestrator/index.ts
(empty — index.ts NOT modified)

$ node --test "pi/orchestrator/*.test.ts"   # with edit vs stashed baseline
diff baseline with-edit → IDENTICAL: no regression
```

Previously-green blocks stay green (3): `worker-output-schema: core required, flags optional, closed shape`; `role plan`; `role implement`. The failing blocks are pre-existing and unrelated to the janitor skill (roles `domain-model`/`spec`/`tickets`/`review-standards`/`review-feature`, `roles/` set mismatch, spawnable-phase skill directories, tdd reference skill, playbook phase names). They belong to sibling tickets not yet merged into this branch.

Scope guard: `git status` before commit showed only `pi/orchestrator/skills/janitor/SKILL.md`. Commit `4f8b895` touches 1 file; `git show --stat HEAD | grep -c index.ts` → 0.

## Issues encountered
None. Drift check (`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/janitor/SKILL.md`) was empty; the live file matched the plan's expected shape (YAML frontmatter + numbered prose, step 4 = "Archive the project"). Identity checks passed: worktree `001-pv2-t10`, branch `001-pv2-t10` (non-main), clean status.
