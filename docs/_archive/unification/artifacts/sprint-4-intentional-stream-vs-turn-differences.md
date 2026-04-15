# Sprint 4 Artifact — Intentional Stream vs Direct-Turn Differences

> This artifact documents the behavioral differences between the stream
> and direct-turn chat transport paths that are **intentional**, not drift.
> Both paths share the same policy, classifiers, and observability contract.
> The differences below reflect legitimate transport-level requirements.

## Timeout Handling

| Behavior | Stream (`anthropic-stream.ts`) | Direct-Turn (`anthropic-client.ts`) |
| --- | --- | --- |
| Timeout mechanism | `createAbortTimeout()` + `AbortSignal.any()` | `Promise.race()` with timeout promise |
| Retry on timeout | ✅ Yes, unless `completedRounds > 0` | ❌ No — fail-fast |
| Rationale | Stream can timeout on first attempt due to slow cold-start; worth retrying. After a successful round, the payload grew — retrying won't help. | Direct-turn with the same payload will always be slow. Retrying amplifies latency without benefit. |

## Cancellation

| Behavior | Stream | Direct-Turn |
| --- | --- | --- |
| User-initiated abort | ✅ Supported via `AbortSignal` propagation | ❌ Not supported (no signal parameter) |
| Abort between tool rounds | ✅ Checked after each tool call | N/A |
| AbortError creation | Explicit `createAbortError(signal)` helper | N/A |

The stream path supports user cancellation because the UI has a "Stop" button.
The direct-turn path has no UI — it's a synchronous API call.

## Error Normalization

| Behavior | Stream | Direct-Turn |
| --- | --- | --- |
| Terminal error type | `ChatProviderError` | `ChatProviderError` |
| Error handler pattern | Inline in catch block | `errorHandlerChain` array |
| Original error preserved | Via `ChatProviderError.cause` | Via `ChatProviderError.cause` |

Both paths now throw `ChatProviderError` for all provider failures
(before Sprint 4, stream threw raw `Error`).

The direct-turn path uses a structured `errorHandlerChain` pattern with
pluggable handlers (`modelNotFoundHandler`, `transientRetryHandler`,
`defaultThrowHandler`). The stream path uses an inline catch block.  
Both patterns produce the same outcomes for the same inputs.

## Retry Backoff

| Behavior | Stream | Direct-Turn |
| --- | --- | --- |
| Backoff formula | `retryDelayMs * attempt` (linear) | `retryDelayMs * attempt` (linear) |
| Shared `delay()` | ✅ From `provider-policy.ts` | ✅ From `provider-policy.ts` |

Identical. No drift.

## Tool Execution

| Behavior | Stream | Direct-Turn |
| --- | --- | --- |
| Multi-round tool loops | ✅ Up to `maxToolRounds` | ❌ Single round via `orchestrateChatTurn` |
| Tool-use abort checking | ✅ Between each tool call | N/A |
| Max tool rounds default | `CHAT_CONFIG.maxToolRounds` | N/A |

The stream path implements a full multi-round agenic loop with tool call,
tool result, and re-prompt cycles. The direct-turn path delegates to
`orchestrateChatTurn` which handles single-round tool execution.

## What is NOT intentionally different

These were **drift** that Sprint 4 eliminated:

1. ~~Error classifiers were copy-pasted~~ → now shared from `provider-policy.ts`
2. ~~Timeout/retry defaults were hardcoded independently~~ → now from `resolveProviderPolicy()`
3. ~~Stream threw raw `Error`, direct-turn threw `ChatProviderError`~~ → both throw `ChatProviderError`
4. ~~Stream had zero observability~~ → both emit `ProviderAttemptEvent` events
5. ~~`delay()` was defined twice~~ → now shared from `provider-policy.ts`
