---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 07
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 07: plan phase — spec-aware planning (skill + role)

## What to build

Make the plan phase spec-aware. When a spec exists, the planner treats it as the primary
input and focuses the plan on architecture (modules, interfaces, schema, API contracts,
testing strategy) rather than re-deriving requirements or producing a work breakdown
(that is the tickets phase). This ticket updates the `plan` skill's context detection
and feature-plan analysis, and updates the `plan` role briefing to match. After this
ticket, the contract test's `role plan` block still passes (it passed at RED baseline)
and the plan skill recognizes spec input.

## Acceptance criteria

- [ ] The `plan` skill's Context Detection table has a top row for `spec.md with status: done` → Feature plan, and the grill row reads as the fallback when there is no spec.
- [ ] Phase 2 → For feature plans has a line: when a spec exists, the plan focuses on architecture (not work breakdown, which is the tickets phase); the spec's Testing Decisions section is the testing-strategy source.
- [ ] Hard Rules, the template reference, and the artifact path (`para/projects/{project-id}/plan-{YYYY-MM-DD}.md`) are unchanged.
- [ ] `roles/plan.md` body notes that a spec (if present) is the primary input and the plan focuses on architecture, not work breakdown.
- [ ] `grep -c "spec.md\|architecture\|tickets phase" pi/orchestrator/skills/plan/SKILL.md` prints `3` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role plan` block still passes; no regression.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan steps to execute (in full)

### Step 8: Modify `skills/plan/SKILL.md` (recognize spec input)

Two targeted edits:

1. In the **Context Detection** table, add a row at the top:
   `| spec.md with status: done | **Feature plan** | Spec → requirements, seams, implementation decisions |`
   and adjust the grill row's note so the precedence reads: spec (if present) is the
   primary input; the grill artifact is the fallback when there is no spec.
2. In **Phase 2 — Analyze → For feature plans**, add one line: when a spec exists, the
   plan focuses on **architecture** (modules, interfaces, schema, API contracts, testing
   strategy — the "how") and does **not** produce a work breakdown (that is the tickets
   phase). The spec's Testing Decisions section is the source for the testing strategy.

Keep the Hard Rules, the template reference, and the artifact path
(`para/projects/{project-id}/plan-{YYYY-MM-DD}.md`) unchanged.

**Verify**: `grep -c "spec.md\|architecture\|tickets phase" pi/orchestrator/skills/plan/SKILL.md`
→ prints `3` or more. `node --test "pi/orchestrator/*.test.ts"` → no regression.

### Step 13 (plan role only): Update `roles/plan.md`

- `roles/plan.md` — keep frontmatter. Add to the body: "When a spec exists
  (`para/projects/{project-id}/spec.md`), it is your primary input; focus the plan on
  architecture, not work breakdown (that is the tickets phase)."

Keep the existing frontmatter shape (`name`, `description`, `provider`, `thinking`,
`workspace`), the flat-spawn prohibition verbatim, and the philosophy/standards line.

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role plan` block still passes.

---

## Context (inlined — you have not read the spec)

The plan phase sits between spec and tickets: grill → spec → domain-model → **plan** →
tickets. The plan produces the architecture ("how"); the tickets phase (Ticket 04)
produces the work breakdown. The plan skill's reference files
(`skills/plan/references/*`) are unchanged — only the context-detection table and the
feature-plan analysis change here.

## Role briefing shape (match exactly)

The existing `roles/plan.md` has YAML frontmatter (`name`, `description`, `provider`,
`thinking`, `workspace`) and a body that states the one job, points at
`~/.pi/agent/extensions/orchestrator/skills/plan/SKILL.md`, carries the flat-spawn
prohibition verbatim, and ends with the philosophy/standards line. Make a targeted body
addition only; keep the `description` colon-free (or double-quoted) — the contract test
enforces this.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/plan/ pi/orchestrator/roles/plan.md`
If the plan skill or role changed since the plan was written, read the live files and
make the targeted edits against their current content; on a structural mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- **YAML frontmatter is strict**: keep the role `description` free of `: ` (or
  double-quote it). The contract test enforces this.
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): plan recognizes spec as primary input`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/plan/SKILL.md` and `pi/orchestrator/roles/plan.md`.
Do NOT touch `skills/plan/references/*`. `pi/orchestrator/index.ts` must NOT change. If
you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the plan skill/role structure doesn't match (drift); `index.ts`
appears to need a change; a verification fails twice after a reasonable fix; the fix
requires an out-of-scope file; identity checks fail.
