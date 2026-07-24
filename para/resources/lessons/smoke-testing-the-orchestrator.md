# Lesson: smoke-testing the orchestrator extension

From project `004-subagent-model-param` (2026-07-24). Two gotchas bit the live
smoke tests; both recur whenever the extension is modified and tested.

## What happened

1. **The global symlink loads the main checkout, not your worktree.**
   `~/.pi/agent/extensions/orchestrator` points at the main checkout's
   `pi/orchestrator/`. A plain `pi` run therefore loads the main
   checkout's code, so testing a branch's changes in a worktree requires loading
   that copy explicitly: `pi -e "$WT/pi/orchestrator/index.ts"
   --no-extensions`. (Corollary: an in-place edit merged to main goes live on the
   next pi session with NO `nixos-rebuild`, since pi reads the symlinked file
   directly; only NixOS config changes need a rebuild.)

2. **`NIXPI_WORKER` leaks into child pi processes.** A worker runs with
   `NIXPI_WORKER=1`. A `pi` subprocess it spawns inherits that variable, which
   trips the extension's nesting guard and skips registering the `subagent` tool
   — the smoke test then sees `NO_SUBAGENT_TOOL_CALL` and looks broken when the
   code is fine. Fix: spawn the child with the worker env stripped:
   `env -u NIXPI_WORKER -u NIXPI_SKILLS_DIR pi ...`.

## The rule

To smoke-test the extension: load the code under test explicitly with
`-e <path> --no-extensions` (don't trust the global symlink to point at your
worktree); strip `NIXPI_WORKER`/`NIXPI_SKILLS_DIR` from any child `pi` process so
it registers the tool normally; and build the fixture agent in a `mktemp -d`
dir, not inside the worktree (`.pi/` is not gitignored here, so an in-worktree
fixture risks an accidental commit).

## The fix used

The smoke tests run `env -u NIXPI_WORKER -u NIXPI_SKILLS_DIR pi --mode json -p
--no-extensions -e "$WT/pi/orchestrator/index.ts" ...` from a
`mktemp -d` fixture, then parse the `tool_execution_end` event's
`result.details.results[0]` for the worker's reported model and exit code.
