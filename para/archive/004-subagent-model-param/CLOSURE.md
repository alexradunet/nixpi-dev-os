---
project: 004-subagent-model-param
closed: 2026-07-24
status: complete
---

# Closure: Per-call model override for the subagent tool

## What was built

The `subagent` tool now accepts an optional `model` override on every call shape:
`SubagentParams.model` (single), `TaskItem.model` (parallel), and
`ChainItem.model` (chain). It is threaded through `runSingleAgent` as
`override?.trim() || agent.model`, pushed to `pi --model` only when truthy, and
recorded in the result's `model` field. The override is pure pass-through (no
validation, enumeration, or state); a bad value is forwarded unchanged and the
provider rejects it. This removes the need to edit a role's frontmatter to vary a
worker's model, enabling a mixed-model reviewer panel as one parallel call.

## What was distilled

- `resources/lessons/pi-bad-model-passthrough.md` — pi does not reject bad model
  ids at process level; it forwards them as custom ids and the provider 404s,
  surfacing as `result.isError=true`, not a non-zero exit.
- `resources/lessons/smoke-testing-the-orchestrator.md` — load worktree code with
  `-e ... --no-extensions` (the global symlink points at the main checkout), and
  strip `NIXPI_WORKER`/`NIXPI_SKILLS_DIR` from child pi processes so the tool
  registers; fixture in a temp dir, not the worktree.
- `resources/subagent-orchestration.md` — gained a "Per-call model override"
  section during implementation (precedence, pass-through, `pi --list-models`).

## What was left behind

- The grill's design decisions (override is the core, discovery kept manual;
  param in all three modes; precedence; pass-through; empty = no override) live
  in the archived `grill-2026-07-24.md`, not a separate `areas/` log (YAGNI; no
  ongoing area warranted). The living architecture is in
  `resources/subagent-orchestration.md`.
- Ruled out by the grill and not built: a "list models" tool/mode, model aliases,
  per-model thinking defaults, and persisted model defaults. Discovery stays
  `pi --list-models` by hand.
- The plan's Step 7 prediction (bad model → non-zero exit, read top-level
  `isError`) was wrong for this pi version; the lead accepted the step as
  satisfied (design intent met) and treated it as a plan-prediction defect. The
  behavior is captured in `pi-bad-model-passthrough.md`.
- Review was APPROVED-WITH-NITS; the single nit (tool-description wording) was
  fixed and aligned with the docs before merge.
