# Sprint 23 — Catalog Executor Binding And Runtime Validation

> **Status:** Complete
> **Goal:** Build on Sprint 20's shipped schema/projection foundation by adding
> executor binding and runtime validation binding to the capability catalog so
> migrated tools derive schema, parser, and executor from one source instead of
> manual registry wiring.
> **Prerequisite:** Sprint 20 foundation complete ✅, Sprint 21 complete ✅, and Sprint 22 complete ✅
> **Estimated scope:** Large — new catalog facet(s), runtime derivation helpers, and first-tranche migration away from manual bundle registration

## Why This Sprint Exists

Sprint 20 landed schema facets and schema projection helpers, and the current
catalog now carries schema data for a meaningful first tranche of capabilities.
Sprint 21 and Sprint 22 then hardened the MCP boundary and transport surface.
What is still missing is executable convergence: the catalog can describe what
a tool should look like, but runtime registration code elsewhere still decides
what function actually runs and what parser or validator enforces the payload.

Elite systems bind three things together from one source:

- capability identity
- input contract
- executor/validator binding

## QA Findings Before Implementation

1. **Schema projection exists, but executable binding does not.**
   `schema-projection.ts` derives Anthropic and MCP schema views, but there is
   no equivalent executor-binding or validator-binding projection yet.

2. **The runtime registry is still manual and bundle-driven.**
   `createToolRegistry()` in `src/lib/chat/tool-composition-root.ts` still calls
   bundle-level `register...Tools()` functions, and those bundle files still own
   the final `registry.register(...)` binding.

3. **Validation and parser logic still live in tool modules.**
   Representative examples include `admin-content.tool.ts`,
   `admin-web-search.tool.ts`, `search-corpus.tool.ts`, and
   `compose-media.tool.ts`, each of which still owns its parser and/or command
   binding outside the catalog.

4. **High-value admin, deferred, and corpus tools are the best first tranche.**
   They cross the internal registry, job projection, admin surfaces, and MCP or
   schema-derived metadata, so they carry the highest drift risk.

## Tasks

1. **Add executor-binding facet(s) to the catalog**
   - Extend `CapabilityDefinition` with an executor facet that can describe:
     - bundle or family ownership
     - canonical executor identifier
     - execution surface (`internal`, `mcp_export`, `shared`, `browser` as needed)

2. **Add validator/parser binding facet(s)**
   - Allow catalog entries to declare the canonical parser or validator
   - Derive validation wrappers for catalog-backed tools
   - Preserve a fallback path for tools that are not yet migrated

3. **Project executable descriptors from the catalog**
   - Derive internal tool descriptors or equivalent registration payloads from
     catalog + executor binding for the migrated set
   - Reuse the same catalog source for MCP schemas where exportable
   - Derive validation from catalog + schema/validator facet

4. **Migrate the highest-risk capabilities first**
   - `admin_web_search` from `admin-web-search.tool.ts`
   - `draft_content` and `publish_content` from `admin-content.tool.ts`
   - `compose_media` from `compose-media.tool.ts`
   - `search_corpus` from `search-corpus.tool.ts`
   - `get_section` or `search_my_conversations` as the next proving-ground
     search/navigation capability once the first tranche is stable

5. **Add convergence tests**
   - Prove that a catalog-backed capability cannot advertise one schema and run another executor
   - Prove that catalog-backed tools use the declared validator/parser
   - Add a canary that fails if a migrated tool is still manually bound in
     `tool-composition-root.ts` or bundle registration code

## Out of Scope

- Migrating every tool in one sprint
- Rewriting business logic inside tool implementations
- Changing user-facing tool names or APIs

## Acceptance Criteria

1. The catalog can describe executor binding and validation for migrated tools.
2. Internal tool descriptors or equivalent registration payloads can be derived
   from catalog data for the migrated set.
3. The migrated first tranche (`admin_web_search`, `draft_content`,
   `publish_content`, `compose_media`, `search_corpus`, plus one proving-ground
   search/navigation tool if needed) no longer relies on bundle-local manual
   parser/executor wiring.
4. Convergence tests prove schema, validator, and executor stay aligned.
5. `npm run qa:unification` passes with the new catalog convergence coverage.

## Verification

```bash
npm exec vitest run src/core/capability-catalog/ src/lib/chat/registry-sync.test.ts
npm run qa:unification
grep -RInE 'registry\.register\((createAdminWebSearchTool|createDraftContentTool|createPublishContentTool|createSearchCorpusTool|composeMediaTool)' src/lib/chat/tool-bundles src/lib/chat/tool-composition-root.ts || true
```
