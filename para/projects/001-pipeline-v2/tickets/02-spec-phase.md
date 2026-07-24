---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 02
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 02: spec phase — skill + role briefing

## What to build

Make the `spec` phase spawnable end to end. A spec worker reads the grill artifact and
the codebase and synthesizes a full spec (problem, solution, user stories,
implementation decisions, testing seams) without re-interviewing the user. This ticket
creates the `spec` skill and the `spec` role briefing that points at it. After this
ticket, the contract test's `role spec` block and the `spec` entry of the skill-dir
block pass.

## Acceptance criteria

- [ ] `pi/orchestrator/skills/spec/SKILL.md` exists; first line is `---`; frontmatter has `name: spec`, a colon-free `description`, `disable-model-invocation: true`, and an `argument-hint`.
- [ ] The skill body has Protocol, Context, Artifact (with a `**Path:**` line and fenced format block), Domain flags, and Constraints sections.
- [ ] `pi/orchestrator/roles/spec.md` exists with frontmatter `name`, `description`, `provider: pi/qwen-token-plan/qwen3.8-max-preview`, `thinking: high`, `workspace: current`; body references `skills/spec/SKILL.md`, carries the flat-spawn prohibition verbatim, and ends with the philosophy/standards line.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role spec` block passes and the skill-dir block now passes for `spec`; no previously-green block regressed.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test (provides the contract test this ticket flips green).

---

## Plan steps to execute (in full)

### Step 3: Create `skills/spec/SKILL.md`

Frontmatter: `name: spec`; a colon-free `description` (e.g. "Synthesize the grill
artifact and codebase into a full spec: problem, solution, user stories, implementation
decisions, testing seams. Read-only on source; writes only the spec artifact.");
`disable-model-invocation: true`; `argument-hint: "Which grill artifact should I turn into a spec?"`.

Body sections (match the grill skill's shape):

- **Protocol**: (1) read the grill artifact at `para/projects/{project-id}/grill-*.md`
  and the repo (`AGENTS.md`, `CONTEXT.md` if present, `para/areas/`); use the domain
  glossary vocabulary and respect ADRs; (2) **do not interview** — the grill already
  did; synthesize what is decided; (3) sketch the test seams, prefer existing seams,
  use the highest seam possible, ideal is one; (4) write the spec; (5) if the user must
  confirm the seams, report `blocked` with the proposed seams listed (workers are
  multi-turn; the orchestrator relays the confirmation).
- **Context**: read grill artifact + codebase; a tradeoff already recorded in the grill
  artifact or an area doc is settled, not a question.
- **Artifact**: `**Path:** para/projects/{NNN}-{slug}/spec.md`, then a fenced format
  block with frontmatter (`phase: spec`, `status: done | blocked`, `project`, `date`)
  and the seven sections inlined in "Design source → Spec template" below.
- **Domain flags**: instruct: if a term contradicts `CONTEXT.md` or a concept deserves a
  glossary entry, add a `## Domain flags` section at the end of the spec; **do not edit
  `CONTEXT.md`**.
- **Constraints**: read-only on source; the only file written is the spec artifact;
  never reproduce secrets.

**Verify**: `test -f pi/orchestrator/skills/spec/SKILL.md && head -1 pi/orchestrator/skills/spec/SKILL.md`
→ file exists, first line is `---`. `node --test "pi/orchestrator/*.test.ts"` → the
`every spawnable phase has a skill directory` block now passes for `spec`.

### Step 12 (spec role only): Create `roles/spec.md`

Create it with the exact frontmatter shape below (colon-free `description`,
`provider: pi/qwen-token-plan/qwen3.8-max-preview`). The body: state the one job, point
at the skill by absolute path, include the flat-spawn prohibition verbatim, end with the
philosophy/standards line.

- `roles/spec.md` — `thinking: high`, `workspace: current`. Body: "You are a spec
  worker. Read and FULLY follow `~/.pi/agent/extensions/orchestrator/skills/spec/SKILL.md`.
  Synthesize the grill artifact + codebase into a spec; do not re-interview; propose test
  seams and report `blocked` if the user must confirm them. Read-only on source; write
  only the spec artifact."

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role spec` block passes.

---

## Design source (inlined — you have not read the spec)

**Spec template** (the seven sections the skill's Artifact format block must contain):
`## Problem Statement`, `## Solution`, `## User Stories` (a LONG numbered list, each
`As an <actor>, I want <feature>, so that <benefit>`), `## Implementation Decisions`
(modules, interfaces, schema changes, API contracts, architectural decisions — **no
specific file paths or code snippets**, they go stale), `## Testing Decisions` (what
makes a good test = test external behavior not implementation details; which seams;
prior art), `## Out of Scope`, `## Further Notes`. The skill synthesizes the grill
artifact + codebase; it does **not** interview (the grill already did). It proposes test
seams and reports `blocked` if the user must confirm them.

## Skill shape (match exactly)

YAML frontmatter with `name`, `description`, `disable-model-invocation: true`,
`argument-hint`; then prose sections **Protocol**, **Context**, **Artifact** (with a
`**Path:**` line and a fenced markdown format block), **Constraints**. Keep
`disable-model-invocation: true`.

## Role briefing shape (match exactly)

YAML frontmatter (`name`, `description`, `provider`, `thinking`, `workspace`), then a
body that (a) states the worker's one job, (b) points at the skill by the stable
absolute path `~/.pi/agent/extensions/orchestrator/skills/spec/SKILL.md`, (c) carries
the flat-spawn prohibition verbatim ("You are a worker. Never run `paseo run` or
`paseo send`, and never create agents. Spawn power belongs to the orchestrator alone."),
(d) ends with the philosophy/standards line. Keep the role `description` colon-free (or
double-quote it) — the contract test enforces this.

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/`
If `skills/grill/SKILL.md` (the shape exemplar) changed since the plan, compare before
proceeding; on a mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...` — never the
`~/.pi/...` symlink (that absolute path appears only *inside* the role briefing body).

### Repo conventions
- **YAML frontmatter is strict**: keep role `description` values free of `: `, or
  double-quote them. The contract test enforces this.
- Prose obeys the playbook's Writing standards (in `AGENTS.md`): cut filler, no clichés,
  active voice, concrete.

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): add spec skill and role`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/spec/SKILL.md` and `pi/orchestrator/roles/spec.md`.
`pi/orchestrator/index.ts` must NOT change. If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the grill skill shape doesn't match (drift); `index.ts` appears to
need a change; a verification fails twice after a reasonable fix; the fix requires an
out-of-scope file; identity checks fail.
