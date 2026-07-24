---
phase: review
status: done
project: 005-harness-review
date: 2026-07-24
verdict: changes-requested
---

# Review: orchestration harness (pi/orchestrator + nixos)

Independent audit of existing code. No plan, no impl, no diff. Reviewed
`pi/orchestrator/index.ts`, `pi/orchestrator/agents.ts`, `roles/*.md`,
`skills/*/SKILL.md`, `AGENTS.md`, `nixos/configuration.nix`, `nixos/flake.nix`.

## Verdict: CHANGES REQUESTED

The harness is well-architected and a lot of it is done right (see Summary).
But there is one real security gap (headless bypass of the project-agent gate),
two real correctness bugs (discarded spawn errors, multibyte stream corruption),
and systemic standards violations (a 1053-line file with multiple 100+-line
functions, three `any` usages, no test suite, dead code). These are documented
rules, not style calls. Fix the hard items before relying on this in any
untrusted-repo or headless context.

## Correctness & security findings

### [hard] `index.ts:540` — headless mode silently bypasses the project-agent confirmation gate

The gate is:

```ts
if ((agentScope === "project" || agentScope === "both") && confirmProjectAgents && ctx.hasUI) {
```

When `ctx.hasUI` is false (CI, cron, any non-interactive driver), the entire
block is skipped. Project-local agents — repo-controlled `.md` files that the
playbook explicitly frames as untrusted ("Only continue for trusted
repositories") — run with no confirmation, and with the full parent
environment (see next finding). The `confirmProjectAgents` default of `true`
is silently ignored the moment there is no UI.

The gate's purpose is a trust boundary. A trust boundary that evaporates in
headless mode is not a trust boundary. Either: refuse to run project agents
when `ctx.hasUI` is false (return an `isError` result naming the agent and the
reason), or require an explicit `confirmProjectAgents: false` opt-out from
the caller and log that project agents were run unconfirmed. Do not fall
through to execution.

### [hard] `index.ts:412` — spawn errors are discarded; debugging is impossible

```ts
proc.on("error", () => {
    resolve(1);
});
```

The `Error` argument is dropped. For a missing `pi` binary (ENOENT), a
permission failure (EACCES), or a kill failure (ESRCH), the result is
`exitCode: 1`, empty `stderr`, empty `messages`. The caller sees `Agent
failed: (no output)` (via `getResultOutput` at `index.ts:169`). There is no
way to distinguish "the model errored" from "the binary is not installed."

This breaks the playbook rule "Messages must include the offending value and
expected shape" (Code standards → Errors). Capture the error: `proc.on("error",
(err) => { currentResult.errorMessage = err.message; resolve(1); })`. The
existing `errorMessage` field (`index.ts:336`) already flows through to the
result rendering, so this is a one-line fix with full plumbing already in
place.

### [hard] `index.ts:346` — task content is passed on the command line, visible in `ps`

```ts
args.push(`Task: ${task}`);
```

The system prompt is correctly protected via a `0o600` temp file
(`index.ts:250-258`, `writePromptToTempFile`), but the task is not. The task
string is a positional argv element, readable by any user via `ps aux` or
`/proc/<pid>/cmdline`. Tasks routinely contain file paths, code snippets, and
sometimes secrets pasted by the orchestrator. If the prompt deserves a temp
file, so does the task. Write the task to its own `0o600` temp file and pass
it via pi's stdin or a `--prompt-file` flag if one exists; if not, this is
worth a one-line feature request upstream. At minimum, document the leak in
the tool description so callers know not to put secrets in `task`.

### [hard] `index.ts:397` — multibyte corruption in stdout streaming

```ts
proc.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) processLine(line);
});
```

`Buffer.toString()` on a chunk ending mid-codepoint emits U+FFFD and leaves
the next chunk's partial bytes to also decode as U+FFFD. The boundary
character is destroyed. JSON strings carrying raw UTF-8 (an accented char
in a tool result, a non-ASCII file path) corrupt at chunk boundaries, and the
corrupted line then either fails `JSON.parse` (silently dropped by
`processLine`'s `catch { return; }`) or parses with a mangled string.

This is a classic Node streaming bug. Use a `StringDecoder('utf8')` (which
buffers incomplete multibyte sequences across chunks) or accumulate Buffers
and decode once at split time. The same `data.toString()` pattern recurs for
stderr at `index.ts:404` — same bug, lower blast radius (stderr is for
display, not parsed).

### [hard] `index.ts` (whole file) and `agents.ts` — no automated tests for the core tooling

`index.ts` is 1053 lines of subprocess lifecycle, abort/signal handling, a
concurrency limiter, streaming JSON parsing, and output truncation. None of
it is tested. `agents.ts` (140 lines: frontmatter parsing, the upward walk,
scope merging) is untested. The README states "the real test is delegation
itself." That is a fine smoke test; it is not a regression suite.

The playbook requires every function to have a test and a single-command
test run (Code standards → Tests). The riskiest logic here — abort
escalation (`index.ts:417-426`), the concurrency limiter
(`index.ts:232-248`), `truncateParallelOutput` (`index.ts:175-184`),
`isFailedResult`/`getResultOutput` (`index.ts:165-173`) — is pure and
unit-testable without spawning pi. A `bun test` or `vitest` suite covering
the pure helpers would catch regressions in the streaming rewrite and the
abort path for free.

### [judgement] `index.ts:404` — stderr accumulated without bound

```ts
currentResult.stderr += data.toString();
```

For a long-running worker that logs to stderr, `currentResult.stderr` grows
without cap. Memory risk for long workers. Cap it (keep the tail, drop the
head with a "truncated" marker) the way `truncateParallelOutput` caps
per-task output.

### [judgement] `index.ts:430` — abort discards partial results

```ts
if (wasAborted) throw new Error("Subagent was aborted");
```

The streamed `currentResult` (partial messages, partial usage) is thrown
away. In parallel mode, `Promise.all` rejects on the first throw
(`index.ts:232-248`), discarding all partial results from every worker, not
just the aborted one. A cleaner abort sets `stopReason = "aborted"` and
returns the partial result; the caller can then show what was captured
before the abort. `isFailedResult` already treats `"aborted"` as failure
(`index.ts:166`), so rendering would Just Work.

### [judgement] `index.ts:425` — stale abort listener on normal completion

```ts
else signal.addEventListener("abort", killProc, { once: true });
```

If the process completes normally, `killProc` stays registered on `signal`
(holding a reference to `proc`). For a per-request AbortSignal this is
harmless (the signal dies with the request). For a long-lived shared signal
and many delegations, listeners accumulate. `removeEventListener` on `close`
would make this clean, but it is low priority.

### [judgement] `agents.ts:92-104` — `findNearestProjectAgentsDir` walks to filesystem root

The walk stops only at `/`, not at a git/VCS boundary. A stray `.pi/agents`
directory anywhere up the tree is treated as a project agents dir. In
practice the impact is low: the user agent dir is `getAgentDir()/agents`
(`agents.ts:109`), a different path from the `CONFIG_DIR_NAME/agents` the
walk searches for, so there is no default collision. But the walk is
unbounded; a developer who happens to have `~/.pi/agents` for unrelated
reasons would see those agents labeled "project". Consider stopping at the
nearest `.git` boundary.

### [judgement] `agents.ts:60` / `agents.ts:42` — `parseFrontmatter` and thinking validation crash all discovery

`parseFrontmatter` (`agents.ts:60`) is outside the try/catch (only
`fs.readFileSync` at `agents.ts:55` is wrapped). The `thinking` validation
throw (`agents.ts:42`) is also uncaught by `loadAgentsFromDir`. One malformed
role file — exactly the "description with an unquoted colon" case the playbook
warns about — throws and breaks ALL subagent delegation, not just that role.

The playbook explicitly says "discovery crashes instead of skipping the file,"
so this is consistent with the documented intent. It is still fragile: a typo
in one role file takes down the whole tool. The error message itself is
exemplary (it names the file, the value, and the allowed set), so a crash is
at least debuggable. Worth keeping as-is only if the strict-fail policy is
intentional; otherwise wrap and skip-with-warning.

## Standards findings

### [hard] `index.ts` — file exceeds the 500-line limit by 2x

1053 lines. The playbook: "Files: under 500 lines, ideally 200–300. Split by
responsibility." This file does four jobs: subprocess lifecycle
(`runSingleAgent`, `mapWithConcurrencyLimit`, `writePromptToTempFile`,
`getPiInvocation`), the tool entrypoint (`execute`), TUI rendering
(`renderCall`, `renderResult` + all the format helpers), and shared types.
Split into `spawn.ts` / `render.ts` / `format.ts` / `index.ts` (entrypoint
only). The render code alone is ~310 lines and is the natural first
extraction.

### [hard] `index.ts` — multiple functions far exceed the 4–20 line rule

- `runSingleAgent`: `index.ts:281-446` (~165 lines)
- `execute`: `index.ts:503-693` (~190 lines)
- `renderResult`: `index.ts:782-1050` (~268 lines)
- `renderCall`: `index.ts:738-782` (~44 lines)
- `formatToolCall`: `index.ts:64-119` (~55 lines)

The playbook: "Functions: 4–20 lines. Split if longer." `runSingleAgent` in
particular mixes three concerns: arg building, the spawn/parse loop, and
abort handling. The spawn+parse loop (the `new Promise` block,
`index.ts:348-431`) is its own function; the abort wiring
(`index.ts:415-426`) is its own function. `renderResult` has three nearly
identical branches (single/chain/parallel) each rendering the same
"header → tool calls → final output → usage" shape — extract a
`renderResultRow(r, theme)` helper and the duplication collapses.

### [hard] `index.ts:87`, `index.ts:217`, `index.ts:361` — `any` used three times

```ts
themeFg: (color: any, text: string) => string,     // :87
type DisplayItem = { ...; args: Record<string, any> };  // :217
let event: any;                                      // :361
```

The playbook: "No `any`, no untyped function signatures." The theme function
type should come from `@earendil-works/pi-tui` (the same source `theme.fg`
comes from); `DisplayItem.args` should be `Record<string, unknown>` (it is
only read, never mutated); `event` should be a discriminated union of the
JSON-mode events (`message_end`, `tool_result_end`, …) or at minimum
`Record<string, unknown>` with a narrowed `type` check.

### [hard] `agents.ts:132` — dead exported function

`formatAgentList` is exported but never imported or called anywhere in the
repo (`rg formatAgentList` returns only its own definition). The playbook:
"Never leave dead code, commented-out blocks, or unused code in place.
Delete it." Remove it, or wire it into the "Available agents" error messages
in `index.ts` (which currently hand-roll the same listing inline at
`index.ts:516` and `index.ts:688`).

### [judgement] `index.ts:688` and `index.ts:516` — duplicated "Available agents" listing

Both the `modeCount !== 1` branch and the final fall-through build the same
`agents.map((a) => \`${a.name} (${a.source})\`).join(", ")` string. Minor
duplication; extract a helper. (This is the same spot where the dead
`formatAgentList` would slot in.)

### [judgement] `nixos/configuration.nix:120-130` — pi-extensions activation script leaves stale symlinks

The script symlinks each `${extensionsPath}/*/` into `~/.pi/agent/extensions/`
with `ln -sfn` (which replaces existing symlinks) but never removes entries
whose source disappeared. If an extension dir is renamed or removed from
`extensionsPath`, a dangling symlink remains and pi may try to load a broken
extension. Add a cleanup pass (remove existing symlinks in `$ext_dst` whose
targets no longer exist before re-linking). The repo's own
`para/resources/lessons/stale-global-symlinks-after-rename.md` records that
this exact bite was hit before — the lesson is filed but the script was not
patched.

## Consistency / doc-drift findings

### [hard] `AGENTS.md` (When the user says "go", step 3) — playbook is stale on model override

The playbook says:

> The model lives in the role's frontmatter; if the user overrides, edit the
> role file before delegating.

The code supports a per-call `model` override that beats the role's
frontmatter, with no file edit:

```ts
const effectiveModel = modelOverride?.trim() || agent.model;   // index.ts:309
if (effectiveModel) args.push("--model", effectiveModel);        // index.ts:310
```

The `model` field is on `TaskItem` (`index.ts:461`), `ChainItem`
(`index.ts:469`), and the top-level `SubagentParams` (`index.ts:478`), and the
tool description documents it (`index.ts:496-499`). So the orchestrator no
longer needs to edit a role file to override the model — it passes `model`
in the task. The playbook predates this feature. Update AGENTS.md step 3 to
say "pass `model` in the task; the role's frontmatter is the default."

### [judgement] `skills/review/SKILL.md` artifact path vs. multi-model panels

The skill's artifact path is `review-{YYYY-MM-DD}.md`, but the skill
description says it "Can run as a single reviewer or as part of a
multi-model panel." This review is `review-2026-07-24-glm.md` (model suffix)
precisely because a panel needs distinct filenames. The path format does not
document the `-{model}` suffix convention. Add a sentence: "For multi-model
panels, suffix the filename with the model: `review-{date}-{model}.md`."

### [judgement] `model-registry-template.md` vs. role frontmatter — review tier tension

The template's phase-defaults table says review default tier is "mid" with
"premium (for security/architecture)" fallback. The bundled `roles/review.md`
pins `model: qwen-token-plan/qwen3.8-max-preview` with `thinking: high` — a
single premium model, no fallback. This is not a contradiction (the role is
the bundled default; the registry is per-repo and user-edited), but a reader
cross-referencing the two will notice the role is already at the premium tier
the registry calls a fallback. Worth a one-line note in the template that the
role's model is the floor, not the recommendation.

## Suggestions (non-blocking)

- `index.ts:355` — the env spread `{ ...process.env, NIXPI_WORKER: "1",
  NIXPI_SKILLS_DIR: SKILLS_DIR }` is necessary (workers need the parent's
  provider keys), but it means project-local (untrusted) agents get every env
  var the orchestrator has. Once the headless gate (finding 1) is fixed, the
  threat model is "trusted caller explicitly approved these agents," which
  makes the env spread acceptable. Until then it is part of the same gap.
- `configuration.nix:97` — `security.sudo.wheelNeedsPassword = false` gives
  the SSH user passwordless root. Combined with key-only SSH, an attacker who
  obtains the key gets passwordless root. This is a deliberate dev
  convenience, but for a box marketed as hardened it is the weakest link.
  Consider `sudo` with a password, or `doas` with a configured password, if
  the convenience cost is acceptable.
- `configuration.nix:35` — `AllowTcpForwarding = "yes"` enables SSH port
  forwarding (a lateral-movement vector). The README documents forwarding as
  a feature, so this is intentional. If forwarding is only needed for
  specific local ports, `AllowTcpForwarding local` narrows it.
- `flake.nix:43` — `nixpi.extensionsPath = "/home/balaur/projects/nixpi-dev-os/pi"`
  is an absolute path tied to one user/machine. Fine for a single-host
  config; if this flake is ever reused on another host, this will silently
  point at a nonexistent path and no extensions load.

## Summary

The harness is mostly well-built. The concurrency limiter, abort escalation
(SIGTERM → SIGKILL after 5s), worker nesting guard (`index.ts:494`), output
truncation that preserves full output in details, the `0o600` temp-file
handling for the system prompt, the `thinking`-level validation error
message (names file, value, and allowed set), and the SSH hardening
(non-standard port, no password auth, no root login, `MaxAuthTries=3`,
`LoginGraceTime=30`, fail2ban) are all correct and often exemplary. The
roles/skills/playbook are internally consistent on the things that matter
(roles point at `$NIXPI_SKILLS_DIR/{name}/SKILL.md`, all four skills exist,
frontmatter follows the colon-quoting rule).

The hard findings cluster into two themes. First, the headless code path:
the project-agent trust gate evaporates without a UI, and the env spread
hands untrusted agents the full parent environment. Second, the streaming
subprocess path: spawn errors are discarded, multibyte output corrupts at
chunk boundaries, and none of it is tested. The standards findings (1053
lines, multiple 100+-line functions, three `any`, dead code, stale playbook
on the model override) are systemic but mechanical to fix with a split. Fix
the headless gate and the two streaming bugs first; the standards split can
follow. Confidence is high — every hard finding is cited to a line and
verified against the code.
