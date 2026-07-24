---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 09
blocked-by: [01, 05]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 09: implement phase — TDD + ticket awareness (skill + role)

## What to build

Make the implement phase ticket-aware and TDD-driven. An implement worker reads its
assigned ticket file (confirming its blockers are done), follows the `tdd` reference
skill (red-green per step, testing at the spec's seams), and writes its artifact at the
ticket-relative path. This ticket updates the `implement` skill (pre-flight, TDD
protocol, artifact path, domain flags) and the `implement` role briefing. After this
ticket, the contract test's `role implement` block still passes and the implement skill
references the `tdd` skill (created in Ticket 05).

## Acceptance criteria

- [ ] The implement skill's Pre-flight reads the assigned ticket file and confirms `status: ready` and all `blocked-by` are `done`, keeping the existing worktree/branch/status checks.
- [ ] The Protocol references the tdd skill by absolute path and spells out the per-step loop: identify seam → RED (failing test) → GREEN (minimal code) → VERIFY → commit test + implementation together; plus the anti-pattern line.
- [ ] The Artifact path is ticket-relative `para/projects/{project-id}/tickets/NN-slug-impl.md` (with `impl-{date}.md` as the plan-only fallback) and the frontmatter gains `ticket: {NN}` (keeping `status`, `commit`, `branch`).
- [ ] A Domain flags flag-don't-edit bullet is present.
- [ ] The "never push / never destructive git / commit and report only" Constraints are unchanged.
- [ ] `roles/implement.md` body adds the ticket-file + TDD + ticket-relative artifact instructions; frontmatter (`thinking: low`, `workspace: worktree`) and flat-spawn text unchanged.
- [ ] `grep -c "tdd/SKILL.md\|RED\|ticket" pi/orchestrator/skills/implement/SKILL.md` prints `3` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role implement` block still passes; no regression.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.
- Ticket 05: tdd reference skill (the implement skill references `skills/tdd/SKILL.md`, which must exist).

---

## Plan steps to execute (in full)

### Step 9: Modify `skills/implement/SKILL.md` (TDD + ticket awareness)

Targeted edits:

1. **Pre-flight**: add a step that reads the **ticket file**
   (`para/projects/{project-id}/tickets/NN-slug.md`) when one is assigned (the prompt
   names it), and confirms its `status` is `ready` and its `blocked-by` are all `done`.
   Keep the existing worktree/branch/status checks.
2. **Protocol**: add a bullet that references the tdd skill — "Read
   `~/.pi/agent/extensions/orchestrator/skills/tdd/SKILL.md` and follow it. For each
   step: identify the seam (from the spec's Testing Decisions), RED — write a failing
   test at that seam, GREEN — write the minimal code to pass, VERIFY — run the test and
   confirm green, then commit the test and implementation together." Add the
   anti-pattern line: no implementation-coupled, tautological, or horizontal-slice tests.
3. **Artifact**: change the path from `impl-{YYYY-MM-DD}.md` to the ticket-relative
   `para/projects/{project-id}/tickets/NN-slug-impl.md` (when implementing a ticket),
   keeping the legacy `impl-{date}.md` path as the fallback for a plan-only implement.
   Add `ticket: {NN}` to the frontmatter. Keep `status`, `commit`, `branch`.
4. Add the **Domain flags** flag-don't-edit instruction (one bullet): if a term
   contradicts `CONTEXT.md` or a concept deserves a glossary entry, add a `## Domain flags`
   section at the end of the artifact; do not edit `CONTEXT.md`.

Keep the "never push / never destructive git / commit and report only" Constraints.

**Verify**: `grep -c "tdd/SKILL.md\|RED\|ticket" pi/orchestrator/skills/implement/SKILL.md`
→ prints `3` or more. `node --test "pi/orchestrator/*.test.ts"` → no regression.

### Step 13 (implement role only): Update `roles/implement.md`

- `roles/implement.md` — keep frontmatter (`thinking: low`, `workspace: worktree`). Add
  to the body: "Read your assigned ticket file and confirm its blockers are done before
  editing. Follow the tdd skill (red-green per step, test at the spec's seams). Write the
  implement artifact at the ticket-relative path." Keep the pre-flight and flat-spawn text.

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role implement` block still passes.

---

## Context (inlined — you have not read the spec)

The implement phase runs per ticket, in parallel, each in its own worktree. The
implement skill references the `tdd` reference skill (Ticket 05) for discipline: for
each step, identify the seam (from the spec's Testing Decisions), red → green → verify →
commit test + implementation together. Anti-patterns enforced: no implementation-coupled
tests, no tautological assertions, no horizontal slicing.

## Role briefing shape (match exactly)

The existing `roles/implement.md` has YAML frontmatter (`name`, `description`,
`provider`, `thinking: low`, `workspace: worktree`) and a body that states the one job,
points at `~/.pi/agent/extensions/orchestrator/skills/implement/SKILL.md`, carries the
flat-spawn prohibition verbatim, and ends with the philosophy/standards line. Make a
targeted body addition only; keep the `description` colon-free (or double-quoted) — the
contract test enforces this.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/implement/ pi/orchestrator/roles/implement.md`
If the implement skill or role changed since the plan was written, read the live files
and make the targeted edits against their current content; on a structural mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...` — the tdd skill
reference inside the body uses the absolute `~/.pi/...` path exactly as written in Step 9.

### Repo conventions
- **YAML frontmatter is strict**: keep the role `description` free of `: ` (or
  double-quote it). The contract test enforces this.
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): implement bakes in TDD + ticket awareness`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/implement/SKILL.md` and
`pi/orchestrator/roles/implement.md`. `pi/orchestrator/index.ts` must NOT change. If you
believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the implement skill/role structure doesn't match (drift); `index.ts`
appears to need a change; a verification fails twice after a reasonable fix; the fix
requires an out-of-scope file; identity checks fail.
