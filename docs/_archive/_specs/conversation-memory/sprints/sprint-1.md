# Sprint 1 — Rolling Summaries

**Goal:** Long conversations are automatically summarized. The LLM context
window stays bounded. Users never hit the message limit wall.

| Task | Description | Req |
| ---- | ----------- | --- |
| 1.1 | Add `summary` variant to `MessagePart` union | CONVO-030 |
| 1.2 | ~~Expand `Message.role` to include `"system"`~~ _(completed in Sprint 0 — entity type updated alongside other Sprint 0 entity changes)_ | CONVO-030 |
| 1.3 | Define `LlmSummarizer` port | CONVO-030 |
| 1.4 | Implement `AnthropicSummarizer` adapter | CONVO-030 |
| 1.5 | Implement `SummarizationInteractor` | CONVO-030 |
| 1.6 | Build context window function (summary + recent messages) | CONVO-030 |
| 1.7 | Wire trigger into stream route (post-response async, emits `summarized` event) | CONVO-030 |
| 1.8 | ~~Raise `MAX_MESSAGES_PER_CONVERSATION` to 200~~ _(completed in Sprint 0 — Section 7.4 CONVO-050 scope)_ | CONVO-030 |
| 1.9 | Unit + integration tests (~6 new) | |
| 1.10 | Full suite green, build clean | |

**Deliverable: ~394 existing + ~6 new = ~400 tests, long conversations
auto-summarize.**
