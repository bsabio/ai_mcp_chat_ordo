# 11 Provider Runtime Path Matrix
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document maps the actual model-backed execution paths in the repository.

The main conclusion is straightforward:

The repo does not currently have one provider runtime. It has a family of use-case-local provider paths with different client construction, prompt sources, resilience rules, and observability behavior.

That matters because provider reliability is not only about which upstream model is used. It is also about where timeout policy lives, where retries are applied, where prompt text is assembled, and where failures are normalized.

## 1. Current Path Matrix

| Use case | Entrypoint | Upstream call style | Client construction | Prompt or input source | Tool loop | Resilience and guards | Observability reading |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Main chat stream | `/api/chat/stream` -> `ChatStreamPipeline` -> `runClaudeAgentLoopStream` | Anthropic `messages.stream` | `anthropic-stream.ts` creates `new Anthropic({ apiKey })` unless a client is injected | `createSystemPromptBuilder(role, options)` plus request-time sections added by the route and pipeline: page context, user preferences, trusted referral, summary, routing, tool manifest, and other turn-specific blocks | Yes. Internal `ToolRegistry` schemas plus deferred-job aware tool executor | Own model-candidate fallback, retry, timeout, abort propagation, and special fail-fast behavior when a timeout happens after a successful tool round | Route- and pipeline-level lifecycle behavior plus SSE events. Not routed through `provider-decorators.ts` |
| Direct chat turn | `executeDirectChatTurn` | Anthropic `messages.create` | `chat-turn.ts` constructs `new Anthropic({ apiKey })`, then wraps `createAnthropicProvider(...)` with `withProviderErrorMapping(...)` and `withProviderTiming(...)` | `createSystemPromptBuilder(role)` plus user preferences only | Yes. `orchestrateChatTurn(...)` loops tool calls using internal registry schemas and executor | `anthropic-client.ts` owns timeout, retry, retry delay, and model fallback for this path | `provider.call` timing logs via `withProviderTiming(...)`; errors normalized into `ChatProviderError` |
| Live eval runtime | `executeLiveEvalRuntime` and `buildLiveEvalSystemPrompt(...)` in `live-runner.ts` | Anthropic streaming by default through `runClaudeAgentLoopStream` | No dedicated provider factory. The runtime reuses the streaming chat path unless a custom runner is injected | `buildSystemPrompt(role)` or caller-supplied prompt, then some scenarios append funnel directives, routing context, and page context manually | Optional. Some scenarios pass an empty tool set explicitly | Inherits `anthropic-stream.ts` behavior only when using the default stream runner | Eval result capture is separate from the app chat route and does not share the direct-turn decorator path |
| Conversation summarization | `AnthropicSummarizer.summarize(...)` | Anthropic `messages.create` | `AnthropicSummarizer` constructs `new Anthropic({ apiKey })` per call | Fixed `SUMMARY_PROMPT`; only `user` and `assistant` turns are forwarded | No | No shared timeout, retry, or model fallback layer around the call | Local class behavior only |
| Blog article pipeline | `AnthropicBlogArticlePipelineModel` via `blog-production-root.ts` | Anthropic `messages.create` | `blog-production-root.ts` creates the Anthropic client for the pipeline model and exposes it behind a lazy service wrapper | Task-specific JSON-only system prompts for `composeArticle`, `reviewArticle`, `resolveQa`, and `designHeroImagePrompt` | No | If JSON parsing fails, the model performs one repair request. It does not share the chat timeout, retry, or model-fallback layer | Local parsing and repair behavior only |
| Blog image generation | `OpenAiBlogImageProvider.generate(...)` via `blog-production-root.ts` | OpenAI `images.generate` | `blog-production-root.ts` creates a fresh OpenAI client when image generation runs | Prompt text is derived from article content and optionally enhanced locally before generation | No | No shared retry, timeout, or error-mapping runtime | Local result shaping only |
| Admin web search | `createAdminWebSearchTool(...)` -> `adminWebSearch(...)` | OpenAI `responses.create` with upstream `web_search` tool | The tool descriptor uses a deps factory that creates a fresh OpenAI client | Raw admin query plus allowed-domain filters and the upstream web-search tool config | Uses the upstream OpenAI tool call, but not the app chat tool loop | Input validation and API error mapping only. No shared retry or fallback runtime | Returns an admin payload, but does not share chat-provider observability |
| TTS | `/api/tts` | Raw HTTP `fetch` to OpenAI `/v1/audio/speech` | No SDK abstraction. The route performs a direct HTTP request with the OpenAI API key | Plain text input only | No | Manual `AbortController` timeout, response-size cap, cache lookup, and file persistence | Route metrics and request logs exist here, but they are unrelated to chat-provider abstractions |

## 2. What This Matrix Proves

### 2.1 There is no single provider runtime

The repository already has several model-backed systems, but they do not share one provider abstraction:

- the main chat stream owns its own Anthropic streaming loop
- the direct-turn path owns a separate Anthropic provider abstraction
- live eval reuses only part of the streaming stack
- summarization creates Anthropic clients independently
- blog generation creates Anthropic and OpenAI clients independently
- TTS bypasses SDK abstractions and uses raw HTTP

This is more than a style difference. It means reliability policy is distributed across multiple call sites.

### 2.2 Chat already contains two separate Anthropic runtimes

The highest-pressure path in the repo, chat, is itself split:

- `anthropic-stream.ts` owns streaming retries, model fallback, abort propagation, timeout behavior, and tool-round semantics for the primary chat route
- `anthropic-client.ts` owns non-streaming retries, timeout behavior, and model fallback for the direct-turn path

Both paths solve similar infrastructure problems, but they do so with different abstractions and different extension points.

### 2.3 Prompt production is still use-case-local

The provider path is tightly coupled to how prompt text is produced:

- the main chat route builds the richest prompt
- the direct-turn path builds a smaller prompt
- live eval sometimes builds from `buildSystemPrompt(...)` and then appends extra directives manually
- summarization and blog generation use independent fixed or task-specific prompts
- admin web search and TTS do not participate in the prompt-builder contract at all

That means “provider runtime” and “prompt runtime” are already coupled in practice, even though they are not represented as one shared runtime service.

### 2.4 Client lifetime is inconsistent

Different model-backed features create clients at different lifetimes:

- request-local construction in chat
- lazy service wrappers in blog production
- per-call construction in summarization
- raw fetch in TTS

This makes it harder to answer one simple operational question: where should provider-level policy actually live?

## 3. Current Reliability Reading By Path

### Main chat stream

This is the most sophisticated path in the repo.

Strengths:

- supports tool-use loops
- understands abort propagation
- applies model fallback and retries
- cooperates with deferred-job promotion and SSE lifecycle events

Weaknesses:

- the behavior is specific to `anthropic-stream.ts`
- the direct-turn path cannot inherit it automatically
- non-chat Anthropic use cases do not inherit it either

### Direct chat turn

This path is cleaner than a raw SDK call because it does use a provider abstraction and decorators.

Strengths:

- explicit provider interface
- centralized timing and error mapping for this path
- centralized model fallback and retry logic for this path

Weaknesses:

- it is still parallel to the streaming runtime rather than shared with it
- it builds a smaller prompt contract than the main route

### Non-chat model paths

Summarization, blog generation, image generation, admin web search, and TTS each make local sense.

The problem is not that any one path is wrong. The problem is that each use case answers the same infrastructure questions independently:

- how to construct the client
- how to apply timeouts
- how to retry
- how to record metrics
- how to normalize errors
- how to describe prompt provenance

## 4. Architectural Implications

The current system is not “provider agnostic” in the operational sense.

It is provider plural.

That distinction matters. A repo can support multiple providers and still be unified if those calls flow through one runtime contract. This repo currently does not.

The deepest convergence pressure is in four places:

1. upstream selection and client construction
2. timeout, retry, and fallback policy
3. prompt attachment and provenance
4. provider-level observability and error mapping

## 5. What A Unified Runtime Would Need To Preserve

Any future provider runtime should preserve the useful differences between use cases without preserving the current infrastructure duplication.

The shared runtime should own:

- client construction
- upstream selection
- timeout and retry policy
- model fallback
- error normalization
- provider metrics

Use-case adapters should still own:

- whether the interaction is streaming or turn-based
- whether tools are enabled
- which prompt sections are included
- task-specific post-processing such as JSON repair or media persistence

That is the practical architectural reading from the current path matrix.
