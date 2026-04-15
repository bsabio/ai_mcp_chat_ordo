# Sprint 7 Artifact — Provider Expansion Matrix

> Every non-chat model caller assessed for observability vs resilience.

## Assessment Criteria

| Level | What it provides | When to use |
| --- | --- | --- |
| **Observability-only** | `emitProviderEvent()` for start/success/failure | Low-frequency, non-critical paths |
| **Observability + Resilience** | + retry, backoff, model fallback | High-frequency, user-visible paths |

## Provider Expansion Matrix

| Caller | SDK | Surface | Obs. Level | Resilience? | Sprint 7 Status |
| --- | --- | --- | --- | --- | --- |
| `anthropic-stream.ts` | Anthropic | `stream` | Full lifecycle | ✅ retry + fallback | Sprint 4 (baseline) |
| `anthropic-client.ts` | Anthropic | `direct_turn` | Full lifecycle | ✅ retry + fallback | Sprint 4 (baseline) |
| `AnthropicSummarizer.ts` | Anthropic | `summarization` | Full lifecycle | ❌ observability-only | ✅ Sprint 7 instrumented |
| `OpenAiBlogImageProvider.ts` | OpenAI | `image_generation` | Full lifecycle | ❌ observability-only | ✅ Sprint 7 instrumented |
| `tts/route.ts` | OpenAI (fetch) | `tts` | Full lifecycle | ❌ observability-only | ✅ Sprint 7 instrumented |
| `blog-production-root.ts` | Anthropic + OpenAI | `blog_production` | Not yet | ❌ | Surface declared, instrumentation deferred (complex pipeline) |
| `admin-web-search.tool.ts` | OpenAI | `web_search` | Not yet | ❌ | Surface declared, instrumentation deferred |

## Rationale for Observability-Only

The 3 callers instrumented in Sprint 7 receive observability events but **not**
resilience policy (retry, backoff, model fallback) because:

1. **Summarization**: Called infrequently (conversation context compaction).
   Failure is non-blocking — the conversation continues without a summary.
   Adding retry would complicate the flow for marginal benefit.

2. **Image generation**: Called via deferred jobs which already have their own
   retry policy (`AUTOMATIC_RETRY_EDITORIAL`). Adding provider-level retry on
   top of job-level retry would create double-retry cascades.

3. **TTS**: The TTS route has its own timeout handling and user-facing error
   reporting. Adding provider-level retry could mask timeout conditions.

## Future Expansion Candidates

| Caller | Complexity | Benefit | Priority |
| --- | --- | --- | --- |
| `blog-production-root.ts` | High (multi-step pipeline, 2 SDKs) | Medium | Low |
| `admin-web-search.tool.ts` | Low | Low (admin-only, inline) | Low |
