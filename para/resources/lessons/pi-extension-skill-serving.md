# Lesson: how pi serves skills and prompts from an extension

From project `003-orchestrator-extension` (2026-07-24). These were open questions
during the grill, resolved empirically against pi 0.81.1 (throwaway extension +
live `pi -p` runs) before the implementation relied on them.

## What happened

Packaging the orchestration as one extension required three behaviors that the
docs did not state outright. All three were confirmed by experiment:

1. **`skillPaths` accepts a directory of skills, not just single files.** A
   `resources_discover` handler returning `{ skillPaths: [<dir>] }` where `<dir>`
   contains `{name}/SKILL.md` subdirs discovers every skill (pi recurses; a dir
   that itself holds a `SKILL.md` is one skill, otherwise it descends). Returning
   the directory is enough; no need to glob and return each `SKILL.md` path.
2. **`disable-model-invocation: true` is honored for extension-served skills.**
   The flag is parsed at load time regardless of discovery source. Such a skill
   is hidden from the model's auto-invokable list but still loads via its
   `/skill:{name}` slash command. This is how the orchestration skills stay
   explicit-only.
3. **`before_agent_start` appends to the per-turn base prompt, so injected text
   does not accumulate.** A handler returning
   `{ systemPrompt: event.systemPrompt + "\n\n" + content }` fires each turn from
   the freshly built base prompt, so the same content appears once per turn, never
   twice in one prompt. Instructional content belongs here, not in a context
   message (which would be conversational noise).

## The rule

When an extension needs to ship skills or inject standing instructions, verify the
mechanism with a throwaway extension and a live `pi -p` run before building on it.
Confirmed facts: a directory in `skillPaths` recurses; `disable-model-invocation`
works for served skills (slash command survives); `before_agent_start` is the
right hook for non-accumulating system-prompt injection.

## The fix used

`pi/orchestrator/index.ts` returns `{ skillPaths: [SKILLS_DIR] }` from
`resources_discover` (one directory, all 7 skills) and appends the bundled
playbook in `before_agent_start`. No glob fallback was needed.
