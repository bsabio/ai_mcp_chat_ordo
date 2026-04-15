# 01 Current State Architecture
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document maps the architecture as implemented today. It is intentionally descriptive before it is prescriptive.

## 1. Top-Level Reality

Studio Ordo currently has two different tool stories at the same time:

- an internal application chat tool system used by the main chat runtime
- standalone MCP servers and MCP-shaped modules under `mcp/`

Those systems share code in places, but they are not the same runtime boundary.

## 2. Main Chat Runtime

The main user-facing chat path starts in `src/app/api/chat/stream/route.ts`.

The route currently does all of the following:

1. resolves the session and role
2. parses the inbound payload
3. builds the system prompt
4. resolves the internal tool registry and tool executor
5. performs routing analysis and context-window assembly
6. narrows tool scope for some admin requests
7. wraps deferred tools in queue-backed execution
8. streams tool calls, tool results, and assistant deltas back through SSE
9. persists assistant output and lifecycle metadata

### Key files

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/tool-composition-root.ts`
- `src/lib/chat/tool-capability-routing.ts`
- `src/lib/chat/policy.ts`
- `src/core/use-cases/SystemPromptBuilder.ts`

## 3. Internal Tool Architecture

The internal tool system is centered on `ToolRegistry`.

### Current composition flow

`src/lib/chat/tool-composition-root.ts` currently:

- instantiates `ToolRegistry`
- registers bundle metadata
- registers multiple tool bundles from application code
- applies instance-level enabled and disabled tool filtering from `config/tools.json`
- wraps execution with logging, capability, and RBAC middleware

### Important implication

The internal chat runtime is code-first, not config-first, and not MCP-first.

The registry is the effective source of truth for prompt-visible and executable app chat tools.

## 4. Deferred Tool Runtime

Some internal tools are executed inline, while others are represented as deferred jobs.

### Current deferred flow

When a tool descriptor has `executionMode: "deferred"`:

1. `createDeferredToolExecutor` in `src/lib/chat/stream-pipeline.ts` checks the descriptor
2. it may dedupe against an existing active job
3. it creates a queue record and queued event
4. it returns a deferred-job payload back into the streaming chat loop
5. the chat stream emits both the raw tool result and a promoted job event
6. the UI later renders from the persisted job status payload and result envelope

### Key files

- `src/lib/chat/stream-pipeline.ts`
- `src/lib/jobs/deferred-job-result.ts`
- `src/lib/jobs/job-status.ts`
- `src/lib/jobs/job-status-snapshots.ts`
- `src/lib/jobs/deferred-job-runtime.ts`
- `src/lib/jobs/deferred-job-handlers.ts`
- `src/lib/jobs/job-capability-registry.ts`

## 5. Capability Presentation Layer

The user-visible chat card system is driven by its own capability presentation registry.

### Current presentation path

- the presenter inspects persisted message parts and tool results
- it projects or synthesizes a `CapabilityResultEnvelope`
- it resolves a presentation descriptor from the capability presentation registry
- it renders a specific custom card or a system fallback card

### Key files

- `src/adapters/ChatPresenter.ts`
- `src/lib/capabilities/capability-result-envelope.ts`
- `src/frameworks/ui/chat/registry/capability-presentation-registry.ts`
- `src/frameworks/ui/chat/registry/default-tool-registry.ts`

### Important implication

The system already treats capability rendering as a separate contract from raw tool execution. That is a strong design direction, but it is not yet driven from one shared capability definition.

## 6. Prompt Runtime

Prompt assembly currently combines multiple sources with different lifecycles.

### Current prompt ownership layers

1. `ConfigIdentitySource` builds base identity from config and corpus prompt text
2. `SystemPromptDataMapper` reads prompt versions from the database
3. `DefaultingSystemPromptRepository` falls back to hardcoded defaults when DB entries are absent
4. `SystemPromptBuilder` assembles identity, role directive, page context, user preferences, summary, routing context, referral context, and tool manifest

### Key files

- `src/lib/chat/policy.ts`
- `src/adapters/ConfigIdentitySource.ts`
- `src/adapters/SystemPromptDataMapper.ts`
- `src/core/use-cases/DefaultingSystemPromptRepository.ts`
- `src/core/use-cases/SystemPromptBuilder.ts`
- `config/prompts.json`

### Important implication

There are two kinds of prompts in the repo today:

- configuration-owned prompt-like data for branding and personality
- database-owned system prompts for base and role directives

Those are composed together at runtime, but they are not administered through one unified workflow.

## 7. Anthropic And Provider Runtime

The repo uses multiple Anthropic execution paths.

### Current paths

- streaming path: `src/lib/chat/anthropic-stream.ts`
- direct-turn path: `src/lib/chat/chat-turn.ts` plus `src/lib/chat/anthropic-client.ts` and `src/lib/chat/orchestrator.ts`
- summarization: `src/adapters/AnthropicSummarizer.ts`
- blog generation: `src/lib/blog/blog-production-root.ts`

### Important implication

Resilience policy is not fully centralized. Timeout, retry, model fallback, and provider construction are duplicated across separate call paths.

## 8. MCP Runtime As Implemented Today

The repo ships MCP servers, but the main chat app does not call them through an MCP client.

### Standalone MCP entrypoints

- `mcp/calculator-server.ts`
- `mcp/embedding-server.ts`

### What `mcp/embedding-server.ts` currently exposes

- embedding and search tools
- corpus and librarian tools
- prompt administration tools
- conversation analytics tools

### Important implication

The file name suggests a narrow embedding server, but the actual server is a mixed operational server.

## 9. Direct Reuse Of MCP-Shaped Modules

Parts of the application import logic from `mcp/` directly.

Examples include:

- analytics imports from `@mcp/analytics-tool`
- web-search validation and execution imports from `mcp/web-search-tool`
- calculator tool reuse in eval support

This means the repo already uses `mcp/` as a shared module namespace, not only as protocol servers.

## 10. Configuration Reality

Tool config exists, but it only narrows a code-defined tool surface.

### Current config behavior

- `config/tools.json` may define `enabled` and `disabled`
- `DEFAULT_TOOLS` is an empty object
- tool composition still starts from hardcoded bundle registration

### Important implication

The config file does not define the tool catalog. It only filters the existing in-app catalog.

## 11. Testing Reality

There is significant coverage in the repo, but not all of it tests real system seams.

### Strong areas

- internal tool module tests
- registry synchronization tests
- prompt builder tests
- job payload and presenter tests

### Weak areas

- very limited true MCP server contract coverage
- route tests that heavily mock provider, registry, queue, and prompt seams
- admin prompt UI path and MCP prompt path are not validated as one behaviorally equivalent system

## 12. Current Architecture Assessment

The current system is not chaotic. It has real structure and thoughtful contracts. The main issue is that too many contracts are parallel instead of derived.

In short:

- the app chat runtime is internally coherent
- the MCP layer is operationally useful
- the UI capability layer is richer than the raw tool layer
- the prompt system is functional

But the overall architecture is still fragmented across multiple truths.