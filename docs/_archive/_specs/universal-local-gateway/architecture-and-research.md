# Universal Local Gateway: Architecture & Research

> **Purpose:** Ground the gateway spec in the code that actually exists today, identify the real insertion points, and document the research conclusions that changed the spec.

## 1. Verified Repo Boundaries

### 1.1 Browser contract today

The browser does not talk to Anthropic directly. It talks to `src/app/api/chat/stream/route.ts` through `src/adapters/ChatStreamAdapter.ts`, and the adapter parses Studio Ordo SSE payloads such as:

- `delta`
- `tool_call`
- `tool_result`
- `conversation_id`
- `job_queued`, `job_started`, `job_progress`, `job_completed`, `job_failed`, `job_canceled`
- `error`

This is the first architectural fact that matters: a local gateway should not be designed as a browser replacement. It is a server-to-server upstream concern. `[ULG-R-001]`

### 1.2 Anthropic-dependent server paths today

The repo has several separate Anthropic call sites:

| Surface | Current file | Current behavior |
| --- | --- | --- |
| Streaming chat loop | `src/lib/chat/anthropic-stream.ts` | Uses `client.messages.stream(...)` with model fallbacks |
| Direct chat turn | `src/lib/chat/chat-turn.ts` + `src/lib/chat/anthropic-client.ts` | Uses `client.messages.create(...)` through a provider wrapper |
| Summarization | `src/adapters/AnthropicSummarizer.ts` | Constructs `new Anthropic(...)` directly |
| Blog article production | `src/lib/blog/blog-production-root.ts` and `src/adapters/AnthropicBlogArticlePipelineModel.ts` | Uses Anthropic directly for editorial workflows |
| Evals | `src/lib/evals/*` | Reads Anthropic env and model config directly |

This means “swap Anthropic for a gateway” is not one change. The code first needs a shared provider-selection seam. `[ULG-R-002]`

### 1.3 Config and readiness today

The current runtime config is Anthropic-first:

- `src/lib/config/env.ts` exposes `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, request timeout, retry count, retry delay, and model fallbacks.
- `src/lib/health/probes.ts` treats Anthropic credentials as the readiness source of truth.

There is no:

- `LLM_PROVIDER_TARGET`
- gateway URL
- local alias registry
- daemon lifecycle manager
- provider-neutral readiness mode

`[ULG-R-003]`

### 1.4 What does not exist yet

The repo currently has no implementation of:

- `ordo_gateway`
- `AppleMCPAdapter`
- `LocalModelRegistry`
- `AnthropicSseTranslator`
- `DaemonManager`
- any `ordo` daemon integration
- any Ollama or MLX runtime binding

The gateway design is therefore greenfield. The spec should reflect that instead of implying partial implementation already exists. `[ULG-R-004]`

## 2. Research Conclusions

### 2.1 The original “zero modifications to ordoSite” assumption is false

Because the browser consumes the app’s own SSE format and the server constructs Anthropic clients directly in multiple places, the gateway cannot be adopted cleanly without `ordoSite` changes.

Those changes are not a bug in the plan. They are the correct prerequisite work. `[ULG-R-010]`

### 2.2 The existing `ChatStreamProvider` is not the right upstream abstraction

`src/core/use-cases/ChatStreamProvider.ts` is a browser-side interface for fetching `/api/chat/stream`. It is not a model-provider abstraction.

Trying to overload it for cloud versus local model routing would blur the browser boundary with the server provider boundary. `[ULG-R-011]`

### 2.3 Anthropic SSE parity matters on the server boundary, not the browser boundary

The gateway only needs enough Anthropic compatibility to satisfy the server-side consumers that currently rely on `@anthropic-ai/sdk` semantics or equivalent response shapes.

The browser still receives Studio Ordo stream events from the Next route after the server has interpreted model output, tool events, and deferred job state. `[ULG-R-012]`

### 2.4 Phase 1 should stay narrow

The first realistic rollout surface is:

1. streaming chat loop
2. direct chat turn
3. summarization

Blog production, live evals, and any future local-first editorial flows should come later, after the provider seam is proven. `[ULG-R-013]`

### 2.5 Readiness and diagnostics need to branch on provider target

If the selected provider becomes a local gateway, it is no longer correct for readiness to fail because `ANTHROPIC_API_KEY` is missing. Health checks need a provider-aware branch. `[ULG-R-014]`

## 3. Recommended Integration Seams

### 3.1 App-side factory seam

Introduce one server-side provider-selection layer for Anthropic-compatible calls.

Recommended responsibilities:

1. Read provider target and model alias env.
2. Decide between cloud Anthropic and local gateway transport.
3. Return the client or provider wrapper expected by each caller.
4. Surface consistent timeout and retry behavior.

Potential placement:

- `src/lib/ai/provider-target.ts`
- `src/lib/ai/provider-client-factory.ts`
- `src/lib/ai/local-gateway-client.ts`

The exact filenames can change, but the boundary should be explicit and shared. `[ULG-R-020]`

### 3.2 Gateway-side seam

The gateway can still be a separate Node process, but it should be treated as an upstream service, not as a replacement for `src/app/api/chat/stream/route.ts`.

Recommended first gateway responsibilities:

1. resolve local model alias
2. run Apple or Ollama adapter
3. enforce local-only concurrency policy
4. expose a minimal server-to-server HTTP API for message generation, health, and warmup

`[ULG-R-021]`

## 4. Open Implementation Questions

These are real follow-up questions, not blockers to the spec direction.

1. Should the Anthropic-compatible gateway client use the Anthropic SDK against a custom base URL, or should `ordoSite` use a thin internal HTTP client for local gateway mode? `[ULG-R-030]`
2. Should the gateway live as a sibling workspace in this repo for the first iteration, or in a dedicated repo once the contract settles? `[ULG-R-031]`
3. Should summarization use the same local alias as the main chat loop, or a separate lighter alias by default? `[ULG-R-032]`

## 5. Bottom Line

The universal local gateway idea is sound, but the original draft was too detached from the repo.

What changed after research:

1. The gateway is now a **server-side upstream**, not a browser-facing drop-in.
2. `ordoSite` needs **provider centralization first**.
3. The rollout should start with **chat, direct turns, and summarization**, not every Anthropic-dependent subsystem at once.
4. The spec should stop promising “zero modifications” and instead describe the small, necessary modifications that make the rest of the design possible. `[ULG-R-040]`
