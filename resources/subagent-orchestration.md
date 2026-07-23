# Subagent orchestration

How this repo delegates autonomous work to spawned pi workers. Source: project `002-pi-orchestrator` (2026-07-24).

## The mechanism

The `subagent` tool (a patched copy of pi's official example at `pi_extensions/orchestrator/`) runs each delegation as a **one-shot `pi` subprocess** (`pi --mode json -p --no-session`) with an isolated context window. Task in, artifact out. Workers are stateless pure functions of (brief, committed repo state).

Workers spawn with `NIXPI_WORKER=1` in their environment; the extension factory skips registering the spawner tool when that var is set (no nesting), but still serves the skills and injects the playbook, so workers get the methodology. The tool also injects `NIXPI_SKILLS_DIR` into the worker env.

## Spawnable vs in-session

The filesystem is the contract: a phase is spawnable **iff** its role file exists in the extension's `roles/`.

- **Spawnable** (role files present): explore, plan, implement, review.
- **In-session** (no role file; invoke the skill directly): grill, teach, janitor. Grill and teach are interactive (decisions belong to the user); janitor is trivial.

## Role format

`pi_extensions/orchestrator/roles/{name}.md`, bundled in the extension. Frontmatter:

```yaml
name: review
description: Review worker — ...
model: qwen-token-plan/qwen3.8-max-preview
thinking: high
tools: read, bash, write
```

The body is the worker's system prompt and must point the worker at its skill (`$NIXPI_SKILLS_DIR/{name}/SKILL.md`). Never embed the skill's methodology in the role; it duplicates and drifts.

**YAML hazard:** frontmatter is parsed as strict YAML. Quote any `description` containing a colon, or discovery crashes instead of skipping the file (see `resources/lessons/pi-role-yaml-frontmatter.md`).

## Worktree contract

The orchestrator stays in the main checkout. Before delegating `implement`, it creates a worktree (`git worktree add ../<repo-dir>-{NNN}-{slug} -b {NNN}-{slug}`) and passes `cwd: <worktree>`. `implement` and `review` get the worktree cwd; `explore` and `plan` run with the default cwd (main checkout). Plan and prior artifacts must be committed before `implement`, so the worktree sees a coherent state.

## Adding a spawnable role

Drop `{name}.md` into `pi_extensions/orchestrator/roles/` and rebuild. The tool discovers it from the bundled `roles/` directory.

## Maintenance

On pi version bumps, diff `pi_extensions/orchestrator/` against the new store's example and re-apply the four local patches (they must stay the only behavioral diff):

1. `agents.ts` — `thinking` frontmatter support; bundled `roles/` discovery (`"bundled"` source via `import.meta.url`).
2. `index.ts` — pass `--thinking <level>`; set `NIXPI_WORKER=1` and `NIXPI_SKILLS_DIR` in the spawn env.
3. `index.ts` — factory nesting guard (tool only; hooks still run in workers).
4. `index.ts` — `resources_discover` serves bundled `skills/`; `before_agent_start` injects the bundled `AGENTS.md` playbook.

## Why this shape

Subprocess one-shot beat the alternatives: in-process SDK sessions (more wiring, shared event loop, recursion hack) and a tmux pane layer (visibility turned out not to be needed; progress streams into the tool call). Subprocesses give crash isolation, stay stateless, and track upstream with a ~15-line patch.
