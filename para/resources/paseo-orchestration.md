# Paseo orchestration

How this repo delegates autonomous work to spawned workers via the Paseo daemon. Source: project `006-paseo-orchestrator` (2026-07-24). Replaces the retired pi `subagent` tool (one-shot `pi` subprocesses).

## The mechanism

Pi stays the interactive orchestrator (playbook + skills + PARA). Paseo (daemon on `127.0.0.1:6767`, `paseo.service`) provides worker lifecycle, worktree workspaces, visibility, and cross-provider reach. The orchestrator drives Paseo through bash (pi has no MCP client by design). The orchestrator extension (`pi/orchestrator/index.ts`) registers no tool; it only serves the skills and injects the playbook.

Two spawn shapes:

- **Foreground** (explore, plan, review): `paseo run --wait-timeout 30m --output-schema ~/.pi/agent/extensions/orchestrator/worker-output-schema.json --provider <provider/model> --thinking <level> "<briefing>"`. Blocks; returns a structured summary (`status`, `artifact_path`, `summary`).
- **Background** (implement): `paseo run --background --workspace <id> --provider ... --thinking ... "<briefing>"` → agent id; then `paseo wait <id>` or a self-heartbeat (`paseo heartbeat create ...`) so the orchestrator can free the session.

## Spawnable vs in-session

The filesystem is the contract: a phase is spawnable iff its role briefing exists in `pi/orchestrator/roles/`.

- Spawnable (role briefing present): explore, plan, implement, review.
- In-session (no role briefing; invoke the skill directly): grill, teach, janitor.

## Role briefing format

`pi/orchestrator/roles/{name}.md`. Frontmatter: `name`, `description`, `provider` (a `paseo run --provider` value, e.g. `pi/qwen-token-plan/qwen3.8-max-preview`), `thinking`, `workspace` (`current` | `worktree`). The body is the worker briefing and points at the skill by stable absolute path (`~/.pi/agent/extensions/orchestrator/skills/{name}/SKILL.md`) so non-pi workers can read it. Never embed the skill's methodology in the role.

## Worktree contract

Worktrees are Paseo-managed. For implement/review: `paseo workspace create --isolation worktree --mode branch-off --new-branch {NNN}-{slug} --worktree-slug {NNN}-{slug} --base main --json`, then `paseo run --workspace <id>`. Worktrees land under `~/.paseo/worktrees/<hash-of-source-path>/<slug>/`. No `paseo.json` setup hook is needed for this repo (pure config + TS, no build step); add one only if a worktree demonstrably needs it. explore/plan run in the current checkout (no worktree).

## Artifacts travel with the worker

Workers write to `para/projects/{NNN}-{slug}/` in their own cwd (main checkout for explore/plan; worktree for implement/review). Foreground workers return the artifact path in the output schema; for background workers the orchestrator reads it from `paseo inspect <id> --json` (field `Cwd`). Implement artifacts merge back with the branch. One convention, no env-var tricks.

## Redirects and heartbeats

- Redirect an existing worker in place: `paseo send <id> "<follow-up>"` (waits; `--no-wait` to return immediately). Do not spawn a fresh worker for a follow-up.
- Long background runs: `paseo heartbeat create "<check worker <id>; read its artifact>" --cron "*/5 * * * *" --max-runs N` so the orchestrator is re-prompted to check; it deletes the heartbeat when the worker lands.

## Flat spawning policy

Workers never spawn workers. Paseo gives every worker full spawn power (`PASEO_AGENT_ID` is set in workers), so this is enforced by the briefing text ("you are a worker; never run `paseo run`/`paseo send` or create agents"), not by the harness.

## Edge case: which workspace

Inside a Paseo session (`PASEO_AGENT_ID` set — the normal case here), `paseo run` auto-parents the worker under the current agent in the current workspace (omit `--workspace` for explore/plan). Outside one, it creates a top-level agent in a new workspace; pass `--workspace <id>` explicitly (from `paseo workspace ls --json` matched on cwd). implement/review always pass `--workspace` (the worktree workspace).

## Model values

`paseo run --provider` takes `<paseo-provider>/<model-id>`, e.g. `pi/qwen-token-plan/qwen3.8-max-preview` (paseo provider `pi`, pi model `qwen-token-plan/qwen3.8-max-preview`). Available models: `paseo provider models pi`. Only the `pi` provider is installed; `claude`/`codex`/`copilot`/`opencode` are enabled but their CLIs are not installed — cross-provider is dormant until a second CLI is installed; nothing here depends on it being active.

## Verified Paseo facts (2026-07-24, paseo 0.2.0-beta.4)

CLI: `run` (`--background`, `--wait-timeout`, `--output-schema`, `--provider`, `--model`, `--thinking`, `--workspace`, `--new-workspace`, `--worktree-mode`, `--worktree-slug`, `--new-branch`, `--base`, `--env`, `--label`, `--cwd`), `send` (`--no-wait`, `--prompt-file`), `wait`, `ls`, `logs`, `inspect`, `attach`, `archive`, `stop`, `workspace create/ls/archive`, `heartbeat create/update/delete`, `schedule`, `provider ls/models`. Daemon: `127.0.0.1:6767`, systemd `paseo.service`. `jq` is NOT installed; parse `--json` output with `python3 -c 'import json,sys;...'` (or read it directly).

## Maintenance

On paseo version bumps, re-verify the CLI flags above (`paseo <cmd> --help`) and the `--json` field names the playbook relies on (`workspaceId`, agent `agentId`, inspect `Cwd`/`Status`). If pi-native subagents are ever wanted again, install an existing community extension; we do not maintain our own spawn tool.
