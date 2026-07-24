# Model Registry

Manual registry of available models, their tiers, and recommended use cases.
Updated by the user based on benchmarks (ai arena), budget, and quota.

The orchestrator reads this file to recommend models for each task phase.

## Complexity rubric

| Tier | When to use | Examples |
|------|-------------|----------|
| premium | Deep reasoning, architecture, adversarial grilling, complex multi-file plans | Grill on a new system, plan a migration, audit security |
| mid | Solid implementation, standard planning, code review | Implement a well-specified plan, review a PR, explore a bug |
| budget | Fast execution of literal steps, simple fixes, formatting | Execute a plan step-by-step, fix a typo, run a checklist |

## Active models

| Model (paseo --provider value) | Tier | Strength | Status |
|-------|------|----------|--------|
| pi/openai-codex/gpt-5.6-sol | premium | Deep reasoning, architecture, adversarial analysis | exhausted (no quota) |
| pi/openai-codex/gpt-5.6-terra | mid | Solid implementation, reliable planning | active |
| pi/openai-codex/gpt-5.6-luna | budget | Fast execution, follows plans literally | active |
| pi/qwen-token-plan/qwen3.8-max-preview | mid | Good all-rounder, strong at code | active |
| pi/qwen-token-plan/qwen3.7-plus | mid | Reliable implementation | active |
| pi/qwen-token-plan/qwen3.6-flash | budget | Cheap, fast, simple tasks | active |
| pi/qwen-token-plan/glm-5.2 | mid | Alternative perspective for reviews | active |

## Phase defaults

| Phase | Default tier | Fallback |
|-------|-------------|----------|
| grill | premium | mid |
| explore | mid | budget |
| plan (feature) | premium | mid |
| plan (fix) | mid | budget |
| plan (audit) | premium | mid |
| implement | mid | budget |
| review | mid | premium (for security/architecture) |
| teach | mid | premium (for deep topics) |
| janitor | budget | mid |

Spawned phases (delegated via `paseo run`; model comes from the role briefing's `provider` field): explore, plan, implement, review. In-session phases (run on the orchestrator's own model): grill, teach, janitor.

## Notes

- As of 2026-07-23: `gpt-5.6-sol` has no quota. `pi/qwen-token-plan/qwen3.8-max-preview` is the global default and the effective top-tier model — recommend it wherever "premium" is called for until sol quota returns.
- Update this file when quota changes, new models become available, or benchmarks shift.
- The orchestrator recommends; the user always confirms before spawn.
- If a model's status is `exhausted` or `removed`, the orchestrator falls back to the next model in the same tier.
- Multi-model review panels should use models from different providers when possible (reduces correlated blind spots).
