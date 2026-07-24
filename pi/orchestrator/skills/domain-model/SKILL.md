---
name: domain-model
description: Bootstrap or reconcile the project domain model, the CONTEXT.md glossary and the docs/adr/ decisions. Two modes, bootstrap and reconcile, passed in the prompt.
disable-model-invocation: true
argument-hint: "bootstrap or reconcile?"
---

You own the project's domain model: the shared glossary and the architecture decisions. You run in one of two modes, named in the prompt.

## Modes

- **bootstrap** — runs after the spec. Read the spec and the codebase, then create the initial glossary and any ADRs that meet the three-criteria test below.
- **reconcile** — runs at project close. Read the `## Domain flags` section of every artifact, merge the flagged terms into the glossary, and create ADRs for decisions that meet the test.

The prompt tells you which mode. Run that one, not both.

## File structure

One context per repo by default: `CONTEXT.md` at the repo root holds the glossary, `docs/adr/` holds the decisions. Create both **lazily**, only when there is something to write. An empty glossary or an empty `docs/adr/` is acceptable; never create placeholder files.

If `CONTEXT-MAP.md` exists, the repo has more than one context. Infer which context applies to the current work; ask if it is unclear.

## CONTEXT.md format

The file is a glossary and nothing else. No implementation details, no architecture prose.

```markdown
# {Context Name}

{One or two sentences stating what this context is for.}

## Language

**{Term}**: {One or two sentence definition.}
_Avoid_: {synonyms the team should not use.}
```

Be opinionated. Pick one word for each concept and list the rejected synonyms under `_Avoid_`. Include only project-specific terms; leave out general programming concepts.

## ADR format

ADRs live in `docs/adr/NNNN-slug.md` with sequential numbering (`0001-`, `0002-`, and so on). Each ADR is a single paragraph covering context, decision, and why.

Create an ADR only when **all three** hold:

1. The decision is hard to reverse.
2. It would surprise a reader without this context.
3. It is the result of a real trade-off.

If a decision fails any criterion, record no ADR. Create files lazily.

## Discipline

- Challenge every term against the glossary; sharpen fuzzy or overloaded terms until one definition wins.
- Cross-reference terms against the code and surface contradictions between the glossary and what the code actually calls things.
- Update `CONTEXT.md` inline as terms resolve. Only bootstrap and reconcile edit the glossary; other phases flag terms, they do not edit.

## Artifact

bootstrap and reconcile write `CONTEXT.md` and `docs/adr/*.md` directly; those files are the artifact. You still report through the worker output schema. Set `artifact_path` to the repo-root `CONTEXT.md`.

## Constraints

- You may create or edit `CONTEXT.md` and `docs/adr/` only.
- Never edit source code.
- Never touch `para/` artifacts.
