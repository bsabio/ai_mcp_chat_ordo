# Sprint 0 - Lane State And Event Foundation

> **Goal:** Introduce durable lane-routing state and event primitives in the conversation domain so later sprints can analyze, persist, and consume routing snapshots without treating lane logic as prompt-only text.
> **Spec ref:** `CLR-030` through `CLR-035`, `CLR-040` through `CLR-057`, `CLR-080` through `CLR-082`
> **Prerequisite:** None
> **Test count target:** 612 existing + 7 new = 619 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/conversation.ts` | `Conversation` currently contains persisted metadata such as `convertedFrom`, `messageCount`, `firstMessageAt`, `lastToolUsed`, `sessionSource`, and `promptVersion`, but no lane state |
| `src/core/use-cases/ConversationRepository.ts` | Current repository contract supports `create`, `findById`, `findActiveByUser`, `touch`, `incrementMessageCount`, `setLastToolUsed`, `setConvertedFrom`, and `transferOwnership`, but no routing update method |
| `src/core/use-cases/ConversationInteractor.ts` | `ConversationInteractor` already owns conversation lifecycle and uses optional `ConversationEventRecorder` for `started`, `message_sent`, `tool_used`, `archived`, and `converted` events |
| `src/core/use-cases/ConversationEventRecorder.ts` | `record(conversationId, eventType, metadata = {})` already provides the canonical conversation-event sink |
| `src/adapters/ConversationDataMapper.ts` | Maps `ConversationRow` from `conversations` into the domain entity and already handles additive metadata columns safely |
| `src/lib/db/schema.ts` | `ensureSchema(db)` already evolves the `conversations` table with additive `ALTER TABLE` columns and creates `conversation_events` indexes |
| `src/adapters/ConversationEventDataMapper.test.ts` | Existing mapper tests already cover event persistence and JSON metadata round-trip |
| `src/core/use-cases/ConversationInteractor.test.ts` | Existing tests already verify create, append, archive, ownership, and event recording patterns suitable for routing-state expansion |

---

## Task 0.1 - Add lane-routing types to the conversation domain

**What:** Create a stable, typed routing snapshot in the core domain so lane state stops living as an implied future field.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/entities/conversation.ts` |
| **Create** | `src/core/entities/conversation-routing.ts` |
| **Spec** | `CLR-030`, `CLR-031`, `CLR-040` through `CLR-051` |

### Task 0.1 Notes

Prefer a small, reusable routing type rather than scattering string unions across repositories and tests.

Use a shape close to:

```ts
export type ConversationLane = "organization" | "individual" | "uncertain";

export interface ConversationRoutingSnapshot {
  lane: ConversationLane;
  confidence: number | null;
  recommendedNextStep: string | null;
  detectedNeedSummary: string | null;
  lastAnalyzedAt: string | null;
}
```

Then expose that snapshot on `Conversation` as either embedded fields or a nested property. Keep the shape serialization-friendly for SQLite mapper work.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Persist routing snapshot columns in the conversation store

**What:** Extend the conversation persistence layer to store the durable routing snapshot directly in the current persistence flow.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Modify** | `src/core/use-cases/ConversationRepository.ts` |
| **Modify** | `src/adapters/ConversationDataMapper.ts` |
| **Spec** | `CLR-034`, `CLR-044` through `CLR-051` |

### Task 0.2 Notes

For Sprint 0, prefer additive columns on `conversations` over a second profile table unless the mapper becomes materially simpler with a separate row.

Expected persisted fields:

1. `lane`
2. `lane_confidence`
3. `recommended_next_step`
4. `detected_need_summary`
5. `lane_last_analyzed_at`

Add one repository method that updates the routing snapshot atomically, for example:

```ts
updateRoutingSnapshot(
  id: string,
  snapshot: ConversationRoutingSnapshot,
): Promise<void>;
```

Keep creation defaults safe. Newly created conversations should begin in `uncertain` state with null supporting fields.

### Task 0.2 Verify

```bash
npx vitest run src/adapters/ConversationDataMapper.test.ts
```

---

## Task 0.3 - Add conversation-interactor support for routing snapshot updates

**What:** Introduce a narrow interactor operation that lets later stream analysis persist routing updates through the conversation domain instead of calling data mappers directly.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/ConversationInteractor.ts` |
| **Modify** | `src/core/use-cases/ConversationInteractor.test.ts` |
| **Spec** | `CLR-030`, `CLR-033`, `CLR-034`, `CLR-052` through `CLR-057` |

### Task 0.3 Notes

Add one dedicated method rather than overloading `appendMessage`:

```ts
async updateRoutingSnapshot(
  conversationId: string,
  userId: string,
  snapshot: ConversationRoutingSnapshot,
): Promise<void>
```

The method should:

1. enforce conversation ownership like other interactor methods
2. persist the snapshot through the repository
3. record at least `lane_analyzed`
4. record `lane_changed` when the prior lane differs from the new lane
5. optionally record `lane_uncertain` when the snapshot lands in uncertain state

Do not run actual analysis logic in this sprint. This is infrastructure only.

### Task 0.3 Verify

```bash
npx vitest run src/core/use-cases/ConversationInteractor.test.ts src/adapters/ConversationEventDataMapper.test.ts
```

---

## Task 0.4 - Add focused routing-state regression coverage

**What:** Add tests that lock the new routing snapshot contract before Sprint 1 wires it into the chat stream lifecycle.

| Item | Detail |
| --- | --- |
| **Modify** | `src/adapters/ConversationDataMapper.test.ts` |
| **Modify** | `src/core/use-cases/ConversationInteractor.test.ts` |
| **Modify** | `tests/conversation-analytics.test.ts` |
| **Spec** | `CLR-080` through `CLR-082` |

### Task 0.4 Notes

Cover at minimum:

1. new conversations default to `uncertain`
2. mapper round-trips routing snapshot fields correctly
3. `updateRoutingSnapshot()` emits `lane_analyzed`
4. lane transitions emit `lane_changed`
5. analytics-friendly seed rows can include the new lane fields without breaking current conversation inspection flows

This sprint does not need stream-route tests yet because the route should not invoke lane analysis until Sprint 1.

### Task 0.4 Verify

```bash
npx vitest run src/adapters/ConversationDataMapper.test.ts src/core/use-cases/ConversationInteractor.test.ts tests/conversation-analytics.test.ts
```

---

## Task 0.5 - Record the routing-foundation boundary in the sprint artifact

**What:** Preserve any implementation-time choice about column names, confidence representation, or event naming so Sprint 1 stream integration stays aligned.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/conversation-lane-routing/sprints/sprint-0-lane-state-and-event-foundation.md` |
| **Spec** | `CLR-034`, `CLR-035`, `CLR-052` through `CLR-057` |

### Task 0.5 Notes

If implementation matches the spec, leave `QA Deviations` empty. If event naming or column naming shifts to fit repo conventions, document it explicitly here.

### Task 0.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Conversation domain exposes a typed routing snapshot
- [x] Conversation persistence stores lane, confidence, next step, summary, and analyzed timestamp
- [x] ConversationInteractor can update routing state without direct mapper access
- [x] Lane-analysis and lane-change events are recorded through the canonical event recorder
- [x] Focused tests cover mapper round-trip and interactor event behavior

## QA Deviations

None.
