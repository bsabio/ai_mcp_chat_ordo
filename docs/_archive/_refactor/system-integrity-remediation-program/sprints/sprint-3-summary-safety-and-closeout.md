# Sprint 3 — Summary Safety And Closeout

> **Goal:** Finish the integrity pass by hardening summary replay, preventing
> duplicate summarization runs, and running the final release-confidence checks.
> **Spec ref:** §5.4, §6, §8
> **Prerequisite:** Sprint 2 complete

---

## Coordinated Workstream

1. `summary-context-hardening`

## Required outcomes

1. Summary replay is server-owned, delimited, and quoted.
2. Summary generation avoids future-turn instructions and policy overrides.
3. Overlapping summarize triggers for one conversation do not create duplicate
   summary writes in one process.
4. The remediation program closes with focused tests and a production build.

### Verify Sprint 3

```bash
npx vitest run tests/chat-stream-route.test.ts src/core/use-cases/SummarizationInteractor.test.ts src/adapters/AnthropicSummarizer.test.ts
npm run build
```