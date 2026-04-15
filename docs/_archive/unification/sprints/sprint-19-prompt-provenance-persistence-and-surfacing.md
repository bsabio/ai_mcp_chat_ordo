# Sprint 19 — Prompt Provenance Persistence and Surfacing

> **Status:** Complete
> **Goal:** Make prompt provenance (slotRefs, sections, warnings) from
> `PromptRuntimeResult` inspectable by persisting it per-turn and exposing it
> through an operational debug surface.
> **Prerequisite:** Sprint 18 complete ✅ (MCP protocol parity tests)
> **Estimated scope:** Medium — prompt provenance logging, compact per-conversation storage, MCP debug surfacing, and seam-test coverage
> **Implementation note:** The current repo state includes provenance logging in `src/lib/chat/stream-pipeline.ts`, `PromptProvenanceStore` in `src/lib/prompts/prompt-provenance-store.ts`, `prompt_get_provenance` in `src/lib/capabilities/shared/prompt-tool.ts` plus `mcp/operations-server.ts`, and `src/lib/prompts/prompt-provenance.test.ts` in `qa:unification`.

## QA Findings Before Implementation

1. **`PromptRuntimeResult`** (defined in `src/lib/chat/prompt-runtime.ts` L74)
   contains `slotRefs: PromptSlotRef[]`, `sections: PromptSectionContribution[]`,
   and `warnings: PromptRuntimeWarning[]`. It is assembled but never persisted
   or logged. The chat route builds it (`src/app/api/chat/stream/route.ts` L97)
   and passes it to `stream-pipeline.ts` (L104: `promptRuntime: finalPromptRuntimeResult`).

2. **`stream-pipeline.ts`** (1203 lines) receives the result and includes it in
   the pipeline context (L568–574, L620–626), but the data is never written to
   any store or logged.

3. **Eval flows** (`src/lib/evals/live-runtime.ts`, `live-runner.ts`) also
   produce `PromptRuntimeResult` and include it in eval results, but only for
   the eval response — not persisted.

4. **Doc 12 (Prompt Equivalence and Control Plane Audit):** "the final prompt
   text actually sent to a model" should be inspectable (L13).

5. **Doc 05 (Provider and Prompt Unification) §5:** "prompt debugging becomes
   real instead of inferred" (L104).

6. **Doc 14 (Concrete Runtime Interface Set) §3.2:** "whether a slot came from
   the DB or a fallback, whether config overlays were applied, which
   request-time sections were appended" (L139–141).

7. **Architecture change since sprint was drafted:** All domain tool modules
   have migrated from `mcp/*.ts` to `src/lib/capabilities/shared/*.ts`.
   The MCP transport layer is now `mcp/operations-server.ts` (336 lines)
   which imports from `@/lib/capabilities/shared/prompt-tool`. There is no
   longer a `mcp/prompt-tool.ts`.

8. **Observability pattern:** `stream-pipeline.ts` uses `logDegradation()` and
   `logFailure()` from `@/lib/observability/logger.ts`. The pipeline also uses
   `emitObservabilityEvent()` from `@/lib/observability/events` for structured
   metrics. Sprint 19 should use the same pattern.

## Current Provenance Flow

```text
PromptRuntime.build() → PromptRuntimeResult
       ↓
  src/app/api/chat/stream/route.ts (L97–104)
       ↓
  src/lib/chat/stream-pipeline.ts (L568–574, L620–626)
       ↓
  ... DEAD END — never stored, never logged, never surfaced
```

## Target Provenance Flow

```text
PromptRuntime.build() → PromptRuntimeResult
       ↓
  src/app/api/chat/stream/route.ts
       ↓
  src/lib/chat/stream-pipeline.ts
       ↓
  ┌─ Structured log via logEvent() (observability)
  └─ PromptProvenanceStore (per-conversation last-turn metadata)
       ↓
  MCP prompt_get_provenance tool (optional debug surface)
       ↓
  mcp/operations-server.ts (case handler for prompt_get_provenance)
```

## Tasks

1. **Add provenance logging to stream pipeline**
   - In `src/lib/chat/stream-pipeline.ts`, after `promptRuntimeResult` is
     built (~L568 and ~L620), emit a structured log entry with:
     - `conversationId`
     - `slotRefs` (compact form: role + source + version)
     - `sections` (keys and sourceKinds only — no full content)
     - `warnings` (if any)
   - Use the existing `logEvent()` from `@/lib/observability/logger`
   - Goal: runtime prompt provenance appears in operational logs

2. **Create `PromptProvenanceStore`**
   - New file: `src/lib/prompts/prompt-provenance-store.ts`
   - Stores the latest `PromptRuntimeResult` metadata per conversation
   - Compact format: strip `content` from sections, keep `key`, `sourceKind`,
     `priority`, `includedInText`. Keep `slotRefs` and `warnings` as-is.
   - Implementation: in-memory Map keyed by conversationId with TTL eviction
     (alternatively, write to a lightweight JSON column on conversation metadata)
   - Serves as the "last known prompt provenance" for debug queries

3. **Wire provenance store into stream pipeline**
   - After successful prompt assembly, write compact provenance to store
   - Fire-and-forget (non-blocking — provenance recording should not affect
     chat latency)
   - Wire through `PipelineOptions` so the store is injectable/mockable

4. **Expose provenance through MCP debug tool**
   - Add `prompt_get_provenance` tool to
     `src/lib/capabilities/shared/prompt-tool.ts`
   - Add to the schemas returned by `getPromptToolSchemas()` (will become 6
     schemas instead of 5)
   - Register the case handler in `mcp/operations-server.ts`
   - Input: conversationId (optional)
   - Output: last known provenance including slot sources, section keys,
     warnings, and surface type
   - This gives operators visibility into "what prompt was actually built?"

5. **Add provenance verification tests**
   - New: `src/lib/prompts/prompt-provenance.test.ts`
   - Test: provenance store records from PromptRuntimeResult
   - Test: compact format excludes full text but includes structure
   - Test: slotRefs distinguish db vs fallback vs missing sources
   - Test: TTL eviction removes stale entries
   - Register in `run-unification-qa.ts`
   - ~10 tests

## Out of Scope

- Historical provenance (storing every past turn's prompt — only latest)
- Provenance in admin UI (MCP debug surface is sufficient for now)
- Provenance for eval flows (already included in eval results)
- Changing how PromptRuntimeResult is assembled
- Any changes to `mcp/calculator-server.ts` (unrelated)

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | Structured log emitted with prompt provenance per chat turn | `grep "provenance" src/lib/chat/stream-pipeline.ts` |
| AC2 | `PromptProvenanceStore` persists compact provenance | `test -f src/lib/prompts/prompt-provenance-store.ts` |
| AC3 | MCP `prompt_get_provenance` tool returns last known provenance | `grep "prompt_get_provenance" mcp/operations-server.ts` |
| AC4 | `getPromptToolSchemas()` returns 6 schemas (was 5) | Schema count test |
| AC5 | Provenance test verifies slot source attribution and section keys | `npx vitest run src/lib/prompts/prompt-provenance.test.ts` |
| AC6 | `npm run qa:unification` passes with prompt provenance coverage in the seam suite | `npm run qa:unification` |

## Verification

```bash
# New provenance store
test -f src/lib/prompts/prompt-provenance-store.ts

# Pipeline integration
grep -c "provenance" src/lib/chat/stream-pipeline.ts  # > 0

# MCP tool registered
grep "prompt_get_provenance" mcp/operations-server.ts

# Schema count bumped
grep -c "name:" src/lib/capabilities/shared/prompt-tool.ts  # expect 6+

# Tests pass
npx vitest run src/lib/prompts/prompt-provenance.test.ts

# Full QA suite
npm run qa:unification

# No new type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37
```
