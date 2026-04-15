# Refactor Workstream Index

This directory holds targeted refactor plans for concrete defects and
architectural inconsistencies identified during repository review. It mirrors
the structure used in `docs/_specs/`: each refactor gets one folder with a
`spec.md` and a `sprints/` implementation plan.

## When To Use `_refactor/`

Use `_refactor/` when the problem is not a new product capability but a multi-file correctness, integrity, or safety issue.

Typical cases:

- auth and identity boundary cleanup
- migration correctness
- prompt-boundary hardening
- persistence or indexing repair

If the work introduces new user-facing product behavior, it usually belongs under `_specs/` instead.

For the full workflow around specs, sprints, QA, and LLM guardrails, read:

1. `../../README.md`
2. `../operations/agentic-delivery-playbook.md`
3. `../operations/architecture-diagrams.md`
4. `../_specs/README.md`

## Workstreams

| Refactor | Status | Sprints | Scope |
| --- | --- | --- | --- |
| [Style System Authority And Globals Partitioning](style-system-authority-and-globals-partitioning/) | Planned | 4 | Add CSS guardrails, reduce style-authority drift, and split `src/app/globals.css` by concern without UI regressions |
| [System Integrity Remediation Program](system-integrity-remediation-program/) | Planned | 4 | Coordinate all confirmed audit findings across auth, anonymous persistence, migration integrity, and summary safety |
| [Session Identity Boundary Hardening](session-identity-boundary-hardening/) | Planned | 3 | Remove mock-cookie auth fallback, constrain role simulation to real sessions, and clean up invalid session state |
| [Anonymous Conversation Consistency](anonymous-conversation-consistency/) | Planned | 3 | Align middleware, routes, and client restore flow for anonymous conversation persistence |
| [Conversation Search Migration Integrity](conversation-search-migration-integrity/) | Planned | 3 | Preserve conversation-search index correctness across anonymous-to-authenticated migration |
| [Summary Context Hardening](summary-context-hardening/) | Planned | 3 | Convert summary replay into server-owned context and add regression coverage |
| [Agent Runtime Truthfulness And Retrieval Integrity](agent-runtime-truthfulness-and-retrieval-integrity/) | Planned | 8 | Eliminate prompt and documentation drift, make corpus citations canonical, reduce tool ambiguity, and add truthfulness guardrails for self-descriptive runtime answers |
| [Agent Session Value And Retrieval Calibration](agent-session-value-and-retrieval-calibration/) | Planned | 7 | Turn live operator feedback into governed response-state gating, closure, routing calibration, retrieval-confidence plumbing, and chunk-quality audits |
| [Visual Theme Runtime And Semantic Surface Architecture](visual-theme-runtime-and-semantic-surface-architecture/) | Planned | 4 | Unify runtime theme authority, extract semantic surface primitives, and make MCP-driven UI customization safer, drier, and more performant |
| [Mobile Surface Density And Route Remediation](mobile-surface-density-and-route-remediation/) | In Progress | 6 | Rebuild phone-first density, overflow handling, and route-family ergonomics across chat, public, workspace, and admin surfaces |
| [API Rate Limiting](api-rate-limiting/) | Planned | 2 | Add sliding-window rate limiting to the proxy layer with tiered thresholds for auth, chat, and API endpoints |
| [Structured Logging](structured-logging/) | Planned | 2 | Replace `console.*` with a Pino-based structured JSON logger, add correlation IDs and context propagation |
| [Database Migrations](database-migrations/) | Planned | 2 | Replace ad-hoc `addColumnIfNotExists()` with numbered-file migration system and `schema_migrations` tracking |
| [Error Standardization](error-standardization/) | Planned | 2 | Consolidate scattered error classes, create error-to-HTTP-status registry, unify API response envelope |
| [Use-Case Reorganization](use-case-reorganization/) | Planned | 1 | Group 65 flat use-case files into 8 bounded-context subdirectories |
| [Test Reorganization](test-reorganization/) | Planned | 1 | Rename 27 sprint-numbered and tech-debt-prefixed test files to feature-descriptive names |

## Why A Separate Refactor Area

These changes are narrower than a new product feature but larger than a single
bugfix. They cut across persistence, auth, search, and prompt assembly. Keeping
them under `docs/_refactor/` avoids bloating the feature specs while still
providing implementation-grade sprint documents.

## Dependency Order

1. System Integrity Remediation Program
2. Style System Authority And Globals Partitioning
3. Anonymous Conversation Consistency
4. Session Identity Boundary Hardening
5. Conversation Search Migration Integrity
6. Summary Context Hardening
7. Agent Runtime Truthfulness And Retrieval Integrity
8. Agent Session Value And Retrieval Calibration
9. Visual Theme Runtime And Semantic Surface Architecture
10. Mobile Surface Density And Route Remediation

### Quality Infrastructure (can run in parallel with above)

1. API Rate Limiting
2. Structured Logging *(depends on API Rate Limiting for rate-limit 429 instrumentation)*
3. Error Standardization
4. Database Migrations
5. Use-Case Reorganization *(pure file moves — no behavioral changes)*
6. Test Reorganization *(pure file renames — no behavioral changes)*

The umbrella program defines rollout order, verification gates, and ownership
across the issue-specific workstreams. The style-system workstream is a UI and
maintainability hardening pass that introduces CSS guardrails and reduces
single-file drift without adding product behavior. The next three are
user-facing correctness and auth-integrity issues. The summary work is a
reliability and prompt-boundary hardening pass that should land after identity
and ownership rules are stable.

The visual-theme runtime workstream is the follow-on design-system control pass.
It assumes CSS ownership has already been partitioned and focuses on unifying
theme truth, removing repeated component-level visual composition, and making
runtime theme control a governed API for both the app and MCP tooling.

The agent-runtime truthfulness workstream should land after summary-context
hardening stabilizes server-owned prompt context. It focuses on keeping
prompt-visible claims, retrieval behavior, tool manifests, and public
documentation synchronized with runtime truth while adding regression coverage
for fourth-wall answers, canonical corpus references, and contract-heavy chat
output.

The session-value and retrieval-calibration workstream is the follow-on agent
behavior program. It assumes runtime truthfulness is already in place and then
governs how the system decides to close, continue, clarify, and communicate
retrieval confidence. Its purpose is not to add more agent personality but to
reduce over-eager follow-ups and confident-sounding weak retrieval.

The mobile-surface remediation workstream is the route-delivery program that
consumes the audit output in `docs/_qa/` and the shared design-system work in
spacing, chat control, and theme semantics. It exists so mobile quality is
fixed as one governed surface program rather than as one-off route patches.

## Teaching Value

This folder is useful for students because it shows a different kind of agentic work from feature delivery. A refactor workstream forces the team to:

- define the defect clearly
- isolate the contract that was violated
- break the repair into controlled sprints
- prove the fix with regression coverage

That is the part many AI-assisted teams skip, and it is where drift and false confidence usually show up.
