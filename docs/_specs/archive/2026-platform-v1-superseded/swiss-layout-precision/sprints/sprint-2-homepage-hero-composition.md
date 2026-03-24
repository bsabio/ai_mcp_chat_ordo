# Sprint 2 - Homepage Hero Composition

> **Goal:** Turn the initial homepage state into an intentional hero composition with better message copy, centered chip behavior, and a controlled relationship to the composer row.
> **Spec sections:** `SLP-030` through `SLP-033`, `SLP-100` through `SLP-104`
> **Prerequisite:** Sprint 1 complete and committed

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/home/HomepageChatStage.tsx` | Simple bounded stage wrapper with `data-homepage-chat-stage` and `data-homepage-chat-stage-shell` |
| `src/frameworks/ui/ChatContainer.tsx` | Embedded chat workspace with `EMBEDDED_CONTAINER_CLASSES`, `showEmbeddedStageBranding`, `ChatMessageViewport`, and composer row markup |
| `src/frameworks/ui/ChatMessageViewport.tsx` | Embedded/floating message viewport with stack alignment determined by `showEmbeddedStageBranding` |
| `src/frameworks/ui/MessageList.tsx` | Hero intro header, first message rendering, suggestion chips, and `data-message-list-state` |
| `src/frameworks/ui/ChatInput.tsx` | Composer shell with textarea, attachment trigger, and send button |
| `src/hooks/chat/chatState.ts` | `HERO_MESSAGE`, `HERO_SUGGESTIONS`, and `createInitialChatMessages()` |
| `src/frameworks/ui/MessageList.test.tsx` | Hero-state tests and suggestion-chip assertions |

---

## Tasks

### 1. Refine the homepage intro copy and hero headline system

Required work:

1. Rewrite `HERO_MESSAGE` and `HERO_SUGGESTIONS` so the system reads as an intelligence/architecture console.
2. Keep the language concrete and operational, not promotional.
3. Remove decorative status framing that implies unverifiable runtime guarantees.

Verify:

```bash
npm run test -- src/frameworks/ui/MessageList.test.tsx
```

### 2. Lock hero-state geometry in `MessageList` and `ChatMessageViewport`

Required work:

1. Ensure the hero stack is vertically intentional and not simply “not at the bottom”.
2. Keep conversation state aligned to normal message-thread behavior.
3. Preserve the bounded homepage stage and message-scroll ownership.

Verify:

```bash
npm run test -- src/frameworks/ui/MessageList.test.tsx tests/homepage-shell-ownership.test.tsx
```

### 3. Refine suggestion-chip cluster behavior and composer adjacency

Required work:

1. Center hero-state chips as a cluster with predictable wrapping.
2. Preserve non-hero chip behavior in normal conversation mode.
3. Tune the visual distance between chips and the composer so the fold does not feel detached.

Verify:

```bash
npm run test -- src/frameworks/ui/MessageList.test.tsx tests/browser-overlays.test.tsx
```

### 4. Make the embedded composer visually subordinate but stable

Required work:

1. Refine `ChatContainer` and `ChatInput` so the composer feels anchored without dominating the hero state.
2. Keep keyboard focus, send behavior, attachment handling, and mention behavior unchanged.

Verify:

```bash
npm run test -- src/frameworks/ui/ChatInput.test.tsx tests/homepage-shell-layout.test.tsx
```

---

## Completion Checklist

- [ ] Homepage intro copy reads like a precise intelligence console
- [ ] Hero-state geometry is explicit and stable
- [ ] Suggestion chips center and wrap correctly in hero state
- [ ] Embedded composer relationship is visually controlled without behavioral regressions
- [ ] Verification commands passed

## QA Deviations

None.