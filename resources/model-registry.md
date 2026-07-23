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

| Model | Provider | Tier | Strength | Status |
|-------|----------|------|----------|--------|
| gpt-5.6-sol | openai-codex | premium | Deep reasoning, architecture, adversarial analysis | exhausted (no quota) |
| gpt-5.6-terra | openai-codex | mid | Solid implementation, reliable planning | active |
| gpt-5.6-luna | openai-codex | budget | Fast execution, follows plans literally | active |
| qwen3.8-max-preview | qwen-token-plan | mid | Good all-rounder, strong at code | active |
| qwen3.7-plus | qwen-token-plan | mid | Reliable implementation | active |
| qwen3.6-flash | qwen-token-plan | budget | Cheap, fast, simple tasks | active |
| glm-5.2 | qwen-token-plan | mid | Alternative perspective for reviews | active |

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

## Notes

- As of 2026-07-23: `gpt-5.6-sol` has no quota. `qwen3.8-max-preview` (qwen-token-plan) is the global default and the effective top-tier model — recommend it wherever "premium" is called for until sol quota returns.
- Update this file when quota changes, new models become available, or benchmarks shift.
- The orchestrator recommends; the user always confirms before spawn.
- If a model's status is `exhausted` or `removed`, the orchestrator falls back to the next model in the same tier.
- Multi-model review panels should use models from different providers when possible (reduces correlated blind spots).
