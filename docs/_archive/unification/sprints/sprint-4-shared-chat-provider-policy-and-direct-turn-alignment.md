# Sprint 4 — Shared Chat Provider Policy And Direct-Turn Alignment

> **Status:** Complete
> **Goal:** Extract one shared provider-policy contract for stream and
> direct-turn chat while preserving the transport-specific strengths of each
> path.
> **Spec ref:** `UNI-120` through `UNI-159`
> **Prerequisite:** Sprint 3 complete

## Why This Sprint Exists

Chat currently contains two separate Anthropic runtime policies.

That is the highest-value runtime duplication in the repo, but it should only be
 attempted after prompt provenance and seam tests are in place.

## Primary Areas

- `src/lib/chat/anthropic-stream.ts`
- `src/lib/chat/anthropic-client.ts`
- `src/lib/chat/chat-turn.ts`
- provider decorators, error mapping, and observability hooks
- any new provider-policy runtime modules

## Tasks

1. **Create shared provider-policy resolution**
   - Define one policy source for timeout, retry, retry delay, fallback models,
     and structured provider metrics.

2. **Align stream and direct-turn policy**
   - Make `anthropic-stream.ts` and the direct-turn path consume the same policy
     contract while preserving their transport-specific control flow.

3. **Normalize provider observability and error mapping**
   - Ensure stream and direct-turn paths report provider attempts, fallbacks,
     duration, and failure shape coherently.

4. **Document intentional differences**
   - Explicitly preserve any stream-only behavior such as tool-round-specific
     fail-fast semantics where required.

5. **Add provider-policy equivalence tests**
   - Prove that stream and direct-turn chat resolve the same governing policy
     for the same use case.

## Required Artifacts

- provider-policy equivalence matrix
- provider observability field map
- documented list of intentional stream-vs-turn differences

## Implementation Outputs

- shared chat provider-policy runtime or resolver
- aligned stream and direct-turn provider behavior
- provider policy and observability tests

## Acceptance Criteria

1. Chat no longer defines timeout, retry, and fallback policy in two separate
   places.
2. Stream and direct-turn chat can differ intentionally by transport, not by
   accidental policy drift.
3. Provider behavior is observable through one coherent contract.

## Verification

- chat provider-policy tests
- reduced-mock chat integration tests from Sprint 3 remain green
- diagnostics-clean changed files

## QA Closeout

Sprint 4 was implemented by extracting `src/lib/chat/provider-policy.ts` as the
single source of truth for provider resilience policy, error classification,
and structured provider observability.

### What was unified

1. `toErrorMessage(error)` — one canonical error-to-string helper
2. `isModelNotFoundError(error)` — one canonical model-not-found classifier
3. `isTimeoutError(error)` — one canonical timeout classifier
4. `isTransientProviderError(error)` — one canonical transient-error classifier
5. `classifyProviderError(error)` — one canonical error categorizer
   returning `"transient" | "model_not_found" | "timeout" | "abort" | "fatal"`
6. `resolveProviderPolicy()` — one canonical resolver for timeout, retry,
   retry delay, and model fallback candidates from environment config
7. `delay(ms)` — one shared delay helper
8. `emitProviderEvent(event)` — one shared observability emitter for all
   provider lifecycle events
9. `ChatProviderError` — both paths now throw the same error type;
   stream previously threw raw `Error` instances

### What was preserved

1. `anthropic-stream.ts` keeps its stream-specific abort/timeout logic
   (`createAbortTimeout` + `AbortSignal.any`) because streaming has different
   cancellation semantics.
2. `anthropic-client.ts` keeps its `errorHandlerChain` pattern and `withTimeout`
   helper because the direct-turn transport uses `Promise.race`.
3. Both paths now import classifiers, policy, and observability from the
   shared module instead of defining their own copies.

### Intentional stream-vs-turn differences

| Behavior | Stream | Direct Turn | Rationale |
| --- | --- | --- | --- |
| Timeout mechanism | `createAbortTimeout` + `AbortSignal.any` | `Promise.race` | Stream needs abort signal propagation to cancel in-flight chunks |
| Abort handling | Explicit `AbortError` creation and signal listener | Not applicable | Stream supports user-initiated cancellation |
| Error handler chain | Inline in retry loop | `errorHandlerChain` array | Direct-turn path has a more structured error-resolution pipeline |
| Retry on timeout | Retries timeouts (unless after completed round) | Skips retry on timeout (fail-fast) | Direct-turn timeouts with same payload are not transient |

### Required Artifacts

1. `../artifacts/sprint-4-provider-policy-equivalence-matrix.md` — proves
   policy resolution, classifier, error wrapping, and observability equivalence
2. `../artifacts/sprint-4-provider-observability-field-map.md` — documents
   the `ProviderAttemptEvent` schema, event kinds, and log format
3. `../artifacts/sprint-4-intentional-stream-vs-turn-differences.md` —
   documents all intentional behavioral differences with rationale

## Verification Result

- `npm exec vitest run src/lib/chat/provider-policy.test.ts` — 1 file,
  37 tests passed (policy, classifiers, observability, equivalence)
- TypeScript typecheck passed with no new errors on any changed file
- Both stream and direct-turn paths emit structured `ProviderAttemptEvent`
  events through the shared `emitProviderEvent()` function
- Both paths throw `ChatProviderError` for all provider failures
- Zero duplicate error classifiers or policy constants remain
