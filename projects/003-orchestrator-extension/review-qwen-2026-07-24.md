---
phase: review
status: done
project: 003-orchestrator-extension
date: 2026-07-24
reviewer: qwen3.8-max-preview
verdict: approved-with-nits
---

# Review: Package the orchestration as a single pi extension

## Verdict: APPROVED-WITH-NITS

The branch does exactly what the plan prescribed, nothing more. All four
design decisions (D1, D2, D4, generalized AGENTS.md; D3 and D5 verified in
passing) are implemented as specified, every Done criterion holds under my own
checks, and the change set touches only in-scope files. I re-ran the Step 10
smoke tests live plus two extra probes of my own, and all passed. The nits
below are pre-existing vendored-code traits or plan-prescribed choices; none
blocks merge.

## Independent verification (not trusting the report)

- **Smoke test 1 (load):** `pi --no-extensions -e ./pi_extensions/orchestrator/index.ts -p --no-session --model qwen-token-plan/qwen3.6-flash "Reply with exactly: ok"` → `ok`. Ran with `NIXPI_WORKER=1` inherited from my own spawn env, which also proves the extension loads cleanly in worker mode.
- **Smoke test 2 (playbook):** same isolation, asked for the pipeline phases → model listed grill, explore, plan, implement, review, teach, janitor. Playbook injection confirmed, and confirmed under `NIXPI_WORKER=1` (worker sessions get the methodology).
- **Smoke test 3 (roles):** default scope listed `review (user), implement (user), plan (user), explore (user)`. The `(user)` tags are the stale pre-rebuild global symlinks at `~/.pi/agent/agents/` overriding bundled by design (I verified the symlinks exist on this un-rebuilt machine).
- **Bundled discovery probe (deterministic):** a throwaway extension importing `discoverAgents` printed `scope=user: all (user)`, `scope=project: all (bundled)`, `scope=both: all (user)`. Bundled loads as the base layer for every scope; user overrides bundled on name collision. All four role frontmatters parsed without a YAML crash.
- **Recursion probe:** under `NIXPI_WORKER=1` with `--tools subagent`, the model could not call `subagent` (replied `NO-SUCH-TOOL` when instructed to call or report). The tool is genuinely absent in worker sessions. (Its earlier "Yes, I have it" was a budget-model hallucination; the call attempt is the real evidence.)
- **Skill serving probe:** `/skill:grill` in the isolated session loaded the bundled skill (model replied `skill-loaded`). The assembled extension surfaces `skills/` via `resources_discover` in directory form; no glob fallback needed. All 7 skills carry `disable-model-invocation: true` (grep: 7/7).
- **Nix coherence:** `nixfmt --check` exit 0; `nix eval ./nixos_dev_env#nixosConfigurations.nixos.config.system.build.toplevel.drvPath` → `/nix/store/fi1ww9c5g4f3l9570y31gabz63bg4laf-nixos-system-nixos-26.11.20260719.241313f.drv`, the same drv the report recorded.

## Plan conformance

- **Step 2 (Commit A `f0e7991`):** pass. 20 pure `R100` renames (2 TS, 4 roles, 14 skill files); zero content lines changed in the skills (`git diff -M` on the skill paths: 0 insertions, 0 deletions).
- **Step 3 (agents.ts):** pass. `"bundled"` at all three type sites (`agents.ts:21`, `agents.ts:30`, and the call at `agents.ts:112`); `bundledDir` resolved via `import.meta.url` (`agents.ts:108`); bundled set into the map first, then user, then project (`agents.ts:118-127`), so Map overwrite order gives bundled < user < project. The old bare `else` became an explicit `else if (scope === "project")` (`agents.ts:125`), behavior-identical since `AgentScope` has exactly three members.
- **Step 4 (index.ts):** pass. Constants + `loadPlaybook` at `index.ts:34-44`; `SingleResult.agentSource` widened at `index.ts:164`; `NIXPI_SKILLS_DIR: SKILLS_DIR` injected at `index.ts:353`; both hooks register at `index.ts:482-486` before the guard at `index.ts:489`; tool still named `subagent` at `index.ts:491`. Hook shapes match pi 0.81.1 docs (`resources_discover` → `{ skillPaths }`, `before_agent_start` → `{ systemPrompt }`, per-turn chaining, no cross-turn accumulation).
- **Step 5 (roles):** pass. All four bodies match the plan's prescribed replacements verbatim (diffed each role against `180c348:.pi/agents/{r}.md`); frontmatter byte-identical for all four (extracted and diffed the `---` blocks); grep confirms 4/4 roles reference `NIXPI_SKILLS_DIR`, zero `~/.pi/agent/skills`, zero `nixpi-dev-os`, zero dangling backtick-`AGENTS.md` references.
- **Step 6 (playbook):** pass. `pi_extensions/orchestrator/AGENTS.md` is byte-identical to the plan's prescribed content (209 lines, programmatic diff: IDENTICAL). Methodology retention verified section-by-section against `180c348:AGENTS.md`: every section body is unchanged except the three the plan said to edit (The pipeline, Skills and roles, When the user says "go"), plus one planned addition (Model registry). Zero project-specific paths (`grep -c 'nixpi-dev-os\|nixos_dev_env\|extensionsPath\|skillsPath\|rolesPath\|pi_skills/\|.pi/agents'` → 0); compose note, `pi --list-models --offline` auto-seed, and `NIXPI_SKILLS_DIR` all present.
- **Step 7 (template):** pass. Byte-identical to the plan's prescribed content; section structure mirrors the real `resources/model-registry.md` (same five headings, same order).
- **Step 8 (Commit C `a4c2943`):** pass. `skillsPath`/`rolesPath` options and the `pi-skills`/`pi-roles` activation scripts deleted; `extensionsPath` option (`configuration.nix:20`) and `pi-extensions` script (`configuration.nix:151-153`) intact; `flake.nix:39` keeps `nixpi.extensionsPath`. Both nix files edited in one commit, so the flake never sets an undeclared option. Grep for stale refs: no matches.
- **Step 9 (Commit D `1d3fb6b`):** pass. Root `AGENTS.md` deleted; README layout tree, discovery section, and testing command match the plan's prescribed text; `resources/subagent-orchestration.md` carries all seven prescribed edits including the four-patch maintenance list. Grep for stale paths in both docs: no matches.
- **Steps 10-11:** pass. Smoke tests reproduced (above); `git ls-files pi_extensions/orchestrator/` lists all 22 files; `git status --short` clean; four logical commits plus the grill/plan and implement-report artifact commits.
- **Scope:** pass. `git diff --name-status 180c348..HEAD` touches only in-scope paths plus the project's own artifacts. `resources/model-registry.md`, `resources/lessons/`, `archive/`, `hardware-configuration.nix`, `flake.lock`, and the Paseo blocks are untouched (empty diff).
- **STOP conditions:** none observable post-hoc; the accumulation STOP condition is structurally impossible (the handler appends to the per-turn chained `event.systemPrompt`, which pi rebuilds from the base prompt each turn; docs confirm "Replace the system prompt for this turn").

## Reviewer focus items

- **D1 (narrowed nesting guard):** confirmed safe and effective. Hooks register for every session (`index.ts:482-486`), only `registerTool` is gated (`index.ts:489`). Empirically: playbook reaches a `NIXPI_WORKER=1` session (smoke test 2 ran in exactly that env), and the `subagent` tool is absent there (NO-SUCH-TOOL probe). Workers get the methodology three ways: role body via `--append-system-prompt` (`index.ts:341`), playbook via `before_agent_start`, and skill files via `cat "$NIXPI_SKILLS_DIR/..."` (env injected at `index.ts:353`). No skill body instructs workers to spawn (grep found one descriptive mention in `skills/plan/references/closing-the-loop.md:5`, no instruction). No recursion path exists.
- **D2 (`"bundled"` source + precedence):** type widening is complete (three sites plus `SingleResult.agentSource`; the only remaining `"user" | "project"` string is `AgentScope` at `agents.ts:12`, which is the scope type and correctly untouched). Precedence verified empirically: bundled < user (scope=user/both with stale user symlinks present) and bundled-alone under scope=project. Project-over-project trust prompt only fires for `source === "project"` (`index.ts:542`), so bundled roles never trigger it: correct, bundled content ships with the trusted extension.
- **D4 (role generalization):** clean. Bodies reference `$NIXPI_SKILLS_DIR` and "the orchestration playbook"; frontmatter byte-identical; no dangling `~/.pi/agent/skills` or `nixpi-dev-os` anywhere in `roles/`.
- **Generalized AGENTS.md:** retained all methodology (section-level diff: only the three planned sections changed) while shedding every project-specific path (grep: 0). The worktree command is generalized to `../<repo-dir>-{NNN}-{slug}` and the D5 template path (`~/.pi/agent/extensions/orchestrator/model-registry-template.md`) matches what the `pi-extensions` activation symlink creates by basename (`configuration.nix:158`).

## Standards findings

- [judgement] `pi_extensions/orchestrator/index.ts:1-1044` — the file is 1044 lines, over the playbook's 500-line file standard. Pre-existing: it was 1019 lines at baseline (vendored pi subagent example), and the plan deliberately confined edits to four regions so the file stays diff-able against upstream on pi version bumps (`resources/subagent-orchestration.md` → Maintenance). The change added 25 net lines. Not a violation introduced by this branch.
- [judgement] `pi_extensions/orchestrator/index.ts:38-44` — `loadPlaybook()` swallows read errors and returns `""`, silently disabling injection on a broken install. The Errors standard prefers messages with the offending value, but this is plan-prescribed graceful degradation (a missing playbook should not crash every session), and the playbook is bundled so the path only triggers on a broken install. Non-blocking.
- [judgement] `pi_extensions/orchestrator/index.ts:493-498` — the tool description still documents only the user/project scopes and does not mention that bundled roles are always included. The plan prescribed the tool registration as unchanged, so this is a minor doc gap, not drift.
- [judgement] `pi_extensions/orchestrator/agents.ts:132` — `formatAgentList` is exported but never called (dead code). Pre-existing at baseline (`180c348:pi_extensions/subagent/agents.ts:127`); the plan scoped agents.ts edits to the discovery region. Non-blocking.

## Suggestions (non-blocking)

- On the next maintenance pass, add one clause to the `subagent` tool description: bundled roles from the extension's `roles/` are always available regardless of scope.
- If a broken-install diagnostic is ever wanted, `loadPlaybook` could `console.error` once on read failure instead of returning `""` silently. Optional; the current behavior is defensible.
- The D5 template path in the playbook assumes the global-symlink install location. That holds for the NixOS vector (the only supported install path per the grill), but a future `pi install` distribution channel would need that line revisited.

## Summary

High-quality, tightly scoped execution: the diff is exactly the plan's four regions of TS plus the prescribed content files, moves are history-preserving and verbatim, and every claim in the implement report reproduced under my own live checks (including two the report did not run: worker-mode tool absence and bundled skill serving). Confidence is high; the only concerns for the lead are operational, not code: remove the stale global symlinks post-rebuild per the plan's Maintenance notes, since they currently shadow the bundled roles by design.
