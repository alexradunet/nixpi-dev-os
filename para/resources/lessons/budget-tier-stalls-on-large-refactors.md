# Lesson: budget-tier models stall on large mechanical refactors

From project `005-harness-review` (2026-07-24).

## What happened

The implement phase ran on `qwen3.6-flash` (budget). It executed the
prescriptive workstreams flawlessly — the fail-closed gate, the streaming
fixes, 49 passing tests, all committed and verified. Then it hit the file
split (extracting `spawn.ts`/`render.ts` from a 1053-line `index.ts`) and
stalled: it extracted code with `sed` and Python byte-manipulation, corrupted
the indentation, and trusted `node --check`, which PASSES even when pi's
transpiler rejects a file. It spiraled through "multiple approaches," left two
broken orphan files, and reported a blocker.

The recovery ran on `qwen3.8-max-preview` (mid) with a corrected protocol and
finished cleanly: write each new module fresh with correct indentation, delete
the moved blocks from `index.ts` with exact-match edits, and run the live pi
load smoke after every single module move as the source of truth.

## The rule

Budget tier is for literal execution of small, fully-specified steps — not for
large mechanical refactors that need structural judgement (where a block ends,
how to re-indent, whether a move broke loading). For file splits and big
refactors, use mid tier or higher, and dictate the protocol in the plan or
delegation:

- one module at a time, not a big-bang extraction;
- write new files fresh and correctly indented; do not mechanically re-indent
  extracted text or use byte-level tooling;
- the verification that matters is the RUNTIME check (the extension actually
  loads: `pi --no-extensions -e ./pi/orchestrator/index.ts -p --no-session
  --model <budget> --thinking off "Reply with exactly: ok"`), never a
  syntax-only check like `node --check`, which lies here;
- run the test suite after every move so regressions surface at the move that
  caused them.
