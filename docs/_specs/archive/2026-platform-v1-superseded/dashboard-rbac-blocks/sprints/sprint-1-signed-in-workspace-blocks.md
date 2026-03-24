# Sprint 1 - Signed-In Workspace Blocks

> **Goal:** Add the first useful signed-in dashboard blocks for personal workspace context so `/dashboard` immediately helps authenticated users without exposing founder-only operations.
> **Spec ref:** `DRB-033`, `DRB-035`, `DRB-040` through `DRB-045`, `DRB-072` through `DRB-077`, `DRB-081`, `DRB-086` through `DRB-088`
> **Prerequisite:** Sprint 0 complete
> **Test count target:** 649 existing + 9 new = 658 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/hooks/useGlobalChat.tsx` | `useGlobalChat()` already exposes `currentConversation`, `routingSnapshot`, `conversationId`, and chat actions, which makes it a viable client-side source for conversation-aware dashboard blocks |
| `src/hooks/chat/useChatConversationSession.ts` | The session layer already restores the active conversation and keeps `currentConversation` synchronized with restored messages |
| `src/core/use-cases/ConversationInteractor.ts` | The conversation domain already supports `getActiveForUser(userId)` and `list(userId)`, which makes it suitable for user-owned dashboard summaries |
| `src/app/api/conversations/active/route.ts` | The active-conversation API already returns both the `conversation` object and `messages` for the current user |
| `src/app/api/conversations/route.ts` | A conversations collection route already exists and should be preferred over inventing a second route for signed-in recent-conversation data if its response shape is compatible |
| `src/lib/dashboard/dashboard-blocks.ts` | Sprint 0 should provide the block registry and signed-in filtering contract that Sprint 1 consumes |
| `docs/_specs/progressive-contact-capture/spec.md` | Contact capture and future lead blocks explicitly depend on dashboard prioritization, so signed-in workspace blocks should preserve room for future pipeline views rather than collapsing everything into one card |

---

## Task 1.1 - Add dashboard data loaders for signed-in workspace blocks

**What:** Create server-owned block loaders for user-scoped workspace data instead of fetching everything directly inside React components.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Create** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Spec** | `DRB-034`, `DRB-060` through `DRB-064`, `DRB-072` through `DRB-077` |

### Task 1.1 Notes

Sprint 1 should start with signed-in-safe loaders only, for example:

1. `loadConversationWorkspaceBlock(user)`
2. `loadRecentConversationsBlock(user)`

These loaders should call existing interactors or routes rather than duplicate SQL.

Keep the loader output intentionally compact:

```ts
interface DashboardBlockPayload<TData> {
  blockId: DashboardBlockId;
  state: "ready" | "empty";
  data: TData;
}
```

### Task 1.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts
```

---

## Task 1.2 - Render the first signed-in workspace blocks on `/dashboard`

**What:** Replace the Sprint 0 placeholder cards with real blocks for active conversation context and recent user conversation history.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Create** | `src/components/dashboard/ConversationWorkspaceBlock.tsx` |
| **Create** | `src/components/dashboard/RecentConversationsBlock.tsx` |
| **Create** | supporting tests near the new components |
| **Spec** | `DRB-035`, `DRB-072` through `DRB-077`, `DRB-081`, `DRB-087` |

### Task 1.2 Notes

These blocks should be useful to authenticated users before any founder-only business intelligence ships.

Recommended behavior:

1. `ConversationWorkspaceBlock` summarizes active conversation status, lane when available, and a clear path back into chat
2. `RecentConversationsBlock` lists recent conversations with title, status, updated time, and link target

Do not pull founder/admin analytics into these blocks yet.

### Task 1.2 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 1.3 - Connect runtime context from chat/session state where useful

**What:** Let signed-in dashboard blocks consume current conversation context without making the dashboard itself a second chat state machine.

| Item | Detail |
| --- | --- |
| **Modify if needed** | `src/hooks/useGlobalChat.tsx` |
| **Modify if needed** | `src/hooks/chat/useChatConversationSession.ts` |
| **Modify** | dashboard block consumers or shared view-model helpers |
| **Spec** | `DRB-033`, `DRB-044`, `DRB-057`, `DRB-064` |

### Task 1.3 Notes

Only add client wiring if the signed-in workspace blocks genuinely need it.

Use the existing read-only shape:

```ts
currentConversation: Conversation | null;
routingSnapshot: ConversationRoutingSnapshot | null;
```

Do not add dashboard-specific mutation APIs to `useGlobalChat()`.

### Task 1.3 Verify

```bash
npx vitest run src/hooks/useGlobalChat.test.tsx
```

---

## Task 1.4 - Add signed-in dashboard regression coverage

**What:** Lock the behavior of the first real workspace blocks before admin-only blocks arrive in Sprint 2.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify or Create** | `src/components/dashboard/*.test.tsx` |
| **Spec** | `DRB-104`, `DRB-106`, `DRB-107` |

### Task 1.4 Notes

Cover at minimum:

1. authenticated users see workspace blocks but not admin blocks
2. workspace blocks show empty states truthfully when no current conversation or history exists
3. block payloads stay user-scoped and do not leak other users’ conversation metadata

### Task 1.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 1.5 - Record the signed-in workspace boundary

**What:** Preserve any implementation-time decision about how much chat/session state is reused and how user-owned blocks are shaped.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/sprints/sprint-1-signed-in-workspace-blocks.md` |
| **Spec** | `DRB-072` through `DRB-077`, `DRB-081` |

### Task 1.5 Notes

Document any of the following if they shift during implementation:

1. whether workspace blocks call existing `/api/conversations/*` routes or use server loaders directly
2. whether `useGlobalChat()` is consumed directly by dashboard blocks or only through page props/view models
3. any empty-state rules needed when a signed-in user has no conversations yet

### Task 1.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Signed-in dashboard blocks exist for active conversation context and recent conversations
- [x] User-scoped dashboard data is loaded through server-owned loader functions
- [x] Workspace blocks reuse existing conversation contracts rather than duplicating persistence logic
- [x] Authenticated users do not see founder/admin-only blocks
- [x] Focused tests cover loader behavior, workspace block rendering, and user scoping

## QA Deviations

- Workspace blocks use server-side loaders that call `ConversationInteractor` directly through the existing composition root rather than round-tripping through `/api/conversations/*` from the dashboard route.
- Sprint 1 did not add any dashboard-specific client state. The dashboard consumes server-loaded props, while `useGlobalChat()` remains available for later client refinements if a block genuinely needs live chat context.
- Because the product does not yet expose a dedicated per-conversation page, recent conversation items link back to the chat homepage (`/`) as the truthful re-entry point into the workspace.
