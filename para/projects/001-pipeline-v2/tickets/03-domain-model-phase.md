---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 03
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 03: domain-model phase — skill + role briefing

## What to build

Make the `domain-model` phase spawnable end to end. A domain-model worker owns the
project glossary (`CONTEXT.md` at repo root) and the ADRs (`docs/adr/`), running in one
of two modes passed in the prompt: `bootstrap` (after spec, create the initial glossary
and ADRs) or `reconcile` (at project close, merge flagged terms from every artifact).
This ticket creates the `domain-model` skill and the `domain-model` role briefing. After
this ticket, the contract test's `role domain-model` block and the `domain-model` entry
of the skill-dir block pass.

## Acceptance criteria

- [ ] `pi/orchestrator/skills/domain-model/SKILL.md` exists; first line is `---`; frontmatter has `name: domain-model`, a colon-free `description`, `disable-model-invocation: true`, `argument-hint`.
- [ ] The skill body documents both modes (bootstrap, reconcile), the CONTEXT.md glossary format, the ADR format, the lazy-creation rule, and Constraints (may create/edit `CONTEXT.md` and `docs/adr/` only).
- [ ] `pi/orchestrator/roles/domain-model.md` exists with frontmatter `name`, `description`, `provider: pi/qwen-token-plan/qwen3.8-max-preview`, `thinking: medium`, `workspace: current`; body references `skills/domain-model/SKILL.md`, carries the flat-spawn prohibition verbatim, ends with the philosophy/standards line.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role domain-model` block passes and the skill-dir block passes for `domain-model`; no previously-green block regressed.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message.

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan steps to execute (in full)

### Step 4: Create `skills/domain-model/SKILL.md`

Frontmatter: `name: domain-model`; colon-free `description` (e.g. "Bootstrap or
reconcile the project domain model: CONTEXT.md glossary and docs/adr/ decisions. Two
modes, bootstrap and reconcile, passed in the prompt."); `disable-model-invocation: true`;
`argument-hint: "bootstrap or reconcile?"`.

Body:

- **Modes**: `bootstrap` (after spec — read spec + codebase, create the initial
  glossary and any ADRs that meet the three-criteria test) and `reconcile` (at project
  close — read every artifact's `## Domain flags` section, merge flagged terms into
  `CONTEXT.md`, create ADRs for decisions that meet the test). The prompt tells the
  worker which mode.
- **File structure**: single context — `CONTEXT.md` at repo root + `docs/adr/`. Create
  both **lazily** (only when there is something to write). If `CONTEXT-MAP.md` exists,
  the repo has multiple contexts; infer which applies, ask if unclear.
- **CONTEXT.md format** and **ADR format**: inline the formats from "Design source →
  Domain-model formats" below (glossary only, no implementation details; `_Avoid_`
  synonyms; ADR = one paragraph, three-criteria gate, sequential numbering).
- **Discipline**: challenge terms against the glossary; sharpen fuzzy/overloaded terms;
  cross-reference code and surface contradictions; update `CONTEXT.md` inline as terms
  resolve (bootstrap/reconcile only — other phases flag, they do not edit).
- **Artifact**: bootstrap/reconcile write `CONTEXT.md` and `docs/adr/*.md` directly
  (these are the artifacts). The worker still reports via the output schema; set
  `artifact_path` to the repo-root `CONTEXT.md`.
- **Constraints**: may create/edit `CONTEXT.md` and `docs/adr/` only; never edit source
  code; never touch `para/` artifacts.

**Verify**: `test -f pi/orchestrator/skills/domain-model/SKILL.md` → exists.
`node --test "pi/orchestrator/*.test.ts"` → skill-dir block passes for `domain-model`.

### Step 12 (domain-model role only): Create `roles/domain-model.md`

Create it with the exact frontmatter shape below (colon-free `description`,
`provider: pi/qwen-token-plan/qwen3.8-max-preview`). The body: state the one job, point
at the skill by absolute path, include the flat-spawn prohibition verbatim, end with the
philosophy/standards line.

- `roles/domain-model.md` — `thinking: medium`, `workspace: current`. Body: "You are a
  domain-model worker. Read and FULLY follow
  `~/.pi/agent/extensions/orchestrator/skills/domain-model/SKILL.md`. Run in the mode
  given in this prompt (bootstrap or reconcile). Edit only CONTEXT.md and docs/adr/."

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role domain-model` block passes.

---

## Design source (inlined — you have not read the spec)

**Domain-model formats**: `CONTEXT.md` at repo root is a **glossary and nothing else**
(no implementation details). Format: `# {Context Name}`, one-two sentence purpose,
`## Language`, then per term `**Term**:` + one-two sentence definition +
`_Avoid_: {synonyms}`. Be opinionated (pick one word, list others under _Avoid_); only
project-specific terms (no general programming concepts). ADRs live in
`docs/adr/NNNN-slug.md`, sequential numbering, a single paragraph (context + decision +
why); create an ADR only when **all three** hold: hard to reverse, surprising without
context, result of a real trade-off. Create both files **lazily**.

## Skill shape (match exactly)

YAML frontmatter with `name`, `description`, `disable-model-invocation: true`,
`argument-hint`; then prose sections (here: **Modes**, **File structure**, **CONTEXT.md
format**, **ADR format**, **Discipline**, **Artifact**, **Constraints**). Keep
`disable-model-invocation: true`.

## Role briefing shape (match exactly)

YAML frontmatter (`name`, `description`, `provider`, `thinking`, `workspace`), then a
body that (a) states the worker's one job, (b) points at the skill by the stable
absolute path `~/.pi/agent/extensions/orchestrator/skills/domain-model/SKILL.md`,
(c) carries the flat-spawn prohibition verbatim ("You are a worker. Never run
`paseo run` or `paseo send`, and never create agents. Spawn power belongs to the
orchestrator alone."), (d) ends with the philosophy/standards line. Keep the role
`description` colon-free (or double-quote it) — the contract test enforces this.

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
  `feat(orchestrator): add domain-model skill and role`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/domain-model/SKILL.md` and
`pi/orchestrator/roles/domain-model.md`. `pi/orchestrator/index.ts` must NOT change. If
you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the layout doesn't match (drift); `index.ts` appears to need a
change; a verification fails twice after a reasonable fix; the fix requires an
out-of-scope file; identity checks fail. If `thinking: medium` is later rejected at
spawn, that surfaces in the verification ticket — report it, do not guess.
