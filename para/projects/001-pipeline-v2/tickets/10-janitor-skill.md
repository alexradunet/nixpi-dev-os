---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 10
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 10: janitor skill — trigger domain-model reconcile before archiving

## What to build

Make project close reconcile the glossary. Before the janitor archives a project, it
checks whether the project produced a `CONTEXT.md` or any artifact with a `## Domain flags`
section, and if so asks the orchestrator/user to run the `domain-model` worker in
`reconcile` mode (or runs `/domain-model reconcile` in-session), confirming the flags are
merged before archiving. The janitor is in-session, so it asks rather than spawns (the
flat-spawn rule stays intact). After this ticket, the contract test shows no regression.

## Acceptance criteria

- [ ] `skills/janitor/SKILL.md` has a step before "Archive the project" that triggers domain-model reconcile (spawn via orchestrator in reconcile mode, or `/domain-model reconcile` in-session) and confirms flags are merged before archiving.
- [ ] The flat-spawn rule is preserved (janitor asks the orchestrator/user to run the reconcile worker; it does not spawn).
- [ ] `grep -c "reconcile\|Domain flags" pi/orchestrator/skills/janitor/SKILL.md` prints `2` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → no regression (previously-green blocks stay green).
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan step to execute (in full)

### Step 11: Modify `skills/janitor/SKILL.md` (trigger domain-model reconcile)

One targeted edit: add a step **before** "Archive the project" — "Reconcile the domain
model: if the project produced a `CONTEXT.md` or any artifact has a `## Domain flags`
section, spawn (via the orchestrator) a `domain-model` worker in `reconcile` mode, or
run `/domain-model reconcile` in-session, and confirm the flags are merged before
archiving." (Janitor is in-session; it asks the orchestrator/user to run the reconcile
worker rather than spawning it itself — keep the flat-spawn rule intact.)

**Verify**: `grep -c "reconcile\|Domain flags" pi/orchestrator/skills/janitor/SKILL.md`
→ prints `2` or more. `node --test "pi/orchestrator/*.test.ts"` → no regression.

---

## Context (inlined — you have not read the spec)

`domain-model-close` is the `domain-model` skill (Ticket 03) running in `reconcile`
mode, spawned via the single `domain-model` role with the mode passed in the prompt. The
janitor does not spawn it directly (flat-spawn rule); it asks the orchestrator/user to
run the reconcile worker, or runs `/domain-model reconcile` in-session.

## Skill shape (match exactly)

The janitor skill already has YAML frontmatter (`name`, `description`,
`disable-model-invocation: true`, `argument-hint`) and prose sections. Make one targeted
edit; keep the shape and `disable-model-invocation: true`.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/janitor/SKILL.md`
If the janitor skill changed since the plan was written, read the live file and make the
targeted edit against its current content; on a structural mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): janitor triggers domain-model reconcile before archiving`).
  Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/janitor/SKILL.md`. `pi/orchestrator/index.ts` must
NOT change. If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the janitor skill structure doesn't match (drift); `index.ts`
appears to need a change; a verification fails twice after a reasonable fix; the fix
requires an out-of-scope file; identity checks fail.
