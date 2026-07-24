---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 09
date: 2026-07-24
plan: plan-2026-07-24.md
commit: 3aff2de
branch: 001-pv2-t09
---

# Implementation: ticket 09 — implement phase (TDD + ticket awareness)

## Steps completed
- [x] Step 9: Modify `skills/implement/SKILL.md` (TDD + ticket awareness) — verified: `grep -c "tdd/SKILL.md\|RED\|ticket"` → `5` (≥3); contract test shows no regression.
- [x] Step 13 (implement role only): Update `roles/implement.md` body — verified: `role implement` block passes.

## Files changed
- `pi/orchestrator/skills/implement/SKILL.md` — Pre-flight adds step 4 (read the assigned ticket file `para/projects/{project-id}/tickets/NN-slug.md`, confirm `status: ready` and every `blocked-by` is `done`) and folds the blocked ticket into the step-5 stop condition; existing worktree/branch/status checks kept. Protocol adds a test-first bullet referencing `~/.pi/agent/extensions/orchestrator/skills/tdd/SKILL.md` with the per-step loop (identify seam → RED → GREEN → VERIFY → commit test + implementation together) and the anti-pattern line (no implementation-coupled, tautological, or horizontal-slice tests), plus a domain flag-don't-edit bullet (add a `## Domain flags` section; never edit `CONTEXT.md`). Artifact path is now ticket-relative `para/projects/{project-id}/tickets/NN-slug-impl.md` with `impl-{YYYY-MM-DD}.md` as the plan-only fallback; frontmatter gains `ticket: {NN}`, keeping `status`, `commit`, `branch`. Constraints (never push / never destructive git / commit and report only) unchanged.
- `pi/orchestrator/roles/implement.md` — body adds the ticket-file + blockers, tdd skill (red-green per step, test at the spec's seams), and ticket-relative artifact instructions. Frontmatter (`thinking: low`, `workspace: worktree`, colon-free quoted `description`) and flat-spawn text unchanged; body still references `skills/implement/SKILL.md`.
- `pi/orchestrator/index.ts` — NOT modified (confirmed via empty `git diff`).

## Verification results
`grep -c "tdd/SKILL.md\|RED\|ticket" pi/orchestrator/skills/implement/SKILL.md` → `5` (≥3 required).

`node --test pi/orchestrator/*.test.ts`:
- `role implement` ✔ (target block, still passes).
- Previously-green blocks still green: `worker-output-schema` ✔, `roles/ directory` ✔, `role spec` ✔, `role domain-model` ✔, `role plan` ✔, `role tickets` ✔, `role review-standards` ✔, `role review-feature` ✔, `every spawnable phase has a skill directory` ✔, `tdd reference skill exists` ✔. No regression.
- Still-failing block `playbook names every spawnable phase` (AGENTS.md missing `domain-model`) is owned by ticket 12 and was already red at baseline before this change (confirmed by running the suite before editing). Out of scope for this ticket.

## Issues encountered
None. Drift check (`git diff --stat 77dc6db..HEAD` over the implement skill + role) was empty before editing. Identity checks passed (worktree `001-pv2-t09`, branch `001-pv2-t09` non-main, clean status). The pre-existing `playbook` test failure was present at baseline and is unrelated to the two in-scope files.
