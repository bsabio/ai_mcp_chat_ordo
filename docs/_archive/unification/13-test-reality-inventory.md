# 13 Test Reality Inventory
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document maps the current verification picture at the seams most relevant to MCP alignment, provider reliability, and prompt-control unification.

The main conclusion is not that the repo lacks tests.

The repo has many tests.

The deeper issue is that the strongest tests are often local-module tests, while the weakest confidence is at the composition seams where the architecture is most split.

## 1. Current Reading

The current suite is best described this way:

- strong on local logic
- mixed on route control flow
- weak on cross-seam equivalence

That matches the architecture itself. The repository already has thoughtful local contracts, but the cross-system seams are still mostly verified through mocks.

## 2. Seam Matrix

| Seam | Representative tests reviewed | What is exercised for real | What is mocked or bypassed | Confidence reading |
| --- | --- | --- | --- | --- |
| Streaming Anthropic loop | `tests/chat/anthropic-stream.test.ts` | Real `runClaudeAgentLoopStream(...)` logic with injected client doubles. Covers abort propagation, model fallback, transient retry, and timeout-after-tool-round behavior | No route, prompt builder, tool registry selection, persistence, or real Anthropic client | High confidence in local streaming-loop logic; low confidence in full runtime composition |
| Direct-turn provider path | `src/lib/chat/chat-turn.test.ts` | Real `executeDirectChatTurn(...)` function and provider-call logging path | Mocks `createSystemPromptBuilder`, Anthropic SDK, user-pref repo, tool composition, and `orchestrateChatTurn(...)` | Medium confidence in local wiring; low confidence that direct-turn behavior matches stream runtime behavior |
| Main chat route | `src/app/api/chat/stream/route.test.ts`, `tests/chat/chat-stream-route.test.ts` | Route-level control flow, some SSE payload handling, active-stream lifecycle | Mocks `policy`, `anthropic-stream`, `chat-turn`, `conversation-root`, and `RepositoryFactory` | Low confidence in the actual provider, prompt, and composition contract of the real route |
| Stream pipeline methods | `tests/stream-pipeline.test.ts` | A meaningful amount of pipeline branching and helper logic | Heavy mocks for the same core seams: `anthropic-stream`, `policy`, `conversation-root`, `chat-turn`, `RepositoryFactory` | Medium confidence in local branch logic; low confidence in integrated runtime behavior |
| Prompt repository and prompt events | `tests/system-prompt.test.ts` | Real in-memory DB, real `SystemPromptDataMapper`, real fallback repository behavior, real `promptSet(...)` and `promptRollback(...)` event recording | Does not go through admin server actions, config identity overlays, or the main chat route | High confidence in raw slot-version semantics; medium confidence in effective runtime prompt semantics |
| Prompt builder | `tests/system-prompt-builder.test.ts`, `tests/system-prompt-assembly.test.ts` | Real `SystemPromptBuilder`, real ordering rules, real tool-manifest assembly using the registry, repeated-byte-stability checks | Does not exercise `createSystemPromptBuilder(...)`, `_basePrompt` cache behavior, admin/MCP control planes, or final route-time additions like referral flow | High confidence in the builder object; medium confidence in end-to-end prompt provenance |
| Admin prompt surfaces | `tests/admin-prompts-conversations.test.tsx` | Route helpers, page rendering contracts, admin action entrypoints at the UI level | Mocks prompt loaders and `RepositoryFactory`; does not verify fallback visibility, event emission, or default role coverage such as `APPRENTICE` | Low confidence in prompt-control operational equivalence |
| Admin web search | `tests/mcp/web-search-tool.test.ts` | Real `adminWebSearch(...)` parsing, validation, citation extraction, source extraction, and API error mapping with OpenAI doubles | Does not go through the app tool registry, admin tool descriptor, or chat runtime | Medium confidence in tool module behavior |
| Blog article pipeline | `src/adapters/AnthropicBlogArticlePipelineModel.test.ts` | Real JSON parsing and malformed-response failure behavior in the model adapter | Does not cover `blog-production-root.ts`, client construction policy, or shared provider-runtime behavior | Medium confidence in adapter parsing logic |
| Conversation summarizer | `src/adapters/AnthropicSummarizer.test.ts` | Real message filtering and summary safety-prompt behavior | Does not cover summarization interactor composition or shared provider policy | Medium confidence in summarizer-local logic |
| TTS route | `src/app/api/tts/route.test.ts`, `tests/tts-route-hardening.test.ts` | Route control flow, auth gate, cache behavior, persistence metadata, and source-code hardening checks around timeout and size cap | Uses mocked fetch and file system; not covered through a shared provider abstraction because none exists | Medium confidence in route-local hardening, but it remains an isolated provider path |

## 3. What The Suite Is Actually Strong At

The strongest current tests are the ones that focus on a concrete module boundary and exercise the real implementation inside that boundary.

Examples:

- `tests/chat/anthropic-stream.test.ts`
- `tests/system-prompt.test.ts`
- `tests/system-prompt-builder.test.ts`
- `tests/system-prompt-assembly.test.ts`
- `tests/mcp/web-search-tool.test.ts`
- `src/adapters/AnthropicSummarizer.test.ts`
- `src/adapters/AnthropicBlogArticlePipelineModel.test.ts`
- `src/app/api/tts/route.test.ts`

These tests do useful work. They prove the repo already has good local contracts in several important places.

## 4. Where Confidence Drops

Confidence drops at the seams where the repo composes those local contracts.

The reviewed route and pipeline tests repeatedly mock the same high-value boundaries:

- `@/lib/chat/policy`
- `@/lib/chat/anthropic-stream`
- `@/lib/chat/chat-turn`
- `@/lib/chat/conversation-root`
- `@/adapters/RepositoryFactory`

Those mocks are understandable in isolation. But they also remove exactly the seams where the current architecture is split:

- prompt assembly versus prompt storage
- streaming runtime versus direct-turn runtime
- request-scoped composition versus process-cached service lookup
- real provider policy versus route control flow

That is why a route test can pass while the real integrated runtime still drifts.

## 5. Specific Test-Reality Gaps

### 5.1 Prompt control-plane equivalence is not really tested

The repo does test prompt slots and prompt events, but not the full equivalence story.

What is covered:

- DB slot behavior
- prompt set and rollback event recording through the MCP path
- builder ordering and assembly

What is not meaningfully covered in the reviewed suite:

- admin action side effects versus MCP prompt-tool side effects
- fallback visibility in admin surfaces
- config overlay impact on effective prompt behavior
- the `APPRENTICE` role gap across seed data and control-plane defaults

### 5.2 Main chat route tests do not prove the real chat prompt contract

Because route tests mock `policy`, they do not prove the actual route prompt includes the same identity, directive, tool manifest, user preferences, and other request-time sections that the real runtime assembles.

They prove route control flow, not prompt provenance.

### 5.3 Main chat route tests do not prove the real provider contract

Because route tests mock `anthropic-stream` and often `chat-turn`, they do not prove that the real route composes correctly with:

- fallback model behavior
- timeout behavior
- tool-round behavior
- error normalization

They prove that the route can react to a mocked provider runtime, not that the route and provider runtime are unified correctly.

### 5.4 Local provider tests do not prove shared provider policy

`anthropic-stream.ts`, `chat-turn.ts`, summarizer, blog generation, admin web search, and TTS each have their own testing story.

But there is no reviewed test that proves those paths share a common provider policy, because today they do not.

The tests reflect the implementation truth:

- the provider paths are separate
- therefore the test surfaces are separate

## 6. The Real Verification Story

The current suite is not misleading because it is weak.

It is misleading because it can feel comprehensive while still leaving the most important cross-system seams mostly unverified.

The practical reading is:

1. local module confidence is often good
2. route-level control-flow confidence is mixed
3. system-equivalence confidence is still low where the architecture is duplicated

## 7. Why This Matters For Unification Work

The unification effort does not need a test strategy from zero.

It needs to preserve the strong local tests while adding seam-level verification around the places currently most likely to drift:

- provider runtime equivalence
- prompt-control equivalence
- route-to-runtime integration
- service-lifetime boundaries

That is the main lesson from the current test inventory.
