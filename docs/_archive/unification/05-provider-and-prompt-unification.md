# 05 Provider And Prompt Unification
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document focuses on two related seams:

- model provider creation and execution
- prompt ownership and prompt provenance

## 1. Why These Concerns Belong Together

The final model request is produced by combining:

- provider target and resilience policy
- prompt text and tool schemas
- context-window and message assembly

If provider policy is duplicated and prompt ownership is fragmented, the most important request in the system becomes hard to reason about.

## 2. Current Provider State

The repo currently has multiple model-execution paths with overlapping concerns.

### Current paths

- streaming loop for chat
- direct-turn provider abstraction
- summarizer construction
- blog-generation model construction

### Current problems

- duplicated client construction
- duplicated resilience behavior
- inconsistent future provider-target support
- harder centralized observability

## 3. Target Provider Runtime

Introduce one provider runtime with a stable factory surface.

### Proposed shape

```ts
interface ProviderRuntimeRequest {
  useCase: "chat_stream" | "chat_turn" | "summarization" | "blog_generation";
  prompt: string;
  messages: unknown[];
  tools?: unknown[];
  signal?: AbortSignal;
}

interface ProviderRuntime {
  createStreamingSession(request: ProviderRuntimeRequest): Promise<StreamingSession>;
  createTurn(request: ProviderRuntimeRequest): Promise<TurnResult>;
}
```

### Responsibilities

- choose upstream target
- construct provider clients
- enforce timeout and retry policy
- apply model fallback rules
- expose unified error mapping and metrics

## 4. Current Prompt State

Prompt data is currently split between config and database-backed sources.

### Current sources

- config identity and personality overlays
- active database prompt versions
- hardcoded role directive fallbacks
- request-specific prompt sections such as page, routing, and summary blocks

### Current problem

There is no single object that represents the provenance of the final prompt used for a specific turn.

## 5. Target Prompt Runtime

Introduce an explicit prompt runtime that produces both text and provenance.

### Proposed outputs

```ts
interface PromptRuntimeOutput {
  text: string;
  provenance: {
    basePrompt: { source: "db" | "fallback"; version: number | null };
    roleDirective: { role: string; source: "db" | "fallback"; version: number | null };
    configOverlay: { personalityApplied: boolean; identityName: string };
    sections: Array<{ key: string; priority: number }>;
    toolManifest: { toolNames: string[]; prefiltered: boolean };
  };
}
```

### Benefits

- prompt debugging becomes real instead of inferred
- prompt changes become auditable per turn
- runtime bugs can be traced to prompt inputs more quickly

## 6. Prompt Administration Unification

The repo should not have one prompt path for MCP and another for admin UI with different event semantics.

### Target rule

All prompt mutations should go through one domain service.

That service should own:

- version creation
- activation
- rollback
- event emission
- path revalidation hooks via surface adapters

### Adapter split

- admin UI server actions call the domain service
- MCP prompt server calls the same domain service
- scripts call the same domain service

## 7. Config Versus Prompt Versions

The system should explicitly define what belongs in config and what belongs in prompt versions.

### Keep in config

- branding and instance identity
- UI bootstrap copy
- operator-controlled environment-specific personality overlays only if truly instance-wide

### Keep in prompt versions

- base behavioral instructions
- role directives
- governed system prompt text that must be versioned and audited

### Important rule

If a change should produce a behaviorally meaningful prompt-version event, it does not belong only in `config/prompts.json`.

## 8. Streaming And Direct Turn Convergence

The streaming route and direct-turn path do not need identical code, but they should share:

- provider runtime
- prompt runtime
- capability catalog and tool schema derivation
- error mapping policy

## 9. Success Criteria

This seam is improved when:

1. there is one provider runtime used across model-backed flows
2. every model request can report prompt provenance
3. admin and MCP prompt mutations produce the same domain events
4. gateway or alternate-provider support can be added without patching many call sites