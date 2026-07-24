---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 05
date: 2026-07-24
plan: 05-tdd-reference-skill
commit: bb6f437
branch: 001-pv2-t05
---

# Implementation: Ticket 05 — tdd reference skill

## Steps completed
- [x] Step 6: Create `pi/orchestrator/skills/tdd/SKILL.md` — verified: `test -f` exists; `head -1` is `---`; frontmatter has `name: tdd`, colon-free `description`, `disable-model-invocation: true`, `argument-hint: ""`; body has the four required sections plus the CONTEXT.md note.

## Files changed
- `pi/orchestrator/skills/tdd/SKILL.md` — new reference skill. Frontmatter as specified. Body: top note to read `CONTEXT.md` so test names match the domain language, then four sections — **What a good test is** (behavior through public interfaces; expected values from an independent source of truth), **Seams (where tests go)** (test only at the spec's pre-agreed Testing Decisions), **Anti-patterns** (implementation-coupled, tautological, horizontal slicing, each with its tell), **Rules of the loop** (red before green; one seam/test/implementation per cycle; refactoring outside the loop).

## Verification results

```
$ head -1 pi/orchestrator/skills/tdd/SKILL.md
---

$ grep -E '^(name|disable-model-invocation|argument-hint):' pi/orchestrator/skills/tdd/SKILL.md
name: tdd
disable-model-invocation: true
argument-hint: ""

$ grep -E '^## ' pi/orchestrator/skills/tdd/SKILL.md
## What a good test is
## Seams (where tests go)
## Anti-patterns
## Rules of the loop

$ node --test "pi/orchestrator/*.test.ts" | grep "tdd reference skill"
✔ tdd reference skill exists (read by implement, has no role)
```

The `tdd reference skill exists` block passes. No previously-green block regressed: I diffed the failing-test set with the file removed vs present, and the only change is the tdd block dropping out of the failing set (was failing, now passes). The remaining failures (roles spec/domain-model/tickets/review-standards/review-feature, spawnable skill dirs, playbook phase names) are identical before and after and belong to other tickets.

Scope guard: `git show --stat HEAD` shows only `pi/orchestrator/skills/tdd/SKILL.md` (34 insertions). `pi/orchestrator/index.ts` not modified.

## Issues encountered
The plan's suggested `description` contained a colon ("...implement skill: what a good test..."), which violates the acceptance criterion "a colon-free description". Reworded to use a period instead: "TDD reference discipline read by the implement skill. Covers what a good test is, where tests go, the anti-patterns to avoid, and the rules of the red-green loop. Not spawned directly." No other deviation.
