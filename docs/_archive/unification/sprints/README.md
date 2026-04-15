# Implementation Plan — Architecture Unification And Open-Source Release Preparation

> **Status:** Phase 4 complete — Phase 1 (Sprints 0–8) and Phase 2 (Sprints 9–14) are complete, Sprints 15–19 are complete, Sprint 20 has landed the schema facet and projection foundation with broader consumer migration still partial, and Sprints 21–25 are now landed, including the elite-ops drift, RBAC, latency, and degraded-path release gates from Sprint 25
> **Source:** `docs/_refactor/unification/spec.md`
> **Focus:** Move the repository from overlapping prompt, provider, capability,
> deferred-state, and MCP systems to a public, unified, release-gated target
> architecture without losing the strengths already present in the codebase.

## Why This Package Exists

The research set in the parent folder identifies the current state, target
state, and risk-ranked gaps.

This sprint package turns that analysis into an execution sequence that is hard
to lose track of.

It is intentionally broader than the first high-value moves because the goal is
to carry the repo all the way from current state to ideal state, including the
public release closeout.

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-baseline-freeze-governance-and-artifact-map.md](sprint-0-baseline-freeze-governance-and-artifact-map.md) | Freeze baseline contracts, inventories, release assumptions, and package outputs before runtime changes begin |
| 1 | [sprint-1-prompt-control-plane-unification-and-role-coverage.md](sprint-1-prompt-control-plane-unification-and-role-coverage.md) | Route admin, MCP, and scripts through one prompt control-plane service and fix slot coverage drift |
| 2 | [sprint-2-effective-prompt-runtime-and-provenance.md](sprint-2-effective-prompt-runtime-and-provenance.md) | Introduce an explicit prompt runtime that returns effective prompt text plus provenance |
| 3 | [sprint-3-seam-tests-and-chat-runtime-integration.md](sprint-3-seam-tests-and-chat-runtime-integration.md) | Add seam-level integration tests and reduce blind spots around route, prompt, and provider composition |
| 4 | [sprint-4-shared-chat-provider-policy-and-direct-turn-alignment.md](sprint-4-shared-chat-provider-policy-and-direct-turn-alignment.md) | Extract shared provider policy, observability, and error normalization across stream and direct-turn chat |
| 5 | [sprint-5-capability-catalog-pilot-and-metadata-derivation.md](sprint-5-capability-catalog-pilot-and-metadata-derivation.md) | Pilot a shared capability catalog for the highest-drift capability family |
| 6 | [sprint-6-job-projection-and-service-lifetime-clarification.md](sprint-6-job-projection-and-service-lifetime-clarification.md) | Unify 5 job-state publication channels, declare service lifetime policy, reduce RepositoryFactory ambiguity |
| 7 | [sprint-7-provider-runtime-expansion-and-mcp-boundary-cleanup.md](sprint-7-provider-runtime-expansion-and-mcp-boundary-cleanup.md) | Expand provider-policy to 5+ non-chat surfaces, instrument model callers, wire catalog-driven MCP export |
| 8 | [sprint-8-open-source-release-gates-and-program-closeout.md](sprint-8-open-source-release-gates-and-program-closeout.md) | Run release-gate ladder, update system-architecture.md, aggregate residual risks, write closeout report, add qa:unification script |

### Phase 2 — Remaining Fragmentation (Sprints 9–14)

| Sprint | File | Description |
| --- | --- | --- |
| 9 | [sprint-9-data-access-migration.md](sprint-9-data-access-migration.md) | Migrate 33 direct `getDb()` callers (3 patterns: DataMapper swap, default-param injection, raw SQL) to RepositoryFactory + 3 new exports |
| 10 | [sprint-10-capability-catalog-expansion.md](sprint-10-capability-catalog-expansion.md) | Expand capability catalog from 4 pilot tools to full 55-tool coverage (11 bundles) |
| 11 | [sprint-11-mcp-domain-transport-separation.md](sprint-11-mcp-domain-transport-separation.md) | Split analytics-tool.ts (841 lines) into domain/transport, wire catalog mcpExport to server startup |
| 12 | [sprint-12-registry-convergence.md](sprint-12-registry-convergence.md) | Replace code-first registration in 4 parallel registries with catalog-driven derivation |
| 13 | [sprint-13-prompt-directive-unification.md](sprint-13-prompt-directive-unification.md) | Replace monolithic ROLE_DIRECTIVES with catalog-driven prompt directive assembly |
| 14 | [sprint-14-full-unification-closeout.md](sprint-14-full-unification-closeout.md) | Final cleanup, end-to-end catalog flow test, operational docs update, final architecture deep-dive |

### Phase 3 — Deep Audit Remediation (Sprints 15–20)

| Sprint | File | Description |
| --- | --- | --- |
| 15 | [sprint-15-cleanup-audit-marks-and-documentation-hygiene.md](sprint-15-cleanup-audit-marks-and-documentation-hygiene.md) | Fix Sprint 14 type regressions, add audit comments to getDb() call sites, normalize docs |
| 16 | [sprint-16-provider-instrumentation-completion.md](sprint-16-provider-instrumentation-completion.md) | Instrument blog-production and web-search with provider events, create ProviderRuntime facade |
| 17 | [sprint-17-embedding-server-domain-transport-separation.md](sprint-17-embedding-server-domain-transport-separation.md) | Split embedding-server.ts (683 lines) into domain modules + thin transport shell |
| 18 | [sprint-18-mcp-protocol-parity-tests.md](sprint-18-mcp-protocol-parity-tests.md) | Add test coverage for all MCP domain modules (60+ tests across 5+ files) |
| 19 | [sprint-19-prompt-provenance-persistence-and-surfacing.md](sprint-19-prompt-provenance-persistence-and-surfacing.md) | Persist prompt provenance per-turn, expose via structured logs and MCP debug tool |
| 20 | [sprint-20-catalog-schema-derivation.md](sprint-20-catalog-schema-derivation.md) | Land catalog schema facets and projection helpers from one source; broad production-consumer migration remains follow-on work |

### Phase 4 — Elite-System Hardening (Sprints 21–25)

| Sprint | File | Description |
| --- | --- | --- |
| 21 | [sprint-21-mcp-boundary-rename-and-shared-module-extraction.md](sprint-21-mcp-boundary-rename-and-shared-module-extraction.md) | Finish MCP boundary hardening after the shipped operations-server rename, shared-module extraction, and `@mcp/*` removal |
| 22 | [sprint-22-mcp-transport-roundtrip-and-compatibility-deprecation.md](sprint-22-mcp-transport-roundtrip-and-compatibility-deprecation.md) | Add real stdio JSON-RPC tests for MCP servers, publish a compatibility matrix, and retire the `mcp:embeddings` alias when safe |
| 23 | [sprint-23-catalog-executor-binding-and-runtime-validation.md](sprint-23-catalog-executor-binding-and-runtime-validation.md) | Derive executor binding and runtime input validation from the capability catalog to eliminate remaining schema/executor drift |
| 24 | [sprint-24-prompt-provenance-audit-replay-and-admin-surface.md](sprint-24-prompt-provenance-audit-replay-and-admin-surface.md) | Turn prompt provenance into a durable audit/debug surface across chat, admin, and eval workflows |
| 25 | [sprint-25-elite-ops-gates-security-and-performance.md](sprint-25-elite-ops-gates-security-and-performance.md) | Add drift gates, latency budgets, RBAC regression matrices, and operational evidence so the system stays elite under change |

## Dependency Graph

```text
Sprint 0 (baseline freeze + governance + artifact map)
  -> Sprint 1 (prompt control-plane unification + role coverage)
     -> Sprint 2 (effective prompt runtime + provenance)
        -> Sprint 3 (seam tests + chat runtime integration)
           -> Sprint 4 (shared chat provider policy)
              -> Sprint 5 (capability catalog pilot + derivation)
                 -> Sprint 6 (job projection + service lifetime clarity)
                    -> Sprint 7 (provider expansion + MCP boundary cleanup)
                       -> Sprint 8 (open-source release gates + closeout)
                          -> Sprint 9 (data access migration)  ──────────────────┐
                          -> Sprint 10 (catalog expansion)  ──┐                  │
                             -> Sprint 11 (MCP domain/transport separation)      │
                             -> Sprint 12 (registry convergence)  ───────────────┤
                             -> Sprint 13 (prompt directive unification) ────────┤
                                -> Sprint 14 (full unification closeout)  <──────┘
                                   -> Sprint 15 (cleanup + audit marks + doc hygiene)
                                      -> Sprint 16 (provider instrumentation completion)
                                         -> Sprint 17 (embedding-server split)
                                            -> Sprint 18 (MCP protocol parity tests)
                                      -> Sprint 19 (prompt provenance persistence)
                                   -> Sprint 20 (catalog schema derivation)  [after 18]
                                      -> Sprint 21 (MCP boundary rename + shared extraction)
                                         -> Sprint 22 (MCP transport round-trip + alias retirement)
                                      -> Sprint 23 (catalog executor binding + runtime validation)
                                         -> Sprint 24 (prompt provenance audit + replay)
                                            -> Sprint 25 (elite ops gates + security + performance)
```

## Workstream Coverage

| Workstream | Primary Sprints |
| --- | --- |
| Prompt control plane | 1, 2, 3 |
| Prompt provenance | 2, 3, **19** |
| Chat provider policy | 3, 4, 7, **16** |
| Capability catalog | 5, 10, 12, **20** |
| Deferred-state publication | 6 |
| Service lifetime clarity | 6, 9, **15** |
| MCP boundary cleanup | 5, 7, 11, **17** |
| MCP test coverage | **18** |
| Registry convergence | 5, 10, 12 |
| Prompt directive unification | 5, 10, 13 |
| Data access migration | 6, 9, **15** |
| Open-source release readiness | 0, 8, 14, **15** |
| Schema derivation | **20** |
| MCP boundary canonicalization | **21** |
| MCP transport round-trip and compatibility deprecation | **22** |
| Executor derivation and validation | **23** |
| Prompt provenance auditability | **19**, **24** |
| Drift gates, security, and latency budgets | **25** |

## Release Rule

Do not call the unification program complete because the architecture document
looks cleaner.

The closeout bar is that runtime truth, control-plane behavior, provider policy,
deferred-state publication, tests, and public release gates all tell the same
story.

## Concrete Artifacts

The package now includes concrete baseline and planning artifacts:

- [../artifacts/README.md](../artifacts/README.md)
- [sprint-1-file-level-implementation-backlog.md](sprint-1-file-level-implementation-backlog.md)

## Cross-Program Dependencies

> **FFmpeg Hybrid Sprint Program**
> (`docs/_archive/_specs/mcp_ffmpeg_system_upgrade_wasm/`)
>
> The FFmpeg sprint program introduced a hybrid browser/server execution model
> for media composition tools. It modified the same systems this unification
> program covers: tool registry, capability presentation registry, browser
> capability registry, chat pipeline tool execution, and role directives.
>
> Overlapping changes were identified during QA and resolved:
>
> - `compose_media` execution mode was corrected from `deferred` to `inline`
> - A cross-registry validation test (`src/lib/chat/registry-sync.test.ts`)
>   was added to prevent future drift between the three registries
> - `compose_media` was moved to a dedicated `MEDIA_BUNDLE` and role directives
>   were added for `APPRENTICE` and `STAFF`
>
> Sprint 5 (capability catalog) should reference the FFmpeg program's registry
> patterns when defining the unified capability catalog model.
