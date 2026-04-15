# Sprint 2 - Client Consumers And Founder Visibility

> **Goal:** Expose durable lane-routing state to chat-adjacent client consumers, contact-capture flows, and founder analytics surfaces without requiring transcript replay.
> **Spec ref:** `CLR-033`, `CLR-035`, `CLR-068` through `CLR-071`, `CLR-080` through `CLR-084`
> **Prerequisite:** Sprint 1 complete
> **Test count target:** 626 existing + 8 new = 634 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/api/conversations/active/route.ts` | The active-conversation route already returns the full `conversation` object and `messages`, which means lane-routing state can be exposed to the client without rebuilding it from the transcript |
| `src/hooks/chat/useChatConversationSession.ts` | Current chat session state only tracks `conversationId`, loading state, and archive/new-conversation controls; it does not retain conversation metadata for client consumers |
| `src/hooks/useGlobalChat.tsx` | `ChatContextType` still exposes only messages, send/archive controls, and `conversationId`, so future lane-aware UX cannot read routing state directly |
| `src/core/entities/conversation.ts` | The domain `Conversation` object already includes `routingSnapshot`, so the missing work is exposure and consumption rather than new persistence |
| `mcp/analytics-tool.ts` | The analytics tool already reads `SELECT * FROM conversations` and can inspect lane fields, but current metrics do not summarize route mix, uncertain share, or lane-change behavior |
| `tests/conversation-analytics.test.ts` | Existing analytics tests already seed lane metadata and verify conversation inspection, which makes them a good base for lane-summary reporting |
| `docs/_specs/progressive-contact-capture/spec.md` | Contact capture explicitly depends on lane-aware field selection and trigger timing, so Sprint 2 should expose a reusable routing contract rather than duplicating routing heuristics inside capture work |
| `tests/chat-stream-route.test.ts` and `src/lib/chat/routing-analysis.test.ts` | Sprint 1 already verifies server-owned routing analysis and prompt context, so Sprint 2 can focus on consumer-facing access rather than re-testing classification internals |

---

## Task 2.1 - Expose routing snapshot through the chat session contract

**What:** Promote the active conversation object, or at minimum its routing snapshot, into the client chat session layer so future UI can react to lane state without re-fetching or replaying transcripts.

| Item | Detail |
| --- | --- |
| **Modify** | `src/hooks/chat/useChatConversationSession.ts` |
| **Modify** | `src/hooks/useGlobalChat.tsx` |
| **Modify** | `src/app/api/conversations/active/route.ts` if response shaping needs to be clarified |
| **Spec** | `CLR-068`, `CLR-069`, `CLR-070` |

### Task 2.1 Notes

Sprint 2 should give client code a stable read-only view of routing state.

Acceptable shapes include:

```ts
interface ChatContextType {
  currentConversation: Conversation | null;
  routingSnapshot: ConversationRoutingSnapshot | null;
}
```

or a narrower derived selector if exposing the full conversation object creates unnecessary churn.

The client should remain unable to mutate lane state directly. Editing stays server-owned.

### Task 2.1 Verify

```bash
npx vitest run src/app/api/conversations/active/route.test.ts
```

---

## Task 2.2 - Add a reusable lane-consumption contract for contact capture

**What:** Define and implement the routing selectors that contact-capture work will consume so lane-aware capture fields do not duplicate heuristics or query transcripts directly.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/chat/routing-consumers.ts` or equivalent |
| **Modify** | `src/core/entities/conversation-routing.ts` if derived helper types are needed |
| **Reference** | `docs/_specs/progressive-contact-capture/spec.md` |
| **Spec** | `CLR-069`, `CLR-070`, `CLR-071` |

### Task 2.2 Notes

This sprint does not need to implement the contact-capture UI itself. It should define reusable server/client helpers such as:

1. `isHighConfidenceLane(snapshot)`
2. `getLaneRecommendedNextStep(snapshot)`
3. `getContactCaptureFieldProfile(snapshot)` returning organization vs individual field recommendations

The aim is to make Progressive Contact Capture Sprint 1 consume a stable lane contract instead of re-deriving state from prompt text.

If `training_path_recommended` becomes necessary here to express individual follow-up direction, record it as an additive event or derived field rather than mutating the primary lane model.

### Task 2.2 Verify

```bash
npx vitest run src/lib/chat/routing-consumers.test.ts
```

---

## Task 2.3 - Extend analytics and inspection for founder visibility

**What:** Promote lane-routing state from raw inspectable fields into founder-usable reporting so the repo can answer what share of conversations are organizational, individual, uncertain, or frequently changing lanes.

| Item | Detail |
| --- | --- |
| **Modify** | `mcp/analytics-tool.ts` |
| **Modify** | `tests/conversation-analytics.test.ts` |
| **Spec** | `CLR-033`, `CLR-035`, `CLR-071`, `CLR-082`, `CLR-084` |

### Task 2.3 Notes

Add lane-aware reporting without requiring transcript replay.

Useful additions include:

1. lane distribution counts in overview output
2. uncertain share for the selected time range
3. counts of `lane_changed` and `lane_uncertain` events
4. a top-level list of recently analyzed or recently changed conversations for inspection

If adding a whole new analytics metric is too much surface area, enrich existing `overview` and `conversation_inspect` outputs first and defer a dedicated lane metric to later tooling work.

### Task 2.3 Verify

```bash
npx vitest run tests/conversation-analytics.test.ts
```

---

## Task 2.4 - Add lane-aware client and API regression coverage

**What:** Lock the new consumer contract so future UI work can read lane state safely and analytics changes remain founder-usable.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/conversations/active/route.test.ts` |
| **Modify or Create** | `src/hooks/chat/useChatConversationSession.test.tsx` or `src/hooks/useGlobalChat.test.tsx` |
| **Modify** | `tests/conversation-analytics.test.ts` |
| **Create** | `src/lib/chat/routing-consumers.test.ts` |
| **Spec** | `CLR-080` through `CLR-084` |

### Task 2.4 Notes

Cover at minimum:

1. active conversation responses include routing snapshot fields without transcript replay
2. chat context exposes the current routing snapshot to future consumers
3. contact-capture field-profile helpers distinguish organization vs individual lanes
4. analytics surfaces lane mix and uncertainty counts correctly
5. lane-change events remain queryable for founder review

This sprint still does not need mutable UI controls for lane overrides.

### Task 2.4 Verify

```bash
npx vitest run src/app/api/conversations/active/route.test.ts src/lib/chat/routing-consumers.test.ts tests/conversation-analytics.test.ts
```

---

## Task 2.5 - Record the consumer boundary in the sprint artifact

**What:** Preserve any implementation-time decision about client exposure shape, analytics output shape, or contact-capture helper names so downstream work consumes a stable contract.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/conversation-lane-routing/sprints/sprint-2-client-consumers-and-founder-visibility.md` |
| **Spec** | `CLR-068` through `CLR-071` |

### Task 2.5 Notes

Document any of the following if they shift during implementation:

1. whether the client receives `currentConversation` or only `routingSnapshot`
2. whether lane-aware analytics land in `overview` or a dedicated metric
3. any helper names shared with Progressive Contact Capture Sprint 1
4. whether founder-facing review relies entirely on analytics-tool output or needs a dedicated route later

### Task 2.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Chat session and context expose current lane-routing state to client consumers
- [x] Shared lane-consumption helpers exist for contact-capture and related UI work
- [x] Founder-facing analytics report lane mix, uncertainty, and change behavior without transcript replay
- [x] Focused tests cover client exposure, helper behavior, and lane-aware analytics output
- [x] Sprint 2 leaves lane mutation server-owned and avoids client override controls

## QA Deviations

None.

Implementation notes:

- The client now receives both `currentConversation` and the derived `routingSnapshot` through `useGlobalChat()`, while lane mutation remains server-owned.
- Shared consumer helpers live in `src/lib/chat/routing-consumers.ts` so Progressive Contact Capture can reuse lane confidence and field-profile logic instead of re-deriving routing rules.
- Founder-facing lane visibility landed by enriching the existing analytics `overview` and `conversation_inspect` outputs rather than creating a new dedicated analytics metric in this sprint.
