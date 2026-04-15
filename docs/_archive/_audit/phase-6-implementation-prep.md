# Phase 6 Implementation Prep — Client Runtime Cleanup

Status: Ready for implementation
Date: 2026-04-09
Prereqs: Phases 0–5 complete and green (2997 tests, lint, build all pass)

---

## 1. Objective

Remove the heaviest client-side architectural liabilities now that the server/runtime contract is stable:

- Replace synchronous send-time DOM cloning with a background current-page memento
- Decompose `useGlobalChat` into smaller state, actions, session, and event concerns
- Preserve chat continuity across navigation where the product requires it

This phase resolves audit items 01–06:
- 01: Ghost DOM race condition (pathname updates before DOM)
- 02: Evaporating text selections (mousedown collapses selection before capture)
- 03: Portal/modal blindspots (portals live outside `<main>`)
- 04: Hard refresh vulnerability (legacy `<a>` tags destroy chat state)
- 05: Synchronous DOM cloning stutter (cloneNode blocks main thread at send time)
- 06: Shadow DOM selection blindness (getSelection can't penetrate shadow roots)

---

## 2. Current State

### Snapshot Pipeline (`src/lib/chat/collect-current-page-snapshot.ts` — 79 lines)

- `collectCurrentPageSnapshot(currentPathname)` is called **synchronously** inside `sendMessage` and `retryFailedMessage` in `useChatSend.ts`
- Uses `cloneNode(true)` on the content root to deep-copy the entire DOM subtree
- Strips excluded elements (`nav`, `footer`, `[data-chat-container-mode]`, etc.) from the clone
- Collects headings, selected text, and content excerpt from the stripped clone
- Returns a `CurrentPageSnapshot` passed as normalization input

**Problems:**
1. `cloneNode(true)` is synchronous and can exceed 50–100ms on content-heavy pages (audit 05)
2. `usePathname()` updates instantly on soft navigation while DOM lags behind — snapshot captures stale DOM with new pathname (audit 01)
3. `window.getSelection()` collapses when the user mousedowns on the Send button — selected text is lost by the time `collectSelectedText()` fires (audit 02)
4. Content root selector (`main[data-shell-main-surface]`) misses React portals (`[role="dialog"]`, Radix overlays) mounted at `document.body` (audit 03)
5. `cloneNode` does not traverse shadow DOM boundaries (audit 06)

### Context Types (`src/lib/chat/current-page-context.ts` — 141 lines)

- Defines `CurrentPageSnapshot` and `CurrentPageDetails` interfaces
- `normalizeCurrentPageSnapshot()` — sanitizes and truncates all fields (title 200, heading 200, excerpt 1600 chars)
- `resolveCurrentPageDetails()` — hydrates route labels from `SHELL_ROUTES`
- `formatCurrentPagePromptContext()` — formats snapshot as LLM-readable prompt block
- 3 tests in `current-page-context.test.ts` covering sanitization, normalization, and prompt formatting

**This file is stable and well-contracted. Sprint 6.1 changes the producer, not the consumer.**

### Send Hook (`src/hooks/chat/useChatSend.ts` — 348 lines)

- `sendMessage` callback: validate → upload attachments → **collect snapshot** → prepare optimistic messages → run stream → refresh conversation
- `retryFailedMessage` callback: validate → **collect snapshot** → prepare retry send → run stream → refresh
- Both call `collectCurrentPageSnapshot(currentPathname)` inline before stream runs
- `inFlightRef` mutex prevents concurrent sends
- 488-line test file with comprehensive coverage (mocks `collectCurrentPageSnapshot`)

### Global Chat Provider (`src/hooks/useGlobalChat.tsx` — 215 lines)

- Root `ChatProvider` component wrapping the entire app (in `src/app/layout.tsx`)
- Composes 7 concerns into one oversized provider:
  1. **Message state** — `useReducer(chatReducer, ...)` for messages + dispatch
  2. **Referral context** — `useState` + `useEffect` fetching `/api/referral/visit`
  3. **Failed send recovery** — `useRef(Map)` + `useEffect` hydrating from messages
  4. **Conversation session** — `useChatConversationSession()` hook
  5. **Send orchestration** — `useChatSend()` hook
  6. **Job events** — `useChatJobEvents()` hook
  7. **Bootstrap messages** — `useEffect` refreshing greeting on role change
- Also calls `useChatPushNotifications(initialRole)` as a side-effect-only hook
- Exposes `ChatContextType` with 13 fields to consumers
- 1315-line integration test suite

**State tally: 7× useState/useReducer, 2× useRef, 6× useCallback, 4× useEffect**

### Conversation Session (`src/hooks/chat/useChatConversationSession.ts` — 71 lines)

- Manages `conversationId`, `currentConversation`, `isLoadingMessages` state
- Delegates initial restore to `useChatRestore` hook (87 lines)
- `refreshConversation()` loads conversation + messages from API
- Race condition guard for newly-created conversations
- No dedicated test file — integration tested via `useGlobalChat.test.tsx`

### Job Events (`src/hooks/chat/useChatJobEvents.ts` — 142 lines)

- SSE subscription to `/api/chat/events?conversationId=...`
- Job snapshot reconciliation on mount, error, focus, and visibility change
- Best-effort pattern — failures don't interrupt chat
- 86-line test file

### Chat State (`src/hooks/chat/chatState.ts` — 305 lines)

- `chatReducer` handling 8 action types (REPLACE_ALL, APPEND_TEXT, APPEND_TOOL_CALL, APPEND_TOOL_RESULT, UPSERT_JOB_STATUS, UPSERT_GENERATION_STATUS, SET_FAILED_SEND, SET_ERROR)
- `createInitialChatMessages(role, prompts, referralCtx)` — bootstrap greeting factory
- `CHAT_BOOTSTRAP_COPY` — 5 role-specific greeting variants
- Helper functions for message mutation (updateMessageAtIndex, appendPart, etc.)
- 79-line test file covering reducer actions

### Chat Hooks Directory (`src/hooks/chat/` — 32 files)

| File | Lines | Purpose | Has Tests |
|---|---|---|---|
| chatAttachmentApi.ts | — | File upload/cleanup API | ✗ |
| chatBootstrap.ts | — | Referral context + bootstrap logic | ✓ (85 lines) |
| chatConversationApi.ts | — | Conversation persistence API | ✓ (236 lines) |
| chatFailedSendRecovery.ts | — | Retry payload hydration | ✗ |
| chatRequest.ts | — | Request object construction | ✗ |
| chatSendPolicy.ts | — | Validation + send preparation | ✓ |
| chatState.ts | 305 | Reducer + bootstrap | ✓ (79 lines) |
| chatStreamAdapter.ts | — | Stream protocol adapter | ✗ |
| chatStreamDispatch.ts | — | Stream event dispatch mapper | ✓ |
| chatStreamProcessor.ts | — | SSE event processor | ✓ |
| chatStreamRunner.ts | — | Stream execution orchestrator | ✓ |
| chatStreamTextBuffer.ts | — | Text delta batching | ✓ |
| useChatComposerController.ts | — | Composer UI state | ✓ |
| useChatComposerState.ts | — | Composer input state | ✓ |
| useChatConversationSession.ts | 71 | Conversation lifecycle | ✗ |
| useChatJobEvents.ts | 142 | Job event SSE | ✓ (86 lines) |
| useChatRestore.ts | 87 | Initial restoration | ✗ |
| useChatSend.ts | 348 | Message send orchestration | ✓ (488 lines) |
| useChatStreamRuntime.ts | — | Stream runtime wrapper | ✓ (349 lines) |

### Consumers of `useGlobalChat`

- `src/frameworks/ui/useChatSurfaceState.tsx` — main consumer for chat UI composition
- `src/app/layout.tsx` — wraps `ChatProvider` at root
- 6+ test files import or mock `ChatProvider`/`useGlobalChat`

---

## 3. Sprint 6.1 — Background Current-Page Snapshot Pipeline

### Design: Background Snapshot Memento

Replace the synchronous inline `collectCurrentPageSnapshot()` call with a background-maintained memento that is always ready when send fires.

**New module: `src/lib/chat/CurrentPageMemento.ts`**

```typescript
export interface CurrentPageMemento {
  /** Read the latest cached snapshot. Never blocks. */
  getSnapshot(): CurrentPageSnapshot | undefined;
  /** Start observing. Call once on mount. */
  start(): void;
  /** Stop observing. Call on unmount. */
  stop(): void;
}
```

**Observation strategy:**
1. On route change (`pathname` update from Next.js), schedule a snapshot capture after a short debounce (~150ms) via `requestIdleCallback` or `requestAnimationFrame` to let DOM settle
2. On `MutationObserver` detecting subtree changes within the content root, re-debounce and re-capture
3. On `selectionchange` event, cache the latest non-collapsed selection text in a separate ref so it survives mousedown on Send
4. Snapshot is always available synchronously via `getSnapshot()` — never blocks the send path

**Selection preservation (audit 02 fix):**
- Listen to `document.addEventListener('selectionchange', ...)` globally
- Cache the last non-collapsed, non-chat-container selection text
- On `getSnapshot()`, inject the cached selection rather than calling `window.getSelection()` at send time

**Portal capture (audit 03 fix):**
- After cloning the content root, also capture `textContent` from active portals (`[role="dialog"]`, `[data-radix-popper-content-wrapper]`) excluding chat containers
- Append portal text to the snapshot's `contentExcerpt` field (with a `[Active Dialog]` prefix)

**Race condition fix (audit 01):**
- The memento observes DOM mutations, so by the time the user types and sends, the snapshot reflects the settled DOM
- If a route transition is actively pending (DOM not yet matching pathname), the memento's internal `pathname` only updates once the corresponding DOM content has been observed

**Shadow DOM (audit 06):**
- Deferred to future iteration — shadow DOM is not currently used in the app's content areas
- The architecture supports adding a recursive shadow traversal to the observer later

### New Hook: `useCurrentPageMemento`

Location: `src/hooks/chat/useCurrentPageMemento.ts`

```typescript
export function useCurrentPageMemento(currentPathname: string): CurrentPageMemento;
```

- Creates and manages the memento lifecycle (start/stop) tied to component mount
- Passes the memento reference to `useChatSend` instead of calling `collectCurrentPageSnapshot` inline

### Send Path Changes

In `useChatSend.ts`, both `sendMessage` and `retryFailedMessage` change from:
```typescript
const currentPageSnapshot = collectCurrentPageSnapshot(currentPathname);
```
to:
```typescript
const currentPageSnapshot = memento.getSnapshot();
```

The send path becomes fully non-blocking.

### Files to Create

| File | Purpose |
|---|---|
| `src/lib/chat/CurrentPageMemento.ts` | Background snapshot observer and cache |
| `src/hooks/chat/useCurrentPageMemento.ts` | React lifecycle wrapper for the memento |

### Files to Change

| File | Change |
|---|---|
| `src/hooks/chat/useChatSend.ts` | Accept memento instead of calling `collectCurrentPageSnapshot` inline |
| `src/hooks/useGlobalChat.tsx` | Instantiate `useCurrentPageMemento` and pass to `useChatSend` |
| `src/lib/chat/collect-current-page-snapshot.ts` | Refactor internals for reuse by memento (extract text collection from clone logic) |

### Tests to Extend

| File | What to Verify |
|---|---|
| `src/hooks/chat/useChatSend.test.tsx` | Send uses memento.getSnapshot() instead of synchronous collect; null snapshot handled gracefully |
| `src/hooks/useGlobalChat.test.tsx` | Provider creates and passes memento correctly |
| `src/lib/chat/current-page-context.test.ts` | Add portal content normalization tests |

### Tests to Add

| File | What to Cover |
|---|---|
| `src/lib/chat/CurrentPageMemento.test.ts` | Background observation lifecycle, debounced updates, selection caching, portal capture, null/missing DOM safety, start/stop cleanup |
| `src/hooks/chat/useCurrentPageMemento.test.tsx` | Hook lifecycle (start on mount, stop on unmount), pathname change triggers re-observation |
| `src/lib/chat/collect-current-page-snapshot.test.ts` | Direct unit tests for DOM text extraction (moved from integration-only coverage) |

### Acceptance Criteria

- [ ] Sending no longer performs synchronous full-content DOM cloning at the send boundary
- [ ] Null snapshots, missing portals, and absent shadow content do not crash the send path
- [ ] Useful page context remains available to the runtime (same `CurrentPageSnapshot` contract)
- [ ] Route changes during send do not leak stale snapshots into later turns
- [ ] Selected text survives mousedown on the Send button (selectionchange cache)
- [ ] Active dialog/portal text is captured in the snapshot
- [ ] Existing `useChatSend.test.tsx` and `useGlobalChat.test.tsx` suites still pass

---

## 4. Sprint 6.2 — `useGlobalChat` Decomposition

### Design: Extract Concerns into Dedicated Hooks

The current `useGlobalChat.tsx` (215 lines, 7 useState, 2 useRef, 6 useCallback, 4 useEffect) manages five separable concerns. Extract each into a focused hook while preserving the existing `ChatContextType` contract.

### Extraction Plan

#### 1. `useReferralContext` (extracted from lines 124–140)

Location: `src/hooks/chat/useReferralContext.ts`

```typescript
export function useReferralContext(
  initialRole: RoleName,
): ReferralContext | undefined;
```

- Owns the `/api/referral/visit` fetch + `referralResolved` ref
- Only fetches for ANONYMOUS role
- Returns `ReferralContext | undefined`
- Pure side-effect hook — no render output

#### 2. `useFailedSendRecovery` (extracted from lines 80–104)

Location: `src/hooks/chat/useFailedSendRecovery.ts`

```typescript
export function useFailedSendRecovery(
  messages: ChatMessage[],
): {
  getFailedSend: (retryKey: string) => FailedSendPayload | undefined;
  registerFailedSend: (payload: FailedSendPayload) => void;
  clearFailedSend: (retryKey: string) => void;
};
```

- Owns the `failedSendsRef` Map and hydration effect
- Re-hydrates from messages on every message state change
- Preserves `taskOriginHandoff` from existing entries
- Returns the same three callbacks `useChatSend` already consumes

#### 3. `useBootstrapMessages` (extracted from lines 162–189)

Location: `src/hooks/chat/useBootstrapMessages.ts`

```typescript
export function useBootstrapMessages(options: {
  messages: ChatMessage[];
  initialRole: RoleName;
  conversationId: string | null;
  currentConversation: Conversation | null;
  isLoadingMessages: boolean;
  isSending: boolean;
  prompts: InstancePrompts;
  referralCtx: ReferralContext | undefined;
  dispatch: Dispatch<ChatAction>;
}): void;
```

- Owns the `bootstrapRoleRef` and the `shouldRefreshBootstrapMessages` effect
- Dispatches `REPLACE_ALL` when role changes require a greeting refresh
- Pure side-effect hook — no return value

#### 4. Slim `ChatProvider` (what remains)

After extraction, `useGlobalChat.tsx` becomes a thin composition shell:

```typescript
export function ChatProvider({ children, initialRole }) {
  const currentPathname = usePathname();
  const prompts = useInstancePrompts();
  const referralCtx = useReferralContext(initialRole);
  const [messages, dispatch] = useReducer(chatReducer, initialRole, ...);
  const [isSending, setIsSending] = useState(false);
  const failedSends = useFailedSendRecovery(messages);
  const session = useChatConversationSession({ dispatch });
  const memento = useCurrentPageMemento(currentPathname);  // from Sprint 6.1
  const send = useChatSend({ ...session, ...failedSends, memento, dispatch, ... });
  useChatJobEvents({ conversationId: session.conversationId, dispatch });
  useChatPushNotifications(initialRole);
  useBootstrapMessages({ messages, initialRole, ...session, isSending, prompts, referralCtx, dispatch });

  return <ChatContext.Provider value={...}>{children}</ChatContext.Provider>;
}
```

Target: ~80–100 lines (down from 215), pure composition with no inline logic.

### Files to Create

| File | Purpose |
|---|---|
| `src/hooks/chat/useReferralContext.ts` | Referral visit fetch hook |
| `src/hooks/chat/useFailedSendRecovery.ts` | Failed send map lifecycle hook |
| `src/hooks/chat/useBootstrapMessages.ts` | Bootstrap greeting refresh hook |

### Files to Change

| File | Change |
|---|---|
| `src/hooks/useGlobalChat.tsx` | Replace inline logic with extracted hook calls; slim to composition shell |
| `src/hooks/chat/useChatSend.ts` | Accept memento via options (from Sprint 6.1) instead of importing `collectCurrentPageSnapshot` |

### Tests to Extend

| File | What to Verify |
|---|---|
| `src/hooks/useGlobalChat.test.tsx` | All existing behaviors preserved after decomposition; provider still exposes same ChatContextType |
| `src/hooks/chat/useChatSend.test.tsx` | Send/retry flow unchanged with new memento injection |
| `src/hooks/chat/useChatJobEvents.test.tsx` | Job events still work with slimmed provider |
| `src/hooks/chat/chatBootstrap.test.ts` | Bootstrap logic still exercised via new hook |
| `src/hooks/chat/chatConversationApi.test.ts` | Conversation API still works with session hook |

### Tests to Add

| File | What to Cover |
|---|---|
| `src/hooks/chat/useReferralContext.test.tsx` | Fetch for ANONYMOUS, skip for other roles, error handling, single-fire guard |
| `src/hooks/chat/useFailedSendRecovery.test.tsx` | Hydration from messages, taskOriginHandoff preservation, get/register/clear lifecycle |
| `src/hooks/chat/useBootstrapMessages.test.tsx` | Role change triggers refresh, no-op when conditions not met, dispatch called with correct messages |

### Acceptance Criteria

- [ ] Bootstrap, restore, retry, deferred-job, and routing-snapshot behaviors are preserved
- [ ] No user-visible chat behavior regresses as provider responsibilities are split
- [ ] Navigation continuity remains intact where the product depends on it
- [ ] `ChatProvider` is under 100 lines and contains no inline business logic
- [ ] Each extracted hook has direct unit test coverage
- [ ] Architecture tests can assert state orchestration is no longer concentrated in one oversized provider
- [ ] Existing `useGlobalChat.test.tsx` integration suite still passes

---

## 5. Hard Test Requirements (from Strategic Plan)

### Positive Tests

- Current-page context remains available without synchronous send-time DOM cloning
- Chat behavior is preserved after provider decomposition
- Selected text survives the Send button interaction
- Portal/dialog content appears in snapshot

### Negative Tests

- Sending does not lose selection or snapshot state
- Internal navigation does not tear down chat continuity where continuity is required
- Null memento snapshot does not crash or corrupt the send path

### Edge Tests

- Rapid route change during send — snapshot reflects settled DOM, not transitional state
- Null snapshots — memento created but no content root found
- Portal absence — no active dialogs, snapshot is clean
- Shadow-content absence — no shadow DOM hosts, no crash
- Concurrent mount/unmount — memento start/stop lifecycle is clean
- Role change during active conversation — bootstrap refresh fires correctly

---

## 6. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Breaking existing send flow | `useChatSend.test.tsx` (488 lines) locks the entire send/retry/stop contract. Run before/after. |
| Breaking chat UI integration | `useGlobalChat.test.tsx` (1315 lines) locks provider behavior. All existing tests must pass. |
| Memento producing stale snapshots | Debounce window is short (150ms). MutationObserver catches DOM updates. Test with simulated route transitions. |
| Selection cache leaking across conversations | Clear cached selection on conversation change and route change. |
| Decomposition changing ChatContextType | The context interface does not change. Only internal composition changes. Consumer code (`useChatSurfaceState.tsx`, tests) is unaffected. |
| Portal capture including chat container content | Exclusion selector already handles `[data-chat-container-mode]` and `[data-chat-floating-shell]`. Extend to portal context. |
| Regression in job event reconciliation | `useChatJobEvents.test.tsx` locks SSE subscription + reconciliation behavior. |

---

## 7. Implementation Order

### Sprint 6.1 (Background Snapshot Pipeline)

1. Create `CurrentPageMemento` type and background observer in `src/lib/chat/CurrentPageMemento.ts`
2. Add `CurrentPageMemento.test.ts` — observation lifecycle, debounce, selection caching, portal capture, null safety
3. Create `useCurrentPageMemento` hook in `src/hooks/chat/useCurrentPageMemento.ts`
4. Add `useCurrentPageMemento.test.tsx` — mount/unmount lifecycle, pathname change
5. Add `collect-current-page-snapshot.test.ts` — direct unit tests for DOM text extraction
6. Modify `useChatSend.ts` to accept memento via options instead of calling `collectCurrentPageSnapshot` inline
7. Modify `useGlobalChat.tsx` to create memento and pass to send hook
8. Update `useChatSend.test.tsx` — mock memento instead of `collectCurrentPageSnapshot`
9. Verify `useGlobalChat.test.tsx`, `current-page-context.test.ts`, and full suite pass
10. Add portal content tests to `current-page-context.test.ts`

### Sprint 6.2 (useGlobalChat Decomposition)

11. Extract `useReferralContext` hook + tests
12. Extract `useFailedSendRecovery` hook + tests
13. Extract `useBootstrapMessages` hook + tests
14. Slim `ChatProvider` to composition shell (~80–100 lines)
15. Verify all existing `useGlobalChat.test.tsx` tests pass without modification
16. Add architecture assertion: `ChatProvider` line count ≤ 100
17. Full suite: `npx vitest run && npm run lint && npm run build`

---

## 8. Files Inventory

### New Files

| File | Purpose |
|---|---|
| `src/lib/chat/CurrentPageMemento.ts` | Background snapshot observer and cache |
| `src/lib/chat/CurrentPageMemento.test.ts` | Memento unit tests |
| `src/hooks/chat/useCurrentPageMemento.ts` | React lifecycle wrapper for memento |
| `src/hooks/chat/useCurrentPageMemento.test.tsx` | Hook lifecycle tests |
| `src/lib/chat/collect-current-page-snapshot.test.ts` | Direct DOM extraction tests |
| `src/hooks/chat/useReferralContext.ts` | Referral visit fetch hook |
| `src/hooks/chat/useReferralContext.test.tsx` | Referral hook tests |
| `src/hooks/chat/useFailedSendRecovery.ts` | Failed send map lifecycle hook |
| `src/hooks/chat/useFailedSendRecovery.test.tsx` | Failed send recovery tests |
| `src/hooks/chat/useBootstrapMessages.ts` | Bootstrap greeting refresh hook |
| `src/hooks/chat/useBootstrapMessages.test.tsx` | Bootstrap refresh tests |

### Modified Files

| File | Change |
|---|---|
| `src/lib/chat/collect-current-page-snapshot.ts` | Refactor internals for memento reuse; extract text collection |
| `src/lib/chat/current-page-context.ts` | Add portal content support to normalization (if needed) |
| `src/lib/chat/current-page-context.test.ts` | Add portal content normalization tests |
| `src/hooks/chat/useChatSend.ts` | Accept memento via options; remove inline `collectCurrentPageSnapshot` import |
| `src/hooks/chat/useChatSend.test.tsx` | Mock memento instead of `collectCurrentPageSnapshot` |
| `src/hooks/useGlobalChat.tsx` | Slim to composition shell; call extracted hooks |
| `src/hooks/useGlobalChat.test.tsx` | Extend for decomposed behavior if needed |

### Unchanged Files (verify stability)

| File | Why |
|---|---|
| `src/hooks/chat/useChatJobEvents.ts` | Already a separate hook — no changes needed |
| `src/hooks/chat/useChatConversationSession.ts` | Already a separate hook — no changes needed |
| `src/hooks/chat/chatState.ts` | Reducer and bootstrap unchanged |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Consumer — imports `useGlobalChat`, same interface |
| `src/app/layout.tsx` | Wraps `ChatProvider` — same props |
