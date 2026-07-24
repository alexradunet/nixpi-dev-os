# Lesson: blind multi-model reviews complement each other

From project `005-harness-review` (2026-07-24).

## What happened

The harness got two independent code reviews run blind: GLM-5.2 (spawned
worker) and the lead orchestrator (in-session). They converged on the verdict
and the priority order, but neither was complete alone. GLM caught what the
lead missed: the task leaking via `ps` argv, multibyte UTF-8 corruption at
chunk boundaries, discarded spawn errors, a dead exported function, and the
absence of any test suite. The lead caught what GLM missed: a signal-killed
worker reported as success (`code ?? 0` on a null exit code) and the
worker-told-it's-the-orchestrator prompt-identity conflict. The merged finding
set was strictly larger than either review.

## The rule

For an audit, run two or more reviews blind and merge them:

- Blind means an empty project folder and no anchoring — the second reviewer
  must not read the first's findings before writing its own. Independence is
  what produces the non-overlapping catches.
- Use different models, ideally different providers (per the model-registry
  note on reducing correlated blind spots).
- Tag each finding `(also X)` / `(Y only)` during the merge so the planner can
  dedupe without losing the unique catches.

This empirically validates the registry's "alternative perspective for reviews"
rationale. A single reviewer, however thorough, has a blind-spot distribution;
two blind reviewers' blind spots barely overlap.
