# Sprint 0 — Current Repo Integration Foundation

> **Goal:** Centralize provider selection inside `ordoSite` before any gateway process is introduced.
> **Spec ref:** §3.2, §3.5
> **Prerequisite:** None.

---

## Sprint Scope

1. Add explicit provider-target env parsing and validation for cloud Anthropic versus local gateway mode.
2. Introduce one shared server-side provider boundary for streaming chat, direct turns, and summarization.
3. Make readiness and diagnostics report the active provider target truthfully.

## Out Of Scope

1. No standalone gateway process or daemon lifecycle work yet.
2. No Apple or Ollama adapter implementation yet.
3. No migration of blog production or eval runners in this sprint.

---

## Task 0.1 — Add Provider Target Config

**What:** Extend env parsing so the app can distinguish cloud Anthropic from local gateway mode.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/config/env.ts` |
| **Modify** | `src/lib/config/env-config.ts` |
| **Spec** | §3.5 |
| **Reqs** | `ULG-042`, `ULG-050`, `ULG-051` |

Deliverables:

1. Add provider-target config such as `LLM_PROVIDER_TARGET` and `LLM_GATEWAY_URL`.
2. Keep existing Anthropic env keys working for cloud mode.
3. Add validation and defaulting rules that make the selected provider target explicit.

---

## Task 0.2 — Introduce A Shared Server-Side Provider Factory

**What:** Add one shared provider-selection seam for Anthropic-compatible server-side callers.

| Item | Detail |
| --- | --- |
| **Create** | provider-target and provider-client factory modules under `src/lib/ai/` or equivalent |
| **Modify** | `src/lib/chat/anthropic-stream.ts` integration path |
| **Modify** | `src/lib/chat/anthropic-client.ts` integration path |
| **Modify** | `src/adapters/AnthropicSummarizer.ts` |
| **Spec** | §3.2 |
| **Reqs** | `ULG-031`, `ULG-043` |

Rules:

1. Remove new direct Anthropic construction from these call paths.
2. Preserve current timeout and retry semantics.
3. Keep browser and route contracts unchanged.

---

## Task 0.3 — Make Readiness Provider-Aware

**What:** Update readiness and diagnostics so they report the active provider target truthfully.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/health/probes.ts` |
| **Modify** | any admin diagnostics surface that reports Anthropic-only state |
| **Spec** | §3.5 |
| **Reqs** | `ULG-044`, `ULG-052` |

---

## Validation

1. Env parsing tests cover Anthropic cloud mode, local gateway mode, and invalid mixed configuration.
2. Provider-boundary tests prove chat streaming, direct turns, and summarization resolve through the same server-side selection seam.
3. Health and diagnostics tests prove the reported provider target matches the active config.

---

## Sprint 0 — Completion Checklist

- [ ] Provider target env is explicit and validated.
- [ ] Chat streaming, direct turns, and summarization resolve through one shared server-side provider boundary.
- [ ] Readiness no longer assumes Anthropic cloud is always the active backend.
