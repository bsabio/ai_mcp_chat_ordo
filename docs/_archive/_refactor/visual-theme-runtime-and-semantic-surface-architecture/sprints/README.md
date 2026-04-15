# Visual Theme Runtime And Semantic Surface Architecture — Sprint Index

This workstream depends on the style-partitioning refactor already having
completed because it assumes `src/app/styles/` remains the shared CSS home.

## Planned Sprint Sequence

1. [Sprint 0 — Authority Freeze And Documentation Correction](sprint-0-authority-freeze-and-documentation-correction.md)
2. [Sprint 1 — Theme Manifest Extraction And Contract Unification](sprint-1-theme-manifest-extraction-and-contract-unification.md)
3. [Sprint 2 — Semantic Chat And Shell Surface Extraction](sprint-2-semantic-chat-and-shell-surface-extraction.md)
4. [Sprint 3 — Jobs, Journal, MCP Hardening, And QA Closure](sprint-3-jobs-journal-mcp-hardening-and-qa-closure.md)
5. [Sprint 4 — Theme Profile Introspection, Token Governance, And Drift Audits](sprint-4-theme-profile-introspection-token-governance-and-drift-audits.md)

## Intent By Sprint

1. Sprint 0 freezes the current authority map, corrects stale runtime-facing theme docs, and adds early drift guards for selector and metadata ownership.
2. Sprint 1 creates the manifest-backed source of truth and unifies runtime, selector, metadata, and tool-schema theme membership around it.
3. Sprint 2 removes repeated component-level visual composition from the highest-value chat and shell surfaces by introducing semantic primitives and explicit variants.
4. Sprint 3 extends the same semantic extraction to jobs and journal surfaces, then closes the first extraction and hardening wave by revalidating browser-facing behavior plus production build safety.
5. Sprint 4 finishes the remaining spec debt by enriching the manifest into an inspectable theme-profile contract, adding bounded read-only inspection, and installing governance/performance drift audits.
