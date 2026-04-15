# Sprint 1 - Shell, Viewport, And Safe Area

> **Goal:** Remove the highest-risk layout issues by simplifying viewport sizing,
> clarifying scroll ownership, and adding safe-area aware spacing.
> **Spec ref:** `BUI-010`, `BUI-020`, `BUI-090`, `BUI-120`, `BUI-130`,
> `BUI-201`, `BUI-202`, `BUI-260`
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/layout.tsx` | Root layout currently renders `ThemeProvider`, `ChatProvider`, nav, main shell, footer, `GlobalChat`, `GridInspector`, and `CommandPalette` |
| `src/app/globals.css` | Global shell variables and utility classes already exist |
| `src/components/SiteNav.tsx` | Sticky top nav with `backdrop-blur-md` |
| `src/components/SiteFooter.tsx` | Footer currently lives below the viewport-locked shell |
| `src/components/GlobalChat.tsx` | Returns `<ChatContainer isFloating={true} />` outside the home route |
| `src/frameworks/ui/ChatContainer.tsx` | Floating shell owns fixed positioning, height math, message scroll region, and input footer |
| `src/frameworks/ui/ChatHeader.tsx` | Embedded header uses sticky positioning |
| `src/hooks/useChatScroll.ts` | Scroll logic already centralizes message-area scrolling |

---

## Task 1.1 - Refactor root shell height strategy

**What:** Replace the current nested viewport lock with a more stable layout
contract.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/layout.tsx` |
| **Modify** | `src/app/globals.css` |
| **Spec** | `BUI-010`, `BUI-020`, `BUI-120`, `BUI-130` |

### Task 1.1 Notes

- Reduce or eliminate nested `h-[100dvh]` shell locking.
- Prefer a single main viewport-aware container with `min-height` semantics.
- Preserve the footer-below-fold behavior without forcing every interior region
  to own height independently.
- Keep the shell compatible with home page chat and floating chat.

### Task 1.1 Verify

```bash
npm run lint -- src/app/layout.tsx src/app/globals.css
```

---

## Task 1.2 - Make floating chat safe-area aware

**What:** Update the floating launcher and shell to respect safe-area insets and
 dynamic mobile viewport changes.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Spec** | `BUI-090`, `BUI-130`, `BUI-202`, `BUI-260` |

### Task 1.2 Notes

- Replace hard-coded bottom offsets with safe-area-aware spacing.
- Replace repeated inline `100dvh` math with shared tokens or helper classes.
- Preserve current full-screen and minimized behavior.
- Ensure floating chat remains visually strong on desktop while becoming less
  fragile on mobile browsers.

### Task 1.2 Verify

```bash
npm run test -- src/components/AudioPlayer.test.tsx
```

---

## Task 1.3 - Clarify scroll ownership for embedded chat

**What:** Ensure the embedded chat path has one intentional scroll owner and
 that sticky elements behave inside a predictable container.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Modify** | `src/hooks/useChatScroll.ts` |
| **Spec** | `BUI-020`, `BUI-120`, `BUI-202`, `BUI-232` |

### Task 1.3 Notes

- Keep the message list scroll area explicit.
- Avoid parent clipping rules that undermine sticky correctness.
- Normalize auto-scroll behavior to supported values.
- Preserve current user-scrolled-up behavior in `useChatScroll`.

### Task 1.3 Verify

```bash
npm run test
```

---

## Task 1.4 - Stabilize nav/header shell layering

**What:** Make sticky shell surfaces resilient when blur is unavailable or when
 the browser repaints aggressively.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Spec** | `BUI-040`, `BUI-120`, `BUI-203`, `BUI-222` |

### Task 1.4 Notes

Use non-blur fallback backgrounds and simplify layering assumptions. This sprint
 should not remove the current visual language; it should make it survivable on
 Safari and Firefox.

### Task 1.4 Verify

```bash
npm run build
```
