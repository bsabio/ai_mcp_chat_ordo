# Sprint 2 — Chat Rendering And Blog Use Case

> **Goal:** Add first-class job-status rendering in chat and use deferred blog drafting as the first end-to-end implementation of the abstract job model.
> **Spec Sections:** `DJO-027` through `DJO-029`
> **Prerequisite:** Sprint 1 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/rich-content.ts` | Current rich-content model already supports structured blocks such as tables, operator briefs, graphs, and action links. This is the right place to add a durable `job-status` block. |
| `src/frameworks/ui/RichContentRenderer.tsx` | Existing block registry pattern is the right renderer integration point for a job-status block. |
| `src/adapters/ChatPresenter.ts` | Converts tool results into rich content. Deferred tool enqueue responses should be rendered here rather than leaking raw JSON. |
| `src/core/use-cases/tools/admin-content.tool.ts` | Current blog drafting flow is a natural first deferred use case. It should become queue-backed without making the queue architecture content-specific. |

---

## Tasks

### 1. Add chat job-status rich content support

Create a first-class job-status block and renderer with support for:

- queued
- running
- succeeded
- failed
- canceled

Include action hooks for:

- view status
- retry
- cancel

Verify: add focused tests such as `tests/deferred-job-ui.test.tsx` and run `npx vitest run tests/deferred-job-ui.test.tsx src/frameworks/ui/RichContentRenderer.test.tsx src/frameworks/ui/MessageList.test.tsx src/adapters/ChatPresenter.test.ts`

### 2. Queue-enable blog drafting

Convert blog drafting to deferred execution using the abstract execution-mode contract.

The enqueue response should render as a job-status block immediately, and the final completion should append a durable result with actions such as:

- open draft
- revise
- publish

Verify: `npx vitest run tests/sprint-7-blog-pipeline.test.ts tests/chat-route.test.ts tests/chat-stream-route.test.ts src/adapters/ChatPresenter.test.ts`

### 3. Add end-to-end blog draft job tests

Test the full path:

- enqueue
- worker execution
- progress events
- final durable result
- chat-side rendering after reload

The end-to-end coverage should prove that the blog feature consumes the shared jobs program rather than introducing a blog-specific background runner.

Verify: add focused tests such as `tests/deferred-blog-job-flow.test.ts` and run `npx vitest run tests/deferred-blog-job-flow.test.ts tests/sprint-7-blog-pipeline.test.ts`

---

## Completion Checklist

- [x] job-status chat block added
- [x] renderer added
- [x] blog drafting uses deferred jobs
- [x] blog flow proven to consume shared queue infrastructure
- [x] end-to-end deferred blog tests added
- [x] focused tests pass

## QA Deviations

- Delivered slightly beyond the original sprint scope by wiring blog completion actions directly into chat cards, including open draft, revise, publish, and published-post links once terminal results are projected.
