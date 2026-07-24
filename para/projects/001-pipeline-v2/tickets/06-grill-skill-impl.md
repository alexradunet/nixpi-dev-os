---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 06
date: 2026-07-24
plan: 06-grill-skill.md
commit: a6dc75c
branch: 001-pv2-t06
---

# Implementation: grill skill absorbs explore, adds test seams + root-cause

## Steps completed
- [x] Pre-edit identity checks — verified: `pwd` = worktree `001-pv2-t06`, branch `001-pv2-t06` (non-main), `git worktree list` confirms identity, `git status --short` clean.
- [x] Drift check — verified: `git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/grill/SKILL.md` empty; file structure matched the expected shape (frontmatter with `disable-model-invocation: true`, Protocol, Context, Artifact with `**Path:**` + fenced block, Constraints).
- [x] Step 7 edit 1: bug-investigation bullet in Protocol — hypothesis → verify read-only (`grep`, `git log`, `git blame`, read files) → iterate on failures → confirm root cause explains the full symptom → check related instances. Placed after the "look it up" bullet.
- [x] Step 7 edit 2: test-seams bullet in Protocol — grill which public boundaries (exported functions, CLI entry points, module interfaces) the change should be tested at, so the spec inherits them. Placed after the decision-tree bullet.
- [x] Step 7 edit 3: Artifact format block — added `root-cause:` frontmatter line and `## Root cause` section above `## Decisions made`, both annotated bug-grills-only / omit for features.
- [x] Commit — `a6dc75c feat(orchestrator): grill absorbs explore protocol, adds test seams + root-cause`.

## Files changed
- `pi/orchestrator/skills/grill/SKILL.md` — +6 lines: two Protocol bullets (bug hypothesis-verify loop, test seams), `root-cause:` frontmatter line and `## Root cause` section in the Artifact format block.

## Verification results

```
$ grep -c "hypothesis\|root-cause\|test seams" pi/orchestrator/skills/grill/SKILL.md
3
```

`node --test "pi/orchestrator/*.test.ts"` — no regression. Baseline (edit stashed) and post-edit runs produce identical results: 3 pass (worker-output-schema, role plan, role implement), 9 fail. The 9 failures assert work owned by other tickets (roles/ set, spec/domain-model/tickets/review roles, tdd skill, playbook phases) and fail identically without this edit.

`git status --short` after commit: clean. Only `pi/orchestrator/skills/grill/SKILL.md` was touched; `pi/orchestrator/index.ts` and `skills/explore/SKILL.md` unchanged.

Acceptance criteria:
- [x] Protocol has the bug-investigation bullet (~4 lines, all five elements).
- [x] Protocol has the test-seams bullet.
- [x] Artifact frontmatter has `root-cause:` and `## Root cause` sits above `## Decisions made`.
- [x] `disable-model-invocation: true` and read-only Constraints unchanged.
- [x] grep count ≥ 3 (prints 3).
- [x] No test regression.
- [x] `index.ts` not modified.
- [x] Conventional commit.

## Issues encountered
None. The 9 red contract-test blocks are expected: they cover other tickets in this pipeline and were red before this edit.
