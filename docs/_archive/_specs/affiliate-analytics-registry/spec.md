# Affiliate Analytics Registry

> **Status:** Draft v0.1
> **Date:** 2026-04-01
> **Scope:** Define the shared registry, authorization model, and contract tests for affiliate and referral analytics delivered through MCP-backed system tools and graph datasets.
> **Dependencies:** [Affiliate Referral Remediation](../affiliate-referral-remediation/spec.md), [RBAC](../rbac/spec.md), [Tool Architecture](../tool-architecture/spec.md), [Tool Manifest](../tool-manifest/spec.md), [Flexible Graphing System](../flexible-graphing-system/spec.md)
> **Affects:** `mcp/analytics-tool.ts`, `src/lib/graphs/graph-data-sources.ts`, `src/core/use-cases/tools/generate-graph.tool.ts`, `src/core/use-cases/tools/UiTools.ts`, `src/lib/chat/tool-composition-root.ts`, `src/lib/chat/tool-bundles/`, `src/core/tool-registry/`, new affiliate analytics tool files under `src/core/use-cases/tools/`, and new graph or dataset registry modules under `src/lib/graphs/` or `src/lib/analytics/`
> **Motivation:** The platform already has a strong tool registry and an initial graphing system, but analytics datasets are still governed by ad hoc switch statements and loader choices. Referral analytics cannot ship safely on top of that ambiguity.
> **Requirement IDs:** `AAR-001` through `AAR-199`

---

## 1. Problem Statement

### 1.1 Verified current state

| Area | Verified state | Implication |
| --- | --- | --- |
| Tool registry | `ToolRegistry` enforces RBAC from each `ToolDescriptor.roles` array at execution time | Tool-level authorization is strong once a tool is selected. `[AAR-001]` |
| Tool registration | `src/lib/chat/tool-composition-root.ts` builds the registry from bundle registration functions such as `registerProfileTools()` | New referral analytics tools should fit the existing bundle-based registration model. `[AAR-002]` |
| Existing referral tooling | `registerProfileTools()` currently exposes `get_my_profile`, `update_my_profile`, and `get_my_referral_qr`, but no affiliate analytics tools | Share assets exist, but affiliate analytics are not yet part of the tool surface. `[AAR-003]` |
| Graph tool exposure | `generate_graph` is visible to `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN` | Graph rendering is intentionally broad and should stay broad for inline user-provided data. `[AAR-004]` |
| Graph data source routing | `src/lib/graphs/graph-data-sources.ts` uses a raw `switch` over `sourceType` strings | Dataset policy currently lives in code branches instead of explicit metadata. `[AAR-005]` |
| Current graph source mix | `analytics_funnel`, `lead_queue`, and `routing_review` call admin-only loaders; `conversation_activity` calls a signed-in self-service loader | The graph tool mixes datasets with different audiences behind one resolver without a canonical policy layer. `[AAR-006]` |
| Signed-in fallback path | `GenerateGraphCommand` falls back to an anonymous-looking context when called without an execution context | Direct command use is still possible outside the normal tool path, so data-source policy cannot rely on tool invocation alone. `[AAR-007]` |
| Existing graph tests | `graph-data-sources.test.ts` verifies result shaping, but not a role x dataset permission matrix | Current tests prove mapping, not authorization correctness. `[AAR-008]` |
| Existing analytics MCP | `mcp/analytics-tool.ts` exposes generic metrics such as `overview`, `funnel`, `engagement`, `tool_usage`, `drop_off`, and `routing_review` | A low-level analytics primitive exists, but it is not yet an app-facing affiliate dataset contract. `[AAR-009]` |
| Current execution context | `ToolExecutionContext` carries `role`, `userId`, and optional `conversationId` only | Affiliate capability is currently not represented in the tool execution context. `[AAR-010]` |

### 1.2 Why this needs its own spec

1. The referral remediation plan already requires affiliate self-service datasets, admin program datasets, and role-safe graphing. Those rules are too detailed to stay implicit inside the broader product spec. `[AAR-011]`
2. Tool visibility and dataset visibility are different concerns. A broadly available graph tool can still expose highly restricted datasets if the registry is not explicit. `[AAR-012]`
3. The current graph data source file proves the exact failure mode to avoid: a signed-in tool contract with mixed admin and self-service datasets behind the same resolver. `[AAR-013]`
4. Affiliate access is a capability overlay through `affiliate_enabled`, not a role. That means dataset policy must account for both role and capability state. `[AAR-014]`

### 1.3 Product decision

1. Referral analytics are governed by a shared dataset registry that both MCP-backed tools and graph data resolvers must use. `[AAR-020]`
2. The `generate_graph` tool remains broadly available to signed-in users for inline data, but named server-owned datasets must be authorized separately at the dataset layer. `[AAR-021]`
3. Affiliate self-service datasets are always scoped to the current signed-in account. Caller-provided user ids are never accepted for self-service analytics. `[AAR-022]`
4. Admin referral datasets remain `ADMIN` only by default. `STAFF` does not gain global affiliate visibility in this phase. `[AAR-023]`
5. The app-facing contract is a small set of named datasets and named summary tools, not an open-ended reporting surface. `[AAR-024]`

---

## 2. Design Goals

1. **One registry, multiple channels.** The same dataset definition should drive MCP summary tools, graph dataset resolution, and future admin or affiliate analytics surfaces. `[AAR-030]`
2. **Separate tool RBAC from dataset RBAC.** Tool descriptors govern who can call a tool; dataset policy governs which server-owned datasets that tool may resolve. `[AAR-031]`
3. **Model affiliate capability explicitly.** Dataset policy must understand `affiliate_enabled` without introducing a new `AFFILIATE` role. `[AAR-032]`
4. **Prefer named datasets over arbitrary queries.** The model should request `affiliate_my_pipeline`, not compose SQL or backend-specific filters. `[AAR-033]`
5. **Keep self-service truly self-service.** Self datasets must never leak cross-user results or accept caller-controlled subject ids. `[AAR-034]`
6. **Expose provenance and scope.** Every dataset result should carry enough metadata to explain what was loaded and why the caller was allowed to see it. `[AAR-035]`
7. **Make drift test-detectable.** Dataset registration, graph source exposure, and tool manifest exposure should have contract tests similar to the existing tool manifest system. `[AAR-036]`

---

## 3. Architecture

### 3.1 Shared dataset registry

Introduce a registry dedicated to named analytics datasets.

Suggested shape:

```typescript
type AnalyticsAudience = "signed_in_self" | "affiliate_self" | "admin_global";
type AnalyticsChannel = "tool" | "graph" | "both";

interface AnalyticsViewerContext {
  role: RoleName;
  userId: string;
  affiliateEnabled: boolean;
}

interface AnalyticsDatasetDefinition<TParams = Record<string, unknown>> {
  sourceType: string;
  label: string;
  audience: AnalyticsAudience;
  channels: readonly AnalyticsChannel[];
  category: "affiliate" | "referral_program" | "operator";
  paramsSchema: Record<string, unknown>;
  resolve: (params: TParams, context: AnalyticsViewerContext) => Promise<AnalyticsDatasetResult>;
}

interface AnalyticsDatasetResult {
  rows: GraphRow[];
  summary?: Record<string, unknown>;
  source: {
    sourceType: string;
    label: string;
    rowCount: number;
    scope: "self" | "global";
    audience: AnalyticsAudience;
    provenance: string[];
  };
}
```

Rules:

1. The registry is the only place where a named dataset can declare its audience, supported channels, and resolver. `[AAR-040]`
2. `resolveGraphDataSource()` must become a thin adapter over the registry rather than a hand-maintained `switch` statement. `[AAR-041]`
3. MCP-backed affiliate and admin analytics tools must call the same registry definitions instead of duplicating query logic. `[AAR-042]`

### 3.2 Audience policy

The initial audience model should be explicit.

| Audience | Allowed viewer | Scope rules |
| --- | --- | --- |
| `signed_in_self` | any non-anonymous user | subject is always the current user |
| `affiliate_self` | any non-anonymous user where `affiliateEnabled = true` | subject is always the current user |
| `admin_global` | `ADMIN` only | dataset may aggregate across users |

`[AAR-043]`

Rules:

1. `signed_in_self` and `affiliate_self` datasets must ignore or reject caller-supplied user ids. `[AAR-044]`
2. `affiliate_self` is stricter than `signed_in_self`; it requires both a signed-in viewer and the `affiliate_enabled` capability. `[AAR-045]`
3. `admin_global` datasets must not be exposed to `STAFF` or `APPRENTICE` unless a later spec explicitly changes the matrix. `[AAR-046]`
4. The registry should expose a `canResolve(sourceType, context, channel)` helper so UI renderers, tools, and tests can all ask the same policy question. `[AAR-047]`

### 3.3 Viewer capability resolution

The dataset registry needs richer caller context than the current `ToolExecutionContext` supplies.

Recommended approach:

1. Keep `ToolExecutionContext` focused on core tool execution fields. `[AAR-048]`
2. Add a small viewer-capability resolver on the analytics path that derives `affiliateEnabled` from the current user profile before dataset resolution. `[AAR-049]`
3. `GenerateGraphCommand` should call that resolver when `data.source` is present; inline `data.rows` mode does not need capability enrichment. `[AAR-050]`
4. MCP-backed affiliate and admin analytics tools should use the same capability resolver rather than performing ad hoc profile lookups in each command. `[AAR-051]`

This keeps the general tool framework stable while still supporting capability-sensitive datasets. `[AAR-052]`

### 3.4 Initial dataset catalog

The first registry-backed dataset set should include both migration targets and new referral analytics datasets.

#### 3.4.1 Migrate current graph datasets into the registry

| Source type | Audience | Channel | Notes |
| --- | --- | --- | --- |
| `conversation_activity` | `signed_in_self` | `graph` | Already backed by a signed-in self loader |
| `analytics_funnel` | `admin_global` | `graph` | Currently calls an admin-only loader and should be labeled as such explicitly |
| `lead_queue` | `admin_global` | `graph` | Same |
| `routing_review` | `admin_global` | `graph` | Same |

`[AAR-060]`

This migration is required before referral datasets are added, because it establishes the registry pattern against already-shipped graph sources. `[AAR-061]`

#### 3.4.2 Add referral analytics datasets

| Source type | Audience | Channel | Purpose |
| --- | --- | --- | --- |
| `affiliate_my_overview` | `affiliate_self` | `both` | Summary cards for introductions, chats, registrations, qualified opportunities, and credit state |
| `affiliate_my_timeseries` | `affiliate_self` | `graph` | Time-series charts for validated visits, started chats, registrations, and qualified opportunities |
| `affiliate_my_pipeline` | `affiliate_self` | `both` | Funnel and stage-conversion analytics for the current affiliate |
| `affiliate_my_recent_activity` | `affiliate_self` | `both` | Ordered milestone feed and recent outcomes |
| `admin_affiliate_overview` | `admin_global` | `both` | Global affiliate program totals and top-level health |
| `admin_affiliate_leaderboard` | `admin_global` | `both` | Rankable affiliate performance table or graph source |
| `admin_affiliate_pipeline` | `admin_global` | `graph` | Program-level funnel and conversion views |
| `admin_referral_exceptions` | `admin_global` | `both` | Invalid code traffic, unresolved joins, and credit-review backlog |

`[AAR-062]`

### 3.5 MCP and tool surface

The app should expose referral analytics through small, purpose-built tools that sit above the dataset registry.

Recommended tools:

| Tool | Audience | Backing datasets |
| --- | --- | --- |
| `get_my_affiliate_summary` | `affiliate_self` | `affiliate_my_overview`, optionally `affiliate_my_pipeline` |
| `list_my_referral_activity` | `affiliate_self` | `affiliate_my_recent_activity` |
| `get_admin_affiliate_summary` | `admin_global` | `admin_affiliate_overview`, `admin_affiliate_leaderboard` |
| `list_admin_referral_exceptions` | `admin_global` | `admin_referral_exceptions` |

`[AAR-070]`

Rules:

1. These tools should be registered through a dedicated `registerAffiliateAnalyticsTools()` bundle rather than being folded into the existing profile bundle. `[AAR-071]`
2. The existing `get_my_referral_qr` tool remains in the profile bundle because it is an asset and profile concern, not an analytics concern. `[AAR-072]`
3. The summary tools should be categorized as `system` tools. Graph rendering should continue to flow through `generate_graph`. `[AAR-073]`
4. The model should never have to memorize dataset policy details. Tool descriptions should clearly state whether a tool returns the caller's own affiliate data or admin-only program data. `[AAR-074]`

### 3.6 Graph integration

1. `generate_graph` should keep its current signed-in role exposure, because inline `data.rows` graphing is still useful for ordinary signed-in users. `[AAR-080]`
2. When `data.source` is used, the resolver must first ask the dataset registry whether the caller may resolve that `sourceType` for the `graph` channel. `[AAR-081]`
3. Unknown or unauthorized `sourceType` requests must fail with a structured tool error that names the dataset and the denied audience, rather than leaking lower-level loader errors. `[AAR-082]`
4. The graph renderer should surface the dataset label and scope metadata from the resolved `source` payload so users can tell whether a graph is personal or global. `[AAR-083]`

### 3.7 MCP analytics boundary

`mcp/analytics-tool.ts` should remain a low-level analytics primitive, not the user-facing API contract.

Rules:

1. The affiliate analytics registry may call `conversationAnalytics()` and other internal loaders as implementation details, but callers should only know the named dataset contract. `[AAR-090]`
2. Referral-specific metrics may be added to `mcp/analytics-tool.ts` if they materially simplify implementation, but they must still be wrapped by registry-backed datasets before they reach tools or graph source resolution. `[AAR-091]`
3. If referral metrics grow significantly, they may be factored into a dedicated internal referral analytics module, but the registry remains the app-facing abstraction either way. `[AAR-092]`

---

## 4. Security And Access

1. No dataset resolver may accept raw SQL, table names, or arbitrary backend filter clauses from the model. `[AAR-100]`
2. Self-service affiliate datasets must never accept an explicit `userId` or `affiliateId` parameter from the caller. `[AAR-101]`
3. Admin datasets may accept constrained filters such as time range, sort order, or status buckets only when those filters are part of the dataset schema and validated server-side. `[AAR-102]`
4. Unauthorized dataset access must fail before any underlying admin loader or analytics tool is called. `[AAR-103]`
5. Dataset-level authorization must be covered by contract tests independently of tool descriptor role checks. `[AAR-104]`

---

## 5. Testing Strategy

1. **Registry coverage test:** every named dataset must be registered once, with a unique `sourceType`, declared audience, and declared channels. `[AAR-110]`
2. **Graph contract test:** every `graph` or `both` dataset must appear in the graph source allowlist, and no unregistered graph source may resolve successfully. `[AAR-111]`
3. **Tool contract test:** each affiliate analytics tool must map only to datasets whose audience and channel are compatible with the tool's intended audience. `[AAR-112]`
4. **Audience matrix test:** validate `ANONYMOUS`, `AUTHENTICATED`, `APPRENTICE`, `STAFF`, `ADMIN`, and affiliate-enabled signed-in users across every dataset. `[AAR-113]`
5. **Self-scope test:** prove that self-service datasets ignore or reject caller-supplied subject ids and always scope to the current viewer. `[AAR-114]`
6. **Execution-order test:** unauthorized graph dataset requests should fail before admin-only loaders are invoked. `[AAR-115]`
7. **Manifest parity test:** if a new analytics tool is registered, the live tool manifest should expose it only to the correct audience and role set. `[AAR-116]`
8. **Governance parity test:** after rollout, registry metadata, graph-source exposure, tool bundles, and role-tool manifests should stay aligned through one explicit follow-through audit rather than manual cross-checking. `[AAR-117]`

---

## 6. Delivery Sequence

1. Migrate existing graph datasets into the shared registry and add graph contract tests. `[AAR-120]`
2. Add viewer-capability resolution so registry checks can see `affiliate_enabled` without changing unrelated tools. `[AAR-121]`
3. Add referral analytics datasets and affiliate analytics tools on top of that registry. `[AAR-122]`
4. Wire the affiliate remediation surfaces to those tools and datasets only after registry and policy tests pass. `[AAR-123]`
5. After the initial referral analytics runtime ships, add an explicit governance follow-through so registry parity, release evidence, and drift audits stay operational instead of relying on memory. `[AAR-124]`

Post-closeout follow-through for this registry lands under [Sprint 4 — Governance, Reconciliation, And Release Follow-Through](../affiliate-referral-remediation/sprints/sprint-4-governance-reconciliation-and-release-follow-through.md).

---

## 7. Success Criteria

1. The repo has one shared dataset policy source for MCP-backed referral analytics and graph dataset resolution. `[AAR-130]`
2. A signed-in non-affiliate user can still use `generate_graph` for inline data, but cannot resolve affiliate or admin referral datasets. `[AAR-131]`
3. An affiliate-enabled user can access only their own referral analytics through both tools and graphs. `[AAR-132]`
4. An admin can access global affiliate datasets, leaderboards, and exception queues through the same registry-backed contract. `[AAR-133]`
5. Dataset drift between tool exposure, graph exposure, and backend authorization is prevented by contract tests instead of manual review. `[AAR-134]`
6. Future registry edits can be validated by one explicit parity and release-evidence bundle rather than manual cross-checking across datasets, graphs, and tools. `[AAR-135]`
