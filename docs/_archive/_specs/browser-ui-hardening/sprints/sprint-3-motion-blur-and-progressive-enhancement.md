# Sprint 3 - Motion, Blur, And Progressive Enhancement

> **Goal:** Make advanced visual effects optional instead of structural, and add
> a reduced-motion path across the primary UI surfaces.
> **Spec ref:** `BUI-040`, `BUI-070`, `BUI-110`, `BUI-160`, `BUI-203`,
> `BUI-220` through `BUI-222`, `BUI-262`, `BUI-263`
> **Prerequisite:** Sprint 2 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/globals.css` | Defines brand pulse and multiple animation utilities already |
| `src/components/ThemeProvider.tsx` | Already feature-checks view transitions before use |
| `src/frameworks/ui/ChatContainer.tsx` | Uses `viewTransitionName` and blur-heavy floating shell styling |
| `src/frameworks/ui/MessageList.tsx` | Uses brand pulse, reveal animations, typing animation, and animated suggestion chips |
| `src/components/CommandPalette.tsx` | Uses animated overlay and content entrance transitions |
| `src/components/AccountMenu.tsx` | Uses animated panel and accordion reveals |

---

## Task 3.1 - Add reduced-motion CSS contract

**What:** Introduce a reduced-motion strategy that suppresses or tones down the
 heaviest animations.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Spec** | `BUI-070`, `BUI-160`, `BUI-203`, `BUI-220`, `BUI-263` |

### Task 3.1 Notes

Use `prefers-reduced-motion` and targeted utility overrides. Avoid a blanket
 "disable everything" rule; instead remove high-amplitude movement and repeated
 pulses while preserving state communication.

### Task 3.1 Verify

```bash
npm run lint -- src/app/globals.css
```

---

## Task 3.2 - Make blur a visual enhancement, not a requirement

**What:** Refactor key blur surfaces to look correct with plain translucent
 backgrounds when blur is absent or too expensive.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Modify** | `src/components/CommandPalette.tsx` |
| **Modify** | `src/components/ContentModal.tsx` |
| **Modify** | `src/components/ToolCard.tsx` |
| **Spec** | `BUI-040`, `BUI-110`, `BUI-222`, `BUI-262` |

### Task 3.2 Notes

Preserve the existing look-and-feel as much as possible. The success criterion is
 that the UI remains legible and layered even when blur is removed.

### Task 3.2 Verify

```bash
npm run build
```

---

## Task 3.3 - Contain view-transition usage

**What:** Ensure view transitions are purely additive and do not affect layout
 correctness.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Modify** | `src/components/ThemeProvider.tsx` |
| **Spec** | `BUI-080`, `BUI-110`, `BUI-140`, `BUI-221`, `BUI-262` |

### Task 3.3 Notes

- Keep the existing feature-check pattern in `ThemeProvider`.
- Avoid relying on `viewTransitionName` for shell state correctness.
- If necessary, isolate transition styles behind helper checks.

### Task 3.3 Verify

```bash
npm run test
```

---

## Task 3.4 - Add motion-focused regression tests

**What:** Add lightweight tests for reduced-motion branching and component class
 fallbacks.

| Item | Detail |
| --- | --- |
| **Create** | `tests/browser-motion.test.tsx` |
| **Spec** | `BUI-250`, `BUI-251`, `BUI-263` |

### Task 3.4 Verify

```bash
npm run test -- tests/browser-motion.test.tsx
```
