# Lesson: pi does not reject bad model ids; the provider does

From project `004-subagent-model-param` (2026-07-24).

## What happened

The implementation plan predicted that passing a bogus model to `pi --model`
would make pi exit non-zero, and the smoke test read the top-level tool-envelope
`isError`. Both predictions were wrong. In pi 0.81.1, an unknown model id is NOT
rejected at process level: pi logs `Warning: Model "..." not found for provider
"...". Using custom model id.`, keeps `exitCode=0`, and forwards the id to the
provider. The provider then 404s (`model_not_found`), the worker records
`stopReason=error`, and the subagent tool surfaces the failure as its returned
`result.isError=true` with content `Agent error: 404: ... model_not_found`. The
top-level envelope `isError` stays `false` because the tool execution itself did
not crash.

## The rule

pi treats an unrecognized `--model` value as a pass-through "custom model id"
and lets the provider reject it. So a tool that forwards a model string straight
to `pi --model` gets error surfacing as `result.isError=true` /
`stopReason=error`, NOT a non-zero process exit. When testing bad-model
behavior, assert on the tool/result `isError`, never on the exit code; and don't
write docs claiming pi prints an available-model list or exits non-zero on a bad
model.

## The fix used

The lead accepted the plan's Step 7 as satisfied (the design intent, pure
pass-through with the bad value surfacing as an error, was met and verified) and
treated the mismatch as a plan-prediction defect, not a code defect. The
tool-description wording was aligned with the docs: a bad value is forwarded
unchanged and the provider rejects it (`model_not_found`), surfacing as a tool
error (`isError=true`).
