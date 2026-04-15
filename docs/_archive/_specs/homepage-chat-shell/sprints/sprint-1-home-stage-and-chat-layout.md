# Sprint 1 - Home Stage And Chat Layout

> **Goal:** Implement a dedicated homepage stage and a strict two-row embedded chat workspace so the composer remains pinned and the stage itself never becomes the scrolling surface.
> **Spec ref:** `HCS-030` through `HCS-042`, `HCS-046` through `HCS-049A`, `HCS-051`, `HCS-052A`, `HCS-070` through `HCS-073`, `HCS-080` through `HCS-083`, `HCS-087`
> **Prerequisite:** Sprint 0 complete
> **Test count target:** 505 existing + 5 new = 510 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/page.tsx` | `Home()` now renders `<HomepageChatStage><ChatContainer isFloating={false} /></HomepageChatStage>` |
| `src/components/home/HomepageChatStage.tsx` | `HomepageChatStage({ children })` is the dedicated bounded home-stage wrapper with stable `data-homepage-chat-stage` selectors |
| `src/components/AppShell.tsx` | Home-route `main` already uses `data-home-chat-route` and `overflow-hidden`, which should be simplified into a clearer stage contract |
| `src/frameworks/ui/ChatContainer.tsx` | Embedded mode now exposes stable ownership markers: `data-chat-container-mode="embedded"`, `data-chat-message-viewport="true"`, and `data-chat-composer-row="true"` |
| `src/frameworks/ui/MessageList.tsx` | `MessageList(..., isEmbedded)` now supports embedded-mode spacing and exposes `data-message-list-mode` for layout assertions |
| `src/hooks/useChatScroll.ts` | `useChatScroll<T>(dep)` returns `{ scrollRef, isAtBottom, scrollToBottom, handleScroll }` and already owns message auto-scroll behavior |
| `src/app/globals.css` | Shared viewport token `--viewport-block-size` and safe-area vars already exist and should remain the single sizing foundation |
| `tests/browser-motion.test.tsx` | Existing component-style UI tests already mock `ChatContainer` dependencies and can serve as a pattern for homepage shell tests |
| `tests/homepage-shell-layout.test.tsx` | New Sprint 1 coverage proves stage/footer separation, message/composer structure, and reduced-height structural behavior |

---

## Task 1.1 - Add a dedicated homepage stage wrapper

**What:** Replace incidental flex inheritance on `/` with a named, testable stage wrapper that consumes the remaining viewport below the nav.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/page.tsx` |
| **Optional Create** | `src/components/home/HomepageChatStage.tsx` |
| **Spec** | `HCS-030`, `HCS-040`, `HCS-040A` through `HCS-040D`, `HCS-051`, `HCS-051A`, `HCS-080` |

### Task 1.1 Notes

The stage wrapper should:

- make the viewport budget explicit
- remain non-scrolling
- expose stable selectors or roles for tests

Do not reintroduce footer controls or route-level alternate navigation.

### Task 1.1 Verify

```bash
npm run typecheck
```

---

## Task 1.2 - Harden the two-row embedded chat layout

**What:** Make the embedded chat workspace unambiguously split into one scrolling message row and one non-scrolling composer row.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Spec** | `HCS-032`, `HCS-041`, `HCS-052`, `HCS-052A`, `HCS-053`, `HCS-082`, `HCS-083` |

### Task 1.2 Notes

Preserve existing floating-chat behavior. Restrict layout changes to embedded mode.

Expected outcomes:

- the message viewport owns vertical overflow
- the composer row never enters the scrolling region
- short conversations settle near the composer instead of floating awkwardly mid-viewport

### Task 1.2 Verify

```bash
npm run test -- tests/homepage-shell-layout.test.tsx
```

---

## Task 1.3 - Add layout invariants tests for the homepage stage

**What:** Create behavior-oriented tests that prove the stage, message viewport, and composer row are structurally separated.

| Item | Detail |
| --- | --- |
| **Create** | `tests/homepage-shell-layout.test.tsx` |
| **Spec** | `HCS-041`, `HCS-042`, `HCS-070`, `HCS-071`, `HCS-073`, `HCS-080` through `HCS-083` |

### Task 1.3 Notes

Cover at minimum:

- homepage stage renders independently from the footer segment
- embedded chat exposes one scroll region plus one composer region
- composer stays outside the message viewport DOM subtree
- homepage route does not depend on footer rendering inside `ChatContainer`

### Task 1.3 Verify

```bash
npm run test -- tests/homepage-shell-layout.test.tsx
```

---

## Task 1.4 - Validate mobile viewport and safe-area behavior at the component level

**What:** Add focused tests for viewport-token and reduced-height scenarios so keyboard/visual-viewport regressions are caught before browser QA.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/homepage-shell-layout.test.tsx` |
| **Spec** | `HCS-046` through `HCS-049A`, `HCS-075B`, `HCS-087` |

### Task 1.4 Notes

At this sprint, simulated reduced-height assertions are enough. Real browser keyboard validation comes in Sprint 2 and Sprint 3.

### Task 1.4 Verify

```bash
npm run test -- tests/homepage-shell-layout.test.tsx
```

---

## Completion Checklist

- [x] Homepage route uses a dedicated stage wrapper
- [x] Embedded chat layout is a strict message-row/composer-row split
- [x] Composer remains outside the scrolling region
- [x] Layout tests cover stage, footer separation, and reduced-height behavior

## QA Deviations

No architectural deviations. Clarification: the reduced-height assertions in this sprint are structural jsdom checks against the stage/message/composer contract; real keyboard and visual-viewport verification remains deferred to Sprint 2 and Sprint 3 as planned.

