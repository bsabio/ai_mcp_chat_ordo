# Sprint 3 Seam Coverage Map

## Shipped Coverage

| Surface | Real seam preserved | Controlled doubles | Primary proof | Files |
| --- | --- | --- | --- | --- |
| stream route final prompt boundary | real `createSystemPromptBuilder(...)` delegation, real prompt runtime build, real route-level tool prefiltering, real `inspect_runtime_context` execution | session resolution, conversation services, prompt-slot repository reads, provider transport | the inspected `promptRuntime.text` exactly matches the provider-facing `systemPrompt` after route-level tool selection | `tests/chat/chat-stream-route.prompt-runtime-seam.test.ts`, `tests/helpers/provider-boundary-harness.ts` |
| stream pipeline request-time prompt assembly | real prompt runtime result, real context-window warning generation, real current-page formatting, real routing block, real referral block, real task-origin block | prompt-slot repository reads | `prepareStreamContext(...)` returns a real `promptRuntimeResult` with the expected sections and fallback slot refs | `tests/stream-pipeline.prompt-runtime-seam.test.ts` |
| direct-turn prompt provenance | real direct-turn adopter path already landed before Sprint 3 | provider call boundary | tool execution context carries `promptRuntime` and manifest-aware prompt text | `src/lib/chat/chat-turn.test.ts` |
| live-eval prompt provenance | real live runtime and runner adoption already landed before Sprint 3 | deterministic runtime doubles | runtime inspection returns `promptRuntime` with live-eval-specific sections | `tests/evals/eval-live-runner.test.ts` |
| shared provider boundary | request messages, abort-signal presence, tool calls, tool results including tool-error continuity, delta flow, and stop reason are preserved through one reusable helper | real Anthropic transport | the same harness shape now drives both route-level and live-runtime coverage | `tests/helpers/provider-boundary-harness.ts`, `tests/chat/chat-stream-route.prompt-runtime-seam.test.ts`, `tests/evals/eval-live-runner.test.ts` |

## What Sprint 3 Added

1. A reduced-mock stream-route seam test that proves the final provider-facing prompt is the same prompt exposed through governed runtime inspection.
2. A pipeline seam test that proves request-time sections become real prompt-runtime contributions instead of builder-call side effects.
3. A reusable provider-boundary harness that keeps request shape and tool-executor behavior intact while replacing only the external provider transport.

## Verification Bundle Used

```bash
npm exec vitest run \
  tests/prompt-control-plane.service.test.ts \
  tests/prompt-control-plane-equivalence.test.ts \
  tests/prompt-control-plane-read-parity.test.ts \
  src/core/use-cases/tools/inspect-runtime-context.tool.test.ts \
  src/lib/chat/chat-turn.test.ts \
  src/app/api/chat/stream/route.test.ts \
  tests/chat/chat-stream-route.test.ts \
  tests/chat/chat-stream-route.prompt-runtime-seam.test.ts \
  tests/stream-pipeline.test.ts \
  tests/stream-pipeline.prompt-runtime-seam.test.ts \
  tests/evals/eval-live-runner.test.ts
```

Observed result: 11 files, 98 tests passed.
