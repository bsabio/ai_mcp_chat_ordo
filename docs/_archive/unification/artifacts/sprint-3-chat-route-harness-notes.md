# Sprint 3 Chat Route Harness Notes

## Shared Harness

Sprint 3 adds `tests/helpers/provider-boundary-harness.ts` as the common external-boundary double for chat-provider seams.

The helper preserves these runtime contracts:

1. provider-facing request messages
2. provider-facing abort-signal presence
3. provider-facing `systemPrompt`
4. provider-facing `tools`
5. tool-call envelopes
6. tool-result envelopes, including tool-error continuity
7. streamed delta callbacks
8. deterministic stop-reason reporting

It deliberately does not simulate Anthropic SDK internals, retries, or wire protocol details.

## Route Harness Shape

`tests/chat/chat-stream-route.prompt-runtime-seam.test.ts` keeps these pieces real:

1. `src/app/api/chat/stream/route.ts`
2. `src/lib/chat/stream-pipeline.ts` route assembly path
3. `src/lib/chat/policy.ts` delegation into prompt runtime
4. `src/lib/chat/prompt-runtime.ts`
5. route-level tool prefiltering from `getRequestScopedToolSelection(...)`
6. governed runtime inspection through `createInspectRuntimeContextTool(...)`

The test replaces only these boundaries:

1. session and conversation-service wiring
2. prompt-slot repository reads, forced to fallback mode by returning no active DB prompt rows
3. external provider transport via the shared provider-boundary harness

## Why This Is The Right Seam

Earlier route tests proved branching and streaming behavior, but they mocked prompt assembly so heavily that they could not prove the final prompt boundary.

The Sprint 3 route harness proves the one boundary Sprint 4 needs most:

1. the provider receives a post-tool-selection `systemPrompt`
2. tool execution receives the same prompt through `ToolExecutionContext.promptRuntime`
3. `inspect_runtime_context` can expose that final prompt truth without test-only hooks

## Reuse Guidance For Sprint 4

If provider-policy changes need new coverage, extend this harness by adding step sequences rather than mocking broader route internals again.

Preferred extension points:

1. add more tool-call steps to the provider harness
2. vary the registered tool set to exercise policy filtering
3. vary routing snapshots to exercise lane-dependent tool manifests
4. keep the provider boundary deterministic and avoid re-mocking prompt assembly
