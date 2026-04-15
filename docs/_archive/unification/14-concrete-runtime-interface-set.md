# 14 Concrete Runtime Interface Set
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document turns the target architecture into a concrete interface set.

It does not prescribe one implementation. It defines the contracts the repo should converge on so the next refactor steps can be evaluated against stable runtime boundaries instead of local convenience.

The focus is narrow:

- unified prompt runtime
- unified provider runtime
- unified prompt control-plane service

## 1. Design Rules

The interface set should preserve what already works while removing duplicated ownership.

### Preserve

- streaming and non-streaming chat can still use different low-level adapters
- use-case-specific prompts can still exist when they are truly separate from chat prompt assembly
- admin UI, MCP, and scripts can remain distinct entry surfaces
- typed domain executors and tool modules should remain intact

### Converge

- one effective-prompt contract
- one provider policy contract
- one prompt-mutation side-effect contract

## 2. Shared Vocabulary

```ts
type PromptSlotRole = "ALL" | RoleName;
type PromptSlotType = "base" | "role_directive";

type PromptSurface =
  | "chat_stream"
  | "chat_turn"
  | "live_eval"
  | "summarization"
  | "blog_article"
  | "blog_image"
  | "admin_web_search"
  | "tts";

type PromptSourceKind =
  | "slot"
  | "fallback"
  | "config_overlay"
  | "runtime_context"
  | "tool_manifest"
  | "static_use_case";

type ProviderUseCase = PromptSurface;

type ProviderTarget =
  | "anthropic"
  | "openai"
  | "raw_http";
```

### Important rule

`PromptSurface` and `ProviderUseCase` should line up by default, but they are not interchangeable conceptually.

- prompt surface answers: what kind of prompt is being built
- provider use case answers: what kind of provider policy should be resolved

They can share names while still representing different decisions.

## 3. Prompt Runtime Interface

The prompt runtime should produce both prompt text and prompt provenance in one call.

### 3.1 Core types

```ts
interface PromptSlotRef {
  role: PromptSlotRole;
  promptType: PromptSlotType;
  version: number | null;
  source: "db" | "fallback";
}

interface PromptSectionContribution {
  key: string;
  kind: PromptSourceKind;
  priority: number;
  source: string;
  contentHash: string;
}

interface PromptCapabilityManifestEntry {
  name: string;
  description: string;
}

interface PromptRuntimeRequest {
  surface: PromptSurface;
  role?: RoleName;
  conversationId?: string;
  userId?: string;
  currentPathname?: string;
  currentPageSnapshot?: CurrentPageSnapshot;
  routingSnapshot?: ConversationRoutingSnapshot;
  summaryText?: string | null;
  trustedReferralContext?: TrustedReferralContext | null;
  userPreferences?: UserPreference[] | null;
  capabilityManifest?: PromptCapabilityManifestEntry[];
  extraSections?: Array<{
    key: string;
    content: string;
    priority: number;
    source: string;
  }>;
}

interface PromptRuntimeResult {
  surface: PromptSurface;
  text: string;
  effectiveHash: string;
  slotRefs: PromptSlotRef[];
  sections: PromptSectionContribution[];
  warnings: string[];
}

interface PromptRuntime {
  build(request: PromptRuntimeRequest): Promise<PromptRuntimeResult>;
}
```

### 3.2 Contract requirements

The prompt runtime must make these currently implicit behaviors explicit:

1. whether a slot came from the DB or a fallback
2. whether config identity or personality overlays were applied
3. which request-time sections were appended
4. which capability manifest was shown to the model
5. whether the final prompt differs from raw slot content because of runtime sections

### 3.3 What moves behind this interface

The runtime should absorb the current split across:

- `ConfigIdentitySource`
- `DefaultingSystemPromptRepository`
- `SystemPromptBuilder`
- request-time section additions in `policy.ts`, the chat route, and eval flows

### 3.4 What stays outside the interface

The prompt runtime should not own:

- persistence of prompt versions
- provider execution
- capability execution

It produces the effective prompt contract. It does not mutate prompt history or call models.

## 4. Provider Runtime Interface

The provider runtime should centralize provider policy without forcing every use case through the exact same low-level call shape.

### 4.1 Core policy types

```ts
interface ProviderPolicy {
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  modelCandidates: string[];
  failFastAfterSuccessfulToolRound?: boolean;
}

interface ProviderToolSchema {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface ProviderToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ProviderToolResult {
  toolCallId: string;
  name: string;
  output: unknown;
}
```

### 4.2 Turn and stream contracts

```ts
interface ProviderTurnRequest {
  useCase: ProviderUseCase;
  prompt?: PromptRuntimeResult;
  messages?: unknown[];
  tools?: ProviderToolSchema[];
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

interface ProviderTurnResult {
  useCase: ProviderUseCase;
  target: ProviderTarget;
  model: string;
  outputText: string;
  stopReason: string | null;
  toolCalls: ProviderToolCall[];
  toolResults: ProviderToolResult[];
  metrics: {
    durationMs: number;
    attempts: number;
    fallbackCount: number;
  };
}

interface ProviderStreamCallbacks {
  onTextDelta?: (text: string) => void;
  onToolCall?: (call: ProviderToolCall) => void;
  onToolResult?: (result: ProviderToolResult) => void;
  onLifecycleEvent?: (event: { type: string; payload?: unknown }) => void;
}

interface ProviderRuntime {
  resolvePolicy(useCase: ProviderUseCase): ProviderPolicy;
  runTurn(request: ProviderTurnRequest): Promise<ProviderTurnResult>;
  runStream(
    request: ProviderTurnRequest,
    callbacks: ProviderStreamCallbacks,
  ): Promise<ProviderTurnResult>;
}
```

### 4.3 Specialized asset generation contract

The current repo also has model-backed image and audio generation. Those should not be forced into a chat-turn abstraction.

```ts
interface ProviderAssetRequest {
  useCase: "blog_image" | "tts";
  promptText?: string;
  input: Record<string, unknown>;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

interface ProviderAssetResult {
  useCase: "blog_image" | "tts";
  target: ProviderTarget;
  model: string;
  mimeType: string;
  bytes: Uint8Array;
  metadata: Record<string, unknown>;
}

interface ProviderAssetRuntime {
  generateAsset(request: ProviderAssetRequest): Promise<ProviderAssetResult>;
}
```

### 4.4 Contract requirements

The provider runtime must own the behaviors that are currently duplicated:

- timeout policy
- retry policy
- model fallback policy
- provider error normalization
- provider metrics and observability hooks

### 4.5 Adapter rule

This interface does not require one giant provider class.

It allows separate low-level adapters, such as:

- Anthropic stream adapter
- Anthropic turn adapter
- OpenAI responses adapter
- OpenAI image adapter
- raw HTTP audio adapter

The unification point is policy and contract, not necessarily transport implementation.

## 5. Prompt Control-Plane Service Interface

The prompt control plane should be one domain service used by admin UI, MCP, and scripts.

### 5.1 Core slot and actor types

```ts
interface PromptSlot {
  role: PromptSlotRole;
  promptType: PromptSlotType;
}

interface PromptMutationActor {
  actorId: string | null;
  surface: "admin" | "mcp" | "script" | "seed";
}

interface PromptVersionRecord {
  id: string;
  role: PromptSlotRole;
  promptType: PromptSlotType;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  notes: string;
}
```

### 5.2 Side-effect contract

```ts
interface PromptMutationSideEffects {
  emitSlotVersionChanged(event: {
    slot: PromptSlot;
    oldVersion: number | null;
    newVersion: number;
    actor: PromptMutationActor;
  }): Promise<void>;

  revalidate(slot: PromptSlot): Promise<void>;

  recordAudit(entry: {
    slot: PromptSlot;
    actor: PromptMutationActor;
    action: "create" | "activate" | "rollback";
    version: number;
  }): Promise<void>;
}
```

### 5.3 Service interface

```ts
interface PromptControlPlaneService {
  listSlots(filter?: {
    roles?: PromptSlotRole[];
    promptTypes?: PromptSlotType[];
    includeFallbackOnly?: boolean;
  }): Promise<Array<{
    slot: PromptSlot;
    activeVersion: number | null;
    totalVersions: number;
    runtimeCoverage: "db" | "fallback" | "missing";
  }>>;

  getSlotDetail(slot: PromptSlot): Promise<{
    slot: PromptSlot;
    activeVersion: number | null;
    versions: PromptVersionRecord[];
    runtimeCoverage: "db" | "fallback" | "missing";
  }>;

  createVersion(request: {
    slot: PromptSlot;
    content: string;
    notes: string;
    actor: PromptMutationActor;
  }): Promise<PromptVersionRecord>;

  activateVersion(request: {
    slot: PromptSlot;
    version: number;
    actor: PromptMutationActor;
  }): Promise<{
    slot: PromptSlot;
    oldVersion: number | null;
    newVersion: number;
  }>;

  rollback(request: {
    slot: PromptSlot;
    version: number;
    actor: PromptMutationActor;
  }): Promise<{
    slot: PromptSlot;
    oldVersion: number | null;
    newVersion: number;
  }>;

  diffVersions(request: {
    slot: PromptSlot;
    versionA: number;
    versionB: number;
  }): Promise<{
    slot: PromptSlot;
    diff: string;
  }>;
}
```

### 5.4 Contract requirements

The control-plane service must guarantee:

1. the same role inventory across admin, MCP, and scripts
2. the same side effects regardless of entry surface
3. the same activation and rollback semantics regardless of entry surface
4. visibility into fallback-only prompt coverage where runtime can operate but DB slots do not exist

### 5.5 Important current drift this contract closes

Under this interface, `APPRENTICE` cannot silently disappear from the control plane because role inventory becomes part of the domain contract rather than a hard-coded surface-local list.

## 6. Thin Adapter Mapping From Current Files

| Current file or area | Future role |
| --- | --- |
| `src/lib/chat/policy.ts` | thin chat adapter over `PromptRuntime` |
| `src/lib/chat/chat-turn.ts` | direct-turn adapter over `PromptRuntime` and `ProviderRuntime` |
| `src/lib/chat/anthropic-stream.ts` | stream adapter over shared provider policy and provider callbacks |
| `src/lib/evals/live-runner.ts` and `src/lib/evals/live-runtime.ts` | eval adapters over `PromptRuntime` and `ProviderRuntime` |
| `src/lib/admin/prompts/admin-prompts-actions.ts` | admin adapter over `PromptControlPlaneService` |
| `mcp/prompt-tool.ts` | MCP adapter over `PromptControlPlaneService` |
| `mcp/embedding-server.ts` | transport wrapper that binds prompt operations, not the place that defines prompt behavior |

## 7. Minimal Adoption Slices

This interface set is intentionally shaped for additive adoption.

### Slice A

Introduce `PromptControlPlaneService` first and route both admin and MCP through it.

Why first:

- fixes a real divergence with relatively low blast radius
- normalizes role coverage
- creates a shared side-effect contract before changing chat runtime internals

### Slice B

Introduce `PromptRuntime.build(...)` and adapt `policy.ts` to delegate to it.

Why second:

- makes effective-prompt provenance inspectable
- reduces prompt ambiguity before provider work begins

### Slice C

Introduce `ProviderRuntime.resolvePolicy(...)` and make both chat stream and direct turn consume it, even if their low-level transport code remains separate initially.

Why third:

- removes the largest provider-policy duplication without requiring immediate full adapter collapse

## 8. Definition Of Success

These interfaces are doing their job when:

1. runtime prompt truth can be inspected from one contract
2. provider policy is defined once and reused by chat stream and direct-turn paths
3. admin and MCP prompt mutations become surface adapters over the same domain service
4. later capability, MCP, and testing work can target stable seams instead of reverse-engineering current call paths

That is the intended concrete interface set for the next refactor phase.

## 9. Implementation Status (Post-Sprint 14)

> Added during Sprint 15 documentation hygiene.

### PromptRuntime — ✅ Implemented

- **File:** `src/lib/chat/prompt-runtime.ts`
- **Contract:** `build()` returns `PromptRuntimeResult { text, slotRefs, sections, warnings }`
- **Consumers:** Chat stream route (`route.ts` line 97), eval flows (`live-runtime.ts`)
- **Status:** Full §3 contract realized. Slot attribution, section tracking, and warnings all present.

### ProviderRuntime — ✅ Implemented

- **File:** `src/lib/chat/provider-policy.ts` (functions) + `src/lib/chat/provider-runtime.ts` (facade)
- **What landed:** `resolveProviderPolicy()` — shared across all 7 model-backed surfaces. `emitProviderEvent()` — lifecycle event emission for all surfaces. `classifyProviderError()` — error normalization. `ProviderRuntime` facade wraps all three functions into an injectable interface.
- **Coverage:** All 7 declared `ProviderSurface` values (`stream`, `direct_turn`, `summarization`, `image_generation`, `tts`, `blog_production`, `web_search`) have instrumented callers verified by `provider-instrumentation.test.ts`.
- **What did not land:** The full `runTurn` / `runStream` methods from §4.2. Each caller still invokes Anthropic/OpenAI clients directly.
- **Rationale:** Provider policy unification was achieved at the function level, which delivered the core value (shared timeout, retry, fallback, observability). The facade is the first abstraction step; full `runTurn`/`runStream` wrapping is deferred until a concrete use case drives it (e.g., multi-provider A/B testing, local gateway).
- **History:** Sprint 16 instrumented the final 2 uninstrumented surfaces (`blog_production`, `web_search`) and created `provider-runtime.ts`.

### PromptControlPlaneService — ✅ Implemented

- **File:** `src/lib/prompts/prompt-control-plane-service.ts`
- **Contract:** `listSlots`, `getSlotDetail`, `createVersion`, `activateVersion`, `rollback`, `diffVersions`
- **Consumers:** Admin (`admin-prompts-actions.ts`), MCP (`prompt-tool.ts`)
- **Side effects:** Both surfaces emit `prompt_version_changed` events through the service. Admin also revalidates Next.js paths via surface adapter.
- **Status:** Full §5 contract realized. Admin and MCP are now surface adapters over one domain service, exactly as specified.
