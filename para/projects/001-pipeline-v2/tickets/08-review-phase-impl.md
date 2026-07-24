---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 08
date: 2026-07-24
plan: plan-2026-07-24.md
commit: ba782d3
branch: 001-pv2-t08
---

# Implementation: ticket 08 — review phase (two-mode review skill + review roles)

## Steps completed
- [x] Step 10: Rewrite `skills/review/SKILL.md` around two prompt-selected modes (standards, feature) — verified: `grep -c "Mysterious Name\|Refused Bequest\|## Spec\|standards\|feature"` → `12` (≥5); contract test shows no regression.
- [x] Step 12: Create `roles/review-standards.md` (thinking medium, workspace worktree) — verified: `role review-standards` block passes.
- [x] Step 13: Create `roles/review-feature.md` (thinking high, workspace worktree); `git rm` old `roles/review.md` and `roles/explore.md` — verified: `ls roles/` no longer lists them; `role review-feature` block passes.

## Files changed
- `pi/orchestrator/skills/review/SKILL.md` — rewritten: two modes; Standards axis inlines all 12 Fowler smells as labelled heuristics (repo standards override, skip tooling-enforced, cite file:line); feature mode runs `## Standards` and `## Spec` as separate, never-merged axes with per-axis summary; read-only Constraints kept.
- `pi/orchestrator/roles/review-standards.md` — created (standards mode, thinking medium, worktree).
- `pi/orchestrator/roles/review-feature.md` — created (feature mode, thinking high, worktree).
- `pi/orchestrator/roles/review.md` — deleted (git rm).
- `pi/orchestrator/roles/explore.md` — deleted (git rm).
- `pi/orchestrator/index.ts` — NOT modified (confirmed via empty `git diff`).

## Verification results
`node --test pi/orchestrator/*.test.ts`:
- `role review-standards` ✔ and `role review-feature` ✔ (target blocks).
- Previously-green blocks still green: `worker-output-schema` ✔, `role plan` ✔, `role implement` ✔. No regression.
- Still-failing blocks (`role spec`, `role domain-model`, `role tickets`, `tdd reference skill`, `playbook names every spawnable phase`, `roles/ directory is exactly the spawnable set`) are owned by tickets 02/03/04/05/12 and were already red before this change. The spawnable-set block goes green only once all seven roles exist.

## Issues encountered
None. Drift check (`git diff --stat 77dc6db..HEAD` over review skill + roles) was empty before editing. Identity checks passed (worktree `001-pv2-t08`, branch non-main, clean status).
