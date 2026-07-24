---
phase: review
status: done
project: 005-harness-review
date: 2026-07-24
verdict: approved
reviewer: impl-review worker (worktree 005-harness-review)
---

# Review: Harness Hardening implementation (WS1–WS5)

## Verdict: APPROVED

Reviewed `git diff 608f253..HEAD` (commits b72e3c2, 431aeff, 4695c64, b840f60,
64728f6, plus artifact commits ad259c7, e7af313) against the plan, the two
original audits, and the repo standards. Every original finding is fixed in
the code, not just claimed. I re-ran the regression suite (49/49 pass), the
load smoke (`ok`, exit 0), both nix checks (exit 0), and independently
re-ran the two live security smokes: the headless gate refuses with
`isError: true` and `details.results: []` (worker never spawned), and the
opt-out path delivers the task via `@file` (worker echoed `PING-42`, zero
temp dirs leaked). The WS1 fix is airtight within the designed threat model.
No hard findings. Four judgement-level notes, none blocking.

## Plan conformance

### WS1 — fail-closed headless gate: pass

- `decideProjectAgentGate` at `pi/orchestrator/core.ts:26-40` matches the
  plan's exact shape. Behavior table verified against the code: scope
  `"user"` or `confirmProjectAgents: false` proceeds (line 34); no
  project-sourced agent requested proceeds (line 37); `hasUI: false` with a
  requested project agent rejects (line 38); `hasUI: true` confirms (line 39).
- Wiring at `pi/orchestrator/index.ts:145-190`: `requestedAgentNames`
  collects from chain, tasks, and single (145-148); the gate runs before any
  mode dispatch, so the reject path (159-172) returns `isError: true` with
  the `Refused:` text before a worker can spawn. Confirmed live: my gate
  smoke returned `isError: true`, text `Refused: project-local agents
  (echoer) from /tmp/.../.pi/agents require confirmation ...`, and
  `details.results: []`.
- Name-shadowing is fail-closed: `discoverAgents` lets project agents
  override user agents by name (`agents.ts:119-122`), and the gate checks the
  resolved agent's `source`, so a repo agent cannot shadow a user agent name
  to slip past the headless gate.
- `ctx.hasUI` comes from pi's tool context, not the tool parameters, so the
  caller cannot spoof it; the only bypass is the explicit, documented
  `confirmProjectAgents: false` opt-out. Descriptions updated at
  `index.ts:75-77` (parameter) and `index.ts:106` (tool description), per plan.

### WS2 — streaming/subprocess correctness: pass

- Signal death: `runWorkerProcess` resolves raw close values
  (`spawn.ts:155-163`); `applyWorkerOutcome` maps them through
  `resolveExitOutcome` (`core.ts:86-92`, `spawn.ts:227-237`). `code === null`
  yields exitCode 1 with a message naming the signal; `isFailedResult`
  (`core.ts:143-145`) then reports failure. Spawn-error path also fails
  closed: if `close` races ahead of `error` with `(null, null)`, the
  "neither an exit code nor a signal" branch still returns exitCode 1.
- Spawn errors captured: `spawn.ts:160-162` keeps `err.message`;
  `applyWorkerOutcome` sets `Failed to spawn worker: ${err.message}`
  (`spawn.ts:229-232`), which flows through `getResultOutput`
  (`core.ts:147-152`).
- Encoding-safe streaming: stdout through `createLineSplit`
  (`core.ts:47-63`, wired at `spawn.ts:146-149`); stderr through its own
  `StringDecoder` (`spawn.ts:285-289`). Multibyte-across-chunks regression
  test at `core.test.ts:238-246`.
- Task off argv: `spawn.ts:284-292` writes `Task: ${task}` to a 0o600 temp
  file (shared mkdtemp dir with the prompt file, `spawn.ts:36-47`) and passes
  `@${taskFile.filePath}`. `grep 'args.push(`Task:'` over `pi/orchestrator/`
  returns nothing. Live smoke: worker received the task and echoed `PING-42`;
  the only `/tmp/pi-subagent-*` dir present belongs to the parent session
  (contains `prompt-review.md`, predates the smokes); both smokes left zero
  dirs. File modes verified: 0600 file, 0700 dir.
- Bounded stderr: `capStderr` (`core.ts:66-78`) keeps the tail, byte-aware
  cut, 64 KiB cap. Regression tests at `core.test.ts:272-301`.
- Abort-listener cleanup: `spawn.ts:124-127` removes the listener on close.
  One `removeEventListener` match, inside `wireAbort`.

### WS3 — tests: pass

- All required cases from steps 3.2/3.3 exist in `core.test.ts` (381 lines)
  and `format.test.ts` (79 lines): concurrency limiter (empty, order, cap,
  concurrency-0), `isFailedResult` (5 cases), `getResultOutput` (preference
  chain both directions), `getFinalOutput`, `truncateParallelOutput`
  (including the no-U+FFFD multibyte case), plus the four regression blocks
  mapping 1:1 to the fixes (`resolveExitOutcome`, `createLineSplit`,
  `capStderr`, `decideProjectAgentGate` including the fail-closed row).
- `node --test "pi/orchestrator/*.test.ts"`: 49 tests, 49 pass, 0 fail
  (re-run by me, Node v24.18.0).
- README test command deviates from the plan's `node --test pi/orchestrator/`
  to the quoted-glob form. Verified justified: the directory form exits 1
  with `Cannot find module '.../pi/orchestrator'` on this host's Node
  v24.18.0 (it resolves the dir as a module instead of globbing). The plan's
  literal done-criterion line cannot hold on this host; the documented
  command runs the full suite headlessly, which is the intent.

### WS4 — split, `any`, dead code: pass

- Five modules, all under 500 lines: `agents.ts` 135, `core.ts` 184,
  `core.test.ts` 381, `format.ts` 132, `format.test.ts` 79, `index.ts` 359,
  `render.ts` 271, `spawn.ts` 311.
- `grep -rn ": any\b\|<any>\| any;" pi/orchestrator/*.ts` returns nothing.
  The three original `any` are gone: `ThemeColor` union with provenance
  (`format.ts:11-16`), `Record<string, unknown>` (`format.ts:119`),
  `PiJsonEvent` with the vendored `tool_result_end` provenance comment
  (`spawn.ts:166-173`).
- `formatAgentList` reshaped to the one-line shape (`agents.ts:133-135`) and
  wired into both listing sites (`index.ts:131`, `index.ts:351`). The
  hand-rolled pattern survives only inside `formatAgentList`'s own body,
  which is the plan's prescribed implementation (deviation 6 confirmed). The
  unknown-agent error in `spawn.ts:80` keeps its distinct quoted-names shape
  per plan.
- Pure-seam invariant holds: `core.ts` and `format.ts` import only `node:`
  builtins at runtime (`core.ts:1`, `format.ts:8`); all pi imports are
  type-only. Proven empirically by the bare-node test run.
- Decomposition targets met: `runSingleAgent` 56 lines (`spawn.ts:256-311`,
  under the 60 target) split into `buildAgentArgs`, `wireAbort`,
  `runWorkerProcess`, `processWorkerLine`, `applyWorkerOutcome`,
  `cleanupTempFiles`; `renderResult` dispatcher ~20 lines (`render.ts:253+`);
  no render function over 54 lines (`renderParallelResult`).
- `renderResultRow` is genuinely shared: definition at `render.ts:72-95`,
  called by all three expanded bodies (`render.ts:103`, `:131`, `:172`). I
  diffed the new renderers line-by-line against the original `renderResult`
  (608f253 `index.ts:782-1051`): collapsed views, chain/parallel expanded
  views, icons, `(Ctrl+O to expand)` hints, and the parallel running state
  are byte-identical. `renderCall` is a verbatim move.

### WS5 — docs & NixOS: pass

- AGENTS.md step 3 rewritten (`pi/orchestrator/AGENTS.md:187`); `grep "edit
  the role file"` returns nothing.
- Symlink prune pass at `nixos/configuration.nix:162-168`, before the link
  loop, removes only broken symlinks, with the lesson-file provenance
  comment. Empty-dir glob is a safe no-op (`[ -L ]` fails on the literal).
- README `### Security decisions` at `README.md:37-45` (passwordless sudo
  tradeoff, `AllowTcpForwarding` intent + revisit condition).
- `nix.settings.trusted-users = [ cfg.username ]` at
  `nixos/configuration.nix:117` with the no-new-privilege rationale;
  matching comment above `nixConfig` in `nixos/flake.nix:4-5`.
- Panel suffix sentence at `skills/review/SKILL.md:51`; floor note at
  `model-registry-template.md:46`.
- `nix-instantiate --parse` and `nixfmt --check` exit 0 on both nix files
  (re-run by me).

### Deviation rulings (the four documented, plus two process notes)

1. **`index.ts` 359 vs <300 budget**: acceptable. `index.ts` contains only
   what step 4.4 allows (imports, `loadPlaybook` + constants, four schemas,
   the default export). `execute` is 248 lines (107-354) and the plan
   mandates it stay whole; the plan's own gate block (~18 lines) is what
   pushed it past 300. The plan's formal done-criteria and the hard cap are
   both <500, met. The content rule correctly won.
2. **`renderResultRow` drops `icon`; single-expanded layout unified**:
   acceptable. Icon placement genuinely differs per mode (leading vs
   trailing), so a shared `icon` field cannot work; passing the constructed
   `header` keeps all three header rows byte-identical. Display-only.
3. **`formatUsageStats` keeps the live inline usage type**: acceptable. It is
   the original code verbatim (`format.ts:25-34` vs 608f253 `index.ts:58-82`);
   the inline type's optional `contextTokens?`/`turns?` is what lets
   `aggregateUsage`'s return (no `contextTokens`) type-check. Importing
   `UsageStats` would have required mutating the live shape.
4. **`formatTokens(2000)` → `"2.0k"`**: acceptable. Step 3.3 explicitly says
   the function is right and the expectation adjusts. The `< 10000` decimal
   branch is original behavior, unchanged.
5. (process) Two artifact commits (ad259c7, e7af313) were made by the
   implementer though the plan assigned `para/` artifact commits to the
   lead. Both touch only `para/projects/005-harness-review/impl-2026-07-24.md`;
   no source. Harmless; noted for the record.
6. (process) sed-based pure deletions: acceptable given each move was
   re-verified by the live load smoke and the byte-identical render diff I
   performed confirms no corruption reached the render path.

## Standards findings

- [judgement] `pi/orchestrator/core.test.ts:70-144` — 11 `as any` casts on
  partial `SingleResult` fixtures. The playbook says no `any`; the plan's
  done-criteria grep (`: any` / `<any>` / ` any;`) does not match `as any`,
  so this passes the letter of the plan, and the same file already uses the
  clean form elsewhere (`as unknown as AgentConfig` at :309-310). Non-blocking.
- [judgement] `pi/orchestrator/render.ts:72-95` vs old `index.ts:814-850` —
  the single-mode expanded view loses two details beyond the disclosed
  section labels: the `(no output)` fallback row (when there are no display
  items and no final output) and the `Spacer(1)` before the usage row. Both
  are subsumed by "adopts the shared layout" (chain/parallel expanded never
  had them), display-only, but the disclosure enumerated only the labels.
- [judgement] `pi/orchestrator/core.ts:80,95,107,122,130` — five double
  blank lines left by the move. Cosmetic; no formatter is configured for
  the extension code, so nothing enforces this.
- [judgement] `pi/orchestrator/format.ts:51-117` — `formatToolCall` is 67
  lines, over the ~60 pragmatic bar. It is a verbatim move of a flat switch
  (original was 66 lines) and the ~60 bar was scoped to the render
  decomposition; splitting display cases would break upstream parity. Not a
  plan violation.

## Suggestions (non-blocking)

- Unify the test casts: `as unknown as SingleResult` (or
  `as Partial<SingleResult> as SingleResult`) instead of `as any` in
  `core.test.ts`, matching the gate-test style already in the file.
- Collapse the double blank lines in `core.ts`.
- `spawn.ts:285-289` never calls `stderrDecoder.end()`, so an incomplete
  multibyte sequence at the very end of stderr is dropped. Display-only
  stream, negligible; a one-line flush in `runWorkerProcess`'s close handler
  would close it if touched again.
- `applyWorkerOutcome`'s spawnError branch (`spawn.ts:229-232`) has no unit
  test (the plan scoped the regression test to `getResultOutput`'s
  errorMessage preference, which covers the downstream path). If it were
  exported pure, it would be trivially testable; optional.

## Summary

Solid implementation. All five workstreams conform to the plan; the four
documented deviations are justified and none is behavioral. The security fix
is the headline and it holds up under independent live verification: the
headless gate fails closed before any spawn, name-shadowing cannot bypass it,
`hasUI` is not caller-controllable, and the opt-out is explicit and
documented. The streaming fixes are regression-tested 1:1 and confirmed by
smoke. Confidence is high; the only open items are cosmetic test-cast and
whitespace nits that a follow-up or the janitor pass can absorb.
