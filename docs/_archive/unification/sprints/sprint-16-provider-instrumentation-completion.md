# Sprint 16 — Provider Instrumentation Completion

> **Status:** Complete
> **Goal:** Instrument the 2 remaining model-backed callers with provider
> lifecycle events and introduce a thin `ProviderRuntime` facade that all
> model-backed surfaces can optionally adopt.
> **Prerequisite:** Sprint 15 complete ✅
> **Estimated scope:** 3 files modified, 1 new file, 1 new test file

## QA Findings Before Implementation

1. **`AnthropicBlogArticlePipelineModel.ts`** (216 lines, `src/adapters/`)
   calls `this.client.messages.create()` directly in the private
   `requestJsonObject()` method (line 68: initial call, line 84: JSON repair
   call). Zero references to `resolveProviderPolicy()` or `emitProviderEvent()`.
   This private method is the single Anthropic entry point for all 4 public
   methods (`composeArticle`, `reviewArticle`, `resolveQa`, `designHeroImagePrompt`).

2. **`blog-production-root.ts`** (82 lines, `src/lib/blog/`) creates the blog
   pipeline by calling `createAnthropicBlogArticlePipelineModel()` (lines 38–47)
   and also creates `new OpenAiBlogImageProvider(new OpenAI(...))` (line 30).
   The `OpenAiBlogImageProvider` is already instrumented (Sprint 7). The blog
   article pipeline model is not.

3. **`admin-web-search.tool.ts`** (105 lines, `src/core/use-cases/tools/`)
   creates `new OpenAI(...)` (line 20) and delegates to `adminWebSearch()`
   from `mcp/web-search-tool.ts`. The actual OpenAI call is
   `deps.openai.responses.create()` at `mcp/web-search-tool.ts` line 69.
   Neither file references `emitProviderEvent()` or `resolveProviderPolicy()`.
   The best instrumentation point is `executeAdminWebSearch()` at
   `admin-web-search.tool.ts` line 45 — wrap the `adminWebSearch()` call
   (line 55) with lifecycle events.

4. **`provider-policy.ts`** already exports all 3 required functions:
   - `resolveProviderPolicy()` → `ProviderResiliencePolicy`
   - `emitProviderEvent(event: ProviderAttemptEvent)` → `void`
   - `classifyProviderError(error: unknown)` → error classification
   The `ProviderSurface` type already includes `"blog_production"` and
   `"web_search"` as valid values (added in Sprint 7).

5. **Doc 14 §9** annotates `ProviderRuntime` as ⚠️ Partial — only function-level
   policy exists, no formal facade. Sprint 16 creates the facade.

6. **Residual risk register** items #9 and #10 are annotated "Planned —
   Sprint 16 provider instrumentation completion."

## Current Provider Instrumentation Map

| Caller | File | Instrumented | Surface |
| --- | --- | --- | --- |
| Anthropic stream | `src/lib/chat/anthropic-stream.ts` | ✅ (8 events) | `stream` |
| Anthropic direct | `src/lib/chat/anthropic-client.ts` | ✅ (6 events) | `direct_turn` |
| Summarizer | `src/adapters/AnthropicSummarizer.ts` | ✅ (4 events) | `summarization` |
| Blog image | `src/adapters/OpenAiBlogImageProvider.ts` | ✅ (4 events) | `image_generation` |
| TTS | `src/app/api/tts/route.ts` | ✅ (4 events) | `tts` |
| Blog article | `src/adapters/AnthropicBlogArticlePipelineModel.ts` | ❌ | `blog_production` |
| Web search | `src/core/use-cases/tools/admin-web-search.tool.ts` | ❌ | `web_search` |

## Tasks

1. **Instrument `AnthropicBlogArticlePipelineModel.ts`**
   - Import `emitProviderEvent` and `classifyProviderError` from `provider-policy.ts`
   - Wrap the `requestJsonObject()` private method (the single entry point for
     all Anthropic calls) with lifecycle events:
     - `emitProviderEvent({ kind: "attempt_start", surface: "blog_production", model: this.model, attempt: 1 })`
     - On success: `emitProviderEvent({ kind: "attempt_success", ... durationMs })`
     - On error: `emitProviderEvent({ kind: "attempt_error", ... error, errorClassification: classifyProviderError(err) })`
   - The repair call (line 84) should be a separate event with `attempt: 2`
   - Do NOT change the existing JSON parse/repair logic
   - Do NOT add `resolveProviderPolicy()` timeout — the blog pipeline has its
     own (large) timeout requirements from the calling job

2. **Instrument `admin-web-search.tool.ts`**
   - Import `emitProviderEvent` and `classifyProviderError` from `provider-policy.ts`
   - Wrap the `executeAdminWebSearch()` function at the `adminWebSearch()`
     call boundary (line 55, inside the existing try/catch):
     - Start event before: `emitProviderEvent({ kind: "attempt_start", surface: "web_search", model: input.model ?? "gpt-5", attempt: 1 })`
     - On success: `emitProviderEvent({ kind: "attempt_success", ... durationMs })`
     - On error (catch block, line 57): `emitProviderEvent({ kind: "attempt_error", ... })`
   - Do NOT modify `mcp/web-search-tool.ts` — it's a shared MCP domain module
     and shouldn't depend on provider-policy.ts

3. **Create `ProviderRuntime` facade (optional adoption)**
   - New file: `src/lib/chat/provider-runtime.ts`
   - Interface that wraps the existing provider-policy.ts functions:
     ```typescript
     import type {
       ProviderResiliencePolicy,
       ProviderAttemptEvent,
       ProviderSurface,
     } from "./provider-policy";

     export interface ProviderRuntime {
       resolvePolicy(surface?: ProviderSurface): ProviderResiliencePolicy;
       emitEvent(event: ProviderAttemptEvent): void;
       classifyError(error: unknown): ProviderAttemptEvent["errorClassification"];
     }

     export function createProviderRuntime(): ProviderRuntime {
       return {
         resolvePolicy: resolveProviderPolicy,
         emitEvent: emitProviderEvent,
         classifyError: classifyProviderError,
       };
     }
     ```
   - This is a unification facade, not a replacement — existing callers continue
     using the standalone functions. New callers can optionally inject the facade.

4. **Add provider instrumentation verification test**
   - New file: `src/lib/chat/provider-instrumentation.test.ts`
   - Verify all 7 declared `ProviderSurface` values have at least one file
     that imports `emitProviderEvent` and references that surface string:
     - `stream` → `anthropic-stream.ts`
     - `direct_turn` → `anthropic-client.ts`
     - `summarization` → `AnthropicSummarizer.ts`
     - `image_generation` → `OpenAiBlogImageProvider.ts`
     - `tts` → `tts/route.ts`
     - `blog_production` → `AnthropicBlogArticlePipelineModel.ts` (new)
     - `web_search` → `admin-web-search.tool.ts` (new)
   - Test that `ProviderRuntime` interface can be instantiated via
     `createProviderRuntime()`
   - Register in `run-unification-qa.ts`
   - ~8 tests

5. **Update `run-unification-qa.ts`**
   - Add `provider-instrumentation.test.ts` to the QA runner
   - Expected new total: 199+ tests, 15 files

## Out of Scope

- Replacing existing instrumented callers with the facade (they already work)
- Adding retry/fallback logic to blog or web-search (they have their own)
- Changing the actual provider API calls or model selection
- Full `runTurn` / `runStream` methods on the facade (deferred — function-level
  policy is sufficient, the facade is the first abstraction step)
- Modifying `mcp/web-search-tool.ts` (shared MCP domain module)

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | `AnthropicBlogArticlePipelineModel.ts` emits provider lifecycle events | `grep -c "emitProviderEvent" src/adapters/AnthropicBlogArticlePipelineModel.ts` > 0 |
| AC2 | `admin-web-search.tool.ts` emits provider lifecycle events | `grep -c "emitProviderEvent" src/core/use-cases/tools/admin-web-search.tool.ts` > 0 |
| AC3 | `ProviderRuntime` facade exists | `test -f src/lib/chat/provider-runtime.ts` |
| AC4 | Provider instrumentation test verifies all 7 surfaces | `npx vitest run src/lib/chat/provider-instrumentation.test.ts` |
| AC5 | `npm run qa:unification` passes (199+ tests) | `npm run qa:unification` |
| AC6 | Residual risks #9, #10 can be marked resolved | Manual: update risk register |

## Verification

```bash
# AC1-AC2: instrumentation
grep -c "emitProviderEvent" src/adapters/AnthropicBlogArticlePipelineModel.ts  # expect ≥3
grep -c "emitProviderEvent" src/core/use-cases/tools/admin-web-search.tool.ts  # expect ≥3

# AC3: facade
test -f src/lib/chat/provider-runtime.ts && echo "exists"

# AC4-AC5: tests
npx vitest run src/lib/chat/provider-instrumentation.test.ts
npm run qa:unification  # expect 199+ tests, 15 files

# No new type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37
```
