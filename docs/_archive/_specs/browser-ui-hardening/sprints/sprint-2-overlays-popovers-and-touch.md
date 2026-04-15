# Sprint 2 - Overlays, Popovers, And Touch

> **Goal:** Make dialogs, menus, and anchored interactive surfaces stable on
> touch devices, mobile keyboards, and Safari.
> **Spec ref:** `BUI-030`, `BUI-060`, `BUI-150`, `BUI-210` through `BUI-213`,
> `BUI-261`
> **Prerequisite:** Sprint 1 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/CommandPalette.tsx` | Default export renders a Radix dialog with transformed fixed centering and keyboard navigation |
| `src/components/ContentModal.tsx` | `ContentModal({ bookSlug, chapterSlug, onClose })` renders a Radix dialog with fixed translated content |
| `src/components/ToolCard.tsx` | `ToolCard(...)` can render an expanded Radix dialog modal |
| `src/components/MentionsMenu.tsx` | Absolute-positioned suggestion surface anchored by pixel offsets |
| `src/components/AccountMenu.tsx` | Outside click currently handled via `mousedown` |
| `src/frameworks/ui/ChatInput.tsx` | Hosts the mentions menu and file button/input interactions |

---

## Task 2.1 - Replace transform-centered dialog positioning

**What:** Refactor modal and palette shells so they are inset-based rather than
 translate-centered.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/CommandPalette.tsx` |
| **Modify** | `src/components/ContentModal.tsx` |
| **Modify** | `src/components/ToolCard.tsx` |
| **Spec** | `BUI-030`, `BUI-210`, `BUI-211`, `BUI-261` |

### Task 2.1 Notes

- Use inset wrappers and interior max-height panes.
- Preserve current layout scale on desktop.
- Make mobile keyboard overlap less likely.
- Keep Radix dialog semantics intact.

### Task 2.1 Verify

```bash
npm run lint -- src/components/CommandPalette.tsx src/components/ContentModal.tsx src/components/ToolCard.tsx
```

---

## Task 2.2 - Harden popover anchoring and outside-click behavior

**What:** Make mention and account menus pointer-aware and edge-safe.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/MentionsMenu.tsx` |
| **Modify** | `src/components/AccountMenu.tsx` |
| **Modify** | `src/frameworks/ui/ChatInput.tsx` |
| **Spec** | `BUI-060`, `BUI-150`, `BUI-212`, `BUI-213` |

### Task 2.2 Notes

- Replace `mousedown`-only outside detection with pointer-aware handling where
  appropriate.
- Reduce dependence on fixed pixel offsets for menu placement.
- Ensure menus remain usable when the input is near the bottom of the viewport.
- Preserve keyboard navigation semantics already present in `ChatInput`.

### Task 2.2 Verify

```bash
npm run test
```

---

## Task 2.3 - Review touch hit targets and footer interactions

**What:** Ensure floating and overlay controls remain easy to tap on mobile.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Modify** | `src/frameworks/ui/ChatInput.tsx` |
| **Modify** | `src/components/CommandPalette.tsx` |
| **Spec** | `BUI-150`, `BUI-213` |

### Task 2.3 Notes

Do not redesign the UI. Focus on hit-target sizing, bottom padding, and footer
 crowding under dynamic viewport conditions.

### Task 2.3 Verify

```bash
npm run build
```

---

## Task 2.4 - Add focused overlay interaction tests

**What:** Add at least a minimal automated test layer for dialog and menu
 stability rules that can be asserted in JSDOM.

| Item | Detail |
| --- | --- |
| **Create** | `tests/browser-overlays.test.tsx` |
| **Spec** | `BUI-150`, `BUI-250`, `BUI-251` |

### Task 2.4 Notes

Cover at minimum:

- Command palette open/close behavior
- Pointer-aware dismissal behavior
- Mentions menu visibility and selection behavior after the refactor

### Task 2.4 Verify

```bash
npm run test -- tests/browser-overlays.test.tsx
```
