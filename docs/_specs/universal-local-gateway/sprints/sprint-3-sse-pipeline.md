# Sprint 3 — Server Integration And Parity

> **Goal:** Route selected Anthropic-dependent server paths through the gateway and verify the subset of protocol parity the current repo actually needs.
> **Spec ref:** §3.2, §3.3, §5
> **Prerequisite:** Sprint 2 complete.

---

## Sprint Scope

1. Add the gateway message endpoint consumed by `ordoSite` in local mode.
2. Route streaming chat, direct turns, and summarization through the shared provider boundary when gateway mode is enabled.
3. Verify parity, structured failure handling, and explicit fallback behavior for the phase-1 surfaces.

## Out Of Scope

1. No browser-side replacement of the Studio Ordo SSE contract.
2. No migration of blog production, eval runners, or unrelated model clients.
3. No expansion into speculative routing or caching work.

---

## Task 3.1 — Add The Gateway Message Endpoint

**What:** Expose the server-to-server message endpoint used by `ordoSite` in local gateway mode.

| Item | Detail |
| --- | --- |
| **Create** | `POST /v1/messages` in the gateway |
| **Create** | endpoint tests |
| **Spec** | §3.3 |
| **Reqs** | `ULG-045`, `ULG-046` |

The endpoint must be compatible with the server-side Anthropic message semantics needed by:

1. `src/lib/chat/anthropic-stream.ts`
2. `src/lib/chat/anthropic-client.ts`
3. `src/adapters/AnthropicSummarizer.ts`

It does **not** need to replace the browser stream format. `[ULG-S3-001]`

---

## Task 3.2 — Wire `ordoSite` To The Gateway For Phase 1 Surfaces

**What:** Route the first supported call paths through the shared provider factory when gateway mode is enabled.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/anthropic-stream.ts` path through the provider factory |
| **Modify** | `src/lib/chat/anthropic-client.ts` path through the provider factory |
| **Modify** | `src/adapters/AnthropicSummarizer.ts` path through the provider factory |
| **Spec** | §3.2 |
| **Reqs** | `ULG-020`, `ULG-021`, `ULG-043` |

---

## Task 3.3 — Add Parity And Fallback Tests

**What:** Verify that gateway mode is truthful and recoverable.

| Test family | Purpose |
| --- | --- |
| Provider-factory routing tests | correct cloud versus local selection |
| Gateway-mode chat tests | streaming loop works under local gateway mode |
| Summarizer tests | summarization works through the same provider boundary |
| Fallback tests | local gateway failures map to structured app errors or explicit fallback behavior |

`[ULG-S3-002]`

---

## Validation

1. Provider-routing tests prove cloud Anthropic versus local gateway selection is explicit and deterministic.
2. End-to-end server tests prove the chat stream loop and summarizer work through the gateway without changing the browser contract.
3. Failure-path tests prove local gateway outages do not hang the request and map to structured errors or explicit fallback policy.

---

## Sprint 3 — Completion Checklist

- [ ] `/v1/messages` exists for server-to-server local gateway mode.
- [ ] Chat streaming, direct turns, and summarization can route through the gateway.
- [ ] Parity and fallback behavior are covered by tests.
