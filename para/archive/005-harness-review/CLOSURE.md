---
project: 005-harness-review
closed: 2026-07-24
status: complete
---

# Closure: Harden the orchestration harness

## What was built

Two blind reviews (GLM-5.2 worker + lead orchestrator) of the pi orchestrator
extension and NixOS config converged on one security gap (the headless
project-agent gate failing open) and three streaming correctness bugs
(signal-killed workers reported as success, discarded spawn errors, multibyte
UTF-8 corruption at chunk boundaries), plus standards debt (a 1053-line
`index.ts`, three `any`, dead code, no tests). All were fixed and verified:
the gate fails closed, dead workers report a reason, streaming is
encoding-safe, the task is off `ps` argv, the file is split into modules all
under 500 lines, and a 49-test headless suite guards the pure logic. Reviewed
APPROVED with no hard findings, merged to `main` (`eb02491`), and deployed
(system generation 41).

## What was distilled

- `para/resources/lessons/budget-tier-stalls-on-large-refactors.md` — budget
  tier failed the 1053-line split (sed/byte-manipulation, trusted
  `node --check`); mid tier + an incremental runtime-verified protocol
  finished it.
- `para/resources/lessons/node-test-directory-form-broken.md` — `node --test
  <dir>` is broken on Node 24; use the quoted-glob form.
- `para/resources/lessons/blind-panel-reviews-complement.md` — the two blind
  reviews' catches barely overlapped; merge them for a strictly larger finding
  set.
- `para/resources/lessons/check-main-before-reverting-temp-edits.md` — the
  user committed a "temporary" role edit and advanced `main` in parallel;
  check before reverting and before merging.
- `para/resources/subagent-orchestration.md` — updated for the module split,
  the fail-closed gate, `@file` task delivery, the test command, and the
  pure-seam invariant.

## What was left behind

- Four non-blocking review nits (11 `as any` in `core.test.ts`, two cosmetic
  single-expanded render lines, stray blank lines in `core.ts`, a 67-line
  `formatToolCall`) — not worth a dedicated project; fix opportunistically.
- Deferred design calls, recorded in the plan's Deferred section: the
  worker-told-it's-the-orchestrator prompt-identity conflict (accept until a
  worker acts confused), abort discarding partial results, root-walking agent
  discovery, and strict-fail frontmatter parsing. Revisit only if they bite.
