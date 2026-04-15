# Sprint 2 — Routing Confidence, Suggestion Quality, And Session Resolution

> **Status:** Completed
> **Goal:** Tune interruption thresholds, prioritize suggestion quality over
> count, and add a lightweight session-resolution signal.

## Problem

Even after response-state gating exists, the system can still lose trust if it:

- interrupts coherent requests with unnecessary clarifying questions
- keeps generating low-quality filler suggestions because of quota pressure
- has no way to mark that something meaningful was completed in the session

## Primary Areas

- `src/lib/chat/policy.ts` (System prompt assembly context)
- `src/lib/chat/routing-analysis.ts` (Routing threshold and override logic)
- `src/lib/chat/session-resolution.ts` (Session signal processing and suggestion normalization)
- `src/lib/chat/runtime-hooks.ts` (Turn completion telemetry payload)
- Test suite (`routing-analysis.test.ts`, `session-resolution.test.ts`)

## Tasks

| Status | Task | Implementation Details |
| :--- | :--- | :--- |
| `[x]` | **Clarification threshold tuning** | `CLARIFICATION_INTERRUPT_THRESHOLD` set to `0.25` in `routing-analysis.ts`. Ambiguous signals correctly defer to clarification only below threshold. |
| `[x]` | **Content-based override** | Implemented `shouldSuppressClarifyingTurn` and `looksLikeCoherentRequest` in `routing-analysis.ts` to suppress interruptions for coherent technical asks. |
| `[x]` | **Suggestion quality rules** | `normalizeSuggestions` in `session-resolution.ts` clamps count to 4 and enforces a 60-character length limit, prioritizing quality over count. |
| `[x]` | **Session-resolution signal** | Implemented `resolveSessionResolutionSignal` returning `advanced`, `resolved`, or `blocked` signals alongside a formal `reason`. |
| `[x]` | **Metrics alignment** | Added `sessionResolutionKind`, `sessionResolutionReason`, and `sessionResolutionResponseState` properties to `TurnCompletionHookState` in `runtime-hooks.ts`. |

## Acceptance Criteria

1. Coherent technical asks do not trigger avoidable clarifying turns. (Verified via `routing-analysis.test.ts` overrides)
2. Suggestion counts vary naturally and never pad to hit a quota. (Verified via `normalizeSuggestions` logic)
3. The system can record when a session produced a concrete output. (Verified via `deriveResponseState` & `looksLikeConcreteOutput`)
4. Regression tests prove the override logic and quality-over-count behavior. (Verified by formal test suites)

## Verification

```bash
# Verify unit tests for routing and session resolution logic pass locally
npm run test:unit src/lib/chat/routing-analysis.test.ts src/lib/chat/session-resolution.test.ts
```