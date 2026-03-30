# Sprint 3 — Push Notifications And Hardening

> **Goal:** Add browser push notification delivery and harden cancellation, retry, reconnect, and terminal-state behavior for the deferred job system.
> **Spec Sections:** `DJO-028`, `DJO-040` through `DJO-050`
> **Prerequisite:** Sprint 2 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| Existing authenticated chat/session model | Push notification subscriptions must follow the current authenticated-user boundary rather than introducing anonymous device ownership assumptions. |
| Durable job event stream from Sprint 1 | Push should be emitted from durable terminal events, not from ad hoc tool code. |
| Job-status chat UI from Sprint 2 | Retry/cancel actions already have a visible home in the chat surface and should be hardened here rather than split into a separate control plane. |

---

## Tasks

### 1. Add push subscription and delivery plumbing

Introduce browser push subscription persistence and delivery policies derived from job terminal events.

This sprint must define the canonical persistence contract for push subscriptions, including:

- authenticated user ownership
- subscribe/unsubscribe lifecycle
- revocation behavior
- minimal payload rules for terminal job events

Initial notification policy should cover:

- completion
- failure
- explicit action-required terminal states

Verify: add focused tests such as `tests/deferred-job-notifications.test.ts` and run `npx vitest run tests/deferred-job-notifications.test.ts tests/chat-validation.test.ts`

### 2. Harden retry and cancellation semantics

Implement safe retry/cancel behavior for retryable deferred tools and ensure workers observe cancellation cooperatively.

Verify: `npx vitest run tests/deferred-job-worker.test.ts tests/deferred-job-notifications.test.ts tests/deferred-job-ui.test.tsx src/frameworks/ui/useChatSurfaceState.test.tsx`

### 3. Add reconnect and mobile hardening

Ensure the UI can:

- reconnect to the event stream
- rebuild visible state from durable events
- show terminal job outcomes after reload or push-opened app launch

Verify: add focused tests such as `tests/deferred-job-reconnect.test.tsx` and run `npx vitest run tests/deferred-job-reconnect.test.tsx tests/deferred-job-notifications.test.ts tests/browser-support.test.ts`

---

## Completion Checklist

- [x] push delivery added
- [x] push subscription persistence contract added
- [x] retry/cancel semantics hardened
- [x] reconnect recovery verified
- [x] focused tests pass

## QA Deviations

- The implementation added an explicit authenticated profile toggle plus VAPID setup helper and README guidance so push can be managed and deployed as a complete feature, not only as backend plumbing.
