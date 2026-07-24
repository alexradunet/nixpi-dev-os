---
phase: ticket
status: blocked
project: 001-pipeline-v2
ticket: 12
blocked-by: [02, 03, 04, 05, 06, 07, 08, 09, 10]
worker: ""
branch: ""
shared-blast-radius: false
---

# Ticket 12: playbook — rewrite AGENTS.md pipeline sections for the 10-phase pipeline

## What to build

Bring the orchestration playbook in line with the rebuilt pipeline. Edit only the
pipeline-related sections of `AGENTS.md` (the pipeline diagram, the Paseo-vs-in-session
table, the skills-and-roles section, the "when the user says go" spawn sequence plus the
new parallel implement orchestration loop, and the "what you never do" list); preserve
every other section verbatim. After this ticket, the contract test's `playbook names
every spawnable phase` block passes. This ticket runs only after every phase exists
(Tickets 02–10), so the playbook describes a pipeline that is actually present.

## Acceptance criteria

- [ ] "The pipeline" section shows the 10-phase diagram and the updated "not every project" list and spawnable/in-session sentence (seven spawned phases; grill/teach/janitor in-session; explore ad-hoc; tdd reference).
- [ ] "When to use Paseo vs in-session" table lists the seven spawned phases vs grill/teach/janitor/trivial fix.
- [ ] "Skills and roles" lists the new skills, matches the spawnable sentence, and adds the domain-model role-composition paragraph.
- [ ] "When the user says go" has the new per-phase spawn sequence (foreground for spec/domain-model/plan/tickets) plus a "Parallel implement orchestration loop" subsection (frontier scan, branching strategy, spawn/review/repeat, integrate, review-feature, domain-model-close).
- [ ] "What you never do" adds the two frontier rules.
- [ ] Every other section (Philosophy, Code standards, Writing standards, Response shape, PARA structure, etc.) is preserved verbatim.
- [ ] `node --test "pi/orchestrator/*.test.ts"` → the `playbook names every spawnable phase` block passes; no regression.
- [ ] `grep -c "review-feature\|review-standards\|domain-model\|tickets\|frontier" pi/orchestrator/AGENTS.md` prints `5` or more.
- [ ] `pi/orchestrator/index.ts` is NOT modified.
- [ ] Work committed with a conventional-commit message (e.g. `docs(orchestrator): rewrite playbook for 10-phase pipeline`).

## Blocked by

- Ticket 02: spec phase — skill + role briefing
- Ticket 03: domain-model phase — skill + role briefing
- Ticket 04: tickets phase — skill + role briefing
- Ticket 05: tdd reference skill
- Ticket 06: grill skill — absorb explore, add test seams + root-cause
- Ticket 07: plan phase — spec-aware planning (skill + role)
- Ticket 08: review phase — two-mode review skill + review-standards/review-feature roles, retire old roles
- Ticket 09: implement phase — TDD + ticket awareness (skill + role)
- Ticket 10: janitor skill — trigger domain-model reconcile before archiving

(The playbook must name only phases that actually exist, so it is authored last among
the prose tickets.)

---

## Plan step to execute (in full)

### Step 14: Rewrite the pipeline sections of `AGENTS.md` (targeted edits)

Edit only these sections; preserve every other section (Philosophy, Code standards,
Writing standards, Response shape, PARA structure, etc.) verbatim.

1. **"The pipeline"** — replace the diagram and the phase list with:

   ```
   grill (in-session, absorbs explore)
     → spec → domain-model → plan → tickets        (sequential, spawned, current checkout)
       → implement × N → review-standards × N      (parallel per ticket, spawned, worktrees)
         → integrate (conditional)                  (merge ticket branches; see orchestration loop)
           → review-feature (spawned, two-axis)
             → domain-model-close (spawned, reconcile mode)
   ```

   Replace the "Not every project follows the full pipeline" list:
   - New feature / heavy refactor: the full pipeline.
   - Bug: grill (with root-cause investigation) → spec → … (same downstream).
   - Trivial fix: fix in-session; no project folder, no spawn.
   - Audit / improvement: plan (audit mode) → implement → review-standards.
   - Learning: teach (in-session).

   Replace the spawnable/in-session sentence: "Spawnable phases (a role briefing exists
   in `roles/`): spec, domain-model, plan, tickets, implement, review-standards,
   review-feature. In-session phases: grill, teach, janitor. `explore` survives as an
   ad-hoc skill outside the pipeline (its role briefing was removed); `tdd` is a
   reference skill read by implement, never spawned."

2. **"When to use Paseo vs in-session"** table — replace rows so the spawnable column
   lists the seven spawned phases and the in-session column lists grill, teach, janitor,
   trivial fix.

3. **"Skills and roles"** — update the skills slash-command list to include the new
   skills, and the spawnable-phases sentence to match item 1. Add a paragraph: "Every
   role briefing composition includes the domain-model instruction: read `CONTEXT.md` if
   it exists, use its vocabulary, and add contradictory or new terms to a `## Domain
   flags` section in the artifact — never edit `CONTEXT.md`."

4. **"When the user says go"** — replace the per-phase spawn commands with the new
   sequence. Keep the model-recommendation + confirm gate and the `jq`-not-installed
   note. Foreground phases (spec, domain-model, plan, tickets) use the existing
   foreground `paseo run --wait-timeout 30m --output-schema ... --provider ... --thinking ...`
   form (inside a Paseo session omit `--workspace`; outside one resolve it as the
   existing "Edge case" section describes). Then add a new subsection:

   **"Parallel implement orchestration loop"** — the orchestrator, after tickets exist:
   1. Scan `para/projects/{NNN}/tickets/*.md`; parse each ticket's `status` and
      `blocked-by`. The **frontier** = tickets whose `status` is `ready` and whose
      blockers are all `done`.
   2. If any ticket has `shared-blast-radius: true`, create one integration branch
      `{NNN}-{slug}` and branch every ticket off it; otherwise branch each ticket off
      `main` as `{NNN}-{slug}/ticket-{NN}`.
   3. For each frontier ticket: create its worktree workspace, set `worker` and `branch`
      in the ticket frontmatter, set `status: in-progress`, and spawn an implement worker
      in the background (the existing implement spawn form). Update the ticket to
      `status: review` when its worker lands.
   4. For each ticket that reaches `review`: spawn a `review-standards` worker in that
      ticket's worktree. On `verdict: approved`, set the ticket `status: done`; on
      `changes-requested`, `paseo send` the fix list to the implement worker (do not
      spawn a new one) and re-review.
   5. Repeat 1–4 until every ticket is `done`.
   6. **Integrate**: if an integration branch was used, the final integrate-and-verify
      ticket (emitted by the tickets worker) merges and tests end-to-end. If independent
      branches were used, merge each ticket branch to `main` and run the suite; stop and
      report on conflict (human resolves).
   7. Spawn `review-feature` (two-axis) on the assembled feature, then `domain-model` in
      `reconcile` mode (domain-model-close).

5. **"What you never do"** — add: "Never spawn an implement worker for a ticket whose
   blockers are not all done. Never edit a ticket's frontmatter `status` by hand to skip
   the frontier — the frontier is computed from the files."

**Verify**: `node --test "pi/orchestrator/*.test.ts"` → the `playbook names every
spawnable phase` block passes. `grep -c "review-feature\|review-standards\|domain-model\|tickets\|frontier" pi/orchestrator/AGENTS.md` → prints `5` or more.

---

## Context (inlined — you have not read the spec)

The 10-phase pipeline: grill (in-session, absorbs explore) → spec → domain-model → plan
→ tickets → implement × N → review-standards × N → integrate (conditional) →
review-feature → domain-model-close. Spawnable phases (a role briefing exists): spec,
domain-model, plan, tickets, implement, review-standards, review-feature. In-session:
grill, teach, janitor. `explore` is ad-hoc (role removed); `tdd` is a reference skill
read by implement. `integrate` is a ticket (or an orchestrator merge), not a spawned
phase. The contract test requires the playbook to name every spawnable phase AND still
mention explore (ad-hoc).

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
`git diff --stat 77dc6db..HEAD -- pi/orchestrator/AGENTS.md`
If `AGENTS.md` changed since the plan was written, read the live file and make the
targeted section edits against its current content; if the named sections no longer
exist, treat it as a STOP condition.

### Paths
All paths are relative to the repo root and use `pi/orchestrator/...`.

### Repo conventions
- Prose obeys the playbook's own Writing standards (in `AGENTS.md`): cut filler, no
  clichés, active voice, concrete. This ticket edits that very prose — hold it to the
  standard it describes.

### Git workflow
- Branch: `001-pipeline-v2`. Conventional commits (e.g.
  `docs(orchestrator): rewrite playbook for 10-phase pipeline`). Commit and report only; never push/PR.

### Scope guard
Touch ONLY `pi/orchestrator/AGENTS.md`, and only the five named sections — preserve
every other section verbatim. `pi/orchestrator/index.ts` must NOT change (it reads
`AGENTS.md` dynamically). If you believe a code change is needed, STOP.

### STOP conditions
Stop and report if: the named `AGENTS.md` sections don't exist (drift); `index.ts`
appears to need a change; a verification fails twice after a reasonable fix; the fix
requires an out-of-scope file; identity checks fail.
