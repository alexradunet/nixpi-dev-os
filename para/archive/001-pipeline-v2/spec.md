---
phase: spec
status: done
project: 001-pipeline-v2
date: 2026-07-24
---

# Spec: Orchestration Pipeline v2

## Problem Statement

The current orchestration pipeline (explore → plan → implement → review) is too coarse for non-trivial features. A single plan produces a single implement worker, which means one context window must hold the entire feature. Large features blow the context, stall, or produce incoherent code. There is no spec phase between grilling and planning, so the planner must re-derive requirements from the grill artifact. There is no mechanism for parallel implementation of independent work slices. Review is single-axis and runs once at the end, catching problems late. Domain terminology drifts across phases because no phase owns the glossary.

## Solution

Replace the 4-phase pipeline with a 10-phase pipeline that produces smaller, self-contained work units (tickets) that can be implemented in parallel by independent agents, each following TDD discipline, with review at two levels and domain modeling threaded throughout.

New pipeline:

```
grill (in-session)
  → spec (spawned)
    → domain-model (spawned)
      → plan (spawned)
        → tickets (spawned)
          → implement × N (spawned, parallel, TDD)
            → review-standards × N (spawned, per-ticket)
              → integrate (conditional, spawned)
                → review-feature (spawned, two-axis)
                  → domain-model-close (spawned)
```

All phases after grill are Paseo workers communicating through filesystem artifacts. The orchestrator manages the pipeline state by reading ticket frontmatter.

## User Stories

1. As a developer, I want to grill an idea in-session and have the conversation captured as a structured artifact, so that downstream workers have a precise decisions document to work from.
2. As a developer, I want a spec worker to synthesize the grill artifact and codebase into a full spec (problem, solution, user stories, implementation decisions, test seams), so that the planner has unambiguous requirements rather than re-deriving them.
3. As a developer, I want the spec worker to propose test seams and let me confirm or adjust them via the orchestrator relay, so that testing effort lands on the boundaries I care about.
4. As a developer, I want a domain-model worker to bootstrap CONTEXT.md and ADRs from the spec, so that all downstream workers share a precise vocabulary.
5. As a developer, I want every downstream worker to read CONTEXT.md and flag contradictory or new terms in its artifact, so that glossary drift is surfaced without risking concurrent edits.
6. As a developer, I want a plan worker to produce the architecture (modules, interfaces, schema, testing strategy) from the spec, so that the technical design is explicit before work is sliced.
7. As a developer, I want a tickets worker to break the plan into vertical tracer-bullet tickets with blocking edges and acceptance criteria, so that each ticket is a self-contained unit of work for one agent in one context window.
8. As a developer, I want the tickets worker to quiz me on granularity and blocking edges via the orchestrator relay, so that the breakdown matches my expectations before implementation starts.
9. As a developer, I want the orchestrator to spawn implement workers only for tickets whose blockers are all done (the frontier), so that parallel work doesn't violate dependency order.
10. As a developer, I want each implement worker to follow TDD discipline (red-green per step, testing at the spec's seams), so that tests are written before code and verify behavior through public interfaces.
11. As a developer, I want each implement worker to get its own worktree branched off main, so that parallel tickets don't interfere with each other.
12. As a developer, I want the tickets worker to flag shared blast radius (tickets touching the same files), so that the orchestrator can use an integration branch strategy instead of independent branches.
13. As a developer, I want a per-ticket standards review after each implement worker finishes, so that code smells and convention violations are caught before merging.
14. As a developer, I want a per-feature two-axis review (Standards + Spec) after all tickets are integrated, so that spec conformance is assessed on the complete feature.
15. As a developer, I want the two-axis review to run Standards and Spec as separate concerns that don't pollute each other, so that a standards pass doesn't mask a spec miss or vice versa.
16. As a developer, I want a domain-model-close worker at project end to reconcile all flagged terms into CONTEXT.md, so that the glossary reflects what was actually built.
17. As a developer, I want to steer any spawned worker mid-flight via paseo send or open it directly in Paseo Desktop, so that I have full control over sub-agents at any point.
18. As a developer, I want ticket files to carry their own state in frontmatter (status, worker, branch), so that the orchestrator can compute the frontier by scanning the directory without a separate state file.
19. As a developer, I want trivial fixes to bypass the pipeline entirely (fix in-session), so that small changes don't incur the overhead of 10 phases.
20. As a developer, I want the explore skill to survive as an ad-hoc investigation tool outside the pipeline, so that I can still spawn one-off codebase investigations without starting a full project.
21. As a developer, I want each worker to communicate exclusively through artifacts on the filesystem, so that any worker can be restarted, replaced, or inspected without shared memory.
22. As a developer, I want the grill to absorb explore's investigative function for bugs, so that there is a single entry point into the pipeline for both features and bugs.
23. As a developer, I want the spec to include an extensive list of user stories covering all aspects of the feature, so that edge cases are enumerated before planning begins.
24. As a developer, I want the spec to record implementation decisions (modules, interfaces, schema changes, API contracts) without specific file paths or code snippets, so that the spec doesn't go stale as the codebase evolves.
25. As a developer, I want tickets to be numbered in dependency order (blockers first) with explicit blocking edges, so that the execution order is unambiguous.
26. As a developer, I want wide refactors to be sequenced as expand-migrate-contract instead of forced into vertical slices, so that mechanical changes across many files stay green batch to batch.
27. As a developer, I want the review's Standards axis to carry a fixed smell baseline (Fowler's code smells) that applies even when the repo documents no standards, so that reviews have a consistent floor.
28. As a developer, I want documented repo standards to override the smell baseline, so that project conventions take precedence over generic heuristics.

## Implementation Decisions

### New skills to create

- **spec** (`skills/spec/SKILL.md`): Synthesizes grill artifact + codebase into a spec. Template: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions (seams), Out of Scope, Further Notes. Proposes test seams; reports `blocked` if user confirmation is needed. Read-only on source.
- **domain-model** (`skills/domain-model/SKILL.md`): Bootstraps or reconciles CONTEXT.md (glossary) and docs/adr/ (ADRs). Two modes: `bootstrap` (after spec, creates initial glossary from spec + codebase) and `reconcile` (at project close, merges flagged terms from all artifacts). Creates files lazily. CONTEXT.md is a glossary only, no implementation details.
- **tickets** (`skills/tickets/SKILL.md`): Reads the plan artifact, breaks it into vertical tracer-bullet tickets. Each ticket is a file with frontmatter (status, blocked-by, worker, branch) and body (what to build, acceptance criteria, blocked-by). Quizzes user on granularity via orchestrator relay. Flags shared blast radius. Numbers tickets in dependency order. Handles wide refactors as expand-migrate-contract sequences.
- **tdd** (`skills/tdd/SKILL.md`): Reference skill for TDD discipline. Not spawned directly; read by the implement skill. Defines: what a good test is (behavior through public interfaces), seams (test only at pre-agreed boundaries from the spec), anti-patterns (implementation-coupled, tautological, horizontal slicing), rules of the loop (red before green, one slice at a time, refactoring is not part of the loop).

### Skills to modify

- **grill** (`skills/grill/SKILL.md`): Add explicit codebase investigation for bugs (absorb explore's hypothesis-verify protocol). Add "test seams" as a grill topic when relevant. Artifact format gains a `root-cause` field for bug grills.
- **implement** (`skills/implement/SKILL.md`): Bake in TDD discipline by referencing the tdd skill. Pre-flight reads the ticket file (not just the plan). Red-green per step: write failing test, then minimal implementation. Test at the spec's seams only. Artifact format updated to reference ticket ID.
- **review** (`skills/review/SKILL.md`): Split into two modes. `standards` mode: review against repo conventions + smell baseline (Fowler's 12 smells, each as labelled heuristic). `feature` mode: two-axis review (Standards + Spec) with separate sections, no cross-axis reranking. Standards axis always carries the smell baseline; repo standards override. Spec axis quotes the spec line for each finding.
- **plan** (`skills/plan/SKILL.md`): Update context detection to recognize spec artifacts as input (spec → feature plan). Plan focuses on architecture: modules, interfaces, schema, API contracts, testing strategy. Does not produce work breakdown (that's tickets).
- **janitor** (`skills/janitor/SKILL.md`): Add domain-model reconciliation step (or trigger domain-model-close worker) before archiving.

### New role briefings to create

- **spec** (`roles/spec.md`): workspace: current, thinking: high. Points at spec skill.
- **domain-model** (`roles/domain-model.md`): workspace: current, thinking: medium. Points at domain-model skill. Mode (bootstrap/reconcile) passed in the prompt.
- **tickets** (`roles/tickets.md`): workspace: current, thinking: high. Points at tickets skill.
- **review-standards** (`roles/review-standards.md`): workspace: worktree, thinking: medium. Points at review skill in standards mode.

### Role briefings to modify

- **implement** (`roles/implement.md`): Add TDD instruction, ticket-file awareness.
- **review** (`roles/review.md`): Rename to review-feature, add two-axis protocol.
- **plan** (`roles/plan.md`): Update to reference spec artifacts as primary input.

### Role briefings to remove

- **explore** (`roles/explore.md`): Removed from pipeline. Skill stays for ad-hoc use.

### Playbook (AGENTS.md) changes

- Replace the pipeline diagram and phase descriptions.
- Update "When the user says go" with the new spawn sequence.
- Add the parallel implement orchestration loop: scan tickets directory, compute frontier, spawn implement workers, wait, spawn per-ticket review, repeat until all done, integrate if needed, spawn feature review.
- Add domain-model instructions to all role briefing composition.
- Update the model registry phase-defaults table with new phases.
- Remove explore from the spawnable phases list; note it as ad-hoc.

### Artifact contracts

| Phase | Artifact path | Key frontmatter |
|---|---|---|
| grill | `para/projects/{NNN}/grill-{date}.md` | phase, status, project, date |
| spec | `para/projects/{NNN}/spec.md` | phase, status, project, date |
| domain-model | `CONTEXT.md`, `docs/adr/*.md` (repo root) | — |
| plan | `para/projects/{NNN}/plan-{date}.md` | phase, status, project, date |
| tickets | `para/projects/{NNN}/tickets/NN-slug.md` | phase, status (blocked/ready/in-progress/review/done), project, blocked-by, worker, branch |
| implement | `para/projects/{NNN}/tickets/NN-slug-impl.md` | phase, status, ticket, commit, branch |
| review-standards | `para/projects/{NNN}/tickets/NN-slug-review.md` | phase, status, ticket, verdict |
| review-feature | `para/projects/{NNN}/review-{date}.md` | phase, status, project, verdict |
| domain-model-close | updated `CONTEXT.md` | — |

### Ticket file format

```markdown
---
phase: ticket
status: blocked | ready | in-progress | review | done
project: {NNN}-{slug}
ticket: NN
blocked-by: []  # list of ticket numbers
worker: ""      # agent-id when spawned
branch: ""      # branch name when implemented
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

### Worker output schema

Extend the current schema to support multi-artifact phases:

```json
{
  "status": "done | stopped | blocked",
  "artifact_path": "primary artifact (file or directory)",
  "summary": "one-paragraph summary",
  "flags": ["optional: domain-term-flags, shared-files, etc."]
}
```

The `flags` field is optional and backward-compatible. Workers use it to surface domain term contradictions or shared blast radius without a separate channel.

### Branching strategy

- Default: each ticket branches off `main` as `{NNN}-{slug}/ticket-{NN}`.
- When `shared-blast-radius: true` on any ticket: create integration branch `{NNN}-{slug}`, all tickets branch off it, final integrate-and-verify ticket merges and tests end-to-end.
- The tickets worker sets `shared-blast-radius` when multiple tickets touch the same files.

### Domain modeling integration

- All role briefings include: "Read CONTEXT.md if it exists. Use its vocabulary. If you encounter a term that contradicts the glossary or a concept that deserves a glossary entry, add it to a `## Domain flags` section at the end of your artifact. Do not edit CONTEXT.md."
- Domain-model bootstrap worker runs after spec: reads spec + codebase, creates CONTEXT.md and ADRs.
- Domain-model reconcile worker runs at project close: reads all artifacts' Domain flags sections, updates CONTEXT.md, creates ADRs for decisions that meet the three-criteria test (hard to reverse, surprising without context, result of a real trade-off).

### TDD integration in implement

The implement skill references the tdd skill. For each step:
1. Identify the seam under test (from the spec's Testing Decisions section).
2. Red: write a failing test at that seam.
3. Green: write the minimal code to pass.
4. Verify: run the test, confirm green.
5. Commit the test + implementation together.

Anti-patterns enforced: no implementation-coupled tests, no tautological assertions, no horizontal slicing (all tests first, then all code).

### Review smell baseline

The Standards axis always carries these 12 smells (Fowler, Refactoring ch.3) as labelled heuristics, never hard violations:

Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.

Documented repo standards override the baseline. Skip anything tooling already enforces.

## Testing Decisions

### What makes a good test
Tests verify behavior through public interfaces, not implementation details. A good test reads like a specification and survives refactors. Expected values come from an independent source of truth (known-good literal, worked example, spec), not recomputed the way the code does.

### Seams under test
The orchestrator extension is markdown files (skills, roles, playbook) plus one TypeScript file (index.ts) and one JSON schema. The seams are:

1. **Role briefing validity**: Each role briefing has valid YAML frontmatter (name, description, provider, thinking, workspace) and a body that references an existing skill path. Test: parse frontmatter, verify skill file exists.
2. **Skill self-consistency**: Each skill's artifact contract (path, format) matches what the playbook and downstream skills expect. Test: extract artifact paths from skills, verify the chain is connected (grill output → spec input → plan input → tickets input → implement input → review input).
3. **Playbook pipeline coherence**: The playbook's pipeline diagram, spawn commands, and phase descriptions reference only phases that have both a skill and a role briefing. Test: extract phase names from playbook, verify each has a skill + role.
4. **Worker output schema**: The schema validates known-good worker outputs and rejects malformed ones. Test: JSON schema validation with fixtures.
5. **Ticket frontmatter**: Ticket files parse correctly and blocking edges form a valid DAG (no cycles). Test: parse ticket directory, build dependency graph, assert acyclic.

### Prior art
The existing test approach is smoke-testing via `paseo run` (see `para/resources/lessons/smoke-testing-the-orchestrator.md`). The pipeline v2 test should follow the same pattern: spawn a worker with a trivial task, verify the artifact contract.

## Out of Scope

- **Paseo Desktop UI changes**: We use `paseo agent open` for direct access but don't modify Paseo itself.
- **Model change on running agents**: Paseo's `agent update` only supports name/labels. Model changes require spawning a new worker or using Desktop. We don't build a workaround.
- **Issue tracker integration**: The Matt Pocock skills reference GitHub/Linear issue trackers. We use filesystem artifacts only (PARA). No issue tracker publishing in v2.
- **Multi-repo orchestration**: The pipeline operates within a single repo. Cross-repo coordination is out of scope.
- **Automatic merge conflict resolution**: The integrate step merges branches but stops on conflicts and reports. Human resolves.
- **Explore skill removal**: Explore stays as an ad-hoc tool. We remove its role briefing from the pipeline but don't delete the skill.

## Further Notes

- The Matt Pocock skills (to-spec, to-tickets, tdd, domain-modeling, code-review) are the design source. We adapt them to the PARA artifact contract and Paseo worker model. Key adaptations: no issue tracker (filesystem instead), no interactive interview in spec (grill artifact is the input), workers are multi-turn via `paseo send` but artifacts are the primary communication channel.
- The pipeline is sequential up to tickets (grill → spec → domain-model → plan → tickets) and parallel from implement onward. The orchestrator's main loop complexity is in the implement-review phase: scan tickets, compute frontier, spawn, wait, review, repeat.
- CONTEXT.md lives at the repo root (not under para/) because it's a project-level glossary that all code references, not a PARA artifact. ADRs live in docs/adr/ per the domain-modeling skill convention.
- The worker-output-schema extension (adding `flags`) is backward-compatible: existing workers that don't emit `flags` still validate.
