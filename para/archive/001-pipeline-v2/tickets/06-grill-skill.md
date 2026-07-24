---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 06
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 06: grill skill — absorb explore, add test seams + root-cause

## What to build

Make the grill the single entry point for both features and bugs. The grill skill gains
explore's hypothesis-verify protocol (for bugs, investigate the code read-only to
confirm a root cause before grilling), grills test seams when relevant (so the spec
inherits them), and its artifact gains a `root-cause` field and `## Root cause` section
for bug grills. This is an in-session skill — no role briefing. After this ticket, the
contract test shows no regression (grill is not directly asserted, but the suite must
stay green where it was green).

## Acceptance criteria

- [ ] `skills/grill/SKILL.md` Protocol has a bug-investigation bullet (hypothesis → verify read-only → iterate → confirm root cause explains the full symptom → check related instances), ~4 lines.
- [ ] Protocol has a bullet for grilling test seams when relevant.
- [ ] The Artifact format block's frontmatter has a `root-cause:` line (bug grills only; omit for features) and a `## Root cause` section above `## Decisions made`.
- [ ] `disable-model-invocation: true` and the read-only Constraints are unchanged.
- [ ] `grep -c "hypothesis\|root-cause\|test seams" pi/orchestrator/skills/grill/SKILL.md` prints `3` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → no regression (previously-green blocks stay green).
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan step to execute (in full)

### Step 7: Modify `skills/grill/SKILL.md` (absorb explore; add test seams + root-cause)

Make three targeted edits (do not rewrite the whole file):

1. In **Protocol**, add a bullet: for a **bug or unexpected behavior**, run the
   hypothesis-verify loop before grilling — form a hypothesis, verify it against the
   code with read-only commands (`grep`, `git log`, `git blame`, read files), iterate on
   wrong hypotheses, confirm the root cause explains the full symptom, and check for
   related instances. (This absorbs the `explore` skill's protocol; keep it to ~4 lines.)
2. In **Protocol**, add a bullet: when relevant, grill the **test seams** — which public
   boundaries the feature should be tested at — so the spec inherits them.
3. In the **Artifact** format block, add a `root-cause: {one-line root cause, bug grills only; omit for features}` line to the frontmatter, and a `## Root cause` section (present for bug grills, omitted for features) above `## Decisions made`.

Keep `disable-model-invocation: true` and the read-only Constraints unchanged.

**Verify**: `grep -c "hypothesis\|root-cause\|test seams" pi/orchestrator/skills/grill/SKILL.md`
→ prints `3` or more. `node --test "pi/orchestrator/*.test.ts"` → no regression.

---

## Context (inlined — you have not read the spec)

The `explore` role is removed from the pipeline (Ticket 08 deletes `roles/explore.md`);
the `explore` **skill** stays as an ad-hoc tool outside the pipeline. Grill absorbs
explore's hypothesis-verify protocol for bugs so there is a single entry point into the
pipeline for both features and bugs.

## Skill shape (match exactly)

The grill skill already has YAML frontmatter (`name`, `description`,
`disable-model-invocation: true`, `argument-hint`) and prose sections **Protocol**,
**Context**, **Artifact** (with a `**Path:**` line and a fenced markdown format block),
**Constraints**. Make targeted edits only; keep the shape and
`disable-model-invocation: true`.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/grill/SKILL.md`
If `skills/grill/SKILL.md` changed since the plan was written, read the live file and
make the three targeted edits against its current content; if its structure no longer
matches the shape above, treat it as a STOP condition.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- Prose obeys the playbook's Writing standards (in `AGENTS.md`): cut filler, no clichés,
  active voice, concrete.

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): grill absorbs explore protocol, adds test seams + root-cause`).
  Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/grill/SKILL.md`. Do NOT touch
`skills/explore/SKILL.md` (it stays as-is). `pi/orchestrator/index.ts` must NOT change.
If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the grill skill's structure doesn't match the shape (drift);
`index.ts` appears to need a change; a verification fails twice after a reasonable fix;
the fix requires an out-of-scope file; identity checks fail.
