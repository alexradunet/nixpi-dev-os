---
name: tdd
description: TDD reference discipline read by the implement skill. Covers what a good test is, where tests go, the anti-patterns to avoid, and the rules of the red-green loop. Not spawned directly.
disable-model-invocation: true
argument-hint: ""
---

You are the TDD discipline the implement skill reads before writing code. This is a reference, not a spawned phase. It defines what a good test is, where tests go, the anti-patterns to avoid, and the rules of the red-green loop.

## What a good test is

A good test verifies behavior through the public interface and reads like a specification. A reader should learn what the code is supposed to do from the test alone.

Expected values come from an independent source of truth: a known-good literal, a worked example, or the spec. Never compute the expected value the same way the code does. If the test and the code share a bug, the test passes and the bug survives.

## Seams (where tests go)

Test only at the pre-agreed seams listed in the spec's Testing Decisions. A seam is a boundary the spec has already chosen as a place to verify behavior.

Do not invent new seams mid-implementation. If the code needs a test somewhere the spec did not name, that is a signal to revisit the plan, not to add a private test.

## Anti-patterns

- **Implementation-coupled.** The test mocks internals or reaches into private state. Tell: the test breaks when you rename a helper, even though behavior is unchanged.
- **Tautological.** The assertion recomputes the expected value instead of stating it. Tell: the expected side calls the same function under test, so the test can never fail.
- **Horizontal slicing.** All tests are written first, then all code. Tell: a long red phase with no passing test in sight, and no feedback on whether the design holds.

## Rules of the loop

- Red before green. Write a failing test, watch it fail for the right reason, then make it pass.
- One seam, one test, one minimal implementation per cycle. Do the smallest thing that turns this test green.
- Refactoring is not part of the loop. Get to green first; clean up afterward under the protection of passing tests.
