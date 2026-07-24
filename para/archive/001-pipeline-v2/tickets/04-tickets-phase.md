---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 04
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 04: tickets phase — skill + role briefing

## What to build

Make the `tickets` phase spawnable end to end. A tickets worker reads the plan artifact
and breaks it into vertical tracer-bullet tickets — one file per ticket, numbered in
dependency order, each with blocking edges, acceptance criteria, and frontmatter that
carries its own state (the state machine the orchestrator reads to compute the frontier).
It quizzes the user on granularity and flags shared blast radius. This ticket creates
the `tickets` skill and the `tickets` role briefing. After this ticket, the contract
test's `role tickets` block and the `tickets` entry of the skill-dir block pass.

## Acceptance criteria

- [ ] `pi/orchestrator/skills/tickets/SKILL.md` exists; first line is `---`; frontmatter has `name: tickets`, a colon-free `description`, `disable-model-invocation: true`, `argument-hint`.
- [ ] The skill body has Protocol, Artifact (with the exact ticket file format below), Domain flags, and Constraints sections.
- [ ] The Artifact section reproduces the ticket file frontmatter and body format EXACTLY (phase, status, project, ticket, blocked-by, worker, branch, shared-blast-radius).
- [ ] `pi/orchestrator/roles/tickets.md` exists with frontmatter `name`, `description`, `provider: pi/qwen-token-plan/qwen3.8-max-preview`, `thinking: high`, `workspace: current`; body references `skills/tickets/SKILL.md`, carries the flat-spawn prohibition verbatim, ends with the philosophy/standards line.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role tickets` block passes and the skill-dir block passes for `tickets`; no previously-green block regressed.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan steps to execute (in full)

### Step 5: Create `skills/tickets/SKILL.md`

Frontmatter: `name: tickets`; colon-free `description` (e.g. "Break the plan into
tracer-bullet tickets with blocking edges and acceptance criteria, one file per ticket.
Flags shared blast radius. Read-only on source."); `disable-model-invocation: true`;
`argument-hint: "Which plan should I break into tickets?"`.

Body:

- **Protocol**: (1) read the plan artifact `para/projects/{project-id}/plan-*.md` (and
  the spec it came from); (2) use glossary vocabulary, respect ADRs; (3) draft vertical
  tracer-bullet slices (rules inlined in "Design source → Ticket format" below); wide
  refactors are expand→migrate→contract, not vertical slices; (4) **quiz the user** on
  granularity and blocking edges via the orchestrator relay — report `blocked` with the
  proposed numbered breakdown until approved; (5) write one file per ticket under
  `para/projects/{project-id}/tickets/`, numbered from `01` in dependency order; (6) set
  `shared-blast-radius: true` on every ticket when multiple tickets touch the same files.
- **Artifact**: `**Path:** para/projects/{NNN}-{slug}/tickets/` (a directory; the worker
  reports this directory as `artifact_path`). Then the ticket file format, **exactly**:

  ````markdown
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
  ````

- **Domain flags**: same flag-don't-edit instruction as the spec skill (if a term
  contradicts `CONTEXT.md` or a concept deserves a glossary entry, add a `## Domain flags`
  section at the end of the artifact; do not edit `CONTEXT.md`).
- **Constraints**: read-only on source; writes only files under the project's
  `tickets/` dir; never reproduce secrets.

**Verify**: `test -f pi/orchestrator/skills/tickets/SKILL.md` → exists.
`node --test "pi/orchestrator/*.test.ts"` → skill-dir block passes for `tickets`.

### Step 12 (tickets role only): Create `roles/tickets.md`

Create it with the exact frontmatter shape below (colon-free `description`,
`provider: pi/qwen-token-plan/qwen3.8-max-preview`). The body: state the one job, point
at the skill by absolute path, include the flat-spawn prohibition verbatim, end with the
philosophy/standards line.

- `roles/tickets.md` — `thinking: high`, `workspace: current`. Body: "You are a tickets
  worker. Read and FULLY follow
  `~/.pi/agent/extensions/orchestrator/skills/tickets/SKILL.md`. Break the plan into
  tracer-bullet tickets; quiz the user on granularity and blocking edges (report
  `blocked` until approved); flag shared blast radius. Read-only on source; write only
  ticket files."

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role tickets` block passes.

---

## Design source (inlined — you have not read the spec)

**Ticket format**: one file per ticket, numbered from `01` in dependency order (blockers
first). Each ticket is a tracer-bullet **vertical** slice (narrow but complete path
through every layer; demoable/verifiable alone; sized to one fresh context window). Wide
refactors are the exception: sequence as **expand → migrate (in batches) → contract**,
not a vertical slice. The skill quizzes the user on granularity and blocking edges, and
flags shared blast radius. The ticket file frontmatter and body are fixed by the spec
(reproduced in Step 5 above).

## Skill shape (match exactly)

YAML frontmatter with `name`, `description`, `disable-model-invocation: true`,
`argument-hint`; then prose sections **Protocol**, **Artifact** (with a `**Path:**` line
and a fenced markdown format block), **Domain flags**, **Constraints**. Keep
`disable-model-invocation: true`.

## Role briefing shape (match exactly)

YAML frontmatter (`name`, `description`, `provider`, `thinking`, `workspace`), then a
body that (a) states the worker's one job, (b) points at the skill by the stable
absolute path `~/.pi/agent/extensions/orchestrator/skills/tickets/SKILL.md`, (c) carries
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
If the skills layout changed since the plan, compare before proceeding; on a mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...` — never the
`~/.pi/...` symlink (that absolute path appears only *inside* the role briefing body).

### Repo conventions
- **YAML frontmatter is strict**: keep role `description` values free of `: `, or
  double-quote them. The contract test enforces this.
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `feat(orchestrator): add tickets skill and role`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/tickets/SKILL.md` and
`pi/orchestrator/roles/tickets.md`. `pi/orchestrator/index.ts` must NOT change. If you
believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the layout doesn't match (drift); `index.ts` appears to need a
change; a verification fails twice after a reasonable fix; the fix requires an
out-of-scope file; identity checks fail.
