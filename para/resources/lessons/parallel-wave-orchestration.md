---
source: 001-pipeline-v2
date: 2026-07-24
tags: [paseo, orchestration, parallel, tickets, worktree]
---

# Parallel wave orchestration pattern

How to run parallel implement workers across ticket dependencies, proven on 001-pipeline-v2 (13 tickets, 11 workers, 9 concurrent at peak, ~13 minutes total, 0 merge conflicts).

## Frontier computation

Scan `para/projects/{NNN}/tickets/*.md`. Parse each ticket's `status` and `blocked-by` from frontmatter. The frontier = tickets whose `status` is `ready` (or `blocked` with all blockers `done`). Tickets with unmet blockers stay `blocked`.

## Wave structure

1. **Wave 1:** foundation ticket (no blockers). Runs alone. Merge its branch to the project branch.
2. **Wave 2:** all tickets whose only blocker was wave 1. These run in parallel. Each gets its own worktree workspace branched off the project branch. Spawn all with `paseo run --background`. Use a heartbeat to poll for completion.
3. **Subsequent waves:** repeat. A ticket enters the frontier when all its blockers' tickets are `done`.
4. **Final wave:** verification ticket (blocked by everything). Runs the contract test + smokes.

## Workspace layout

- **Project workbench** (`paseo workspace create --isolation worktree --mode branch-off --new-branch {NNN}-{slug} --base main`): hosts sequential foreground phases (spec, domain-model, plan, tickets) and acts as the merge home.
- **Per-ticket worktree** (`paseo workspace create --isolation worktree --mode branch-off --new-branch 001-pv2-t{NN} --base {NNN}-{slug}`): one per parallel implement worker. Archived after merge.

## Merge strategy

After all workers in a wave finish:
1. `cd` into the workbench worktree.
2. `git merge {ticket-branch} --no-edit` for each ticket branch.
3. Run the contract test to verify no regressions.
4. Archive each ticket workspace: `paseo workspace archive "$WS"`.
5. Delete merged refs: `git branch -d {ticket-branch}`.

## Spawn mechanics

- Prompt files: write each ticket's full briefing to `/tmp/pv2-prompt-{NN}.md` (avoids shell quoting issues with large prompts).
- Spawn: `paseo run --background --workspace "$WS" --provider <model> --thinking low --title "..." "$(cat /tmp/pv2-prompt-{NN}.md)" --json`.
- Parse agent ID: pipe `--json` output to `python3 -c 'import json,sys;print(json.load(sys.stdin)["agentId"])'`.
- Heartbeat for polling: `paseo heartbeat create "Check agents ... If all idle, merge and report." --cron "*/3 * * * *" --max-runs 20`.

## Gotchas

- `$(cat file)` as the prompt argument works; `--prompt-file` does not exist on `paseo run`.
- Branch names with `/` in them (e.g. `001-pipeline-v2/ticket-02`) fail because git refuses to create `refs/heads/001-pipeline-v2/ticket-02` when `refs/heads/001-pipeline-v2` already exists. Use flat names like `001-pv2-t02`.
- Python f-strings with escaped quotes inside bash heredocs cause `SyntaxError: unexpected character after line continuation character`. Use single-quoted python scripts or avoid f-strings with dict access.
- `paseo run --json` prints a "Using workspace ..." line to stdout before the JSON. Parse only the JSON object (skip non-JSON lines or use `2>/dev/null` on stderr and handle the prefix).
