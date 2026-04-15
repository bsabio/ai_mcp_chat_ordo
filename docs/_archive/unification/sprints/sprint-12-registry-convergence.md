# Sprint 12 — Registry Convergence (Catalog-Driven Registration)

> **Status:** Complete
> **Goal:** Replace code-first tool registration with catalog-driven registration
> so the 4 parallel registries derive their entries from the unified catalog
> instead of maintaining independent registration logic.
> **Prerequisite:** Sprint 10 complete ✅ (full catalog coverage), Sprint 11 complete ✅
> **Estimated scope:** 4 registries refactored, 11 bundle files updated

## QA Findings Before Implementation

1. **Sprint 10 delivered full 55-tool catalog.** Every bundle tool now has a
   catalog entry with core, runtime, and presentation facets.
2. **Sprint 11 delivered domain/transport split and fixed mcp-export.** The
   `getAllMcpExportableTools()` now dynamically iterates the catalog. The
   embedding-server wires catalog-aware tools at startup.
3. **Presentation registry has 46 entries** (not 48 as originally claimed).
   Only **4 use `projectPresentationDescriptor()`** — `compose_media`,
   `admin_web_search`, `draft_content`, `publish_content`. The other **42 use
   manual `createDescriptor()`** calls.
4. **10 catalog tools are NOT in the presentation registry:**
   `admin_prioritize_leads`, `admin_prioritize_offer`, `admin_search`,
   `admin_triage_routing_risk`, `get_admin_affiliate_summary`,
   `get_deferred_job_status`, `get_my_job_status`, `list_admin_referral_exceptions`,
   `list_deferred_jobs`, `list_my_jobs`.
5. **Presentation registry has 1 extra tool NOT in catalog:** `navigate` (the
   catalog has `navigate_to_page` but not `navigate`). This is a legacy alias.
6. **Job registry has 10 entries** — exactly matches `DEFERRED_JOB_HANDLER_NAMES`.
   **3 use `projectJobCapability()`** (`draft_content`, `publish_content`,
   `compose_media`). The other **7 use `defineEditorialCapability()`**.
7. **Browser registry has 4 entries.** **1 uses `projectBrowserCapability()`**
   (`compose_media`). The other **3 are manual** (`generate_audio`,
   `generate_chart`, `generate_graph`). Only `compose_media` has a
   `browser` facet in the catalog — the other 3 do NOT.
8. **ToolRegistry itself has no catalog integration.** 11 bundle files manually
   register tools. The composition root (`src/lib/chat/tool-composition-root.ts`,
   73 lines) calls 11 `register*Tools()` functions.

## Current State

### 4 Parallel registries alongside catalog

| Registry | File | Lines | Catalog-derived | Code-first | Total |
| --- | --- | --- | --- | --- | --- |
| `ToolRegistry` | `src/core/tool-registry/ToolRegistry.ts` | 95 | 0 | 55 (via 11 bundles) | 55 |
| Presentation | `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | 240 | 4 (`project*`) | 42 (`createDescriptor`) | 46 |
| Job | `src/lib/jobs/job-capability-registry.ts` | 238 | 3 (`project*`) | 7 (`define*`) | 10 |
| Browser | `src/lib/media/browser-runtime/browser-capability-registry.ts` | 58 | 1 (`project*`) | 3 (manual) | 4 |

### Catalog facet coverage (what exists to drive registration)

| Facet | Catalog entries with it | Registry entries |
| --- | --- | --- |
| `presentation` | 55 (all) | 46 |
| `job` | 10 | 10 |
| `browser` | 1 (compose_media) | 4 |
| `mcpExport` | 1 (admin_web_search) | n/a |
| `promptHint` | 2 (compose_media, admin_web_search) | n/a |

### tool-composition-root.ts (73 lines)

```
src/lib/chat/tool-composition-root.ts
├── TOOL_BUNDLE_REGISTRY: 11 ToolBundleDescriptor entries
├── createToolRegistry(): calls 11 register*Tools() functions
├── getToolComposition(): caches registry + executor with middleware
└── _resetToolComposition(): test-only cache clear
```

### Presentation registry gap detail

```
10 tools in catalog NOT in presentation:
  admin_prioritize_leads     → admin bundle
  admin_prioritize_offer     → admin bundle
  admin_search               → admin bundle
  admin_triage_routing_risk  → admin bundle (4 admin tools missing)
  get_admin_affiliate_summary → affiliate bundle
  list_admin_referral_exceptions → affiliate bundle
  get_deferred_job_status    → job bundle
  get_my_job_status          → job bundle
  list_deferred_jobs         → job bundle
  list_my_jobs               → job bundle (4 job tools missing)

1 tool in presentation NOT in catalog:
  navigate                   → legacy alias for navigate_to_page
```

### Browser registry gap detail

```
3 browser entries have NO browser facet in catalog:
  generate_audio   → catalog has NO browser facet
  generate_chart   → catalog has NO browser facet
  generate_graph   → catalog has NO browser facet

These need browser facets added to the catalog BEFORE Sprint 12 can
replace them with projectBrowserCapability().
```

## Tasks

1. **Add missing browser facets to catalog (prerequisite)**
   - Add `browser` facets for `generate_audio`, `generate_chart`,
     `generate_graph` (3 entries)
   - These exist in the browser registry but NOT in the catalog yet
   - Without this, `projectBrowserCapability()` returns null for them

2. **Derive presentation registry from catalog**
   - Replace 42 manual `createDescriptor()` calls with
     `projectPresentationDescriptor(CAPABILITY_CATALOG.xxx)` for each
   - Add catalog projections for the 10 missing tools (admin + job status)
   - Decide: keep or remove the legacy `navigate` alias
   - Note: `createDescriptor()` function can be removed once all entries
     use the catalog projection

3. **Derive job-capability-registry from catalog**
   - Replace 7 remaining `defineEditorialCapability()` calls with
     `projectJobCapability()` from Sprint 10's job facets
   - All 10 deferred tools already have job facets in the catalog
   - Keep `ADMIN_ONLY_EDITORIAL_POLICY` and `AUTOMATIC_EDITORIAL_RETRY_POLICY`
     as defaults — verify catalog job facets contain equivalent data

4. **Derive browser-capability-registry from catalog**
   - After Task 1 adds browser facets, replace 3 manual entries with
     `projectBrowserCapability()` calls
   - Verify `fallbackPolicy`, `recoveryPolicy`, `maxConcurrentExecutions`
     are captured in catalog browser facets

5. **Add `projectToolDescriptor()` to catalog (scoping decision)**
   - New projection: catalog → ToolDescriptor schema (name, description,
     category, input_schema, roles)
   - **Critical blocker:** `input_schema` (Anthropic JSON schema) is NOT
     in the catalog. Each bundle's `register*Tools()` function constructs
     the `input_schema` at registration time. The catalog does NOT contain
     JSON schemas.
   - **Decision needed:** Move `input_schema` into catalog (large task,
     ~55 schemas) OR keep tool descriptors in bundles and only derive
     metadata from catalog?

6. **Simplify tool-composition-root.ts** (conditional on Task 5)
   - If `input_schema` stays in bundles: keep 11 `register*Tools()` calls
     but derive name/description/category/roles from catalog
   - If `input_schema` moves to catalog: replace 11 bundles with catalog loop
   - Either way: keep runtime dependency injection (repos, services) separate

## Out of Scope

- Changing the ToolRegistry interface itself
- Modifying Anthropic API schema format
- Removing ToolDescriptor type (it stays as the runtime shape)
- Moving `input_schema` into the catalog (flagged as decision point, not in scope)

## Acceptance Criteria

1. `capability-presentation-registry.ts` derives all entries from catalog.
2. `job-capability-registry.ts` derives all 10 deferred entries from catalog.
3. `browser-capability-registry.ts` derives all 4 entries from catalog.
4. All 10 "missing" tools get presentation entries from catalog projection.
5. No duplicate tool metadata (name, description, category, family, cardKind)
   exists outside the catalog.
6. `npm run qa:unification` remains green with expanded coverage.
7. `registry-sync.test.ts` validates parity for every tool.

## Verification

- `npm run qa:unification` passes
- `registry-sync.test.ts` validates parity for every tool
- `grep -c "createDescriptor" src/frameworks/ui/chat/registry/capability-presentation-registry.ts` returns 0 (excluding comments)
- `grep -c "defineEditorialCapability" src/lib/jobs/job-capability-registry.ts` returns 0 (excluding comments)
- All 55 catalog tools have presentation entries
- All 10 deferred tools have job registry entries from catalog
- All 4 browser tools have browser registry entries from catalog

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Presentation registry derives all entries from catalog | ✅ 55 tools + navigate alias, all via projectPresentationDescriptor |
| 2 | Job registry derives all 10 entries from catalog | ✅ 10 projectJobCapability calls |
| 3 | Browser registry derives all 4 entries from catalog | ✅ 4 projectBrowserCapability calls |
| 4 | All 10 previously-missing tools have presentation entries | ✅ admin_prioritize_leads through list_my_jobs |
| 5 | No duplicate tool metadata outside catalog | ✅ createDescriptor, defineEditorialCapability, manual browser descriptors removed |
| 6 | qa:unification green | ✅ 153 tests, 12 files |
| 7 | registry-sync.test.ts validates parity | ✅ 6 tests pass |

### Files Changed

| File | Change |
| --- | --- |
| `src/core/capability-catalog/catalog.ts` | Added browser facets for generate_audio, generate_chart, generate_graph |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | Rewritten: 240→48 lines, all from catalog |
| `src/lib/jobs/job-capability-registry.ts` | Rewritten: 238→173 lines, all from catalog |
| `src/lib/media/browser-runtime/browser-capability-registry.ts` | Rewritten: 58→40 lines, all from catalog |
| `src/core/capability-catalog/registry-convergence.test.ts` | NEW — 20 assertions |
| `scripts/run-unification-qa.ts` | Added Sprint 12 test file |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| Presentation registry lines | 240 | 48 |
| Presentation createDescriptor calls | 42 | 0 |
| Presentation coverage gap | 10 tools missing | 0 missing (55 + navigate alias) |
| Job registry lines | 238 | 173 |
| Job defineEditorialCapability calls | 7 | 0 |
| Browser manual descriptors | 3 | 0 |
| Browser catalog facets | 1 | 4 |
| qa:unification tests | 133 | 153 |
| qa:unification test files | 11 | 12 |
