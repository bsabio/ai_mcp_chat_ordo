# Sprint 8 Artifact — Residual Risk Register

> Aggregated from Sprint 5-7 edge-case and expansion artifacts.
> Each risk includes severity, source sprint, and migration path.
>
> **Archived post-Phase 2.** Resolution status updated after Sprints 9–14.
> See also `04-fully-unified-architecture.md` for the final resolution matrix.

## Severity Key

| Level | Meaning |
| --- | --- |
| **Low** | Documented gap, no user-visible impact, future cleanup |
| **Medium** | Architectural inconsistency, manageable manually |
| **High** | Potential for runtime bugs or data integrity issues |

## Residual Risks

### From Sprint 5: Capability Catalog Edge Cases

| # | Risk | Severity | Source | Migration Path | Resolution |
| --- | --- | --- | --- | --- | --- |
| 1 | ToolDescriptor factory functions not catalog-derived (runtime deps, bound commands, Anthropic schemas) | Low | `sprint-5-unresolved-edge-cases.md` §1 | Future sprint: factory registry or lazy DI pattern | Planned — Sprint 20 catalog schema derivation |
| 2 | Tool bundle membership (`BLOG_BUNDLE`, `MEDIA_BUNDLE`, `ADMIN_BUNDLE`) not catalog-derived | Low | `sprint-5-unresolved-edge-cases.md` §2 | Candidate for catalog-driven bundle derivation | Accepted — stable separation documented in `04-fully-unified-architecture.md` |
| 3 | Role directive string assembly still single-file, not catalog-derived | Low | `sprint-5-unresolved-edge-cases.md` §3 | Wait until all directive sources can be cataloged | ✅ Resolved — Sprint 13 `assembleRoleDirective()` derives directives from catalog `promptHint` facets |
| 4 | Hardcoded `compose_media` guard in job route (`api/chat/jobs/route.ts`) | Low | `sprint-5-unresolved-edge-cases.md` §4 | Business rule, not metadata — acceptable as-is | Accepted — business rule, documented |
| 5 | Renderer mapping (React components) not catalog-derived | Low | `sprint-5-unresolved-edge-cases.md` §5 | Requires plugin system or component auto-discovery | Accepted — requires component plugin system |
| 6 | `executionMode` type split across ToolDescriptor vs CapabilityExecutionMode | Low | `sprint-5-unresolved-edge-cases.md` §6 | Intentional by design, tested by registry-sync | Accepted — intentional, covered by `registry-sync.test.ts` |

### From Sprint 6: Service Lifetime

| # | Risk | Severity | Source | Migration Path | Resolution |
| --- | --- | --- | --- | --- | --- |
| 7 | Legacy `getDb()` callers in route handlers (chat/stream, preferences, etc.) | Medium | `sprint-6-service-lifetime-map.md` | Migrate to RepositoryFactory exports per Sprint 6 pattern | ✅ Resolved — Sprint 9 migrated DataMapper callers, canary test guards 18 approved raw-SQL exceptions |
| 8 | Request-scoped construction in `conversation-root.ts` bypasses process-cached singletons | Low | `sprint-6-service-lifetime-map.md` | Intentional for transactional grouping — document, do not change | Accepted — intentional request-scoped grouping (Sprint 6 design decision) |

### From Sprint 7: Provider Expansion

| # | Risk | Severity | Source | Migration Path | Resolution |
| --- | --- | --- | --- | --- | --- |
| 9 | `blog-production-root.ts` not instrumented with provider events (complex multi-step pipeline) | Low | `sprint-7-provider-expansion-matrix.md` | Add observability in future sprint when blog pipeline is refactored | ✅ Resolved — Sprint 16 instrumented `AnthropicBlogArticlePipelineModel.ts` with lifecycle events |
| 10 | `admin-web-search.tool.ts` not instrumented with provider events | Low | `sprint-7-provider-expansion-matrix.md` | Add observability when web search receives higher usage | ✅ Resolved — Sprint 16 instrumented `admin-web-search.tool.ts` with lifecycle events |
| 11 | `analytics-tool.ts` (700 lines) mixes domain and transport concerns | Medium | `sprint-7-mcp-boundary-map.md` | Separate domain logic from MCP transport in a future sprint | ✅ Resolved — Sprint 11 split into `analytics-domain.ts` (domain) + `analytics-tool.ts` (transport) |

### From Sprint 8: Release Gate Execution

| # | Risk | Severity | Source | Migration Path | Resolution |
| --- | --- | --- | --- | --- | --- |
| 12 | Pre-existing type error in `deferred-job-handlers.ts` (`percent` property) | Low | Sprint 6 QA | Fix in the deferred-job-handlers module, not a unification concern | ✅ Resolved — Sprint 14 type error remediation |
| 13 | Pre-existing test failures in `MediaRenderCard` and `ChatProgressStrip` | Low | Sprint 6 QA | Fix in UI component tests, not a unification concern | Accepted — mock-related type mismatches in test files, out-of-scope |

## Summary

| Severity | Count | Resolved | Planned | Accepted |
| --- | --- | --- | --- | --- |
| High | 0 | — | — | — |
| Medium | 2 | 2 (#7, #11) | 0 | 0 |
| Low | 11 | 4 (#3, #9, #10, #12) | 1 (#1) | 6 (#2, #4, #5, #6, #8, #13) |
| **Total** | **13** | **6** | **1** | **6** |
