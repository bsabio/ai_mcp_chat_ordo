# Sprint 17 — Embedding Server Schema Extraction and Transport Slimming

> **Status:** Complete
> **Goal:** Slim `mcp/embedding-server.ts` (683 lines) to a thin transport shell
> by extracting inline tool schema definitions into the existing domain modules,
> following the pattern established by Sprint 11's analytics-tool split.
> **Prerequisite:** Sprint 16 complete ✅
> **Estimated scope:** 5 files modified, 1 new test file

## QA Findings Before Implementation

1. **`embedding-server.ts` is 683 lines** — the largest MCP file. It imports
   from 21 `src/` modules. It calls `getDb()` directly (line 89). The Sprint 9
   canary test does NOT list it as an approved exception because it's in `mcp/`,
   not `src/`.

2. **All 4 tool domains already delegate to domain modules:**
   - Embedding: `embed_text`, `embed_document`, `search_similar`,
     `rebuild_index`, `get_index_stats`, `delete_embeddings`
     → delegates to `mcp/embedding-tool.ts` (183 lines, pure domain)
   - Corpus: `corpus_list`, `corpus_get`, `corpus_add_document`,
     `corpus_add_section`, `corpus_remove_document`, `corpus_remove_section`
     (aliased as `librarian_*`)
     → delegates to `mcp/librarian-tool.ts` (559 lines, pure domain)
   - Prompt: `prompt_list`, `prompt_get`, `prompt_set`, `prompt_rollback`,
     `prompt_diff`
     → delegates to `mcp/prompt-tool.ts` (244 lines, pure domain)
   - Analytics: `conversation_analytics`, `conversation_inspect`,
     `conversation_cohort`
     → delegates to `mcp/analytics-tool.ts` (179 lines, pure domain)

3. **The domain logic is already separated.** The doc's original framing was
   wrong — it said "embedding and corpus tools have their domain logic inline."
   In fact, all handler `case` branches call domain module functions. The bloat
   is from **inline tool schema definitions** (~360 lines) and
   **infrastructure construction** (~100 lines), not domain logic.

4. **20 tools are registered** in the `ListToolsRequestSchema` handler, plus
   6 `librarian_*` aliases in the `CallToolRequestSchema` switch (26 total
   case branches). The schemas average ~15 lines each.

5. **Two schemas reference runtime config** (`corpusConfig.sourceType` in
   `embed_document` and `rebuild_index` descriptions). These can be resolved
   by accepting `sourceType` as a parameter in the schema factory.

6. **Risk register item #11** (`analytics-tool.ts` mixing domain/transport)
   was already resolved in Sprint 11. The remaining embedding-server boundary
   violation was deferred from Sprint 15.

## Current Structure

```
mcp/embedding-server.ts (683 lines)
├── Imports (33 imports, ~75 lines)
├── AllDeps interface + buildDeps() + getDeps() (~100 lines)
├── server.setRequestHandler(ListToolsRequestSchema) — 20 inline schemas (~360 lines)
├── server.setRequestHandler(CallToolRequestSchema) — 26 case switch (~130 lines)
└── server startup (~5 lines)

Already separated domain modules:
├── mcp/embedding-tool.ts (183 lines) — embed, search, index domain functions
├── mcp/librarian-tool.ts (559 lines) — corpus CRUD domain functions
├── mcp/prompt-tool.ts (244 lines) — prompt domain functions
├── mcp/analytics-tool.ts (179 lines) — analytics transport → analytics-domain.ts
└── mcp/analytics-domain.ts (735 lines) — analytics domain functions
```

## Target Structure

```
mcp/embedding-server.ts (~350 lines)   — transport + infrastructure only
├── Imports (reduced)
├── AllDeps + getDeps()
├── ListToolsRequestSchema handler → imports schema arrays from domain modules
├── CallToolRequestSchema handler → switch dispatch (already delegating)
└── Server startup

Domain modules (existing, extended with schema exports):
├── mcp/embedding-tool.ts (+schema array export)
├── mcp/librarian-tool.ts (+schema array export)
├── mcp/prompt-tool.ts (+schema array export)
└── mcp/analytics-tool.ts (+schema array export)
```

## Tasks

1. **Export tool schemas from `mcp/embedding-tool.ts`**
   - Add `export function getEmbeddingToolSchemas(sourceType: string)` that
     returns the 6 embedding tool schema objects currently inline in
     `embedding-server.ts` (lines 195–296)
   - The `sourceType` parameter resolves the `corpusConfig.sourceType` references
     in `embed_document` and `rebuild_index` descriptions
   - Keep existing domain function exports unchanged

2. **Export tool schemas from `mcp/librarian-tool.ts`**
   - Add `export function getCorpusToolSchemas()` that returns the 6 corpus
     tool schema objects currently inline (lines 299–429)

3. **Export tool schemas from `mcp/prompt-tool.ts`**
   - Add `export function getPromptToolSchemas()` that returns the 5 prompt
     tool schema objects currently inline (lines 431–500)

4. **Export tool schemas from `mcp/analytics-tool.ts`**
   - Add `export function getAnalyticsToolSchemas()` that returns the 3
     analytics tool schema objects currently inline (lines 501–552)

5. **Slim `mcp/embedding-server.ts`**
   - Replace the inline tool schema definitions with:
     ```typescript
     server.setRequestHandler(ListToolsRequestSchema, async () => ({
       tools: [
         ...getEmbeddingToolSchemas(corpusConfig.sourceType),
         ...getCorpusToolSchemas(),
         ...getPromptToolSchemas(),
         ...getAnalyticsToolSchemas(),
       ],
     }));
     ```
   - Keep the `AllDeps` infrastructure construction (it's transport-layer wiring)
   - Keep the `CallToolRequestSchema` handler switch (it's already thin delegation)
   - Target: ≤ 350 lines

6. **Add domain separation verification test**
   - New: `src/core/capability-catalog/embedding-domain-separation.test.ts`
   - Verify each domain module exports a `get*ToolSchemas()` function
   - Verify `embedding-server.ts` calls all 4 schema factories
   - Verify `embedding-server.ts` ≤ 350 lines
   - Verify no domain module imports MCP protocol types
   - Register in `run-unification-qa.ts`

## Out of Scope

- Changing tool APIs, behavior, or handler logic
- Splitting domain modules further (they're already clean)
- Migrating `getDb()` to RepositoryFactory (mcp/ is outside canary scope;
  the single `getDb()` call is infrastructure wiring, not data access)
- Adding new embedding, corpus, or analytics features
- Renaming `librarian-tool.ts` to `corpus-domain.ts` (aliasing is intentional)

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | `embedding-server.ts` ≤ 350 lines | `wc -l mcp/embedding-server.ts` |
| AC2 | `embedding-tool.ts` exports `getEmbeddingToolSchemas()` | `grep "getEmbeddingToolSchemas" mcp/embedding-tool.ts` |
| AC3 | `librarian-tool.ts` exports `getCorpusToolSchemas()` | `grep "getCorpusToolSchemas" mcp/librarian-tool.ts` |
| AC4 | `prompt-tool.ts` exports `getPromptToolSchemas()` | `grep "getPromptToolSchemas" mcp/prompt-tool.ts` |
| AC5 | `analytics-tool.ts` exports `getAnalyticsToolSchemas()` | `grep "getAnalyticsToolSchemas" mcp/analytics-tool.ts` |
| AC6 | No domain module imports MCP protocol types | Domain separation test |
| AC7 | `npm run qa:unification` passes (210+ tests) | `npm run qa:unification` |

## Verification

```bash
# AC1: Server slimmed
wc -l mcp/embedding-server.ts  # expect ≤350

# AC2-AC5: Schema exports
grep "getEmbeddingToolSchemas" mcp/embedding-tool.ts
grep "getCorpusToolSchemas" mcp/librarian-tool.ts
grep "getPromptToolSchemas" mcp/prompt-tool.ts
grep "getAnalyticsToolSchemas" mcp/analytics-tool.ts

# AC6-AC7: Tests
npm run qa:unification  # expect 210+ tests, 16 files

# No new type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37
```
