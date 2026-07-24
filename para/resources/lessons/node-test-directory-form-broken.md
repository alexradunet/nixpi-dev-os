# Lesson: `node --test <dir>` is broken on Node 24; use a quoted glob

From project `005-harness-review` (2026-07-24).

## What happened

The plan prescribed, and the implementer documented in the README, the test
command `node --test pi/orchestrator/`. On Node v24.18.0 that form does not
work: node treats the directory argument as a module to load and dies with
`Error: Cannot find module '.../pi/orchestrator'` (MODULE_NOT_FOUND, exit 1),
with or without the trailing slash. The implementer verified with the glob form
but documented the directory form, so the committed README advertised a command
that did not run. The review caught it; the fix was the quoted glob.

## The rule

On Node 24.x, do not pass a bare directory to `node --test`. Use one of:

- `node --test "pi/orchestrator/*.test.ts"` — quoted so node expands the glob
  itself (portable across shells); this is the documented command now.
- `node --test pi/orchestrator/*.test.ts` — shell-expanded glob.
- `cd pi/orchestrator && node --test` — bare runner from inside the directory.

And: verify a documented test command by actually running it before committing
the doc. "I verified with a slightly different invocation" is how a broken
command gets shipped.
