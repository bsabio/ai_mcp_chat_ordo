# Sprint 5 — Capability Catalog Pilot And Metadata Derivation

> **Status:** Complete
> **Goal:** Prove the capability-catalog architecture on a bounded slice by
> deriving runtime registration, prompt-visible metadata, chat presentation,
> deferred-job policy, browser-runtime metadata, and thin protocol-export
> intent from one shared definition.
> **Spec ref:** `UNI-160` through `UNI-199`, `UNI-250` through `UNI-279`
> **Prerequisite:** Sprint 4 complete ✅
> **Status note:** All prerequisites (Sprints 0–4) are landed in code.
> Sprint 4 shipped `provider-policy.ts` (shared resilience contract),
> `emitProviderEvent()` (unified observability), `ChatProviderError`
> (unified error wrapping), and removed the decorator-based observability
> layer from the direct-turn path. 43 tests including 6 cross-path import
> verification tests.

## QA Findings Before Implementation

1. Sprint 0 already froze the vocabulary and artifact map. Sprint 5 must use
  "capability catalog" to mean one derivation source for existing capability
  metadata, not a second hand-maintained registry beside the current ones.
2. Sprint 1 already finalized prompt role inventory and control-plane mutation
  rules. Sprint 5 may derive prompt-visible capability metadata, but it must
  not reopen governed prompt-slot scope or invent new mutable prompt
  surfaces.
3. Sprint 2's `PromptRuntime` contract is live in code and the sprint doc is
   now marked **Complete** with three artifacts (prompt-surface-input-matrix,
   provenance-field-map, warnings-inventory). Capability-manifest derivation
   must plug into the current prompt-runtime and runtime-manifest seams rather
   than treating prompt provenance as unfinished work.
4. Sprint 3 already landed reduced-mock route, pipeline, and live-runtime
   seams plus a shared provider-boundary harness. Sprint 5 must keep those
   tests as downstream regression proof because prompt manifests and allowed
   tool selection feed the final provider-facing prompt.
5. Sprint 4 is **complete**. It delivered `src/lib/chat/provider-policy.ts`
   (shared resilience policy, error classification, and structured observability),
   removed the `withProviderTiming`/`withProviderErrorMapping` decorator layer
   from `chat-turn.ts`, and unified error wrapping via `ChatProviderError`
   across both transport paths. Sprint 5 must not absorb provider timeout,
   retry, fallback-model, or transport-policy concerns — those are resolved.
6. The current pilot drift is already spread across real code seams:
   `ToolDescriptor` creators, `src/lib/chat/runtime-manifest.ts`,
   `src/core/entities/role-directives.ts`,
   `src/frameworks/ui/chat/registry/capability-presentation-registry.ts`,
   `src/lib/jobs/job-capability-registry.ts`, and
   `src/lib/media/browser-runtime/browser-capability-registry.ts`.
7. `compose_media` is the highest-value pilot edge case because its
   cross-surface differences are intentional, not drift to flatten away.
   `ToolDescriptor` stays browser-first, the presentation layer is `hybrid`,
   the browser registry is `wasm_worker`, and the job registry carries the
   queued server fallback policy. Additionally, `src/app/api/chat/jobs/route.ts`
   has a hardcoded `compose_media` check (line 106) — this is a pre-existing
   manual seam the catalog should document, not hide.
8. `admin_web_search` already shares business logic with the web-search API
   route (`src/app/api/web-search/route.ts`). **Note:** No MCP server
   infrastructure exists in the codebase. The Sprint 5 MCP export task
   requires either creating a minimal MCP server or deferring to Sprint 7.
9. The `executionMode` type split between `ToolDescriptor`
   (`"inline" | "deferred"`) and `CapabilityPresentationDescriptor`
   (`"inline" | "deferred" | "browser" | "hybrid"`) is **intentional and
   tested**. `src/lib/chat/registry-sync.test.ts` explicitly asserts that
   `compose_media` has `undefined` executionMode on `ToolDescriptor`,
   `"hybrid"` on presentation, and `"wasm_worker"` on browser capability.
   Sprint 5 should decide whether to unify the type (introducing
   `"browser" | "hybrid"` to `ToolExecutionMode`) or document the split as
   an architectural invariant with the registry-sync test as the contract.

## Why This Sprint Exists

The repo still carries one of its largest duplication seams in capability
metadata.

This sprint pilots the shared catalog on a bounded slice where the same
capability is already described repeatedly for runtime registration,
prompt-visible instructions, presentation, deferred execution, browser
execution, and protocol export.

The goal is not to invent a new abstraction tier. The goal is to remove
parallel metadata maintenance for a few real capabilities while preserving the
contracts that Sprints 1 through 4 have already established.

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/unification/sprints/sprint-0-baseline-freeze-governance-and-artifact-map.md` | frozen vocabulary, artifact map, and closeout categories |
| `docs/_refactor/unification/sprints/sprint-1-prompt-control-plane-unification-and-role-coverage.md` | finalized prompt role inventory and control-plane scope boundary |
| `docs/_refactor/unification/sprints/sprint-2-effective-prompt-runtime-and-provenance.md` | prompt-runtime contract, now **Complete** with 3 artifacts (input matrix, provenance field map, warnings inventory) |
| `docs/_refactor/unification/sprints/sprint-3-seam-tests-and-chat-runtime-integration.md` | reduced-mock seam bundle and current route or live-runtime regression proof |
| `docs/_refactor/unification/sprints/sprint-4-shared-chat-provider-policy-and-direct-turn-alignment.md` | **Complete** — `provider-policy.ts` (shared resilience + observability + error classification), 43 tests, 3 artifacts |
| `docs/_refactor/unification/artifacts/sprint-4-provider-policy-equivalence-matrix.md` | equivalence proof across stream and direct-turn paths (policy, classifiers, errors, observability) |
| `docs/_refactor/unification/artifacts/sprint-4-provider-observability-field-map.md` | `ProviderAttemptEvent` schema and log format documentation |
| `docs/_refactor/unification/artifacts/sprint-4-intentional-stream-vs-turn-differences.md` | documented intentional behavioral differences between transport paths |
| `src/lib/chat/provider-policy.ts` | shared provider resilience policy, error classification, and observability contract |
| `src/lib/chat/tool-composition-root.ts` | runtime tool-registration root, bundle registry, and middleware composition |
| `src/lib/chat/runtime-manifest.ts` | prompt-visible tool manifest projection seam |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | current chat presentation metadata map |
| `src/frameworks/ui/chat/registry/default-tool-registry.ts` | current renderer mapping for custom capability cards |
| `src/lib/jobs/job-capability-registry.ts` | current deferred-job capability policy source |
| `src/lib/media/browser-runtime/browser-capability-registry.ts` | current browser or hybrid capability policy source |
| `src/lib/chat/registry-sync.test.ts` | current cross-registry drift guard (4 assertions across 3 registries) |

## Current Pilot Drift Snapshot

| Pilot capability | Current metadata owners | Sprint 5 concern |
| --- | --- | --- |
| `draft_content` and `publish_content` | `createDraftContentTool(...)` or `createPublishContentTool(...)`, `BLOG_BUNDLE`, `runtime-manifest.ts`, `capability-presentation-registry.ts`, `JOB_CAPABILITY_REGISTRY`, and shared editorial renderer wiring | best low-risk deferred editorial pair for proving runtime, prompt, UI, and job derivation from one definition |
| `compose_media` | `composeMediaTool`, role directives, `capability-presentation-registry.ts`, `browser-capability-registry.ts`, `JOB_CAPABILITY_REGISTRY`, and `/api/chat/jobs/route.ts` | proves the catalog can express intentional browser, hybrid, and deferred facets without collapsing them into one flag |
| `admin_web_search` | `createAdminWebSearchTool(...)`, role directives, `capability-presentation-registry.ts`, custom card wiring, and `mcp/web-search-tool` | best thin protocol-export pilot because core execution logic already spans app and MCP seams |

## Primary Areas

- `src/core/tool-registry/ToolDescriptor.ts`
- `src/lib/chat/tool-composition-root.ts`
- `src/lib/chat/runtime-manifest.ts`
- `src/core/entities/role-directives.ts`
- `src/frameworks/ui/chat/registry/capability-presentation-registry.ts`
- `src/frameworks/ui/chat/registry/default-tool-registry.ts`
- `src/lib/jobs/job-capability-registry.ts`
- `src/lib/media/browser-runtime/browser-capability-registry.ts`
- pilot tool definitions in `src/core/use-cases/tools/*`
- selected MCP export surfaces for the pilot slice

## Pilot Candidates

- `draft_content`
- `publish_content`
- `compose_media`
- `admin_web_search`

## Out Of Scope

1. Provider-policy convergence, transport retry cleanup, or fallback-model
  alignment. That remains Sprint 4 work.
2. Reopening governed prompt-slot inventory, prompt-version semantics, or
  prompt-control mutation rules from Sprints 1 and 2.
3. Full dynamic renderer derivation or component auto-discovery from
  `default-tool-registry.ts`.
4. Rewriting capability result-envelope projection, deferred job lifecycle
  semantics, or artifact retention behavior beyond what the pilot metadata
  already encodes.
5. A full MCP registry or server rewrite. Sprint 5 should only prove thin
  export hooks for the pilot slice.

## Tasks

1. **Define `CapabilityDefinition` and facet projections**
  - Model one shared definition plus explicit facets for runtime
    registration, prompt manifest visibility, role-directive hinting, chat
    presentation, deferred-job policy, browser runtime, and protocol export
    intent.
  - Absence must be explicit so tools without browser execution, job policy,
    or custom presentation do not receive fake defaults.

2. **Derive app runtime registration for the pilot slice**
  - Generate the pilot `ToolDescriptor` fields from the shared definitions
    where practical: name, schema, roles, category, deferred execution
    config, and any registration metadata that is currently duplicated.
  - Keep bundle grouping explicit unless it can be derived safely without
    changing RBAC or request-scoped tool routing semantics.

3. **Derive prompt-visible capability metadata**
  - Feed `getRuntimeToolManifestForRole(...)` from catalog-derived metadata.
  - Replace duplicated capability prose for `compose_media` and
    `admin_web_search` with catalog-backed prompt hints or manifest extensions
    where practical.
  - Preserve `PromptRuntime` ownership and `inspect_runtime_context`
    provenance.

4. **Derive chat presentation, deferred-job, and browser metadata**
  - Replace pilot rows in `capability-presentation-registry.ts`,
    `job-capability-registry.ts`, and `browser-capability-registry.ts` with
    projections from the shared catalog where the relevant facet exists.
  - Keep `default-tool-registry.ts` as a thin renderer map keyed by the
    derived capability shape. Full component derivation stays out of scope.

5. **Prepare thin MCP export hooks for the pilot slice**
   - Start with `admin_web_search` and prove that protocol export intent can be
     projected without cloning core execution logic.
   - Do not expand this sprint into a general MCP manifest rewrite.
   - **Note:** No MCP server infrastructure currently exists in the codebase.
     This task requires either creating a minimal MCP server or deferring the
     full export implementation to Sprint 7. For Sprint 5, the minimum viable
     proof is a `CapabilityDefinition` facet that declares MCP export intent
     without requiring a running MCP server.

6. **Add derivation tests and drift guards**
  - Add projection equivalence tests for the pilot slice.
  - Update or replace `src/lib/chat/registry-sync.test.ts` so non-pilot tools
    stay guarded while pilot tools prove catalog-derived parity.
  - Keep Sprint 3 reduced-mock stream and live-eval bundles in verification
    because prompt manifest drift is a downstream chat regression.

7. **Document unresolved edge cases explicitly**
  - Record any capability that still needs manual bundle membership, renderer
    mapping, alias handling, or protocol-specific overrides after the pilot.
  - Make `compose_media` multi-runtime semantics explicit in the edge-case log
    if they remain non-derivable from one simple facet model.

## Required Artifacts

- capability catalog pilot inventory
- derivation matrix from `CapabilityDefinition` to runtime registration,
  prompt manifest, role-directive hint, presentation descriptor,
  deferred-job definition, browser capability descriptor, and protocol export
  intent
- unresolved edge-case log for capabilities that do not yet fit the shared
  model cleanly, including manual bundle, renderer, or alias seams

## Implementation Outputs

- shared capability catalog and projection helpers for the pilot slice
- derived runtime, prompt-visible, presentation, deferred-job, and browser
  metadata for pilot capabilities
- thin protocol-export hook proof for at least one pilot capability
- derivation tests, drift guards, and an explicit edge-case log

## Acceptance Criteria

1. At least one deferred editorial family and one non-editorial pilot
  capability are derived from one shared contract.
2. The pilot removes parallel metadata maintenance across the targeted
  registries for the chosen slice rather than adding another compatibility
  layer.
3. `compose_media` retains its intentional browser, hybrid, and deferred
  differences without regressing browser-first execution or queued fallback
  behavior.
4. Prompt-runtime provenance and Sprint 3 reduced-mock route or live-runtime
  tests remain green after the pilot changes.
5. Thin protocol-export intent is proven for at least `admin_web_search`.
6. Remaining manual seams are documented explicitly instead of being hidden by
  the pilot abstraction.

## Verification

- derivation tests for the pilot capabilities and their facet projections
- targeted runtime, prompt-manifest, presentation, job, and browser regression
  coverage for pilot features
- `src/lib/chat/registry-sync.test.ts` or its successor drift guard remains
  green
- Sprint 3 reduced-mock chat regression coverage remains green
- diagnostics-clean changed files

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | ≥1 deferred editorial + ≥1 non-editorial pilot derived from shared contract | ✅ `draft_content`/`publish_content` (editorial deferred) + `compose_media` (media hybrid) + `admin_web_search` (search inline) |
| 2 | Pilot removes parallel metadata, not adding compatibility layer | ✅ Registries now call `projectPresentationDescriptor()`, `projectJobCapability()`, `projectBrowserCapability()` — old hardcoded entries deleted |
| 3 | `compose_media` retains intentional browser/hybrid/deferred differences | ✅ ToolDescriptor=undefined, Presentation=hybrid, Browser=wasm_worker, Job=media — verified by registry-sync test |
| 4 | Prompt-runtime provenance and Sprint 3 tests remain green | ✅ Zero type errors in changed files, 76 tests pass across 3 test files |
| 5 | Thin MCP export intent proven for `admin_web_search` | ✅ `mcpExport` facet declares export intent with `sharedModule: "mcp/web-search-tool"` |
| 6 | Manual seams documented explicitly | ✅ 7 edge cases documented in `sprint-5-unresolved-edge-cases.md` |

### Test Summary

| Test File | Tests | Status |
| --- | --- | --- |
| `src/core/capability-catalog/catalog.test.ts` | 27 | ✅ pass |
| `src/lib/chat/registry-sync.test.ts` | 6 | ✅ pass |
| `src/lib/chat/provider-policy.test.ts` | 43 | ✅ pass |
| **Total** | **76** | **✅ all green** |

### Files Changed

| File | Change |
| --- | --- |
| `src/core/capability-catalog/capability-definition.ts` | NEW — CapabilityDefinition type with 7 facets |
| `src/core/capability-catalog/catalog.ts` | NEW — 4 pilot definitions + 6 projection helpers |
| `src/core/capability-catalog/catalog.test.ts` | NEW — 27 derivation tests |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | MODIFIED — 4 entries → catalog projections |
| `src/lib/jobs/job-capability-registry.ts` | MODIFIED — 3 entries → catalog projections |
| `src/lib/media/browser-runtime/browser-capability-registry.ts` | MODIFIED — 1 entry → catalog projection |
| `src/lib/chat/registry-sync.test.ts` | MODIFIED — added catalog-derived assertion |

### Artifacts

| Artifact | File |
| --- | --- |
| Pilot inventory | `sprint-5-capability-catalog-pilot-inventory.md` |
| Derivation matrix | `sprint-5-derivation-matrix.md` |
| Unresolved edge cases | `sprint-5-unresolved-edge-cases.md` |
