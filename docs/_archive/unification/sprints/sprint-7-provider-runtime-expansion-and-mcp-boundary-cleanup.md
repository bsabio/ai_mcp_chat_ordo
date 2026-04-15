# Sprint 7 — Provider Runtime Expansion And MCP Boundary Cleanup

> **Status:** Complete
> **Goal:** Extend runtime unification beyond chat and thin MCP boundaries so
> protocol surfaces wrap shared domain behavior instead of redefining it.
> **Spec ref:** `UNI-120` through `UNI-159`, `UNI-250` through `UNI-279`
> **Prerequisite:** Sprint 6 complete ✅
> **Status note:** All prerequisites (Sprints 0–6) are landed. Sprint 4 shipped
> `provider-policy.ts` with `emitProviderEvent()` and `resolveProviderPolicy()`
> (surface enum: `"stream" | "direct_turn"`). Sprint 5 declared MCP export
> intent for `admin_web_search` via the catalog's `mcpExport` facet. Sprint 6
> established service-lifetime documentation for all RepositoryFactory exports.

## QA Findings Before Implementation

1. Sprint 4's provider-policy surface enum only covers `"stream" | "direct_turn"`.
   Extending to non-chat callers requires adding surface values like
   `"summarization"`, `"image_generation"`, `"tts"`, and `"blog_production"`.
2. There are **5 non-chat model callers** that make direct Anthropic/OpenAI API
   calls without provider-policy observability or resilience. These are the actual
   migration targets.
3. The MCP architecture is **already well-separated**. The `mcp/` tools are
   standalone modules with clean dependency direction — `src/` imports FROM
   `mcp/web-search-tool.ts`. Task 3 should acknowledge this and scope work
   to incremental thinning, not a rewrite.
4. Sprint 5's catalog declares `mcpExport: { exportable: true, sharedModule:
   "mcp/web-search-tool" }` for `admin_web_search`. Sprint 7 should wire this
   metadata to actual MCP server registration rather than rediscovering it.
5. Sprint 6's service-lifetime map declared process-cached as canonical. New
   provider instrumentation in non-chat callers should follow this pattern.

## Current Architecture Snapshot

### Non-Chat Model Callers (No Provider Policy)

| Provider Path | File | SDK | Resilience | Observability |
| --- | --- | --- | --- | --- |
| Summarization | `src/adapters/AnthropicSummarizer.ts` | Anthropic | ❌ No retry | ❌ No events |
| Blog image generation | `src/adapters/OpenAiBlogImageProvider.ts` | OpenAI | ❌ No retry | ❌ No events |
| TTS | `src/app/api/tts/route.ts` | OpenAI (raw fetch) | ❌ No retry | ❌ No events |
| Admin web search | `src/core/use-cases/tools/admin-web-search.tool.ts` | OpenAI | ❌ No retry | ❌ No events |
| Blog production | `src/lib/blog/blog-production-root.ts` | Anthropic + OpenAI | ❌ No retry | ❌ No events |

### Provider Policy Coverage (Sprint 4)

| Surface | File | emitProviderEvent? | resilience? |
| --- | --- | --- | --- |
| `stream` | `src/lib/chat/anthropic-stream.ts` | ✅ Full lifecycle | ✅ Retry + fallback |
| `direct_turn` | `src/lib/chat/chat-turn.ts` | ✅ Full lifecycle | ✅ Retry + fallback |
| summarization | `src/adapters/AnthropicSummarizer.ts` | ❌ | ❌ |
| image_generation | `src/adapters/OpenAiBlogImageProvider.ts` | ❌ | ❌ |
| tts | `src/app/api/tts/route.ts` | ❌ | ❌ |
| blog_production | `src/lib/blog/blog-production-root.ts` | ❌ | ❌ |
| admin_web_search | `src/core/use-cases/tools/admin-web-search.tool.ts` | ❌ | ❌ |

### MCP Directory Structure (`mcp/` at project root)

| File | Lines | Domain Coupling | Import Direction |
| --- | --- | --- | --- |
| `web-search-tool.ts` | 147 | None (standalone) | `src/` imports FROM this |
| `calculator-tool.ts` | ~30 | `@/lib/calculator` | Thin domain delegate |
| `calculator-server.ts` | 68 | Via calculator-tool | Transport-only server |
| `embedding-tool.ts` | ~120 | `@/core/search/*` | Domain-heavy search ops |
| `embedding-server.ts` | 670 | Via embedding-tool | Transport server |
| `librarian-tool.ts` | ~160 | `@/core/search/*` | Corpus management ops |
| `librarian-safety.ts` | ~50 | None | Safety validation |
| `analytics-tool.ts` | ~700 | Direct DB queries | Analytics domain + transport mixed |
| `prompt-tool.ts` | ~140 | Unknown | Prompt management |

### Import Direction (src/ ↔ mcp/)

```
src/core/use-cases/tools/admin-web-search.tool.ts  →  mcp/web-search-tool.ts
src/lib/evals/workspace.ts                         →  mcp/calculator-tool.ts
src/app/api/admin/routing-review/route.ts           →  @mcp/analytics-tool
src/app/api/web-search/route.ts                     →  mcp/web-search-tool.ts
src/lib/operator/loaders/*                          →  @mcp/analytics-tool
```

## Why This Sprint Exists

Once chat prompt and provider seams are unified and one capability slice is
derived, the next step is to make the rest of the model-backed features and MCP
surfaces align with those shared contracts.

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/lib/chat/provider-policy.ts` | Sprint 4 — `emitProviderEvent()`, `resolveProviderPolicy()`, surface enum |
| `src/lib/chat/provider-policy.test.ts` | Sprint 4 — 43 tests for provider lifecycle events |
| `src/core/capability-catalog/catalog.ts` | Sprint 5 — `mcpExport` facet for `admin_web_search` |
| `docs/_refactor/unification/artifacts/sprint-5-unresolved-edge-cases.md` | MCP infrastructure gap documented |
| `docs/_refactor/unification/artifacts/sprint-6-service-lifetime-map.md` | Lifetime policy for all repos |
| `mcp/web-search-tool.ts` | 147-line standalone web search module |
| `mcp/calculator-server.ts` | 68-line MCP transport server |
| `src/adapters/AnthropicSummarizer.ts` | Summarization adapter (no policy) |
| `src/adapters/OpenAiBlogImageProvider.ts` | Image generation adapter (no policy) |
| `src/app/api/tts/route.ts` | TTS route handler (no policy) |
| `src/lib/blog/blog-production-root.ts` | Blog production composition root |

## Primary Areas

- `src/lib/chat/provider-policy.ts` (surface enum expansion)
- `src/adapters/AnthropicSummarizer.ts`, `OpenAiBlogImageProvider.ts`
- `src/app/api/tts/route.ts`
- `mcp/` directory (incremental thinning)
- Sprint 5 catalog mcpExport facet → actual MCP wiring

## Tasks

1. **Expand provider-policy surface enum**
   - Add surface values for non-chat callers: `"summarization"`,
     `"image_generation"`, `"tts"`, `"blog_production"`, `"web_search"`.
   - Extend `ProviderAttemptEvent` to support OpenAI-specific event fields
     if needed (currently Anthropic-centric).

2. **Instrument non-chat model callers with provider events**
   - Add `emitProviderEvent()` calls to `AnthropicSummarizer.ts` (start, success,
     failure events for summarization calls).
   - Add `emitProviderEvent()` calls to `OpenAiBlogImageProvider.ts` (image
     generation lifecycle).
   - Add `emitProviderEvent()` calls to TTS route (audio generation lifecycle).
   - Assess whether full resilience policy (retry, backoff) provides value for
     each caller or if observability-only is sufficient.

3. **Incrementally thin MCP transport wrappers**
   - Acknowledge that MCP domain separation is already clean for most tools.
   - Target `analytics-tool.ts` (700 lines, domain + transport mixed) as the
     highest-impact candidate for separation.
   - Document which `mcp/` files are transport-only vs domain-carrying.

4. **Wire Sprint 5 catalog mcpExport to MCP server registration**
   - Use the catalog's `mcpExport` facet to drive MCP tool registration for
     `admin_web_search` in `mcp/web-search-tool.ts`.
   - Prove the pattern: catalog metadata → MCP tool registration, so future
     capabilities can follow.

5. **Add provider and boundary tests**
   - Test that new surface events emit correctly for each non-chat caller.
   - Test that MCP tool registration produces correct Anthropic tool schemas
     when derived from catalog metadata.
   - Extend `provider-policy.test.ts` with new surface event tests.

## Out of Scope

1. Rewriting the blog-production pipeline — it's a large multi-step system.
   Sprint 7 adds observability hooks, not structural changes.
2. Changing MCP server protocols (stdio, transport layer) — only thinning
   domain logic out of transport files.
3. Adding new MCP tools — only improving existing tool separation.
4. Modifying the embedding pipeline — `embedding-server.ts` is 670 lines and
   warrants its own effort.
5. Introducing a unified asset storage system for generated images, audio, etc.
6. Adding retry/resilience to all callers — some may only need observability.

## Required Artifacts

- provider-runtime expansion matrix (which callers get observability vs resilience)
- MCP boundary cleanup map (before/after domain ownership per `mcp/` file)
- shared-domain-vs-transport ownership table

## Implementation Outputs

- extended provider-policy surface enum covering 5+ non-chat surfaces
- `emitProviderEvent()` calls in at least 3 non-chat model callers
- catalog-driven MCP tool registration for `admin_web_search`
- boundary tests for provider and protocol adapters

## Acceptance Criteria

1. Provider-policy surface enum supports at least 5 values beyond
   `"stream" | "direct_turn"`, verified by test.
2. At least 3 non-chat model callers emit `emitProviderEvent()` lifecycle
   events, verified by tests.
3. Catalog-driven MCP tool registration is proven for `admin_web_search` —
   the MCP server reads tool metadata from the catalog instead of hardcoding it.
4. Sprint 4-6 test suites remain green (94+ tests).
5. MCP domain-vs-transport ownership is documented for every `mcp/` file.

## Verification

- provider-policy tests for new surface events (extend `provider-policy.test.ts`)
- MCP boundary tests for catalog-driven registration
- `src/lib/chat/registry-sync.test.ts` remains green (6 tests)
- `src/core/capability-catalog/catalog.test.ts` remains green (27 tests)
- `src/lib/chat/provider-policy.test.ts` remains green (43+ tests)
- `src/lib/jobs/job-publication.test.ts` remains green (9 tests)
- diagnostics-clean changed files

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Provider-policy surface enum supports at least 5 values beyond stream/direct_turn | ✅ 5 new surfaces: summarization, image_generation, tts, blog_production, web_search |
| 2 | At least 3 non-chat model callers emit emitProviderEvent() lifecycle events | ✅ AnthropicSummarizer, OpenAiBlogImageProvider, TTS route — all instrumented |
| 3 | Catalog-driven MCP tool registration proven for admin_web_search | ✅ `projectMcpToolRegistration()` + 11 tests |
| 4 | Sprint 4-6 test suites remain green (94+ tests) | ✅ All 109 tests pass (94 from Sprint 4-6 + 15 new from Sprint 7) |
| 5 | MCP domain-vs-transport ownership documented for every mcp/ file | ✅ `sprint-7-mcp-boundary-map.md` with 9-file classification |

### Test Summary

| Test File | Tests | Status |
| --- | --- | --- |
| `src/lib/chat/provider-policy.test.ts` | 47 | ✅ (was 43, +4 new surface tests) |
| `src/core/capability-catalog/mcp-export.test.ts` | 11 | ✅ NEW |
| `src/core/capability-catalog/catalog.test.ts` | 27 | ✅ pass |
| `src/lib/chat/registry-sync.test.ts` | 6 | ✅ pass |
| `src/lib/jobs/job-publication.test.ts` | 9 | ✅ pass |
| `src/lib/jobs/job-status.test.ts` | 3 | ✅ pass |
| `src/lib/jobs/job-read-model.test.ts` | 2 | ✅ pass |
| `src/lib/jobs/job-event-stream.test.ts` | 4 | ✅ pass |
| **Total** | **109** (was 94) | **✅ all green** |

### Files Changed

| File | Change |
| --- | --- |
| `src/lib/chat/provider-policy.ts` | MODIFIED — expanded surface enum (5 new values), ProviderSurface type, updated JSDoc |
| `src/lib/chat/provider-policy.test.ts` | MODIFIED — 4 new tests for surface expansion + 3 cross-path import verifications |
| `src/adapters/AnthropicSummarizer.ts` | MODIFIED — instrumented with emitProviderEvent (summarization surface) |
| `src/adapters/OpenAiBlogImageProvider.ts` | MODIFIED — instrumented with emitProviderEvent (image_generation surface) |
| `src/app/api/tts/route.ts` | MODIFIED — instrumented with emitProviderEvent (tts surface) |
| `src/core/capability-catalog/mcp-export.ts` | NEW — catalog-driven MCP tool registration projection |
| `src/core/capability-catalog/mcp-export.test.ts` | NEW — 10 MCP export projection tests |

### Artifacts

| Artifact | File |
| --- | --- |
| MCP boundary map | `sprint-7-mcp-boundary-map.md` |
| Provider expansion matrix | `sprint-7-provider-expansion-matrix.md` |
