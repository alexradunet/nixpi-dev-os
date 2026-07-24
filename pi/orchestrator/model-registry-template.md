# Model Registry

Manual registry of available models, their tiers, and recommended use cases.
Updated by the user based on benchmarks, budget, and quota.

The orchestrator reads this file to recommend models for each task phase.

## Complexity rubric

| Tier | When to use | Examples |
|------|-------------|----------|
| premium | Deep reasoning, architecture, adversarial grilling, complex multi-file plans | Grill on a new system, plan a migration, audit security |
| mid | Solid implementation, standard planning, code review | Implement a well-specified plan, review a PR, explore a bug |
| budget | Fast execution of literal steps, simple fixes, formatting | Execute a plan step-by-step, fix a typo, run a checklist |

## Active models

<!-- Fill one row per model from `pi --list-models --offline`. Model and Provider come from that output. Tier, Strength, and Status are user-edited: pi cannot know quota or tier. -->

| Model | Provider | Tier | Strength | Status |
|-------|----------|------|----------|--------|
| <model-id> | <provider> | TBD | TBD | TBD |

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

Spawned phases (delegated via the `subagent` tool; model comes from the role's frontmatter): explore, plan, implement, review. In-session phases (run on the orchestrator's own model): grill, teach, janitor.

## Notes

- Update this file when quota changes, new models become available, or benchmarks shift.
- The orchestrator recommends; the user always confirms before spawn.
- If a model's status is `exhausted` or `removed`, the orchestrator falls back to the next model in the same tier.
- Multi-model review panels should use models from different providers when possible (reduces correlated blind spots).
- A bundled role's frontmatter `model` is the floor for that phase, not the recommendation: `roles/review.md` ships at premium tier even though the phase-defaults table lists mid. The registry governs what the orchestrator recommends; the role governs what runs when nobody overrides.
