# Sprint 4 Artifact — Provider Policy Equivalence Matrix

> This artifact proves that stream and direct-turn chat surfaces resolve
> identical provider resilience policy, use identical error classification,
> and emit identical observability events.

## Policy Resolution Equivalence

| Policy Field | Stream Source | Direct-Turn Source | Equivalent? |
| --- | --- | --- | --- |
| `timeoutMs` | `resolveProviderPolicy().timeoutMs` | `resolveProviderPolicy().timeoutMs` | ✅ Same function, same env var |
| `retryAttempts` | `resolveProviderPolicy().retryAttempts` | `resolveProviderPolicy().retryAttempts` | ✅ Same function, same env var |
| `retryDelayMs` | `resolveProviderPolicy().retryDelayMs` | `resolveProviderPolicy().retryDelayMs` | ✅ Same function, same env var |
| `modelCandidates` | `resolveProviderPolicy().modelCandidates` | `resolveProviderPolicy().modelCandidates` | ✅ Same function, same env var |

Both paths call `resolveProviderPolicy()` from `src/lib/chat/provider-policy.ts`
exactly once per request. Verified by cross-path import tests that read the
actual source files and confirm no local policy constants remain.

## Error Classifier Equivalence

| Classifier | Stream Import | Direct-Turn Import | Equivalent? |
| --- | --- | --- | --- |
| `isModelNotFoundError` | `provider-policy.ts` | `provider-policy.ts` | ✅ Same function |
| `isTimeoutError` | `provider-policy.ts` | `provider-policy.ts` | ✅ Same function |
| `isTransientProviderError` | `provider-policy.ts` | `provider-policy.ts` | ✅ Same function |
| `classifyProviderError` | `provider-policy.ts` | `provider-policy.ts` | ✅ Same function |
| `toErrorMessage` | `provider-policy.ts` | `provider-policy.ts` | ✅ Same function |

Verified by cross-path import tests that confirm no local classifier function
definitions exist in either consumer file.

## Error Wrapping

| Behavior | Stream | Direct-Turn |
| --- | --- | --- |
| Error type thrown | `ChatProviderError` | `ChatProviderError` |
| Wrapping point | Inline in catch block | `normalizeProviderError()` via error handler chain |
| Double-wrapping risk | None — no decorator layer | None — `withProviderErrorMapping` removed from `chat-turn.ts` |

Before Sprint 4 QA fix, `chat-turn.ts` wrapped the provider in both
`withProviderErrorMapping` (which wraps errors in `ChatProviderError`) and
the provider's own `normalizeProviderError()` (which also wraps in
`ChatProviderError`), causing double-wrapping. The decorators have been
removed. The canonical error normalization lives inside
`createMessageWithModelFallback` only.

## Observability Equivalence

| Event Kind | Stream Emits? | Direct-Turn Emits? | Shape Equivalent? |
| --- | --- | --- | --- |
| `provider.attempt_start` | ✅ | ✅ | ✅ Same `ProviderAttemptEvent` |
| `provider.attempt_success` | ✅ | ✅ | ✅ Same fields |
| `provider.attempt_retry` | ✅ | ✅ | ✅ Same fields |
| `provider.attempt_failure` | ✅ | ✅ | ✅ Same fields |
| `provider.model_fallback` | ✅ | ✅ | ✅ Same fields |

Before Sprint 4 QA fix, the direct-turn path had two overlapping
observability layers: `withProviderTiming` (decorator) emitting
`provider.call` events, and inline `emitProviderEvent` calls emitting
per-attempt events. The decorator has been removed. Both paths now use
only the inline `emitProviderEvent` contract.

## Test Coverage

`src/lib/chat/provider-policy.test.ts` — **43 tests** including:

- Policy resolution validity and consistency (2)
- Error message extraction (3)
- `isModelNotFoundError` classifier (3)
- `isTimeoutError` classifier (3)
- `isTransientProviderError` classifier (14 via `it.each`)
- `delay` timing (1)
- `classifyProviderError` for all 6 error categories (6)
- `emitProviderEvent` contract tests for 3 event kinds (3)
- Module stability: policy determinism, classifier determinism, event type (3)
- Cross-path import verification: 6 tests that read actual source files to
  verify both consumer files import from `provider-policy.ts`, use no local
  constants, no local classifiers, and both use `ChatProviderError` and
  `emitProviderEvent`
