---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 05
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 05: tdd reference skill

## What to build

Create the `tdd` reference skill: the TDD discipline the implement skill reads (not a
spawned phase, no role). It defines what a good test is, where tests go (pre-agreed
seams), the anti-patterns to avoid, and the rules of the red-green loop. After this
ticket, the contract test's `tdd reference skill exists` block passes. Ticket 09
(implement) depends on this skill existing.

## Acceptance criteria

- [ ] `pi/orchestrator/skills/tdd/SKILL.md` exists; first line is `---`; frontmatter has `name: tdd`, a colon-free `description`, `disable-model-invocation: true`, `argument-hint: ""`.
- [ ] The body has four sections: **What a good test is**, **Seams (where tests go)**, **Anti-patterns**, **Rules of the loop**, plus a top note to read `CONTEXT.md` if it exists so test names match the domain language.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `tdd reference skill exists` block passes; no previously-green block regressed.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan step to execute (in full)

### Step 6: Create `skills/tdd/SKILL.md`

Frontmatter: `name: tdd`; colon-free `description` (e.g. "TDD reference discipline read
by the implement skill: what a good test is, seams, anti-patterns, rules of the
red-green loop. Not spawned directly."); `disable-model-invocation: true`;
`argument-hint: ""` (reference skill, not invoked directly).

Body: inline the "Design source → TDD rules" content below as four sections — **What a
good test is**, **Seams (where tests go)** (test only at pre-agreed seams from the
spec's Testing Decisions), **Anti-patterns** (implementation-coupled, tautological,
horizontal slicing — each with its tell), **Rules of the loop** (red before green; one
slice at a time; refactoring is not part of the loop). Note at the top: read
`CONTEXT.md` if it exists so test names match the domain language.

**Verify**: `test -f pi/orchestrator/skills/tdd/SKILL.md` → exists.
`node --test "pi/orchestrator/*.test.ts"` → the `tdd reference skill exists` block passes.

---

## Design source (inlined — you have not read the spec)

**TDD rules**: a good test verifies behavior through public interfaces and reads like a
specification; expected values come from an independent source of truth (known-good
literal, worked example, spec), never recomputed the way the code does. Test only at
**pre-agreed seams** (from the spec's Testing Decisions). Anti-patterns:
implementation-coupled (mocks internals / tests privates), tautological (assertion
recomputes the expected value), horizontal slicing (all tests then all code). Rules of
the loop: red before green; one seam, one test, one minimal implementation per cycle;
refactoring is not part of the loop.

## Skill shape (match exactly)

YAML frontmatter with `name`, `description`, `disable-model-invocation: true`,
`argument-hint`; then the four prose sections above. Keep `disable-model-invocation: true`.

---

## How to work (read first)

You are an implement worker. You implement; you never spawn. Never run `paseo run` or
`paseo send`, and never create agents.

### Pre-edit identity check (mandatory before any file edit)
1. `pwd` matches the assigned worktree path.
2. `git branch --show-current` is non-main (branch `001-pipeline-v2`).
3. `git worktree list` confirms this worktree's identity.
4. `git status --short` is clean.
Stop and report if any check fails.

### Drift check (run first)
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/`
If the skills layout changed since the plan, compare before proceeding; on a mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- Prose obeys the playbook's Writing standards (in `AGENTS.md`): cut filler, no clichés,
  active voice, concrete.

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): add tdd reference skill`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/tdd/SKILL.md`. `pi/orchestrator/index.ts` must NOT
change. If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the layout doesn't match (drift); `index.ts` appears to need a
change; a verification fails twice after a reasonable fix; the fix requires an
out-of-scope file; identity checks fail.
