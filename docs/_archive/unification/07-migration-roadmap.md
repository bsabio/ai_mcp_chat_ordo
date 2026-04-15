# 07 Migration Roadmap
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This roadmap is phased to reduce risk while converging the architecture.

## Phase 0: Freeze Vocabulary And Boundaries

### Goals

- agree on the meaning of capability, tool, job capability, MCP export, prompt runtime, and provider runtime
- define target ownership boundaries before moving code

### Outputs

- approved unification docs in this folder
- glossary and architectural decision note if needed

## Phase 1: Introduce Shared Capability Catalog

### Goals

- add a new capability catalog alongside existing registries
- model a small initial slice without deleting current systems

### First candidates

- `draft_content`
- `publish_content`
- `compose_media`
- `admin_web_search`

### Outputs

- capability definitions
- derivation helpers for app tool descriptors and presentation metadata

## Phase 2: Generate Internal Registry Metadata

### Goals

- generate `ToolDescriptor` values from the capability catalog
- preserve current middleware and execution flow

### Outputs

- internal tool registration derived from the catalog
- drift tests updated to validate derivation instead of synchronization only

## Phase 3: Derive UI And Job Metadata

### Goals

- generate presentation descriptors from the same capability catalog
- derive deferred-job metadata where possible

### Outputs

- fewer hand-maintained registries
- stronger job and UI contract alignment

## Phase 4: Introduce Unified Prompt Runtime

### Goals

- formalize prompt provenance
- centralize prompt composition logic behind one runtime surface

### Outputs

- prompt runtime object
- prompt provenance diagnostics
- explicit config-overlay policy

## Phase 5: Introduce Unified Provider Runtime

### Goals

- centralize provider creation and resilience policy
- migrate streaming chat, direct turns, summarization, and blog generation incrementally

### Outputs

- shared provider factory and policy layer
- reduced duplication across Anthropic call sites

## Phase 6: Unify Prompt Mutation Paths

### Goals

- route admin UI and MCP prompt actions through one domain service

### Outputs

- consistent prompt-version event emission
- consistent revalidation and auditing behavior

## Phase 7: Export Capabilities To MCP From Shared Definitions

### Goals

- replace hand-maintained MCP tool definitions with catalog-driven export where appropriate
- clarify server boundaries and naming

### Outputs

- thinner MCP server transport wrappers
- protocol parity with app capabilities where intended

## Phase 8: Strengthen Integration And Protocol Tests

### Goals

- add real seam tests as the new shared runtimes land

### Outputs

- route integration coverage with fewer critical mocks
- spawned MCP server contract tests
- prompt mutation equivalence tests

## Sequencing Notes

### Do first

- capability catalog
- prompt runtime
- provider runtime

These unlock most of the architectural convergence.

### Do after those foundations

- MCP export derivation
- server boundary cleanup
- broader naming cleanup

## Migration Guardrails

1. Do not rewrite everything at once.
2. Preserve current user-visible behavior while changing the source of truth underneath.
3. Add derivation and equivalence tests before removing old metadata systems.
4. Move one capability family at a time.
5. Prefer additive migration and cutover over big-bang replacement.

## Definition Of Done

The architecture can be considered unified when:

1. one capability definition drives app, UI, jobs, and MCP exports where relevant
2. one provider runtime owns provider policy
3. one prompt runtime owns final prompt assembly and provenance
4. one prompt mutation service owns prompt version side effects
5. high-value seam tests validate the real architecture instead of only mocked approximations