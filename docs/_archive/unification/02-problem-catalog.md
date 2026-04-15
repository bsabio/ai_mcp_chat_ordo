# 02 Problem Catalog
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document lists the highest-value architectural problems revealed by the current implementation.

## 1. Problem: No Single Capability Source Of Truth

### Symptoms

- tool registration lives in application bundle code
- capability presentation lives in a separate registry
- deferred-job semantics live in a separate job capability registry
- MCP exposure is declared again in server files

### Why it matters

Any change to one tool can require synchronized updates across several layers. That is a classic DRY violation at the architecture level.

### Root cause

The repo evolved by adding sensible subsystem-specific metadata without first defining a shared capability contract that all layers derive from.

### Reliability risks

- mismatched labels, execution modes, or role scopes
- stale UI rendering assumptions
- stale MCP server definitions
- inconsistent retry or dedupe semantics

## 2. Problem: App Chat Is Not MCP-First, But The Repo Narrative Sometimes Suggests It Is

### Symptoms

- the main chat runtime executes internal tool descriptors directly
- no app-side MCP client path was found
- some app logic imports `mcp/*.ts` directly instead of using an MCP protocol boundary

### Why it matters

Teams can make wrong design decisions when the documented architecture and runtime truth diverge.

### Root cause

The repo supports MCP and also reuses MCP-shaped modules internally, but those modes were not clearly separated as distinct architectural options.

### Reliability risks

- future refactors may target the wrong abstraction layer
- externalization work may assume protocol parity that does not exist
- operational naming becomes misleading

## 3. Problem: Provider Creation Is Duplicated

### Symptoms

- streaming chat uses one Anthropic loop
- direct chat turns use a separate provider abstraction
- summarization and blog generation construct their own clients

### Why it matters

Provider policy is a cross-cutting concern. It should be consistent wherever possible.

### Root cause

Different product paths were built at different times around local needs instead of one provider runtime.

### Reliability risks

- inconsistent timeout and retry behavior
- inconsistent model fallback behavior
- harder provider swaps or local gateway support
- more places to patch in an outage

## 4. Problem: Prompt Ownership Is Split Across Separate Lifecycles

### Symptoms

- config-based personality and identity overlays exist
- database-based base prompts and role directives exist
- admin UI prompt actions bypass MCP prompt-tool behavior

### Why it matters

Prompt governance should be auditable, explicit, and behaviorally consistent regardless of the administration path.

### Root cause

The repo has a reasonable split between config and database concerns, but the split is not fully formalized in the operational model.

### Reliability risks

- prompt changes may not emit the same events
- prompt provenance may be unclear on a given turn
- config personality drift may be mistaken for prompt-version drift

## 5. Problem: MCP Server Boundary Is Too Broad And Poorly Named

### Symptoms

- `mcp/embedding-server.ts` exposes much more than embeddings
- corpus, prompt, and analytics tools all share the same server entrypoint

### Why it matters

Server boundaries should reflect ownership, permissioning, and deployment concerns.

### Root cause

Capabilities were added incrementally to the existing MCP server surface because it was already available.

### Reliability risks

- deployment changes become harder to reason about
- health checks and ownership are muddier
- future extraction or remote hosting is harder

## 6. Problem: Heavy Seam Mocking Hides Real Contract Drift

### Symptoms

- route tests mock provider, registry, queue, and prompt builder layers heavily
- some failing tests are stale expectations rather than real runtime defects
- some mock contract mismatches only surface as logged warnings

### Why it matters

The closer a test gets to system architecture, the more dangerous over-mocking becomes.

### Root cause

The test suite optimized for speed and isolation in the same areas where integration confidence matters most.

### Reliability risks

- tests pass while runtime seams drift
- refactors appear safer than they are
- protocol and persistence mismatches are discovered late

## 7. Problem: Prompt-Visible And UI-Visible Capability Information Is Not Fully Unified

### Symptoms

- the system prompt gets a short tool manifest
- the UI renderer relies on richer presentation descriptors and result envelopes
- deferred jobs add a further metadata layer

### Why it matters

The model, the runtime, and the UI should all agree on what a capability is.

### Root cause

Each layer solved for its own local needs with useful metadata, but there is no shared derivation model.

### Reliability risks

- the model sees one description while the UI assumes another
- job orchestration can carry richer semantics than the original tool definition
- future tooling may duplicate metadata again

## 8. Problem: Administrative Paths Do Not Always Reuse The Same Domain Workflow

### Symptoms

- MCP prompt tools emit `prompt_version_changed` events
- admin prompt actions write directly through the repository

### Why it matters

Admin UI, scripts, and MCP tooling should all converge on the same domain behavior for the same action.

### Root cause

Different surfaces were built around repository access rather than a single domain service.

### Reliability risks

- event drift
- audit trail gaps
- inconsistent side effects across operational paths

## 9. Problem: The Current Architecture Is Better Than It Is Unified

This is the key diagnosis.

Most of the pieces are individually reasonable:

- the internal tool registry is coherent
- deferred jobs have thoughtful payload and rendering support
- prompt assembly is structured
- UI capability rendering is stronger than a basic chat UI
- MCP tooling is real, not fictional

The problem is not lack of architecture. The problem is lack of convergence.