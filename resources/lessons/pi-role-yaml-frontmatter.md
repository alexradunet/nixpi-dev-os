# Lesson: pi role frontmatter is strict YAML

From project `002-pi-orchestrator` (2026-07-24).

## What happened

The `subagent` tool's discovery crashed with `Nested mappings are not allowed in compact mappings` instead of listing agents. The cause: `janitor.md`'s description contained a colon+space (`...completed project: distill knowledge...`). pi's `parseFrontmatter` is a real YAML parser, and an unquoted scalar with `: ` parses as a nested mapping. The throw happens before the "skip files without `name`" check, so one malformed role kills discovery for all roles.

## The rule

Role frontmatter (`.pi/agents/*.md`) must be valid YAML. Quote any `description` that contains a colon:

```yaml
description: "Janitor worker — closes out a project: distill, then archive."
```

## Watch for

This bites silently when adding or editing a role: discovery throws rather than skipping, so the tool reports a YAML error instead of an agent list. The four surviving roles (explore, implement, plan, review) have colon-free descriptions and parse cleanly. The warning now also lives in the AGENTS.md roles section.
