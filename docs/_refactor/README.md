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
| [Visual Theme Runtime And Semantic Surface Architecture](visual-theme-runtime-and-semantic-surface-architecture/) | Planned | 4 | Unify runtime theme authority, extract semantic surface primitives, and make MCP-driven UI customization safer, drier, and more performant |
| [Mobile Surface Density And Route Remediation](mobile-surface-density-and-route-remediation/) | In Progress | 6 | Rebuild phone-first density, overflow handling, and route-family ergonomics across chat, public, workspace, and admin surfaces |

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
7. Visual Theme Runtime And Semantic Surface Architecture
8. Mobile Surface Density And Route Remediation

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
