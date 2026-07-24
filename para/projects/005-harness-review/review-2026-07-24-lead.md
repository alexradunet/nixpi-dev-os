---
phase: review
status: done
project: 005-harness-review
date: 2026-07-24
verdict: changes-requested
reviewer: lead (orchestrator session)
---

# Review: orchestration harness — lead findings

Companion to `review-2026-07-24-glm.md` (independent GLM-5.2 audit). Both
reviews are blind and complementary. Each finding below is tagged
`(also glm)` or `(lead only)` so the planner can merge without duplication.
Where GLM already cited a finding with a line reference, I cite the tag only.

## Verdict: CHANGES REQUESTED

I agree with GLM's verdict and its prioritization (headless gate + streaming
bugs first, standards split after). My unique contributions are finding 1
(signal-death masked as success) and finding 3 (the worker prompt-identity
conflict); GLM missed both. Everything else overlaps.

## Correctness & security findings

### [hard] `index.ts:407-409` — signal-killed worker is reported as success (lead only)

```ts
proc.on("close", (code) => {
    if (buffer.trim()) processLine(buffer);
    resolve(code ?? 0);
});
```

The `close` event signature is `(code: number | null, signal: NodeJS.Signals | null)`.
When a subprocess dies by a signal (OOM killer, external `pkill`, SIGSEGV),
`code` is `null`, so `code ?? 0` resolves `0` and `isFailedResult`
(`index.ts:165`) returns false: a dead worker is rendered with a green check
and `(no output)`. The intentional-abort path is covered by `wasAborted`
(`index.ts:430`), but any *other* signal death is silently masked as success.

Fix: capture the second arg; treat a non-null `signal` as failure, e.g. set
`stopReason = "error"` (or `"aborted"`) and `errorMessage = \`worker killed by ${signal}\``
before resolving non-zero. GLM caught the adjacent discarded-spawn-error bug
at `:412` but not this one.

### [hard] `index.ts:540` — headless project-agent gate fails open (also glm #1)

Agree fully with GLM. Trust boundary that evaporates without a UI is not a
trust boundary, and this box runs paseo (a non-interactive daemon) so "no UI"
is a normal runtime, not an edge case. Fail closed.

### [judgement] `index.ts:488` — every worker is told it is the orchestrator (lead only)

`before_agent_start` (playbook injection) and `resources_discover` (skill
serving) are registered *before* the `NIXPI_WORKER` gate at `index.ts:494`.
So every spawned worker receives the full 243-line playbook, whose first line
is "You are the lead agent (the orchestrator)," *and* its role prompt ("You
are an implement worker"). The identities conflict, and the tokens are paid
on every spawn.

The injection is not accidental: the roles explicitly say "match the repo
conventions and code standards in the orchestration playbook," so workers need
the standards half. Options, simplest first:
- (a) Accept it. Recency makes the role prompt win; no observed confusion yet.
- (b) Gate the full playbook on `NIXPI_WORKER != 1`; inline the Code/Writing
  standards into each role (or serve them as a standalone skill workers read).
- (c) Inject a standards-only excerpt for workers.

Recommend (a) until a worker demonstrably acts confused, then (b). Not a bug;
a cost/clarity call. GLM did not raise it.

## Standards findings

### [hard] `index.ts` 1053 lines; giant functions; three `any` (also glm)

Agree with GLM's split proposal (`spawn.ts` / `render.ts` / `format.ts` /
`index.ts` entrypoint) and the `renderResultRow` extraction that collapses the
three near-identical single/chain/parallel branches. `any` at `:87`, `:217`,
`:361` — type the theme color from `pi-tui`, `DisplayItem.args` →
`Record<string, unknown>`, `event` → discriminated union or narrowed
`Record<string, unknown>`.

### [hard] No test suite (also glm #5)

Agree. The pure helpers (`mapWithConcurrencyLimit`, `truncateParallelOutput`,
`isFailedResult`, `getResultOutput`, `getFinalOutput`, `formatTokens`) are
unit-testable without spawning pi. The streaming rewrite (finding 4 below) and
the signal-death fix (finding 1 above) both want regression tests; add the
suite as part of the fix, not after.

### [hard] `agents.ts:132` dead `formatAgentList` (also glm #8)

Agree. Delete it, or wire it into the two inline "Available agents" listings
(`index.ts:516`, `:688`) that hand-roll the same string.

## Consistency / doc-drift

### [hard] `AGENTS.md` "When the user says go" step 3 is stale (also glm #9)

Agree. The per-call `model` override (project 004) makes "edit the role file
before delegating" wrong. Update to "pass `model` in the task; the role's
frontmatter is the default."

## NixOS notes

### [judgement] `configuration.nix:97` passwordless sudo for wheel (also glm)

Agree. Key-only SSH + `wheelNeedsPassword = false` means a leaked key yields
passwordless root. Deliberate dev convenience; document it as a decision in
the README security section rather than leaving it implicit.

### [judgement] activation script leaves stale symlinks (also glm)

Agree, and note the repo already recorded this bite in
`para/resources/lessons/stale-global-symlinks-after-rename.md` without
patching the script. Add a prune pass.

### [judgement] `flake.nix` `nixConfig.extra-substituters` may silently not apply (lead only)

Extra substituters and trusted keys from a flake's `nixConfig` are ignored
unless the invoking user is a `trusted-user` or accepts them at build time.
The numtide cache may not be active in practice. Either add the user to
`nix.settings.trusted-users` or document that the cache requires acceptance.
GLM did not raise this.

## What's good (corroborates GLM)

Concurrency limiter, SIGTERM→SIGKILL escalation, nesting guard, output
truncation preserving full output in details, `0o600` prompt temp file with
`finally` cleanup, no shell injection (`shell: false`, argv array), the
exemplary `thinking`-validation error message, SSH hardening, and clean
role/skill separation with no methodology duplication.

## Summary

Two reviews converge on the same verdict and the same two themes: the
headless trust path and the streaming subprocess path. My signal-death finding
(`:407-409`) belongs in the streaming theme and should be fixed alongside
GLM's spawn-error (`:412`) and multibyte (`:397`) findings. The worker
prompt-identity conflict (`:488`) is the only genuinely new architectural
call, and it can wait. Confidence is high on the hard findings; both reviews
cite every finding to a verified line.
