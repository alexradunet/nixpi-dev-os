---
phase: implement
status: done
project: 001-pipeline-v2
date: 2026-07-24
plan: 02-spec-phase.md
commit: 311b68e
branch: 001-pv2-t02
---

# Implementation: Ticket 02 — spec phase skill + role briefing

## Steps completed
- [x] Pre-edit identity check — verified: `pwd` = worktree `001-pv2-t02`, branch `001-pv2-t02` (non-main), `git status --short` clean.
- [x] Drift check — verified: `git diff --stat 77dc6db..HEAD -- pi/orchestrator/` shows only `orchestrator.test.ts` and `worker-output-schema.json` changed (ticket 01); `skills/grill/SKILL.md` exemplar unchanged.
- [x] Step 3: create `skills/spec/SKILL.md` — verified: `test -f ... && head -1` → file exists, first line `---`. Frontmatter has `name: spec`, colon-free `description`, `disable-model-invocation: true`, `argument-hint`. Body has Protocol, Context, Artifact (with `**Path:**` line + fenced format block carrying the seven spec sections), Domain flags, Constraints.
- [x] Step 12: create `roles/spec.md` — verified: frontmatter `name`, colon-free `description`, `provider: pi/qwen-token-plan/qwen3.8-max-preview`, `thinking: high`, `workspace: current`; body states the one job, references `skills/spec/SKILL.md` by absolute path, carries the flat-spawn prohibition verbatim, ends with the philosophy/standards line.
- [x] Test run — verified: `node --test "pi/orchestrator/*.test.ts"` → `role spec` block passes (✔); skill-dir block now fails on `domain-model` (another ticket), not `spec`, so the `spec` entry is satisfied; pass count 3 → 4 with no previously-green block regressed (schema, role plan, role implement still ✔).

## Files changed
- `pi/orchestrator/skills/spec/SKILL.md` — new spec skill (frontmatter + Protocol/Context/Artifact/Domain flags/Constraints; Artifact format block inlines the seven spec sections).
- `pi/orchestrator/roles/spec.md` — new spec role briefing (frontmatter + one-job body, absolute skill path, flat-spawn prohibition, philosophy line).

## Verification results
```
✔ worker-output-schema: core required, flags optional, closed shape
✖ roles/ directory is exactly the spawnable set (explore removed)   # other tickets
✔ role spec: valid frontmatter + referenced skill exists            # THIS TICKET
✖ role domain-model / tickets / review-standards / review-feature   # other tickets
✔ role plan: valid frontmatter + referenced skill exists
✔ role implement: valid frontmatter + referenced skill exists
✖ every spawnable phase has a skill directory  # fails on skills/domain-model/SKILL.md, not spec
✖ tdd reference skill exists                    # ticket 05
✖ playbook names every spawnable phase          # later ticket
ℹ tests 12  pass 4  fail 8
```
`skills/spec/SKILL.md` exists, so the skill-dir block's `spec` entry is satisfied. `git diff -- pi/orchestrator/index.ts` is empty (index.ts not modified). `git status --short` showed only the two in-scope files before commit.

## Issues encountered
None. The ticket's suggested skill `description` example contained a colon ("a full spec: problem"); the acceptance criteria require a colon-free description, so the description was reworded to avoid `:` entirely. The worktree branch is `001-pv2-t02` (a per-ticket branch off `001-pipeline-v2`), not literally `001-pipeline-v2`; it is non-main as required.
