---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 08
blocked-by: [01]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 08: review phase — two-mode review skill + review-standards/review-feature roles, retire old roles

## What to build

Split review into two modes served by a single `review` skill, and make both spawnable.
**Standards mode** (per ticket) reviews a ticket diff against repo conventions plus a
fixed 12-smell baseline. **Feature mode** (per feature) runs Standards and Spec as two
separate axes that are never merged or reranked. This ticket rewrites the `review` skill
around the two modes, creates the `review-standards` and `review-feature` role
briefings, and deletes the old `roles/review.md` and `roles/explore.md`. After this
ticket, the contract test's `role review-standards` and `role review-feature` blocks
pass. (The `roles/ directory is exactly the spawnable set` block goes fully green only
once every role ticket has merged — it needs all seven roles present and review/explore
deleted.)

## Acceptance criteria

- [ ] `skills/review/SKILL.md` is rewritten around two prompt-selected modes (standards, feature); frontmatter keeps `name: review`, `disable-model-invocation: true`, and a `description` mentioning both modes (colon-free or double-quoted).
- [ ] Standards mode inlines all 12 Fowler smells as labelled heuristics (never hard violations); repo standards override the baseline; skip what tooling enforces; cite `file:line` for every finding; artifact `para/projects/{project-id}/tickets/NN-slug-review.md` with `verdict: approved | changes-requested`.
- [ ] Feature mode runs `## Standards` and `## Spec` as separate sections, never merged/reranked; the Spec axis quotes the spec line per finding; artifact `para/projects/{project-id}/review-{YYYY-MM-DD}.md`; ends with per-axis finding counts and worst issue per axis (no cross-axis winner).
- [ ] `roles/review-standards.md` exists: `thinking: medium`, `workspace: worktree`, references `skills/review/SKILL.md` in standards mode, flat-spawn prohibition verbatim, philosophy/standards line.
- [ ] `roles/review-feature.md` exists: `thinking: high`, `workspace: worktree`, references `skills/review/SKILL.md` in feature mode, flat-spawn prohibition verbatim, philosophy/standards line.
- [ ] `roles/review.md` and `roles/explore.md` are deleted (`git rm`).
- [ ] `grep -c "Mysterious Name\|Refused Bequest\|## Spec\|standards\|feature" pi/orchestrator/skills/review/SKILL.md` prints `5` or more.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `role review-standards` and `role review-feature` blocks pass; no previously-green block regressed.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message (e.g. `refactor(orchestrator): split review into standards + feature modes`).

## Blocked by

- Ticket 01: Foundation — worker-output-schema `flags` + pipeline-v2 contract test.

---

## Plan steps to execute (in full)

### Step 10: Modify `skills/review/SKILL.md` (two modes: standards + feature)

Rewrite the body around two modes selected by the prompt (keep the frontmatter `name:
review`, `disable-model-invocation: true`; update the `description` to mention the two
modes, colon-free or quoted):

- **Mode: standards** (per-ticket). Review the ticket's diff against repo conventions
  (`AGENTS.md`, `para/areas/`, `CONTRIBUTING.md`) **plus the smell baseline** — inline
  the 12 Fowler smells from "Design source → Review smell baseline" below as labelled
  heuristics (never hard violations). Rules: documented repo standards override the
  baseline; skip anything tooling enforces; distinguish hard violations from judgement
  calls; cite `file:line` for every finding. Artifact:
  `para/projects/{project-id}/tickets/NN-slug-review.md`, frontmatter `phase: review`,
  `status: done`, `ticket: {NN}`, `verdict: approved | changes-requested`.
- **Mode: feature** (per-feature, two-axis). Run **Standards** (as above) and **Spec**
  (does the code match `para/projects/{project-id}/spec.md`) as two separate sections,
  `## Standards` and `## Spec`, **never merged or reranked**. The Spec axis quotes the
  spec line for each finding (missing/partial requirement, scope creep, looks-implemented-but-wrong).
  Artifact: `para/projects/{project-id}/review-{YYYY-MM-DD}.md`, frontmatter `phase:
  review`, `status: done`, `project`, `verdict`. End with a one-line summary giving
  finding counts **per axis** and the worst issue within each axis (no single cross-axis winner).
- Keep the read-only Constraints.

**Verify**: `grep -c "Mysterious Name\|Refused Bequest\|## Spec\|standards\|feature" pi/orchestrator/skills/review/SKILL.md`
→ prints `5` or more. `node --test "pi/orchestrator/*.test.ts"` → no regression.

### Step 12 (review-standards role only): Create `roles/review-standards.md`

Create it with the exact frontmatter shape below (colon-free `description`,
`provider: pi/qwen-token-plan/qwen3.8-max-preview`). The body: state the one job, point
at the skill by absolute path, include the flat-spawn prohibition verbatim, end with the
philosophy/standards line.

- `roles/review-standards.md` — `thinking: medium`, `workspace: worktree`. Body: "You are
  a per-ticket standards review worker. Read and FULLY follow
  `~/.pi/agent/extensions/orchestrator/skills/review/SKILL.md` **in standards mode**.
  Review the ticket diff against repo conventions + the smell baseline; cite file:line;
  write only the ticket review artifact. Read-only on source."

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `role review-standards` block passes.

### Step 13 (review-feature role + deletions): Create `roles/review-feature.md`; delete old roles

- Create `roles/review-feature.md` — `thinking: high`, `workspace: worktree`. Body: "You
  are a per-feature two-axis review worker. Read and FULLY follow
  `~/.pi/agent/extensions/orchestrator/skills/review/SKILL.md` **in feature mode**. Run
  Standards and Spec as separate sections; never merge or rerank axes; quote the spec
  line for each Spec finding. Write only the feature review artifact. Read-only on source."
- Delete `roles/review.md` and `roles/explore.md`:
  `git rm pi/orchestrator/roles/review.md pi/orchestrator/roles/explore.md`.

**Verify**: `ls pi/orchestrator/roles/` no longer lists `review.md` or `explore.md`.
`node --test "pi/orchestrator/*.test.ts"` → the `role review-feature` block passes.

---

## Design source (inlined — you have not read the spec)

**Review smell baseline** (Standards axis): these 12 Fowler smells (Refactoring ch.3)
are **labelled heuristics, never hard violations**; documented repo standards override
them; skip anything tooling enforces. Mysterious Name, Duplicated Code, Feature Envy,
Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
Speculative Generality, Message Chains, Middle Man, Refused Bequest. Each reads *what it
is → how to fix*.

**Two-axis review** (feature mode): Standards axis (repo conventions + smell baseline)
and Spec axis (does the code match the spec) are reported under separate `## Standards`
and `## Spec` headings and are **never merged or reranked** — a change can pass one axis
and fail the other. The Spec axis quotes the spec line for each finding.

## Role briefing shape (match exactly)

YAML frontmatter (`name`, `description`, `provider`, `thinking`, `workspace`), then a
body that (a) states the worker's one job, (b) points at the skill by the stable
absolute path `~/.pi/agent/extensions/orchestrator/skills/review/SKILL.md`, (c) carries
the flat-spawn prohibition verbatim ("You are a worker. Never run `paseo run` or
`paseo send`, and never create agents. Spawn power belongs to the orchestrator alone."),
(d) ends with the philosophy/standards line. Keep each role `description` colon-free (or
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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/skills/review/ pi/orchestrator/roles/`
If the review skill or roles changed since the plan was written, compare before
proceeding; on a structural mismatch, STOP.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...` — never the
`~/.pi/...` symlink (that absolute path appears only *inside* the role briefing bodies).

### Repo conventions
- **YAML frontmatter is strict**: keep role `description` values free of `: `, or
  double-quote them. The contract test enforces this.
- Prose obeys the playbook's Writing standards (in `AGENTS.md`).

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `refactor(orchestrator): split review into standards + feature modes`). Commit and
  report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/skills/review/SKILL.md`, `pi/orchestrator/roles/review-standards.md`
(create), `pi/orchestrator/roles/review-feature.md` (create), and the deletions of
`pi/orchestrator/roles/review.md` and `pi/orchestrator/roles/explore.md`. Do NOT touch
`skills/explore/SKILL.md` (the explore *skill* stays as-is; only its role is removed).
`pi/orchestrator/index.ts` must NOT change. If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the review skill/roles structure doesn't match (drift); `index.ts`
appears to need a change; a verification fails twice after a reasonable fix; the fix
requires an out-of-scope file; identity checks fail. If `thinking: medium` for
review-standards is later rejected at spawn, that surfaces in the verification ticket —
report it, do not guess.
