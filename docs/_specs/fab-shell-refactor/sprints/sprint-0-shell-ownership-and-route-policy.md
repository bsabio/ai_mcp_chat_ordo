# Sprint 0 - Shell Ownership and Route Policy

> **Goal:** Split route presence and floating-shell lifecycle out of `ChatContainer` so the FAB is owned by a dedicated shell controller instead of a boolean branch inside the shared chat container.
> **Spec Sections:** `FAB-010` through `FAB-090`

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/GlobalChat.tsx` | `GlobalChat()` now owns only route presence policy: it suppresses the FAB on `/` and renders `<FloatingChatShell />` on eligible routes |
| `src/app/layout.tsx` | `GlobalChat` is mounted once at the root inside `ThemeProvider` and `ChatProvider`, after `AppShell` |
| `src/components/FloatingChatShell.tsx` | `FloatingChatShell` now owns launcher/open/full-screen lifecycle, `OPEN_GLOBAL_CHAT_EVENT` handling, and minimize-to-launcher behavior |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | `FloatingChatLauncher` now isolates the closed-state FAB trigger markup and accessibility hook |
| `src/frameworks/ui/FloatingChatFrame.tsx` | `FloatingChatFrame` now owns floating-shell geometry, size attributes, and floating-header composition |
| `src/frameworks/ui/ChatContentSurface.tsx` | `ChatContentSurface` now provides the shared viewport and composer subtree reused by embedded and floating chat surfaces |
| `src/frameworks/ui/ChatContainer.tsx` | `ChatContainer` is now narrowed to the embedded shell path and shared chat-content composition rather than floating lifecycle ownership |
| `src/frameworks/ui/ChatMessageViewport.tsx` | `ChatMessageViewport` already encapsulates the message-region viewport and scroll CTA contract |
| `src/frameworks/ui/ChatInput.tsx` | `ChatInput` already encapsulates the composer DOM, helper text, file affordances, and send handling |
| `src/hooks/useGlobalChat.tsx` | `useGlobalChat()` provides `messages`, `isSending`, `conversationId`, `currentConversation`, `isLoadingMessages`, `routingSnapshot`, `sendMessage(...)`, `newConversation()`, and `archiveConversation()` |
| `src/lib/chat/chat-events.ts` | `OPEN_GLOBAL_CHAT_EVENT` is already the canonical global open signal: `"studio-ordo:open-chat"` |
| `src/hooks/chat/useChatConversationSession.ts` | `newConversation()` and `archiveConversation()` already exist behind a focused conversation-session hook and do not need to move into FAB-specific state |
| `src/hooks/chat/useChatSend.ts` | send flow already rejects duplicate in-flight sends and returns `{ ok, error? }`, so shell extraction should not duplicate sending state |

## Tasks

1. Create a dedicated floating-shell controller component that owns only FAB lifecycle state: closed, open, and full-screen. It should subscribe to `OPEN_GLOBAL_CHAT_EVENT` and restore the existing open-from-anywhere behavior without relying on `ChatContainer` local state.
2. Create a dedicated launcher component for the closed FAB button so the launcher markup and accessibility contract are no longer embedded inside `ChatContainer`.
3. Create a dedicated floating frame component for the shell wrapper and move floating-only frame geometry and full-screen toggling behind that boundary.
4. Extract or reuse a shared chat-content primitive so the floating shell can render the existing message viewport and composer without duplicating chat runtime logic.
5. Update `GlobalChat` so it owns only route presence policy and renders the new floating shell controller on all non-homepage routes.
6. Narrow `ChatContainer` to the shared embedded chat responsibility or to the shared chat-content surface used by both embedded and floating shells, but stop letting it own floating open/launcher/event behavior directly.
7. Add focused regression coverage for route presence and floating-shell lifecycle, including positive, negative, and edge-case scenarios: launcher visible when closed, `OPEN_GLOBAL_CHAT_EVENT` opens the shell, minimize returns to launcher state, full-screen toggles stay local to the floating controller, homepage suppresses the FAB, duplicate open events do not create duplicate shells, and close/open transitions preserve a single controller instance.

## Test Matrix

### Positive Tests

1. Verify `GlobalChat` renders the launcher on a non-homepage route when the floating shell is closed.
2. Verify activating the launcher opens exactly one floating shell and exposes the shared chat content region.
3. Verify dispatching `OPEN_GLOBAL_CHAT_EVENT` from outside the shell opens the floating shell on a non-homepage route.
4. Verify minimize returns the UI from open-shell state to launcher state without unmounting shared chat runtime state from `ChatProvider`.
5. Verify full-screen toggle changes only floating-shell presentation state and can toggle back to the normal floating size.

### Negative Tests

1. Verify the FAB does not render on `/`.
2. Verify dispatching `OPEN_GLOBAL_CHAT_EVENT` while already open does not render a second shell, duplicate launcher, or duplicate dialog landmark.
3. Verify embedded chat rendering paths do not subscribe to or depend on floating-shell lifecycle state.
4. Verify closing or minimizing the floating shell does not create a new conversation session or invoke send behavior on its own.
5. Verify route-policy checks do not regress into showing the launcher on excluded routes during initial render.

### Edge-Case Tests

1. Verify repeated open/minimize/open sequences keep a single controller instance and preserve stable accessibility hooks.
2. Verify route transitions from `/` to an allowed route cause the launcher to appear only after the route becomes eligible.
3. Verify route transitions from an allowed route back to `/` cleanly remove the launcher or open shell without leaving floating DOM remnants behind.
4. Verify a full-screen shell that is minimized and reopened returns through the controller-defined state transition rather than a stale duplicated state.
5. Verify the controller handles `OPEN_GLOBAL_CHAT_EVENT` correctly during early mount timing, where the event is dispatched shortly after route render.

## Completion Checklist

- [x] FAB route presence stays limited to non-homepage routes
- [x] Floating shell lifecycle is owned outside `ChatContainer`
- [x] Launcher markup is isolated in its own component
- [x] Floating frame markup is isolated in its own component
- [x] Shared chat runtime remains in `ChatProvider` / `useGlobalChat`
- [x] Positive, negative, and edge-case FAB lifecycle tests are implemented
- [x] Focused lifecycle regressions added and passing

## QA Deviations

None.

## Final QA Notes

1. Final Sprint 0 QA confirms the landed implementation now matches the sprint boundary in the spec: route presence is isolated in `GlobalChat`, floating lifecycle is isolated in `FloatingChatShell`, floating frame markup lives in `FloatingChatFrame`, and the shared chat subtree lives in `ChatContentSurface`.
2. No additional Sprint 0 code issues were found in the closing QA pass. The remaining floating-header density/grid coupling is a Sprint 1 concern, not a Sprint 0 regression.

## Verification

- `npm exec vitest run src/components/GlobalChat.test.tsx src/components/FloatingChatShell.test.tsx src/frameworks/ui/ChatContainer.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run typecheck`
