# Spec 03: Tool-Round Config Unification

**Priority:** High
**Risk if deferred:** Inconsistent runtime contracts across code paths; confusing debugging when tool loops terminate at different thresholds
**Files in scope:**
- `src/lib/chat/orchestrator.ts` (~65 lines, hardcoded `6` at line 13)
- `src/lib/chat/anthropic-stream.ts`

---

## Problem Statement

The orchestrator loop uses a hardcoded `6`-step limit (`for (let step = 0; step < 6; step += 1)`). This value:

1. Is not configurable per-request, per-role, or per-environment.
2. Lives as a magic number inside a loop condition, not as a named constant.
3. Creates risk for future code paths (streaming vs non-streaming) to use different limits.

If additional orchestration paths are added (or the streaming loop introduces its own cap), the system has no single source of truth for "how many tool rounds are allowed."

---

## Architectural Approach

### Step 1: Define a shared constant in a config module

```typescript
// src/lib/chat/chat-config.ts
export const CHAT_CONFIG = {
  /** Maximum number of tool-call rounds per orchestration turn. */
  maxToolRounds: 6,
} as const;
```

### Step 2: Replace the hardcoded literal in `orchestrator.ts`

```typescript
// orchestrator.ts — before
for (let step = 0; step < 6; step += 1) {

// after
import { CHAT_CONFIG } from "./chat-config";
for (let step = 0; step < CHAT_CONFIG.maxToolRounds; step += 1) {
```

### Step 3: Use the same constant in the streaming path

If `anthropic-stream.ts` or any future streaming loop has its own round limit, replace it with the same `CHAT_CONFIG.maxToolRounds` reference.

### Step 4: Error message includes the config value

```typescript
throw new Error(
  `Exceeded tool-call safety limit (${CHAT_CONFIG.maxToolRounds} rounds)`,
);
```

### Step 5: Allow optional per-request override (future-proof, minimal)

The config object stays as the default. If per-request override is needed later, the orchestrator function signature can accept an optional `maxRounds` parameter that falls back to the config:

```typescript
export async function orchestrate(
  /* existing params */,
  maxRounds = CHAT_CONFIG.maxToolRounds,
) {
  for (let step = 0; step < maxRounds; step += 1) {
```

Do NOT add per-role or per-environment overrides now. That is premature. Just eliminate the magic number and centralize.

---

## Constraints — Do NOT Introduce

- **Do not** read this value from `process.env` at runtime. It is a code-level safety limit, not an ops tuning knob. Environment-driven overrides can come later if needed.
- **Do not** make this a database-stored config. It is a runtime safety boundary.
- **Do not** change the default value. The limit stays at `6` unless there is a separate product decision to change it.
- **Do not** create a generic "config" module that handles unrelated settings. This is scoped to chat orchestration.

---

## Required Tests

### Unit Tests — `tests/tool-round-config.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `CHAT_CONFIG.maxToolRounds is a positive integer` | Type and value guard — `typeof` check, `> 0`, `Number.isInteger()`. |
| 2 | `CHAT_CONFIG is frozen / immutable` | Attempt to assign `CHAT_CONFIG.maxToolRounds = 99` — must throw or not change. |
| 3 | `orchestrator respects maxToolRounds from config` | Provide a mock LLM that always returns tool calls. Confirm the loop terminates after exactly `CHAT_CONFIG.maxToolRounds` iterations and throws the safety-limit error. |
| 4 | `orchestrator respects optional per-request override` | Pass `maxRounds: 2` to orchestrator with a mock LLM that always returns tool calls. Confirm it stops after 2 rounds. |
| 5 | `error message includes the configured limit value` | Trigger the safety-limit error and assert the message string contains the numeric limit. |

### Grep Verification Test — `tests/tool-round-no-magic-numbers.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `no hardcoded tool-round literals remain in orchestrator or stream files` | Read file contents of `orchestrator.ts` and `anthropic-stream.ts`, assert no bare `< 6` or `< 4` loop conditions exist (regex scan). This is a structural regression guard. |

---

## Acceptance Criteria

- [ ] `CHAT_CONFIG.maxToolRounds` is the single source of truth for tool-round limits.
- [ ] No magic number literals for tool-round limits remain in `orchestrator.ts` or `anthropic-stream.ts`.
- [ ] The safety-limit error message includes the configured value.
- [ ] The orchestrator function signature supports an optional override.
- [ ] All existing orchestrator tests pass without modification.
- [ ] New tests above pass.
