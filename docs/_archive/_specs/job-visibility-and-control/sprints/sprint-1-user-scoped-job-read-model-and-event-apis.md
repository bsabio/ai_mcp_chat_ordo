# Sprint 1 — User-Scoped Job Read Model And Event APIs

> **Goal:** Extend the durable job read model from conversation scope to signed-in user scope so a Jobs page can load and stay current in real time.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.2, §3.3, §6 Sprint 1
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `src/core/use-cases/JobQueueRepository.ts` | Current interface includes `listJobsByConversation(...)` and `listConversationEvents(...)`, but no user-scoped list/event methods. |
| `src/adapters/JobQueueDataMapper.ts` | Current SQLite mapper already stores `user_id` on `job_requests` and orders conversation-scoped jobs by `updated_at DESC, created_at DESC`. |
| `src/app/api/chat/jobs/route.ts` | Current `GET /api/chat/jobs` resolves a conversation and returns snapshots only for that conversation. |
| `src/app/api/chat/events/route.ts` | Current `GET /api/chat/events` streams only one conversation's job events. |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Current route already enforces conversation ownership before returning one job snapshot or accepting `cancel`/`retry`. |
| `src/lib/chat/resolve-user.ts` + auth model | Existing route infrastructure already resolves the current signed-in user for route authorization. |

---

## Tasks

### 1. Extend the repository contract for user-scoped reads

Add user-scoped read methods to `JobQueueRepository` and implement them in `JobQueueDataMapper`.

Required new methods:

```typescript
listJobsByUser(userId: string, options?: { statuses?: JobStatus[]; limit?: number }): Promise<JobRequest[]>;
listUserEvents(userId: string, options?: { afterSequence?: number; limit?: number }): Promise<JobEvent[]>;
listEventsForUserJob(userId: string, jobId: string, options?: { limit?: number }): Promise<JobEvent[]>;
```

The first implementation must preserve visibility for jobs that started under an anonymous session and were later migrated into a signed-in account. It must not scope only to `job_requests.user_id = ?` unless the auth-conversion path also migrates job ownership. Acceptable implementations are:

- migrate `job_requests.user_id` alongside conversation ownership transfer
- resolve visibility from current conversation ownership and `converted_from` lineage

In either case, the read path should fail closed for unrelated `null` ownership rather than broadening access.

Verify: add focused user-scope repository coverage under `tests/` using the repo's top-level integration-test layout, then run `npx vitest run tests/job-visibility-user-scope.test.ts`

### 2. Add user-scoped Jobs API routes

Create the user-facing API surface for the future Jobs page.

Required routes:

- `GET /api/jobs`
- `GET /api/jobs/events`
- `GET /api/jobs/[jobId]`
- `GET /api/jobs/[jobId]/events`, unless `GET /api/jobs/[jobId]` embeds durable event history directly
- optional `POST /api/jobs/[jobId]` if action handling is moved from the chat route rather than shared

These routes must:

- require a signed-in user
- return only authorized jobs
- preserve visibility for migrated anonymous-to-authenticated jobs
- support active-only and limit filters
- return snapshots compatible with the existing `buildJobStatusSnapshot(...)` path
- expose enough durable history to support the Jobs-page detail view after reloads without depending on a long-lived SSE session

Verify: add colocated route tests under `src/app/api/jobs/` and run `npx vitest run src/app/api/jobs/**/*.test.ts`

### 3. Preserve conversation-scoped chat recovery paths

Do not regress `/api/chat/jobs` or `/api/chat/events`.

This sprint adds a user-scoped control plane; it does not replace the conversation-native read model the transcript already uses for reload/recovery.

Anonymous users must continue to receive job visibility through chat-native transcript updates even though `/jobs` remains signed-in only.

Verify: `npx vitest run src/hooks/useGlobalChat.test.tsx tests/chat-route.test.ts tests/chat-stream-route.test.ts`

---

## Completion Checklist

- [ ] user-scoped repository methods added
- [ ] user-scoped jobs list/detail/event routes added
- [ ] auth and visibility rules enforced
- [ ] migrated anonymous jobs remain visible after sign-in
- [ ] conversation-scoped chat read paths still pass existing tests

## QA Deviations

- None yet.
