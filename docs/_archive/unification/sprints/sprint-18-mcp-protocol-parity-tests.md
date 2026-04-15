# Sprint 18 — MCP Protocol Parity Tests

> **Status:** Complete
> **Goal:** Add test coverage for all MCP domain modules to verify tool handler
> correctness, input validation, and behavioral parity with catalog-declared
> capabilities.
> **Prerequisite:** Sprint 17 complete ✅ (embedding-server schema extraction)
> **Estimated scope:** 5–6 new test files, 60+ tests, vitest config update

> **Post-Sprint-21 note:** Shared module tests now live under
> `src/lib/capabilities/shared/`. Verification commands below reflect the
> post-extraction layout rather than the original `mcp/` paths.

## QA Findings Before Implementation

1. **Zero test files exist in `mcp/`** — `find mcp -name "*.test.*"` returns
   nothing. All MCP tool domain logic is untested at the module level.

2. **MCP domain modules to test (post-Sprint 21 layout):**
   - `src/lib/capabilities/shared/calculator-tool.ts` (1 exported function `executeCalculatorTool`)
   - `src/lib/capabilities/shared/embedding-tool.ts` (6 domain functions + `getEmbeddingToolSchemas`)
   - `src/lib/capabilities/shared/librarian-tool.ts` (6 corpus operations + aliases + `getCorpusToolSchemas`)
   - `src/lib/capabilities/shared/prompt-tool.ts` (5 prompt operations + `getPromptToolSchemas`)
   - `src/lib/capabilities/shared/analytics-tool.ts` (3 entry points + `getAnalyticsToolSchemas`)
   - `src/lib/capabilities/shared/analytics-domain.ts` (statistical/query domain logic)
   - `src/lib/capabilities/shared/web-search-tool.ts` (`adminWebSearch` + `validateAdminWebSearchArgs`)

3. **Note:** The original doc referenced `mcp/embedding-domain.ts` and
   `mcp/corpus-domain.ts` as Sprint 17 outputs. Sprint 17 actually extended
   the existing `mcp/embedding-tool.ts` and `mcp/librarian-tool.ts` with
   schema factories — no new domain files were created.

4. **Doc 06 (Test and Verification Strategy) §MCP server protocol tests:**
   Identifies MCP protocol testing as a verification gap, noting the need for
   "parity with internal domain services where intended."

5. **Doc 13 (Test Reality Inventory):** Notes "the strongest tests are often
   local-module tests, while the weakest confidence is at the composition
   seams." MCP domain modules sit at exactly this boundary.

6. **Catalog `mcpExport` facets:** Only 1 catalog entry currently has an
   `mcpExport` facet — `admin_web_search` (pointing to
   `src/lib/capabilities/shared/web-search-tool`). The catalog parity test scope is therefore small.

7. **`web-search-tool.ts` requires an OpenAI client mock** via the
   `WebSearchToolDeps` interface (`{ openai: OpenAI }`). The
   `validateAdminWebSearchArgs` function is pure and testable without mocks.
   The `adminWebSearch` function itself hits `openai.responses.create` —
   testing it requires an OpenAI mock or limiting tests to input validation.

## Tasks

1. **`src/lib/capabilities/shared/calculator-tool.test.ts`**
   - Test `executeCalculatorTool()` with valid math (add, subtract, multiply, divide)
   - Test division by zero handling
   - Test invalid operation rejection
   - Test non-numeric input rejection
   - ~6 tests

2. **`src/lib/capabilities/shared/embedding-tool.test.ts`**
   - Test `embedText()` with mock embedder
   - Test `embedDocument()` with mock pipeline factory
   - Test `searchSimilar()` with mock search handler
   - Test `rebuildIndex()` — valid source, invalid source, force mode
   - Test `getIndexStats()` with mock stores
   - Test `deleteEmbeddings()` — valid ID, missing ID
   - Test `getEmbeddingToolSchemas()` returns 6 schemas with sourceType interpolation
   - Mock: `EmbeddingToolDeps` interface (embedder, vectorStore, bm25IndexStore,
     searchHandler, pipelineFactory, corpusRepo)
   - ~12 tests

3. **`src/lib/capabilities/shared/librarian-tool.test.ts`**
   - Test `corpusList()`, `corpusGetDocument()`, `corpusAddDocument()`,
     `corpusAddSection()`, `corpusRemoveDocument()`, `corpusRemoveSection()`
   - Test `getCorpusToolSchemas()` returns 6 schemas
   - Mock: `CorpusToolDeps` interface (`corpusDir`, `vectorStore`, `clearCaches`)
   - ~10 tests

4. **`src/lib/capabilities/shared/prompt-tool.test.ts`**
   - Test `promptList()`, `promptGet()`, `promptSet()`, `promptRollback()`, `promptDiff()`
   - Test `getPromptToolSchemas()` returns 5 schemas
   - Verify APPRENTICE role appears in role enumeration (via mock service)
   - Mock: `PromptToolDeps` with `service: PromptControlPlaneService`
   - ~12 tests

5. **`src/lib/capabilities/shared/web-search-tool.test.ts`**
   - Test `validateAdminWebSearchArgs()` — valid args, missing query, empty query
   - Test `adminWebSearch()` input validation path (if separable from API call)
   - Schema-level: verify web search is the only catalog entry with `mcpExport`
   - ~5 tests (pure validation only; actual API calls are out of scope)

   > Note: Verifying that `admin_web_search` is the only catalog entry with
   > `mcpExport` is handled in the catalog parity test (Task 6), not here.

6. **Catalog MCP export parity test**
   - New: `src/core/capability-catalog/mcp-catalog-parity.test.ts`
   - For each catalog entry with `mcpExport` facet:
     - Verify the declared `sharedModule` file exists on disk
     - Verify the shared module is consumed by at least one importer
   - Verify the count of `mcpExport` entries matches expectations (currently 1)
   - ~5 tests
   - Register in `run-unification-qa.ts`

## Out of Scope

- Testing MCP transport/protocol layer (JSON-RPC framing, stdio transport)
- Testing `embedding-server.ts` transport shell directly
- End-to-end MCP client-server integration tests
- Changing any MCP tool behavior
- Full `adminWebSearch()` testing (requires real OpenAI client mock)
- Testing `analytics-domain.ts` SQL queries (needs SQLite in-memory db; 
  consider deferring to a dedicated analytics testing sprint)
- Note: `vitest.config.ts` was updated to add `mcp/**/*.{test,spec}.{ts,tsx}`
  to the `include` pattern so vitest discovers tests in `mcp/`

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | `calculator-tool.test.ts` exists and passes | `npx vitest run src/lib/capabilities/shared/calculator-tool.test.ts` |
| AC2 | `embedding-tool.test.ts` exists and passes | `npx vitest run src/lib/capabilities/shared/embedding-tool.test.ts` |
| AC3 | `librarian-tool.test.ts` exists and passes | `npx vitest run src/lib/capabilities/shared/librarian-tool.test.ts` |
| AC4 | `prompt-tool.test.ts` exists and passes | `npx vitest run src/lib/capabilities/shared/prompt-tool.test.ts` |
| AC5 | `web-search-tool.test.ts` exists and passes | `npx vitest run src/lib/capabilities/shared/web-search-tool.test.ts` |
| AC6 | Catalog MCP parity test in QA suite | `npm run qa:unification` |
| AC7 | `npm run qa:unification` passes (290+ tests) | `npm run qa:unification` |

## Verification

```bash
# Run all MCP domain tests
npx vitest run src/lib/capabilities/shared/

# Check test file count
find src/lib/capabilities/shared -name "*.test.*" | wc -l  # expect ≥5

# Full QA suite
npm run qa:unification  # expect 290+ tests, 22+ files

# No new type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37
```
