---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 13
blocked-by: [02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 13: verification — full green suite + runtime smokes

## What to build

Prove the whole rebuild is coherent. Run the contract test suite to full green, run the
two runtime smokes (if a model is reachable), confirm only in-scope files changed, and
commit any remaining work. This is the final gate: it depends on every other ticket and
makes the Done criteria visible. No new source is authored here except committing
leftovers; if the suite is not green, this ticket reports which block fails rather than
re-implementing another ticket's work.

## Acceptance criteria

- [ ] `node --test "pi/orchestrator/*.test.ts"` exits 0 with all tests passing, 0 failures.
- [ ] `ls pi/orchestrator/roles/` is exactly: `domain-model.md implement.md plan.md review-feature.md review-standards.md spec.md tickets.md`.
- [ ] `ls pi/orchestrator/skills/` includes `spec domain-model tickets tdd` alongside the original seven.
- [ ] `roles/review.md` and `roles/explore.md` are deleted (`git status` shows the deletions).
- [ ] `worker-output-schema.json` has `flags` optional and `required` unchanged.
- [ ] `AGENTS.md` pipeline diagram shows the 10 phases and the orchestration-loop section exists.
- [ ] `model-registry-template.md` phase-defaults lists the v2 phases.
- [ ] Runtime load smoke prints `ok` (or the report documents why it was skipped — no model/network).
- [ ] Skill-discovery smoke lists all 11 skills with no YAML parse error (or the report documents why it was skipped).
- [ ] `git status --short` shows only in-scope files; `pi/orchestrator/index.ts` is NOT modified.
- [ ] Any remaining work committed with a conventional-commit message.

## Blocked by

- Ticket 02: spec phase — skill + role briefing
- Ticket 03: domain-model phase — skill + role briefing
- Ticket 04: tickets phase — skill + role briefing
- Ticket 05: tdd reference skill
- Ticket 06: grill skill — absorb explore, add test seams + root-cause
- Ticket 07: plan phase — spec-aware planning (skill + role)
- Ticket 08: review phase — two-mode review skill + review-standards/review-feature roles, retire old roles
- Ticket 09: implement phase — TDD + ticket awareness (skill + role)
- Ticket 10: janitor skill — trigger domain-model reconcile before archiving
- Ticket 11: model-registry-template — v2 phase-defaults
- Ticket 12: playbook — rewrite AGENTS.md pipeline sections for the 10-phase pipeline

---

## Plan step to execute (in full)

### Step 16: Full verification (green suite + smokes)

1. `node --test "pi/orchestrator/*.test.ts"` → **exit 0, all tests pass, 0 fail.**
2. Runtime load smoke (if a model is reachable):
   `pi --no-extensions -e ./pi/orchestrator/index.ts -p --no-session --model pi/qwen-token-plan/qwen3.6-flash --thinking off "Reply with exactly: ok"`
   → prints `ok`, exit 0.
3. Skill-discovery smoke (if a model is reachable): same invocation but prompt
   "List the orchestration skills you can see, one per line." → lists all 11 skills
   (explore, grill, implement, janitor, plan, review, teach, spec, domain-model,
   tickets, tdd) with no YAML parse error.
4. `git status --short` → only in-scope files modified/created/deleted.
5. Commit any remaining work (conventional-commit message).

If smokes 2–3 cannot run (no model/network), say so explicitly in the impl report and
note that the contract test + manual frontmatter inspection stand in.

### Done criteria (ALL must hold)

- [ ] `node --test "pi/orchestrator/*.test.ts"` exits 0 with 0 failures.
- [ ] `ls pi/orchestrator/roles/` is exactly: `domain-model.md implement.md plan.md review-feature.md review-standards.md spec.md tickets.md`.
- [ ] `ls pi/orchestrator/skills/` includes `spec domain-model tickets tdd` alongside the original seven.
- [ ] `roles/review.md` and `roles/explore.md` are deleted (`git status` shows the deletions).
- [ ] `worker-output-schema.json` has `flags` optional and `required` unchanged.
- [ ] `AGENTS.md` pipeline diagram shows the 10 phases and the orchestration-loop section exists.
- [ ] `model-registry-template.md` phase-defaults lists the v2 phases.
- [ ] Runtime load smoke prints `ok` (or the impl report documents why it was skipped).
- [ ] `git status --short` shows only in-scope files; `pi/orchestrator/index.ts` is **not** modified.

---

## Context (inlined — you have not read the spec)

The contract test (`orchestrator.test.ts`, created in Ticket 01) registers 12 `test()`
calls: schema (1), roles-dir (1), one per role (7), skill-dirs (1), tdd (1), playbook
(1). Full green means every role/skill/playbook ticket merged correctly. The two `pi`
smokes are integration gates; the global symlink points at the main checkout, so this
worktree's changes are loaded with `-e <path> --no-extensions`. If a role's
`thinking: medium` value is rejected by `paseo run` at spawn, the smokes surface it —
report the valid thinking option IDs rather than guessing.

### In-scope files (the only ones `git status` should show)

Under `pi/orchestrator/`: `worker-output-schema.json` (modified), `orchestrator.test.ts`
(created), `skills/{spec,domain-model,tickets,tdd}/SKILL.md` (created),
`skills/{grill,plan,implement,review,janitor}/SKILL.md` (modified),
`roles/{spec,domain-model,tickets,review-standards,review-feature}.md` (created),
`roles/{implement,plan}.md` (modified), `roles/{review,explore}.md` (deleted),
`AGENTS.md` (modified), `model-registry-template.md` (modified). `index.ts` must NOT
appear.

---

## How to work (read first)

You are an implement worker. You implement; you never spawn. Never run `paseo run` or
`paseo send`, and never create agents.

### Pre-edit identity check (mandatory before any file edit)
1. `pwd` matches the assigned worktree path.
2. `git branch --show-current` is non-main (branch `001-pipeline-v2`).
3. `git worktree list` confirms this worktree's identity.
4. `git status --short` is clean (or shows only the in-scope work from prior tickets).
Stop and report if any check fails.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits. Commit and report only; never push/PR.

### Scope guard
This ticket runs the suite and smokes and commits leftovers; it does NOT re-implement
other tickets. `pi/orchestrator/index.ts` must NOT change. If the suite is red, report
the failing block(s) and which ticket owns them rather than editing source out of scope.

### STOP conditions
Stop and report (do not improvise) if: the suite fails to go green after confirming all
prior tickets merged; `index.ts` appears to need a change; a role's `thinking: medium`
is rejected at spawn (report the valid thinking option IDs); a smoke fails for a reason
other than no-model/network; identity checks fail.
