# 04 Capability Unification
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document proposes how to unify tool, job, UI, and MCP capability metadata under one contract.

## 1. Why This Is The Core Refactor

Most of the repo's architectural drift starts from one fact: capability metadata exists in multiple parallel systems.

Today those systems include:

- internal tool descriptors
- tool bundle metadata
- job capability definitions
- capability presentation descriptors
- MCP server tool definitions

The system does not need fewer capabilities. It needs fewer independent definitions of the same capability.

## 2. Target Model

Define a single `CapabilityDefinition` model.

## 3. Proposed Capability Shape

```ts
type CapabilityExecutionMode = "inline" | "deferred" | "browser" | "hybrid";

interface CapabilityDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  family: string;
  label: string;
  description: string;
  roles: readonly string[] | "ALL";

  inputSchema: Record<string, unknown>;

  execution: {
    mode: CapabilityExecutionMode;
    handlerId: string;
    dedupeStrategy?: "none" | "per-conversation-payload";
    retryPolicy?: {
      mode: "none" | "manual_only" | "automatic";
      maxAttempts?: number;
      baseDelayMs?: number;
    };
  };

  prompt: {
    includeInManifest: boolean;
    description: string;
  };

  presentation: {
    cardKind: string;
    executionMode: "inline" | "deferred" | "browser" | "hybrid";
    supportsRetry: "none" | "whole_job";
    artifactKinds?: readonly string[];
    historyMode?: string;
  };

  protocol: {
    exportToMcp: boolean;
    mcpServer?: string;
  };
}
```

The exact type can vary, but the system needs this conceptual shape.

## 4. Derived Artifacts

### App chat registration

Generate `ToolDescriptor` objects from capability definitions.

### Tool manifests

Generate Anthropic-compatible tool schemas from the same definitions.

### UI presentation registry

Generate `CapabilityPresentationDescriptor` values from the same definitions.

### Deferred-job registry

Generate job-capability metadata from the same definitions for deferred or hybrid capabilities.

### MCP server exposure

Generate MCP `ListTools` definitions and bind handlers from the same capability definitions.

## 5. Capability Groups Versus Capability Definitions

Tool bundles should remain as grouping and discoverability metadata, but they should no longer be the place where capability semantics live.

### Keep bundles for

- display grouping
- ordering
- role-based surface reporting

### Do not keep bundles as the only place for

- tool existence
- execution mode
- runtime metadata

## 6. Migration Strategy For Existing Systems

### Step 1

Introduce a capability catalog without removing current registries.

### Step 2

Generate internal `ToolDescriptor` objects from the catalog.

### Step 3

Generate or validate presentation descriptors from the catalog.

### Step 4

Generate or validate deferred job capability metadata from the catalog.

### Step 5

Replace hand-authored MCP tool lists with catalog-driven export.

## 7. Specific Wins

This would immediately reduce drift in areas such as:

- `draft_content`
- `publish_content`
- `produce_blog_article`
- `compose_media`
- `admin_web_search`
- analytics-related operational tools

## 8. What To Keep

The refactor should preserve the strengths that already exist:

- typed domain executors
- middleware-based registry execution
- payload-first result envelopes
- UI fallback rendering
- explicit deferred job payloads

## 9. Success Criteria

The capability system can be considered unified when:

1. one capability definition drives app registration, UI presentation, and MCP export
2. no hand-maintained parallel metadata is required for standard cases
3. tests validate derivation, not only synchronization after the fact