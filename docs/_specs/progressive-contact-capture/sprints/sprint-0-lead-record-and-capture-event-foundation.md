# Sprint 0 - Lead Record And Capture Event Foundation

> **Goal:** Introduce structured lead-record persistence and capture-event telemetry so progressive contact capture has a durable backend before any in-thread UI or trigger logic is added.
> **Spec ref:** `PCC-032` through `PCC-035`, `PCC-040` through `PCC-051`, `PCC-061` through `PCC-070`, `PCC-081` through `PCC-086`, `PCC-090` through `PCC-105`
> **Prerequisite:** None
> **Test count target:** 612 existing + 8 new = 620 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/message-parts.ts` | `MessagePart` currently supports only `text`, `tool_call`, `tool_result`, `attachment`, and `summary` |
| `src/core/entities/MessageFactory.ts` | `MessageFactory.createUserMessage(content, parts?)` and `createAssistantMessage(content = "", parts = [])` already centralize message creation |
| `src/frameworks/ui/MessageList.tsx` | `MessageList({ messages, isSending, dynamicSuggestions, ... })` renders rich message content but has no structured capture card state |
| `src/hooks/useGlobalChat.tsx` | `ChatContextType` currently exposes only `sendMessage(messageText, files?)`, conversation state, and archive/new-conversation controls |
| `src/hooks/chat/useChatSend.ts` | `useChatSend(...)` only submits free-text messages plus attachments through the stream runtime |
| `src/core/use-cases/ConversationEventRecorder.ts` | `record(conversationId, eventType, metadata = {})` already exists as the canonical telemetry sink |
| `src/lib/db/schema.ts` | `ensureSchema(db)` already owns additive SQLite migrations for conversation metadata and events |
| `src/adapters/UserFileDataMapper.test.ts` and `src/adapters/ConversationDataMapper.test.ts` | Existing mapper tests provide patterns for new SQLite-backed record types |
| `tests/chat-stream-route.test.ts` | Current stream-route tests cover persisted user message flow and attachment handling, which should remain separate from contact capture submission |

---

## Task 0.1 - Add a first-class lead-record domain model

**What:** Create explicit domain types for captured contact records rather than storing contact state as ad hoc metadata or message text.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/entities/lead-record.ts` |
| **Create** | `src/core/use-cases/LeadRecordRepository.ts` |
| **Spec** | `PCC-033`, `PCC-040` through `PCC-050`, `PCC-081` through `PCC-086` |

### Task 0.1 Notes

Use a small, persistence-friendly shape.

Recommended baseline:

```ts
export type LeadCaptureStatus = "not_started" | "triggered" | "submitted" | "dismissed";

export interface LeadRecord {
  id: string;
  conversationId: string;
  lane: "organization" | "individual" | "uncertain";
  name: string | null;
  email: string | null;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  problemSummary: string | null;
  recommendedNextAction: string | null;
  captureStatus: LeadCaptureStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}
```

Add repository methods for create/find/update status/upsert submission rather than a single generic save.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Add lead-record persistence to the SQLite schema and mapper layer

**What:** Create the durable storage layer for lead records and their capture status.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Create** | `src/adapters/LeadRecordDataMapper.ts` |
| **Create** | `src/adapters/LeadRecordDataMapper.test.ts` |
| **Spec** | `PCC-033`, `PCC-040` through `PCC-051`, `PCC-090` through `PCC-094` |

### Task 0.2 Notes

Add a dedicated `lead_records` table keyed independently from `conversations` with a foreign key back to `conversation_id`.

Expected columns:

1. `id`
2. `conversation_id`
3. `lane`
4. `name`
5. `email`
6. `organization`
7. `role_or_title`
8. `training_goal`
9. `problem_summary`
10. `recommended_next_action`
11. `capture_status`
12. `created_at`
13. `updated_at`
14. `submitted_at`

Add an index on `conversation_id` and one on `capture_status` for future founder views.

### Task 0.2 Verify

```bash
npx vitest run src/adapters/LeadRecordDataMapper.test.ts
```

---

## Task 0.3 - Add a lead-capture interactor and canonical event names

**What:** Introduce a narrow use-case layer for lead-record lifecycle changes and ensure capture telemetry runs through `ConversationEventRecorder`.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/LeadCaptureInteractor.ts` |
| **Create** | `src/core/use-cases/LeadCaptureInteractor.test.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `PCC-035`, `PCC-061` through `PCC-070`, `PCC-081` through `PCC-086` |

### Task 0.3 Notes

This sprint should support backend operations only. No UI prompt parts yet.

Recommended operations:

1. `markCaptureTriggered(conversationId, seedData)`
2. `submitCapture(conversationId, payload)`
3. `dismissCapture(conversationId)`

Canonical event names for Sprint 0:

1. `contact_capture_triggered`
2. `contact_capture_completed`
3. `contact_capture_dismissed`

`submitCapture(...)` should update the lead record and record the completion event. `dismissCapture(...)` must not create a fake submitted lead.

### Task 0.3 Verify

```bash
npx vitest run src/core/use-cases/LeadCaptureInteractor.test.ts src/adapters/ConversationEventDataMapper.test.ts
```

---

## Task 0.4 - Add a dedicated capture-submission API boundary

**What:** Create a non-stream API route for structured contact capture submissions so the chat stream remains focused on conversation exchange.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/api/chat/contact-capture/route.ts` |
| **Create** | `src/app/api/chat/contact-capture/route.test.ts` |
| **Spec** | `PCC-055`, `PCC-066` through `PCC-070`, `PCC-090` through `PCC-094` |

### Task 0.4 Notes

Keep the route narrow and server-validated.

Minimum responsibilities:

1. validate required fields such as `conversationId`, `name`, and `email`
2. route the payload through `LeadCaptureInteractor`
3. return a clean success payload suitable for future in-thread acknowledgement UI
4. reject malformed submissions without mutating lead state

Do not wire this route into `useChatSend()` or `MessageList` yet. Sprint 1 owns the in-thread prompt UI.

### Task 0.4 Verify

```bash
npx vitest run src/app/api/chat/contact-capture/route.test.ts
```

---

## Task 0.5 - Add regression coverage for lead persistence and telemetry

**What:** Lock the new backend contract before capture prompts are introduced in the message model.

| Item | Detail |
| --- | --- |
| **Modify** | `src/adapters/ConversationEventDataMapper.test.ts` |
| **Create or Modify** | `src/adapters/LeadRecordDataMapper.test.ts` |
| **Create or Modify** | `src/core/use-cases/LeadCaptureInteractor.test.ts` |
| **Create or Modify** | `src/app/api/chat/contact-capture/route.test.ts` |
| **Spec** | `PCC-100` through `PCC-105` |

### Task 0.5 Notes

Cover at minimum:

1. triggered capture creates or updates a lead record in `triggered` state
2. completed capture persists the structured fields and timestamp
3. dismissed capture records telemetry but does not create a submitted lead
4. malformed email or missing required fields return validation errors
5. the existing `/api/chat/stream` route stays unchanged in this sprint

### Task 0.5 Verify

```bash
npx vitest run src/adapters/LeadRecordDataMapper.test.ts src/core/use-cases/LeadCaptureInteractor.test.ts src/app/api/chat/contact-capture/route.test.ts tests/chat-stream-route.test.ts
```

---

## Task 0.6 - Record the backend-only boundary in the sprint artifact

**What:** Preserve any implementation-time decision about lead status names, nullable fields, or route shape so Sprint 1 can add prompt UI without rediscovering backend assumptions.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/progressive-contact-capture/sprints/sprint-0-lead-record-and-capture-event-foundation.md` |
| **Spec** | `PCC-052` through `PCC-070` |

### Task 0.6 Notes

If implementation remains backend-only as intended, `QA Deviations` should stay empty. If route shape or status naming changes, document it here explicitly.

### Task 0.6 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [ ] Lead records exist as first-class persisted objects separate from conversations
- [ ] Capture lifecycle statuses and timestamps are stored durably
- [ ] Contact-capture events use the canonical conversation-event recorder
- [ ] A dedicated submission API exists apart from the chat stream
- [ ] Focused tests cover persistence, eventing, and validation failures

## QA Deviations
