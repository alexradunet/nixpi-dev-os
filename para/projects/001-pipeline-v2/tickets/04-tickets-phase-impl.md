---
phase: implement
status: done
project: 001-pipeline-v2
ticket: 04
date: 2026-07-24
plan: 04-tickets-phase
commit: d9a207d
branch: 001-pv2-t04
---

# Implementation: Ticket 04 — tickets phase (skill + role briefing)

## Steps completed
- [x] Step 5: Create `pi/orchestrator/skills/tickets/SKILL.md` — verified: `test -f` passes; first line is `---`; frontmatter has `name: tickets`, colon-free `description`, `disable-model-invocation: true`, `argument-hint`; body has Protocol, Ticket format, Artifact, Domain flags, Constraints; Artifact reproduces the ticket file frontmatter (phase, status, project, ticket, blocked-by, worker, branch, shared-blast-radius) and body exactly.
- [x] Step 12 (tickets role): Create `pi/orchestrator/roles/tickets.md` — verified: frontmatter has `name`, colon-free `description`, `provider: pi/qwen-token-plan/qwen3.8-max-preview`, `thinking: high`, `workspace: current`; body references `skills/tickets/SKILL.md` by absolute path, carries the flat-spawn prohibition verbatim, ends with the philosophy line.
- [x] Verify: `node --test "pi/orchestrator/*.test.ts"` — `role tickets` block flipped green; skill-dir block now fails on `skills/spec/SKILL.md missing` (another ticket), not tickets. No previously-green block regressed.

## Files changed
- `pi/orchestrator/skills/tickets/SKILL.md` — new tickets skill: breaks a plan into vertical tracer-bullet tickets, quizzes the user on granularity (reports `blocked` until approved), flags shared blast radius, read-only on source.
- `pi/orchestrator/roles/tickets.md` — new tickets role briefing (thinking: high, workspace: current).

## Verification results

```
$ node --test "pi/orchestrator/*.test.ts"   # relevant blocks
✔ worker-output-schema: core required, flags optional, closed shape
✔ role plan: valid frontmatter + referenced skill exists
✔ role tickets: valid frontmatter + referenced skill exists   # was RED, now GREEN
✔ role implement: valid frontmatter + referenced skill exists
✖ every spawnable phase has a skill directory                  # fails on skills/spec/SKILL.md (ticket 02), not tickets
```

Previously-green blocks (schema, role plan, role implement) stayed green. The skill-dir block passes for `tickets` (present); it remains red overall only because spec/domain-model/review skill dirs are other tickets' work.

Scope guard: `git status` before commit showed only the two new files. `pi/orchestrator/index.ts` not modified.

## Issues encountered
None. Drift check (`git diff --stat 77dc6db..HEAD -- pi/orchestrator/`) showed only ticket 01's contract test and schema flags; skills/roles layout matched the plan. This ticket ran in its own per-ticket worktree (branch `001-pv2-t04`, base `a9d5281`) rather than directly on `001-pipeline-v2`; the non-main, clean, correct-worktree safety property held.
