# Universal Local Gateway

> **Status:** Draft v0.2
> **Priority:** Medium-High — valuable, but only after current provider seams are centralized
> **Scope:** Introduce an optional local LLM gateway as a server-side upstream for the Anthropic-dependent runtime paths that already exist in `ordoSite`, without changing the browser-facing chat stream contract.
> **Dependencies:** `ordo` MCP daemon (Swift), current `ordoSite` chat runtime, direct-turn runtime, summarizer, and health probes
> **Affects:** `src/app/api/chat/stream/route.ts`, `src/lib/chat/anthropic-stream.ts`, `src/lib/chat/anthropic-client.ts`, `src/lib/chat/chat-turn.ts`, `src/adapters/AnthropicSummarizer.ts`, `src/lib/health/probes.ts`, `src/lib/config/env.ts`, `src/lib/config/env-config.ts`, and a new standalone gateway workspace or package
> **Requirement IDs:** `ULG-001` through `ULG-199`

---

## 1. Problem Statement

### 1.1 Verified current repo state

| Area | Verified state | Implication |
| --- | --- | --- |
| Browser chat contract | The browser talks to `/api/chat/stream` through `ChatStreamAdapter`, which parses Studio Ordo SSE events like `delta`, `tool_call`, `job_*`, and `error` | The browser does **not** consume raw Anthropic SSE. A local gateway does not remove the need for the current app stream route. `[ULG-001]` |
| Server-side streaming | The server-side chat loop in `src/lib/chat/anthropic-stream.ts` uses `@anthropic-ai/sdk` directly via `messages.stream(...)` | The local gateway must integrate at the server provider boundary, not at the browser boundary. `[ULG-002]` |
| Direct-turn path | `src/lib/chat/chat-turn.ts` creates an Anthropic client directly and wraps it with `createAnthropicProvider(...)` | There is more than one Anthropic call surface to centralize. `[ULG-003]` |
| Conversation summarization | `src/adapters/AnthropicSummarizer.ts` also constructs `new Anthropic(...)` directly | Summarization must be considered in the rollout plan if local models are meant to cover more than the main chat loop. `[ULG-004]` |
| Additional Anthropic consumers | Blog article production and live evals also rely on direct Anthropic clients or Anthropic model configuration | Full local-provider adoption is a broader program than just `/api/chat/stream`. `[ULG-005]` |
| Runtime env model selection | `src/lib/config/env.ts` exposes `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and fallback model lists only | The current runtime has no notion of provider target, gateway URL, or model alias registry. `[ULG-006]` |
| Readiness | `src/lib/health/probes.ts` currently validates Anthropic API key and model only | Readiness logic will be wrong if the selected provider becomes a local gateway. `[ULG-007]` |
| Local gateway code | There is no `ordo_gateway`, daemon manager, Apple adapter, Ollama adapter, or local model registry in the repo today | This spec is still greenfield and should stop pretending the runtime already has local-provider seams. `[ULG-008]` |

### 1.2 What is actually missing

The missing capability is not merely “a local SSE server.” The current repo needs:

1. A **server-side provider factory** that can route Anthropic-dependent code paths to cloud Anthropic or a local gateway without copy-pasting that choice across the codebase. `[ULG-010]`
2. A **gateway-side alias registry** that maps logical names such as `local-fast` or `local-pro` to real local backends. `[ULG-011]`
3. A **staged rollout plan** that starts with the existing Anthropic-dependent paths where local execution is plausible, instead of assuming every model consumer in the repo can move at once. `[ULG-012]`

### 1.3 Product decision

1. The browser-facing `/api/chat/stream` contract remains the public runtime boundary. The gateway is an upstream server concern only. `[ULG-020]`
2. Phase 1 covers the main streaming chat loop, the direct chat-turn path, and summarization. Blog production, eval runners, and any other Anthropic consumers are follow-on work. `[ULG-021]`
3. The first version of the local gateway is an **optional provider target**, not an immediate replacement for cloud Anthropic in every environment. `[ULG-022]`
4. “Zero modifications” to `ordoSite` is not a real constraint. Small, explicit provider-centralization changes inside `ordoSite` are required and are the correct first step. `[ULG-023]`

---

## 2. Design Goals

1. **Preserve the browser contract.** No browser or React code should need to understand Anthropic-compatible gateway semantics. `[ULG-030]`
2. **Centralize provider choice.** Direct `new Anthropic(...)` construction should move behind a reusable server-side factory or provider boundary. `[ULG-031]`
3. **Keep local routing explicit.** Local model aliases and provider targets must be configuration, not hardcoded conditions scattered across the app. `[ULG-032]`
4. **Fail safely.** If the local gateway or local daemon is unavailable, the runtime should emit structured failures or fall back according to explicit policy rather than hanging. `[ULG-033]`
5. **Protect local hardware.** Local-only backends need concurrency gates and warmup support appropriate to macOS and local VRAM pressure. `[ULG-034]`
6. **Roll out on the smallest truthful surface first.** The gateway should prove value on chat and summarization before it becomes a universal model backend. `[ULG-035]`

### 2.1 Non-goals

1. This spec does **not** replace the browser-side `ChatStreamProvider`; that abstraction is for the browser-to-Next route, not the upstream model provider. `[ULG-036]`
2. This spec does **not** route OpenAI TTS, OpenAI web search, or blog image generation through the gateway. Those remain separate concerns. `[ULG-037]`
3. This spec does **not** require raw Anthropic SSE parity in the browser. Any Anthropic-compatible surface belongs between `ordoSite` server code and the gateway only. `[ULG-038]`

---

## 3. Architecture

### 3.1 Current runtime boundary

Today the runtime boundary is:

```text
Browser UI
  -> /api/chat/stream (Studio Ordo SSE contract)
  -> ChatStreamPipeline / anthropic-stream / anthropic-client
  -> Anthropic cloud
```

That boundary should remain intact. `[ULG-040]`

### 3.2 Target insertion point

The local gateway should sit behind a new server-side provider client factory.

```text
Browser UI
  -> /api/chat/stream
  -> Studio Ordo stream pipeline
  -> LLM Provider Client Factory
       -> Anthropic cloud client
       -> Local gateway client
  -> optional local gateway
       -> Apple daemon / Ollama / future local engines
```

`[ULG-041]`

Required server-side additions:

1. A provider-target config layer in `src/lib/config/env.ts` and `src/lib/config/env-config.ts`. `[ULG-042]`
2. A reusable factory for Anthropic-compatible message clients used by chat streaming, direct turns, and summarization. `[ULG-043]`
3. A readiness probe that branches on the selected provider target instead of hardcoding Anthropic credential checks. `[ULG-044]`

### 3.3 Gateway-side contract

The gateway itself should remain a standalone Node package or workspace and expose a small server-to-server API.

Recommended initial endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Process liveness |
| `GET /v1/models/system` | Provider readiness, adapter availability, and selected backend details |
| `POST /v1/messages` | Anthropic-compatible server-to-server message generation and streaming |
| `POST /v1/warmup` | Explicit warmup for local-only backends |

`[ULG-045]`

The gateway only needs Anthropic compatibility at the server boundary. It does not need to replace the app’s browser SSE protocol. `[ULG-046]`

### 3.4 Local model registry

The gateway should maintain a registry that maps logical aliases to local backends.

Suggested shape:

```typescript
type GatewayProvider = "apple_foundation" | "ollama";

interface GatewayModelDefinition {
  alias: string;
  provider: GatewayProvider;
  vendorModelId: string;
  contextWindow: number;
  warmupOnBoot?: boolean;
  maxConcurrency?: number;
}
```

Rules:

1. `local-fast`, `local-pro`, and any other local aliases are gateway configuration, not app env names. `[ULG-047]`
2. The app selects logical aliases such as `local-fast`; the gateway resolves them to concrete Apple or Ollama backends. `[ULG-048]`
3. Apple-backed routes must be disabled cleanly off macOS. `[ULG-049]`

### 3.5 App-side provider target config

The app should gain explicit provider target configuration.

Suggested env layer:

```text
LLM_PROVIDER_TARGET=anthropic|local_gateway
LLM_GATEWAY_URL=http://127.0.0.1:4318
LLM_CHAT_MODEL_ALIAS=local-fast|claude-haiku-4-5
LLM_SUMMARIZER_MODEL_ALIAS=local-fast|claude-haiku-4-5
```

Rules:

1. Existing `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` remain valid for the cloud provider target. `[ULG-050]`
2. Provider target config must be explicit. Implicitly treating a model name like `local-pro` as a special case inside current Anthropic env helpers is not allowed. `[ULG-051]`
3. Health probes and admin diagnostics must report the selected provider target and model alias clearly. `[ULG-052]`

### 3.6 Local concurrency and safety

1. The gateway should enforce single-flight or bounded concurrency only for local GPU or daemon-backed models that need it. `[ULG-053]`
2. Cloud Anthropic traffic should not be forced through local mutexes. `[ULG-054]`
3. Gateway failures must fail closed with structured error payloads and request timeouts; they must never hang the app stream. `[ULG-055]`

---

## 4. Security And Reliability

1. No browser-supplied path or socket target may influence Apple daemon transport. All daemon targets are server-owned configuration. `[ULG-060]`
2. Off-macOS hosts must disable Apple-backed adapters deterministically and report that state in readiness output. `[ULG-061]`
3. Local gateway requests must enforce request timeouts and error mapping so `ordoSite` can degrade gracefully. `[ULG-062]`
4. The gateway must never assume local backends are safe to parallelize without explicit adapter policy. `[ULG-063]`

---

## 5. Testing Strategy

1. **Provider-factory contract tests:** prove that chat streaming, direct turns, and summarization all resolve provider targets through one shared factory. `[ULG-070]`
2. **Config tests:** validate env parsing for cloud Anthropic versus local gateway selection. `[ULG-071]`
3. **Gateway registry tests:** verify alias resolution, unsupported provider behavior, and off-macOS Apple disablement. `[ULG-072]`
4. **Readiness tests:** verify probe behavior for cloud and gateway targets separately. `[ULG-073]`
5. **Streaming parity tests:** compare local gateway server-to-server streaming against the subset of Anthropic response semantics that the app’s server runtime actually consumes. `[ULG-074]`
6. **Concurrency tests:** verify local-only concurrency gating and timeout behavior for Apple or other GPU-bound backends. `[ULG-075]`

---

## 6. Delivery Plan

| Phase | Sprint File | Focus |
| --- | --- | --- |
| **0** | [sprints/sprint-0-foundation.md](sprints/sprint-0-foundation.md) | Centralize provider choice inside `ordoSite` before any gateway process exists |
| **1** | [sprints/sprint-1-ipc-bridge.md](sprints/sprint-1-ipc-bridge.md) | Stand up the local gateway process and operational health surfaces |
| **2** | [sprints/sprint-2-model-registry.md](sprints/sprint-2-model-registry.md) | Add alias routing plus Apple and Ollama adapter seams |
| **3** | [sprints/sprint-3-sse-pipeline.md](sprints/sprint-3-sse-pipeline.md) | Route selected server-side call paths through the gateway and verify parity |

`[ULG-090]`

### 6.1 Phase 0: Provider Centralization And Truthful Configuration

1. Add explicit provider-target env parsing, gateway URL support, and model-alias config while preserving cloud Anthropic compatibility. `[ULG-091]`
2. Introduce one shared server-side provider boundary for the phase-1 surfaces: streaming chat, direct turns, and summarization. `[ULG-092]`
3. Update readiness and diagnostics so they report the active provider target and selected aliases truthfully instead of assuming Anthropic cloud is always authoritative. `[ULG-093]`

### 6.2 Phase 1: Gateway Scaffold And Health

1. Create a standalone gateway package or workspace that runs independently from the Next.js app process. `[ULG-094]`
2. Expose the minimum operational HTTP surface: `GET /health`, `GET /v1/models/system`, and `POST /v1/warmup`. `[ULG-095]`
3. Add OS-aware Apple daemon lifecycle management and clear readiness reporting without integrating real adapters into `ordoSite` yet. `[ULG-096]`

### 6.3 Phase 2: Local Registry And Adapters

1. Add a gateway-local provider port and alias registry so the app can request logical models like `local-fast` and `local-pro`. `[ULG-097]`
2. Implement Apple-backed and Ollama-backed adapter seams with explicit platform gating, timeout handling, and bounded concurrency. `[ULG-098]`
3. Keep local execution policy inside the gateway so `ordoSite` stays focused on provider selection rather than daemon or GPU coordination. `[ULG-099]`

### 6.4 Phase 3: Server Integration And Parity

1. Add `POST /v1/messages` and route the first supported server-side call paths through the shared provider boundary when `local_gateway` mode is enabled. `[ULG-100]`
2. Prove parity for the subset of Anthropic-compatible semantics that the repo actually consumes in chat streaming, direct turns, and summarization. `[ULG-101]`
3. Keep blog production, eval runners, and other Anthropic consumers out of the first gateway rollout until the smaller surface is stable. `[ULG-102]`

---

## 7. Success Criteria

1. `ordoSite` can run in cloud Anthropic mode or local gateway mode through explicit config, with no hidden model-name heuristics. `[ULG-110]`
2. The browser-facing `/api/chat/stream` contract remains unchanged while the server runtime switches providers behind the scenes. `[ULG-111]`
3. Chat streaming, direct turns, and summarization all resolve provider selection through one shared server-side boundary. `[ULG-112]`
4. The gateway can resolve local aliases to supported adapters and report unsupported or off-platform states cleanly. `[ULG-113]`
5. Local gateway failures do not hang the app stream; they surface as structured errors or explicit fallback behavior. `[ULG-114]`
6. The first rollout does not widen scope into unrelated model consumers before the initial server-side surfaces are stable. `[ULG-115]`

---

## 8. Future Considerations

1. Blog article production and eval runners can be migrated after chat and summarization prove stable on the new provider boundary. `[ULG-080]`
2. A semantic cache or speculative routing layer belongs above a working provider factory and below the app runtime, not before the provider seam is cleaned up. `[ULG-081]`
