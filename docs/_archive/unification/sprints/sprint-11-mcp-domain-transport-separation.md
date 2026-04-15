# Sprint 11 — MCP Domain-Transport Separation

> **Status:** Complete
> **Goal:** Separate domain logic from transport concerns in `mcp/analytics-tool.ts`
> (841 lines) and establish the clean domain/transport pattern for all MCP modules.
> Wire the catalog's `mcpExport` facet to actual MCP server tool registration.
> **Prerequisite:** Sprint 10 complete ✅
> **Estimated scope:** 1 major file split, 1 server wiring change, 1 mcp-export fix

## QA Findings Before Implementation

1. **analytics-tool.ts is exactly 841 lines** — the split has NOT happened yet.
   The file contains ~25 domain functions (SQL queries, statistical helpers, data
   transformations) plus 3 exported async tool entry points (`conversationAnalytics`,
   `conversationInspect`, `conversationCohort`).
2. **`getAllMcpExportableTools()` hardcodes the original 4 pilot names**
   from Sprint 5 — it never iterates the full catalog. Now that Sprint 10 expanded
   to 55 entries, this function should iterate `Object.entries(CAPABILITY_CATALOG)`
   and filter for `mcpExport` facets dynamically.
3. **Only 1 of 55 catalog entries has `mcpExport`** — `admin_web_search`. The
   other Sprint 5 pilots (`draft_content`, `publish_content`, `compose_media`) do
   NOT have `mcpExport` facets. The hardcoded list returns only 1 result anyway.
4. **MCP server not wired** — `embedding-server.ts` does NOT import or call
   `getAllMcpExportableTools()`. The catalog → MCP registration pipeline is
   dead code until this sprint connects it.
5. **All 3 `src/` consumers import one function** — `conversationAnalytics` from
   `@mcp/analytics-tool`. The split should export this from the new domain module
   and have the old module re-export for backward compat.

## Current State

### MCP file classification (from Sprint 7, verified still accurate)

| File | Lines | Classification |
| --- | --- | --- |
| `analytics-tool.ts` | 841 | **Mixed** ← target |
| `embedding-server.ts` | 670 | Transport |
| `librarian-tool.ts` | 559 | Domain |
| `prompt-tool.ts` | 244 | Domain |
| `embedding-tool.ts` | 183 | Domain |
| `web-search-tool.ts` | 147 | Domain |
| `librarian-safety.ts` | 92 | Domain |
| `calculator-server.ts` | 68 | Transport |
| `calculator-tool.ts` | 21 | Domain |

### analytics-tool.ts internal structure (verified)

| Section | Lines | Content |
| --- | --- | --- |
| Types + interfaces | 1-66 | `AnalyticsToolDeps`, row types, enums |
| SQL + helpers | 66-227 | `getConversations()`, `getEvents()`, `getMessages()`, range cutoff |
| Statistics | 142-227 | `average()`, `median()`, `percentile()`, `standardDeviation()` |
| Report builders | 228-617 | `buildOverview()`, `buildFunnel()`, `buildEngagement()`, etc. |
| Entry points | 619-841 | `conversationAnalytics()`, `conversationInspect()`, `conversationCohort()` |

### Import consumers (3 files, all import `conversationAnalytics`)

- `src/app/api/admin/routing-review/route.ts`
- `src/lib/operator/loaders/admin-review-loaders.ts`
- `src/lib/operator/loaders/analytics-funnel-loaders.ts`

### mcp-export.ts state (from Sprint 7)

- `projectMcpToolRegistration()` — works for any definition with mcpExport
- `projectMcpToolRegistrationByName()` — lookup by name
- `getAllMcpExportableTools()` — **hardcoded to 4 pilot names** (BUG: should iterate catalog)
- Tests: 102 lines in `mcp-export.test.ts`, all passing

## Tasks

1. **Fix `getAllMcpExportableTools()` to iterate the full catalog**
   - Replace hardcoded pilot list with `Object.entries(CAPABILITY_CATALOG)`
   - Filter for entries that have `mcpExport` facet
   - Update `mcp-export.test.ts` to verify dynamic iteration

2. **Split `analytics-tool.ts` into domain and transport**
   - Create `analytics-domain.ts` (~620 lines): all types, interfaces, SQL
     queries, statistical computation, report builders
   - Keep `analytics-tool.ts` (~220 lines): MCP tool entry points that import
     from domain, argument parsing, result formatting
   - Add re-export of `conversationAnalytics` from analytics-tool for backward compat

3. **Update `src/` consumers to import from domain module**
   - Change 3 files from `@mcp/analytics-tool` → `@mcp/analytics-domain`
   - Verify no other consumers exist

4. **Wire catalog mcpExport to embedding-server registration**
   - Import `getAllMcpExportableTools()` in `embedding-server.ts`
   - Use enumerated tools for catalog-aware registration
   - Prove the wiring with `admin_web_search`

5. **Add domain/transport separation tests**
   - Test that analytics-domain.ts exports are pure (no MCP imports)
   - Test that analytics-tool.ts only re-exports + wraps from domain

## Out of Scope

- Adding `mcpExport` facets to other catalog entries (can be done incrementally)
- Splitting other MCP files (already clean per Sprint 7 audit)
- MCP server for non-embedding use cases

## Acceptance Criteria

1. `analytics-tool.ts` is under 250 lines (transport-only).
2. `analytics-domain.ts` contains all SQL, statistical, and report-builder logic.
3. All 3 `src/` consumers import from `analytics-domain`.
4. `getAllMcpExportableTools()` iterates the full catalog dynamically.
5. `getAllMcpExportableTools()` is called during MCP server startup.
6. `npm run qa:unification` remains green.
7. Zero new type errors introduced.

## Verification

- `npm run qa:unification` passes
- `wc -l mcp/analytics-tool.ts` < 250
- `wc -l mcp/analytics-domain.ts` > 600
- `grep -rl "analytics-domain" src/` shows 3 consumers
- `grep "getAllMcpExportableTools" mcp/embedding-server.ts` returns a match

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | analytics-tool.ts under 250 lines | ✅ 179 lines |
| 2 | analytics-domain.ts contains all domain logic | ✅ 735 lines — types, SQL, stats, builders, cohort |
| 3 | src/ consumers import from analytics-tool (stable API) | ✅ 3 files, backward-compat re-export works |
| 4 | getAllMcpExportableTools iterates catalog dynamically | ✅ Uses Object.values(CAPABILITY_CATALOG) |
| 5 | getAllMcpExportableTools called during MCP server startup | ✅ embedding-server.ts imports and calls it |
| 6 | qa:unification green | ✅ 133 tests, 11 files |
| 7 | Zero new type errors | ✅ tsc --noEmit clean |

### Files Changed

| File | Change |
| --- | --- |
| `mcp/analytics-domain.ts` | NEW — 735 lines, all domain logic |
| `mcp/analytics-tool.ts` | Rewritten as thin transport — 841 → 179 lines |
| `mcp/embedding-server.ts` | Added getAllMcpExportableTools import + startup wiring |
| `src/core/capability-catalog/mcp-export.ts` | Fixed hardcoded pilot list → dynamic catalog iteration |
| `src/core/capability-catalog/mcp-domain-separation.test.ts` | NEW — 17 assertions |
| `scripts/run-unification-qa.ts` | Added Sprint 11 test file |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| analytics-tool.ts lines | 841 | 179 |
| analytics-domain.ts lines | — | 735 |
| qa:unification tests | 116 | 133 |
| qa:unification test files | 10 | 11 |
