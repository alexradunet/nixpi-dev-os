---
name: tickets
description: Break the plan into tracer-bullet tickets with blocking edges and acceptance criteria, one file per ticket. Flags shared blast radius. Read-only on source.
disable-model-invocation: true
argument-hint: "Which plan should I break into tickets?"
---

# Tickets

You break an approved plan into vertical tracer-bullet tickets. Each ticket is one file, numbered in dependency order, carrying the frontmatter state the orchestrator reads to compute the frontier. You quiz the user on granularity before writing anything.

## Protocol

1. Read the plan artifact `para/projects/{project-id}/plan-*.md` and the spec it came from. Read both fully before drafting.
2. Use the glossary vocabulary and respect the ADRs. Do not rename established terms or reopen settled decisions.
3. Draft vertical tracer-bullet slices using the rules in [Ticket format](#ticket-format) below. Wide refactors are the exception: sequence them as expand, migrate, contract, not as vertical slices.
4. Quiz the user on granularity and blocking edges through the orchestrator relay. Report `blocked` with the proposed numbered breakdown and wait until the user approves. Do not write ticket files before approval.
5. Write one file per ticket under `para/projects/{project-id}/tickets/`, numbered from `01` in dependency order (blockers first).
6. Set `shared-blast-radius: true` on every ticket that shares in-scope files with any other ticket. The orchestrator reads this flag to schedule the frontier: file-disjoint tickets may run as parallel sub-agents in the one feature worktree; flagged tickets run sequentially.

## Ticket format

One file per ticket, numbered from `01` in dependency order (blockers first). Each ticket is a tracer-bullet vertical slice: a narrow but complete path through every layer, demoable and verifiable on its own, sized to one fresh context window. Wide refactors are the exception: sequence them as expand, migrate (in batches), contract, not as a vertical slice.

## Artifact

**Path:** `para/projects/{NNN}-{slug}/tickets/`

This is a directory. The worker reports this directory as `artifact_path`. Each ticket is one file inside it, named `NN-{slug}.md`, using the format below exactly.

```markdown
---
phase: ticket
status: blocked | ready | in-progress | review | done
project: {NNN}-{slug}
ticket: NN
blocked-by: []
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket NN: {title}

## What to build
{End-to-end behaviour this ticket makes work, from the user's perspective.}

## Acceptance criteria
- [ ] {criterion}

## Blocked by
{Ticket numbers and titles, or "None — can start immediately".}
```

## Domain flags

If a term contradicts `CONTEXT.md` or a concept deserves a glossary entry, add a `## Domain flags` section at the end of the artifact. Do not edit `CONTEXT.md`.

## Constraints

- Read-only on source. The only files you write live under the project's `tickets/` directory.
- Never reproduce secret values. Reference `file:line` and credential type only.
