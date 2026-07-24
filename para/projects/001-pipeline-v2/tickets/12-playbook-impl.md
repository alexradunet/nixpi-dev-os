---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 12
date: 2026-07-24
plan: 12-playbook
commit: 8ed0021
branch: 001-pv2-t12
---

# Implementation: Ticket 12 — rewrite AGENTS.md pipeline sections for the 10-phase pipeline

## Steps completed

- [x] Pre-edit identity check — verified: `pwd` = `.../001-pv2-t12`; `git branch --show-current` = `001-pv2-t12` (non-main); `git worktree list` confirms worktree; `git status --short` clean.
- [x] Drift check — verified: `git diff --stat 77dc6db..HEAD -- pi/orchestrator/AGENTS.md` empty (no drift; all five named sections present).
- [x] Step 14.1 "The pipeline" — replaced diagram with the 10-phase diagram; rewrote the "not every project" list (full pipeline / bug-with-root-cause / trivial fix / audit / learning); replaced the spawnable sentence (seven spawned phases, grill/teach/janitor in-session, explore ad-hoc, tdd reference).
- [x] Step 14.2 Paseo-vs-in-session table — verified: spawnable row now lists spec, domain-model, plan, tickets, implement, review-standards, review-feature; in-session rows unchanged (grill/teach, janitor, trivial fix).
- [x] Step 14.3 "Skills and roles" — updated slash-command list (added /spec, /domain-model, /tickets, /tdd, kept /explore); role-briefing spawnable list now the seven phases; spawnable sentence matches item 1; added the domain-model role-composition paragraph (read CONTEXT.md, use its vocabulary, add flags to `## Domain flags`, never edit CONTEXT.md).
- [x] Step 14.4 "When the user says go" — renamed the foreground subsection to spec/domain-model/plan/tickets (kept the model-recommendation + confirm gate and the `jq`-not-installed note); kept the implement background spawn form; renamed review → review-standards and noted review-feature reuses the same form; added the "Parallel implement orchestration loop" subsection (frontier scan, branching strategy, spawn/review/repeat, integrate, review-feature, domain-model-close).
- [x] Step 14.5 "What you never do" — added the two frontier rules (no implement spawn with unmet blockers; no hand-editing ticket `status` to skip the frontier).
- [x] Commit — verified: `8ed0021 docs(orchestrator): rewrite playbook for 10-phase pipeline`.

## Files changed

- `pi/orchestrator/AGENTS.md` — five pipeline sections rewritten (38 insertions, 17 deletions). Every other section (Philosophy, Code standards, Writing standards, Response shape, Your job, Decision threshold, Redirects, Edge case, On session start, new idea, Model registry, When the user comes back, Model recommendation, Teaching moments, PARA structure) preserved verbatim.

## Verification results

```
$ node --test "pi/orchestrator/*.test.ts"
✔ playbook names every spawnable phase and still mentions explore (ad-hoc)
ℹ tests 12
ℹ pass 12
ℹ fail 0

$ grep -c "review-feature\|review-standards\|domain-model\|tickets\|frontier" pi/orchestrator/AGENTS.md
21

$ git diff --stat 77dc6db..HEAD -- pi/orchestrator/index.ts
(empty — index.ts NOT modified)

$ git status --short   # after commit
(clean)
```

All acceptance criteria met: 10-phase diagram + updated list + spawnable sentence; table lists seven spawned vs grill/teach/janitor/trivial fix; Skills and roles updated with the domain-model paragraph; per-phase spawn sequence plus the parallel orchestration loop; two frontier rules added; contract test block passes with no regression (12/12); grep count 21 (≥5); `index.ts` untouched.

## Issues encountered

None. The "6. Tell the user" line follows the loop's inner "7." — this continues the outer numbered list across the bold subsections, matching the document's pre-existing structure (step 5 → bold subsections → step 6), so no renumbering was introduced. The out-of-scope "Edge case" and "Redirects" sections still reference explore/plan; left verbatim per the scope guard (the test only requires the spawnable phases plus an explore mention, both satisfied).
