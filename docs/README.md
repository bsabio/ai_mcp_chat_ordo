# Documentation Index

This directory is organized by role so feature docs, operational docs, corpus content, and reference notes do not get mixed together.

## Top-Level Structure

| Folder | Purpose |
| --- | --- |
| `_specs/` | Feature specs, sprint plans, and feature-owned artifacts |
| `_refactor/` | Cross-cutting remediation and refactor workstreams |
| `_corpus/` | Canonical corpus source material and structured content manifests |
| `_reference/` | External or ad hoc reference notes |
| `operations/` | Runbooks and operational process docs |

## Start Here

If you are new to the repository, read these first:

1. `../README.md`
2. `operations/agentic-delivery-playbook.md`
3. `operations/architecture-diagrams.md`
4. `_specs/README.md`

## Organization Rules

1. Feature-specific evidence should live with the feature that owns it under `_specs/{feature}/`.
2. Historical one-off notes should move into an `archive/` folder instead of staying mixed into active reference material.
3. The `docs/` root should stay sparse. Avoid placing feature-specific standalone markdown files here.

## Key Operational Docs

- `operations/agentic-delivery-playbook.md`: how this repo turns LLM work into a controlled engineering workflow
- `operations/user-handbook.md`: user guide, feature overview, role model, setup notes, and MCP tool catalog
- `operations/system-architecture.md`: textual architecture walkthrough for the application, tool system, storage, and MCP boundaries
- `operations/architecture-diagrams.md`: visual maps for the delivery loop, runtime architecture, and tool orchestration
- `operations/process-model.md`: runtime process and concurrency model
- `operations/admin-runbook.md`: non-interactive operational commands
- `operations/environment-matrix.md`: required environment templates and parity rules

## Current Feature Artifacts

- Browser UI hardening evidence: `_specs/browser-ui-hardening/artifacts/`
- Homepage chat shell evidence: `_specs/homepage-chat-shell/artifacts/`
- Runtime truthfulness and retrieval integrity workstream: `_refactor/agent-runtime-truthfulness-and-retrieval-integrity/`

## Archived During Cleanup

- Dated reference notes from `2026-03-07` moved to `_reference/archive/2026-03-07/`
