# Sprint 20 — Catalog Schema Derivation Foundation

> **Status:** Partially complete — the schema facet and projection foundation are landed, but broad production-consumer migration remains open
> **Goal:** Move tool input schemas into the capability catalog so Anthropic
> tool descriptors and MCP tool schemas can derive from one source instead of
> being maintained in parallel.
> **Prerequisite:** Sprint 19 complete ✅ (prompt provenance persistence)
> **Estimated scope:** Large — initial schema-enriched catalog coverage, schema projection helpers, and verification landed; broad consumer migration still pending

## QA Findings Before Implementation

1. **Catalog has 0 `inputSchema` references** — confirmed with
   `grep -c "inputSchema\|input_schema\|schema:" catalog.ts` = 0.
   The `CapabilityDefinition` interface has no schema facet.

2. **38 files define tool schemas independently:**
   - 33 tool descriptor files in `src/core/use-cases/tools/` (Anthropic
     `input_schema` format)
   - 4 schema factories in `src/lib/capabilities/shared/` (MCP `inputSchema`
     format): `embedding-tool.ts`, `librarian-tool.ts`, `prompt-tool.ts`,
     `analytics-tool.ts`
   - 1 MCP transport shell: `mcp/operations-server.ts` (imports from shared/)

3. **Doc 03 (03-target-architecture.md) L69–82:** "The system needs one
   catalog that defines each capability once" — each entry should include
   "input schema" and "domain executor binding."

4. **Current duplication:** A tool's schema is defined in:
   - The Anthropic tool descriptor factory (`src/core/use-cases/tools/*.ts`)
   - The shared domain module schema factory (`src/lib/capabilities/shared/*.ts`)
   - Sometimes in the tool bundle registration (`src/lib/chat/tool-bundles/*.ts`)
   These can drift independently.

5. **55 catalog entries** exist in `catalog.ts` (verified by
   `grep -c "^  [a-z_]*: {" catalog.ts`). All 55 would need schema facets
   for full coverage.

6. **Existing projection functions** (from Sprints 5–7):
   - `projectMcpToolRegistration()` — projects catalog → MCP tool registration
   - `projectPresentationDescriptor()` — projects catalog → UI hints
   - `projectJobCapability()` — projects catalog → deferred job descriptor
   - `projectPromptHint()` — projects catalog → prompt directive
   Sprint 20 adds `projectAnthropicSchema()` and `projectMcpSchema()`.

7. **Sprint 17/19 architecture change:** All domain tool modules migrated from
   `mcp/*.ts` to `src/lib/capabilities/shared/*.ts`. The MCP transport layer
   is `mcp/operations-server.ts` (339 lines) which imports schemas from
   shared/. Sprint 19 added `prompt_get_provenance` (21 tool schemas total
   across 4 domain modules).

8. **Current QA baseline:** 290 tests in 23 files, 37 type errors.

## Shipped Foundation

As of 2026-04-12, the repo has already landed the core derivation foundation:

- `CapabilitySchemaFacet` and `schema?: CapabilitySchemaFacet` exist on
  `CapabilityDefinition`.
- `catalog.ts` currently carries 18 schema-enriched entries.
- `src/core/capability-catalog/schema-projection.ts` exports
  `projectAnthropicSchema()`, `projectMcpSchema()`, `getAllAnthropicSchemas()`,
  and `getAllMcpSchemas()`.
- `src/core/capability-catalog/schema-derivation.test.ts` exists and is
  registered in `qa:unification`.
- `docs/_refactor/unification/02-post-unification-architecture.md` documents
  the schema-derivation pipeline.

## Remaining Gap

The projection helpers are currently test- and doc-backed rather than the
primary runtime source for Anthropic descriptor factories and MCP
registration. Sprint 20 should therefore be treated as a landed derivation
foundation, not as a fully closed consumer-convergence sprint.

Executor binding is intentionally deferred to Sprint 23.

## Current State

```text
Tool Schema Sources (Parallel Maintenance):
├── src/core/use-cases/tools/*.ts                 — 33 Anthropic tool descriptors
├── src/lib/capabilities/shared/embedding-tool.ts  — 6 MCP schemas (getEmbeddingToolSchemas)
├── src/lib/capabilities/shared/librarian-tool.ts  — 6 MCP schemas (getCorpusToolSchemas)
├── src/lib/capabilities/shared/prompt-tool.ts     — 6 MCP schemas (getPromptToolSchemas)
├── src/lib/capabilities/shared/analytics-tool.ts  — 3 MCP schemas (getAnalyticsToolSchemas)
├── src/lib/chat/tool-bundles/*                    — bundle registration (imports schemas)
└── mcp/operations-server.ts                       — transport shell (imports from shared/)
```

## Target State

```text
Capability Catalog (Single Source):
catalog.ts → each entry gains `schema` facet
       ↓
  projectAnthropicSchema()    — derives Anthropic-compatible { name, description, input_schema }
  projectMcpSchema()          — derives MCP tool registration { name, description, inputSchema }
  projectValidationSchema()   — (future) derives input validation rules
```

## Tasks

### Phase A: Schema Facet Definition

1. **Define `CapabilitySchemaFacet` type**
   - Add to `src/core/capability-catalog/capability-definition.ts`:

     ```typescript
     interface CapabilitySchemaFacet {
       inputSchema: {
         type: "object";
         properties: Record<string, unknown>;
         required?: string[];
         additionalProperties?: boolean;
       };
       outputHint?: string;  // human-readable output description
     }
     ```

   - Add `schema?: CapabilitySchemaFacet` to `CapabilityDefinition`
   - Make it optional (not all tools have user-facing schemas yet)

2. **Add schema facets to highest-value catalog entries first**
   - Start with deferred tools: `draft_content`, `publish_content`,
     `compose_media`, `admin_web_search` (highest drift risk)
   - Then content tools: `search_corpus`, `get_section`,
     `search_my_conversations`
   - Then admin tools: `admin_prioritize_leads`, `admin_prioritize_offer`,
     `admin_triage_routing_risk`
   - Then referral tools: `get_my_affiliate_summary`,
     `list_my_referral_activity`, `get_admin_affiliate_summary`
   - Remaining tools as time permits (target ≥15 initial entries)

### Phase B: Projection Functions

1. **Create `projectAnthropicSchema()` projection**
   - New function in `src/core/capability-catalog/catalog.ts` or a new file
     `src/core/capability-catalog/schema-projection.ts`
   - Derives Anthropic-compatible `{ name, description, input_schema }` from
     catalog entry's `core` + `schema` facets
   - Falls back to `null` for entries without schema facets (existing
     descriptor factories continue working)

2. **Create `projectMcpSchema()` projection**
   - Derives MCP tool registration `{ name, description, inputSchema }` from
     catalog entry's `core` + `schema` facets
   - Enables MCP tool registration without inline schema duplication
   - Note: MCP uses `inputSchema` (camelCase) while Anthropic uses
     `input_schema` (snake_case) — the projection handles this mapping

### Phase C: Consumer Migration

1. **Migrate Anthropic tool descriptor factories**
   - For catalog entries with schema facets, derive descriptors from catalog
   - Keep existing factories for entries without schema facets (graceful rollout)
   - Add canary test: "catalog-schema entries produce identical descriptors to
     legacy factories"

2. **Migrate MCP tool registrations**
   - For catalog entries with `mcpExport` + schema facets, derive MCP schemas
     from catalog instead of from shared/ schema factories
   - Verify parity with existing inline schemas from
     `getEmbeddingToolSchemas()`, `getCorpusToolSchemas()`, etc.

   Current repo state: this broad runtime migration is still open.
   `schema-projection.ts` exists, but production Anthropic descriptor
   factories and MCP registration paths do not yet consume it outside
   verification coverage.

### Phase D: Verification

1. **Schema parity verification test**
   - New: `src/core/capability-catalog/schema-derivation.test.ts`
   - For each entry with schema facet: project both Anthropic and MCP schemas,
     verify they're structurally equivalent to the legacy definitions
   - Test: schema-faceted entries produce valid JSON Schema
   - Test: projection gracefully returns `null` for entries without schema
   - Test: `inputSchema.required` is preserved through both projections
   - Register in `run-unification-qa.ts`
   - ~15 tests

2. **Update `docs/_refactor/unification/02-post-unification-architecture.md`**
   - Document the schema derivation pipeline
   - Update the capability system map (inputSchema: ✅)

## Out of Scope

- Executor binding migration (domain executor functions stay in tool bundles)
- Removing legacy descriptor factories entirely (graceful coexistence)
- Changing tool behavior or APIs
- Schema validation at runtime (derive only, don't enforce yet)
- Migrating all 55 catalog entries in this sprint (target ≥15)
- Broad replacement of legacy descriptor factories and MCP registration paths
  in production consumers

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | `CapabilitySchemaFacet` type exists on `CapabilityDefinition` | `grep "schema" capability-definition.ts` |
| AC2 | ≥15 catalog entries have schema facets populated | `grep -c "schema:" catalog.ts` ≥ 15 |
| AC3 | `projectAnthropicSchema()` derives correct Anthropic tool descriptors | Schema parity test |
| AC4 | `projectMcpSchema()` derives correct MCP tool registrations | Schema parity test |
| AC5 | Schema parity test verifies derived schemas match legacy schemas | `npx vitest run schema-derivation.test.ts` |
| AC6 | `npm run qa:unification` passes (300+ tests) | `npm run qa:unification` |
| AC7 | Architecture doc updated with schema derivation pipeline | `grep "schema" 02-post-unification-architecture.md` |

## Verification

```bash
# Schema facet type exists
grep "CapabilitySchemaFacet" src/core/capability-catalog/capability-definition.ts

# Schema-enriched catalog entries
grep -c "schema:" src/core/capability-catalog/catalog.ts  # expect ≥15

# Projection functions exist
grep "projectAnthropicSchema\|projectMcpSchema" src/core/capability-catalog/*.ts

# Schema parity test passes
npx vitest run src/core/capability-catalog/schema-derivation.test.ts

# Full QA suite
npm run qa:unification  # expect 300+ tests, 25+ files

# No new type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37
```
