# Prompt Cache Stability — Deterministic Request Assembly

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Enforce deterministic, stable ordering in the assembly of LLM API request payloads — specifically the tool manifest, system prompt context blocks, and message history — so Anthropic's prompt caching produces consistent cache hits across turns rather than invalidating on non-deterministic iteration order.
> **Dependencies:** None. This spec is standalone and has no upstream prerequisites.
> **Affects:** `src/core/tool-registry/ToolRegistry.ts`, `src/lib/chat/tool-composition-root.ts`, `src/lib/chat/stream-pipeline.ts`, `src/lib/chat/context-window.ts`, any code that assembles `system` prompt blocks
> **Motivation:** Anthropic's prompt caching reuses cached KV state when the request prefix is byte-identical to a previous cached request. Any non-deterministic ordering in tool schema assembly, system prompt block injection, or message history construction silently invalidates the cache on every turn. At student scale (hundreds to thousands of users), this translates directly to API cost — cached turns cost ~90% less than uncached turns. This is a fast-win fix with no new features and immediate, measurable ROI.
> **Source:** OpenClaw `AGENTS.md` prompt cache stability discipline, `src/agents/stable-stringify.ts`
> **Requirement IDs:** `PCS-001` through `PCS-099`

---

## 1. Problem Statement

### 1.1 Current State

The tool manifest is assembled by calling `toolRegistry.getSchemasForRole(role)` which iterates over an internal `Map`. JavaScript `Map` iteration order is insertion order — but insertion order depends on registration order, which in `tool-composition-root.ts` is controlled by the order of `registerXxxTools()` calls. If any registration order changes, or if a conditional registration is added, the cache breaks silently for all sessions. `[PCS-001]`

System prompt context blocks are injected from multiple sources (conversation memory, routing analysis, corpus context, user profile). There is currently no documented injection order contract. `[PCS-002]`

Message history construction in `context-window.ts` trims from the tail by default, but there is no explicit guarantee that trimming is always tail-first. If a future compaction implementation trims from the head, cached prefixes break for all active sessions simultaneously. `[PCS-003]`

### 1.2 Why Prompt Caching Matters At Scale

| Scenario | Per-Turn Without Cache | Per-Turn With Cache | Saving |
|---|---|---|---|
| 1,000 students × 50 turns/day | Full input token cost | ~10% of input cost | ~90% |
| 10,000 formation sessions/month | $X | $0.1X | $0.9X |

The exact numbers depend on average context size, but the structural point is clear: non-deterministic assembly means no caching, which at student scale is a significant ongoing cost. `[PCS-004]`

### 1.3 Root Cause

Three assembly points are non-deterministic:

1. Tool manifest schema array — Map iteration order, conditional registrations
2. System prompt block order — no contract, varies by turn
3. Context window trimming direction — implicit, not guaranteed

`[PCS-005]`

---

## 2. Design Goals

1. **Deterministic tool manifest.** `getSchemasForRole()` must return schemas in a stable, documented order on every call regardless of registration sequence. `[PCS-010]`
2. **Documented system prompt block order.** The order of system prompt block injection must be documented and enforced as a contract, not left implicit. `[PCS-011]`
3. **Tail-first trimming guarantee.** Context window trimming must always remove the newest (tail) messages first to preserve the cached system prompt and early conversation prefix. `[PCS-012]`
4. **Regression-tested stability.** Cache stability must be covered by a test that proves turn-to-turn prefix identity, not just helper-level unit tests. `[PCS-013]`
5. **Zero new features.** This spec is purely correctness work. No new capabilities are added. `[PCS-014]`

---

## 3. Architecture

### 3.1 Tool Manifest Deterministic Ordering

`ToolRegistry` must sort schemas before returning them. The sort key must be stable and independent of registration order:

```typescript
// In ToolRegistry.getSchemasForRole():
getSchemasForRole(role: RoleName): ToolSchema[] {
  const schemas = Array.from(this.tools.values())
    .filter(descriptor => descriptor.roles.includes(role) || descriptor.roles.includes("ALL"))
    .map(descriptor => descriptor.schema);

  // Sort deterministically by tool name (alphabetical, case-insensitive)
  return schemas.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}
```

**Why alphabetical by name?**
- Stable across registration order changes
- Predictable for debugging — a developer can look at the manifest and know the order
- Matches how OpenClaw describes the principle: "make ordering deterministic before building the request"

`[PCS-031]`

### 3.2 System Prompt Block Injection Order Contract

The system prompt is assembled from multiple contributors. Define and document the canonical injection order:

```typescript
// Canonical system prompt block order (MUST NOT be changed without cache bust awareness):
const SYSTEM_PROMPT_BLOCK_ORDER = [
  "base_identity",          // 1. Core agent identity — most stable, deepest cache anchor
  "formation_curriculum",   // 2. Formation context — changes per-agent, not per-turn
  "corpus_context",         // 3. Corpus index summary — stable within a corpus version
  "conversation_memory",    // 4. User memory — stable within a session
  "routing_context",        // 5. Active lane and routing state — can change per-turn
  "tool_guidance",          // 6. Active tool hints — changes with tool selection
] as const;

export type SystemPromptBlockKey = typeof SYSTEM_PROMPT_BLOCK_ORDER[number];
```

Blocks must be assembled in this order regardless of which blocks are present. Missing blocks are skipped. `[PCS-032]`

### 3.3 Tail-First Trimming Guarantee

Add an explicit contract to `trimContextWindow()`:

```typescript
/**
 * Trim the context window to fit within the token budget.
 *
 * CACHE STABILITY CONTRACT: trimming MUST remove from the tail (newest messages first).
 * Never trim from the head. The cached system prompt and early conversation prefix
 * must remain byte-identical across turns.
 */
export function trimContextWindow(
  messages: Message[],
  tokenBudget: number,
  transcriptStore?: TranscriptStore,
): Message[] {
  // Implementation must remove from tail only.
  // Preserve messages[0..N] where N is the largest index that fits within budget.
}
```

`[PCS-033]`

### 3.4 Stable Tool Pre-Filter Output

When the heuristic tool pre-filter (Spec 05) is applied, its output must also be sorted before passing to the API:

```typescript
// In selectToolsForRequest():
// After selection, always sort the result for cache stability
return [...pinned, ...ranked].sort((a, b) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase())
);
```

`[PCS-034]`

### 3.5 Cache Stability Regression Test

```typescript
// vitest test — proves two consecutive turns produce byte-identical tool manifest
describe("prompt cache stability", () => {
  it("produces identical tool manifest schema array on consecutive turns", () => {
    const registry = buildTestRegistry();
    const turn1 = registry.getSchemasForRole("user");
    const turn2 = registry.getSchemasForRole("user");
    expect(JSON.stringify(turn1)).toBe(JSON.stringify(turn2));
  });

  it("produces identical tool manifest after out-of-order registrations", () => {
    const registry1 = new ToolRegistry();
    registerToolsABC(registry1); // registers A, B, C

    const registry2 = new ToolRegistry();
    registerToolsCBA(registry2); // registers C, B, A

    const schemas1 = registry1.getSchemasForRole("user");
    const schemas2 = registry2.getSchemasForRole("user");
    expect(JSON.stringify(schemas1)).toBe(JSON.stringify(schemas2));
  });

  it("trims context window from tail, preserving head prefix", () => {
    const messages = buildMessages(20); // 20 test messages
    const trimmed = trimContextWindow(messages, smallBudget);
    // First message must always be preserved
    expect(trimmed[0]).toEqual(messages[0]);
    // Trimmed messages must be a prefix of the original
    for (let i = 0; i < trimmed.length; i++) {
      expect(trimmed[i]).toEqual(messages[i]);
    }
  });
});
```

`[PCS-035]`

---

## 4. Security And Access

1. **No behavioral changes.** This spec only changes ordering, not what is included or excluded from requests. RBAC filtering must run before the sort. `[PCS-040]`
2. **Sort is server-side only.** The deterministic ordering is an internal implementation detail. Client-supplied parameters must not influence sort order. `[PCS-041]`
3. **System prompt contract is server-controlled.** The block injection order is defined in server code. No request parameter may reorder blocks. `[PCS-042]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `getSchemasForRole()` sort order | 6 | Alphabetical, case-insensitive, stable across registration order |
| System prompt block injection order | 6 | All 6 block types appear in canonical order; missing blocks skipped |
| `trimContextWindow()` tail-first guarantee | 6 | Head preserved, tail removed, budget respected |
| Pre-filter output sort | 4 | Pinned + ranked result is alphabetically sorted |

### 5.2 Regression Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Turn-to-turn manifest identity | 4 | Same manifest on consecutive calls |
| Registration-order-independence | 4 | Registry A, B, C = registry C, B, A in output |
| System prompt stability across turns | 4 | Byte-identical system prompt when inputs unchanged |

### 5.3 Existing Test Preservation

All existing tool registry tests must pass. The sort is additive; it does not change which tools are included, only their order. `[PCS-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Registry Sort** | Add alphabetical sort to `getSchemasForRole()`. Add turn-to-turn + registration-order-independence tests. | +14 |
| **1** | **System Prompt Order Contract** | Define `SYSTEM_PROMPT_BLOCK_ORDER`. Enforce in prompt assembly. Add injection order tests. | +10 |
| **2** | **Tail-First Trimming Guarantee** | Add contract comment and enforcement to `trimContextWindow()`. Tests. | +10 |

---

## 7. Future Considerations

1. Cache hit rate observability — add a metric that tracks whether the system prompt prefix matches the previous turn's hash for informed cache effectiveness monitoring.
2. Cache burst detection — alert when a config change would invalidate all active session caches, so it can be deployed at low-traffic times.
3. Explicit cache-control headers — when Anthropic's API exposes cache TTL controls, configure them here.
