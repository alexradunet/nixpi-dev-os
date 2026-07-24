---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 11
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 11: model-registry-template — v2 phase-defaults

## What to build

Update the model-registry seed template so new per-repo registries list the v2 phases.
Replace the "Phase defaults" table with the 10-phase pipeline's phases and tiers, and
update the spawned/in-session line beneath it. This is the template
(`model-registry-template.md`), not the live user-edited registry. After this ticket,
the template lists every v2 phase.

## Acceptance criteria

- [ ] The "Phase defaults" table is replaced with the v2 table below (grill, spec, domain-model bootstrap, plan feature/fix/audit, tickets, implement, review-standards, review-feature, domain-model reconcile, teach, janitor).
- [ ] The note about role-provider floor vs registry recommendation is kept.
- [ ] The "Spawned phases … In-session phases …" line beneath the table is replaced with the v2 wording below.
- [ ] `grep -c "review-feature\|review-standards\|domain-model\|tickets\|spec" pi/orchestrator/model-registry-template.md` prints `5` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → no regression.
- [ ] `pi/orchestrator/index.ts` is NOT modified; the live `para/resources/model-registry.md` is NOT touched.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan step to execute (in full)

### Step 15: Update `model-registry-template.md` phase-defaults

Replace the "Phase defaults" table with the v2 phases (tiers are recommendations; the
role briefing's `provider` is the floor). Keep the existing note about role-provider
floor vs registry recommendation.

```markdown
| Phase | Default tier | Fallback |
|-------|-------------|----------|
| grill | premium | mid |
| spec | premium | mid |
| domain-model (bootstrap) | mid | budget |
| plan (feature) | premium | mid |
| plan (fix) | mid | budget |
| plan (audit) | premium | mid |
| tickets | premium | mid |
| implement | mid | budget |
| review-standards | mid | budget |
| review-feature | premium | mid |
| domain-model (reconcile / close) | mid | budget |
| teach | mid | premium (for deep topics) |
| janitor | budget | mid |
```

Update the "Spawned phases … In-session phases …" line beneath the table to:
"Spawned phases (delegated via `paseo run`; model comes from the role briefing's
`provider` field): spec, domain-model, plan, tickets, implement, review-standards,
review-feature. In-session phases (run on the orchestrator's own model): grill, teach,
janitor. `integrate` is a ticket (or an orchestrator merge), not a spawned phase.
`explore` is ad-hoc, outside the pipeline."

**Verify**: `grep -c "review-feature\|review-standards\|domain-model\|tickets\|spec" pi/orchestrator/model-registry-template.md` → prints `5` or more.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/model-registry-template.md`
If the template changed since the plan was written, read the live file and replace the
table/line against its current content; on a structural mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `docs(orchestrator): update model-registry-template phase-defaults for v2`). Commit and
  report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/model-registry-template.md`. Do NOT touch the live
`para/resources/model-registry.md` (user-edited). `pi/orchestrator/index.ts` must NOT
change. If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the template structure doesn't match (drift); `index.ts` appears to
need a change; a verification fails twice after a reasonable fix; the fix requires an
out-of-scope file; identity checks fail.
