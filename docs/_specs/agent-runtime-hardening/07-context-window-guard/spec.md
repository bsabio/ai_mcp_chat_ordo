# Context Window Guard — Hard Limits With Observable Safety Thresholds

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Add an explicit, observable safety gate to the context window lifecycle — a warn threshold that surfaces a user-visible signal when the session is approaching its limit, and a hard block threshold that prevents new messages from being sent when the effective context window is too small to produce reliable responses. Replace the current silent behavior where sessions degrade invisibly with explicit, instrumentable guard states.
> **Dependencies:** [Hook Pipeline](../01-hook-pipeline/spec.md) — the guard fires a void hook so plugins and analytics can observe warn/block events.
> **Affects:** `src/lib/chat/context-window.ts`, `src/app/api/chat/stream/route.ts`, `src/components/chat/ChatInput.tsx` (warn state), `src/core/tool-registry/ToolRegistry.ts`
> **Motivation:** At student scale, a session that silently degrades produces wrong answers with false confidence. A student in formation doesn't know their 65-turn session has a 16K effective context window left and the agent is now operating on a fragment of the conversation. The guard makes the degradation state explicit, observable by the platform, and surfaceable to the student before they get bad guidance.
> **Source:** OpenClaw `src/agents/context-window-guard.ts` — `resolveContextWindowInfo()`, `evaluateContextWindowGuard()`
> **Requirement IDs:** `CWG-001` through `CWG-099`

---

## 1. Problem Statement

### 1.1 Current State

OrdoSite's context window trimming happens silently in `context-window.ts`. There are no observable states, no user-facing signals, no hooks, no metric emission. The pipeline trims, the LLM responds, and the student has no idea the agent is now working with 20% of its original context. `[CWG-001]`

### 1.2 Impact At Student Scale

| Context Remaining | LLM Behavior | Student Experience |
|---|---|---|
| > 32K tokens | Full context available | Good |
| 16K–32K tokens | Approaching limit, some drift | Degrading silently |
| < 16K tokens | Operating on fragments | Contradicts earlier guidance, misses curriculum context |
| < 8K tokens | Responses unreliable | Risk of harmful formation misguidance |

Without the guard, the last two states are invisible. `[CWG-002]`

---

## 2. Design Goals

1. **Warn threshold.** At 32K tokens remaining, emit a warn-state event observable by hooks and optionally surface a UI signal. `[CWG-010]`
2. **Hard block threshold.** At 16K tokens remaining, block new messages with a clear, graceful error that prompts the user to compact or start a new session. `[CWG-011]`
3. **Source-attributed window resolution.** The effective context window must be resolved from the most specific configured source (models config > model metadata > per-agent override > system default) and the source must be logged. `[CWG-012]`
4. **Observable via hook.** Guard state transitions (ok → warn, ok/warn → block) must fire a hook event at the `void` tier. `[CWG-013]`
5. **Configurable per agent.** The warn and block thresholds must be overridable in per-agent configuration. `[CWG-014]`
6. **Graceful block messaging.** When blocked, the user receives a helpful message that tells them how to proceed (compact, new session), not a raw error. `[CWG-015]`

---

## 3. Architecture

### 3.1 Constants And Types

```typescript
export const CONTEXT_WINDOW_HARD_MIN_TOKENS = 16_000; // block below this
export const CONTEXT_WINDOW_WARN_BELOW_TOKENS = 32_000; // warn below this

export type ContextWindowSource =
  | "model"              // from model metadata
  | "modelsConfig"       // from models config override
  | "agentContextTokens" // from per-agent contextTokens cap
  | "default";           // fallback constant

export interface ContextWindowInfo {
  tokens: number;
  source: ContextWindowSource;
}

export interface ContextWindowGuardResult extends ContextWindowInfo {
  shouldWarn: boolean;
  shouldBlock: boolean;
  tokensRemaining: number;
}
```

`[CWG-031]`

### 3.2 Context Window Resolution

```typescript
export function resolveContextWindowInfo(params: {
  provider: string;
  modelId: string;
  modelContextTokens?: number;
  modelContextWindow?: number;
  agentContextTokensCap?: number;
  defaultTokens: number;
}): ContextWindowInfo {
  // Priority: modelsConfig override > model metadata > default
  // Then: if agentContextTokensCap < base, use cap (with source "agentContextTokens")
}
```

`[CWG-032]`

### 3.3 Guard Evaluation

```typescript
export function evaluateContextWindowGuard(params: {
  info: ContextWindowInfo;
  usedTokens: number;
  warnBelowTokens?: number;
  hardMinTokens?: number;
}): ContextWindowGuardResult {
  const remaining = Math.max(0, params.info.tokens - params.usedTokens);
  const warnBelow = params.warnBelowTokens ?? CONTEXT_WINDOW_WARN_BELOW_TOKENS;
  const hardMin = params.hardMinTokens ?? CONTEXT_WINDOW_HARD_MIN_TOKENS;
  return {
    ...params.info,
    tokensRemaining: remaining,
    shouldWarn: remaining < warnBelow,
    shouldBlock: remaining < hardMin,
  };
}
```

`[CWG-033]`

### 3.4 Guard Integration In Pipeline

On each turn, before assembling the LLM request:

```typescript
const guardResult = evaluateContextWindowGuard({
  info: resolvedContextWindow,
  usedTokens: estimatedTurnTokens,
});

if (guardResult.shouldBlock) {
  // Fire hook (void, parallel)
  await hooks.runContextWindowBlock({ guardResult, sessionId });

  // Return graceful error to user
  return {
    type: "context_window_blocked",
    message: [
      "This session has reached its context limit.",
      "To continue, use `/compact` to summarize the conversation,",
      "or `/clear` to start a new session.",
    ].join(" "),
  };
}

if (guardResult.shouldWarn) {
  // Fire hook (void, parallel) — analytics, UI badge
  await hooks.runContextWindowWarn({ guardResult, sessionId });
}
```

`[CWG-034]`

### 3.5 Hook Events

Two new void hooks added to the hook registry (Spec 01):

```typescript
// context_window_warn — fires when tokensRemaining < warnBelowTokens
// context_window_block — fires when tokensRemaining < hardMinTokens
```

`[CWG-035]`

### 3.6 UI Signal (Warn State)

When `shouldWarn` is true, the API response includes a `contextWarning` field that the `ChatInput` component uses to display a lightweight indicator (e.g., a token gauge or a soft warning banner):

```typescript
// In SSE stream response headers or JSON body:
{
  contextWarning: {
    tokensRemaining: 28000,
    warnThreshold: 32000,
    recommendation: "compact" | "new_session"
  }
}
```

`[CWG-036]`

---

## 4. Security And Access

1. **Block is server-enforced.** The guard block happens in the API route before any LLM call. Client-side signals are advisory only. `[CWG-040]`
2. **Thresholds configurable by admin, not user.** The warn/block thresholds are server-side config. Users cannot suppress the guard. `[CWG-041]`
3. **Token estimates use the same estimator as compaction.** Consistency between context window estimation and compaction estimation prevents mismatches where the guard doesn't fire before compaction is needed. `[CWG-042]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `resolveContextWindowInfo()` | 6 | Source priority, cap enforcement, defaults |
| `evaluateContextWindowGuard()` | 8 | Warn/block thresholds, remaining calc, boundary conditions |
| Block message format | 4 | User-facing message is helpful, not a raw error |
| Warn signal field | 4 | Response includes contextWarning when shouldWarn |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Pipeline blocks before LLM call | 4 | No LLM call when blocked |
| Warn hook fires | 4 | Hook called with correct guard result |
| Block hook fires | 4 | Hook called with correct guard result |

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Guard Core** | `resolveContextWindowInfo()`, `evaluateContextWindowGuard()`, full unit coverage | +14 |
| **1** | **Pipeline Integration** | Wire into route handler. Block path with graceful message. | +10 |
| **2** | **Hooks And UI Signal** | Void hooks for warn/block. `contextWarning` in response. | +8 |

---

## 7. Future Considerations

1. Per-session override — allow admin to set custom limits for long-running formation workshops.
2. Auto-compact on warn — optionally trigger compaction automatically when hitting warn threshold rather than surfacing a signal.
3. Context budget dashboard — admin view showing session-by-session context utilization across the student cohort.
