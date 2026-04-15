# Sprint 5 Artifact — Unresolved Edge Cases

> Capabilities and seams that remain manually maintained after the Sprint 5
> pilot, with explicit reasons why they were not absorbed into the catalog.

## 1. ToolDescriptor Factory Functions

**Files:** `admin-content.tool.ts`, `compose-media.tool.ts`, `admin-web-search.tool.ts`

The `createDraftContentTool(...)`, `createPublishContentTool(...)`, and
`createAdminWebSearchTool(...)` factory functions accept runtime dependencies
(repositories, service factories) and produce `ToolDescriptor` instances
with bound command objects and Anthropic JSON schemas.

**Why not catalog-derived:** The catalog defines metadata (name, category,
roles, execution mode). The factory functions carry:
- Constructor-injected dependencies (BlogPostRepository, OpenAI)
- Bound ToolCommand instances
- The full Anthropic input_schema JSON

These are runtime concerns, not static metadata. Attempting to derive them
from the catalog would require either lazy dependency injection or a factory
registry — both are larger patterns that belong in a future sprint.

## 2. Tool Bundle Membership

**Files:** `BLOG_BUNDLE`, `MEDIA_BUNDLE`, `ADMIN_BUNDLE` in `tool-bundles/*.ts`

Bundle membership (`toolNames` arrays) is not derived from the catalog.
Bundles carry implicit scope and privilege semantics: which tools load
together, which are gated behind instance config, and which share DB mocks
in tests.

**Why not catalog-derived:** Bundle membership overlaps with RBAC policy,
instance configuration routing, and test infrastructure. Deriving it from
the catalog would couple it to a metadata layer that doesn't own those
concerns. This is a candidate for Sprint 6 or 7.

## 3. Role Directives String Assembly

**File:** `src/core/entities/role-directives.ts`

The `ROLE_DIRECTIVES` object joins directive lines with `\n` into final
prompt strings. The catalog's `promptHint` facet documents the source lines
but does not replace the existing assembly logic.

**Why not catalog-derived:** The role directives file joins lines from
multiple sources (job status directives, compose_media directives, web
search directives, and general role framing). Replacing one source while
keeping others hardcoded would create a hybrid that's harder to reason about
than the current single-file approach. Full prompt-hint derivation is
feasible but should wait until all directive sources can be cataloged.

## 4. Hardcoded `compose_media` Job Route

**File:** `src/app/api/chat/jobs/route.ts` (line 106)

The job enqueue endpoint has a hardcoded `if (toolName !== "compose_media")`
guard. This is a routing decision, not metadata — the catalog cannot absorb it.

**Why not catalog-derived:** The route enforces a one-tool policy for the
jobs API. This is a business rule, not a metadata derivation target.

## 5. Renderer Mapping

**File:** `src/frameworks/ui/chat/registry/default-tool-registry.ts`

The renderer map links tool names to React components. Sprint 5 explicitly
keeps this out of scope — full component derivation would require a plugin
system or component auto-discovery, which is a separate architectural concern.

## 6. `executionMode` Type Split

**Types:** `ToolExecutionMode` vs `CapabilityExecutionMode`

The ToolDescriptor type defines `"inline" | "deferred"` while the
presentation type adds `"browser" | "hybrid"`. This split is intentional:
the Anthropic API contract only knows inline vs deferred, while the
presentation layer needs richer execution semantics.

The `registry-sync.test.ts` explicitly tests that `compose_media` has
`undefined` on ToolDescriptor, `"hybrid"` on presentation, and `"wasm_worker"`
on browser capability. This test is the contract — the types remain split by
design.

## 7. MCP Server Infrastructure

No MCP server exists in the codebase. The catalog declares MCP export
intent for `admin_web_search` via the `mcpExport` facet, but no actual
server consumes this intent. Sprint 7 is the planned home for MCP
boundary cleanup, where the export intent can drive actual MCP tool
registration.
