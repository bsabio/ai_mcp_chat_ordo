# Sprint 4 - Media, Scroll, And Browser APIs

> **Goal:** Normalize browser-sensitive runtime behavior for audio, scrolling,
> observers, streams, and feature-guarded enhancements.
> **Spec ref:** `BUI-080`, `BUI-140`, `BUI-230` through `BUI-232`, `BUI-264`
> **Prerequisite:** Sprint 3 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/AudioPlayer.tsx` | Uses `new Audio(url)`, `response.body?.getReader()`, `IntersectionObserver`, and `scrollIntoView({ behavior: "smooth" })` |
| `src/frameworks/ui/RichContentRenderer.tsx` | Dynamically loads `AudioPlayer` |
| `src/hooks/useChatScroll.ts` | Uses `requestAnimationFrame` and `scrollTo({ behavior: "instant" })` |
| `src/components/ThemeProvider.tsx` | Already uses a guarded browser API pattern |
| `src/frameworks/ui/MessageList.tsx` | Renders motion-heavy content and browser-sensitive text styling |

---

## Task 4.1 - Move browser API decisions behind shared helpers

**What:** Replace inline capability assumptions with shared support helpers from
 Sprint 0.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/AudioPlayer.tsx` |
| **Modify** | `src/hooks/useChatScroll.ts` |
| **Modify** | `src/components/ThemeProvider.tsx` |
| **Spec** | `BUI-140`, `BUI-230`, `BUI-232`, `BUI-264` |

### Task 4.1 Notes

Apply the same design principle everywhere:

- guard first
- fallback second
- feature path third

Avoid introducing browser sniffing unless a specific engine bug forces it and it
 is documented clearly.

### Task 4.1 Verify

```bash
npm run lint -- src/components/AudioPlayer.tsx src/hooks/useChatScroll.ts src/components/ThemeProvider.tsx
```

---

## Task 4.2 - Normalize scroll behavior values and intent

**What:** Remove unsupported or ambiguous scroll behavior assumptions.

| Item | Detail |
| --- | --- |
| **Modify** | `src/hooks/useChatScroll.ts` |
| **Modify** | `src/components/AudioPlayer.tsx` |
| **Spec** | `BUI-232`, `BUI-264` |

### Task 4.2 Notes

Replace `instant` with a widely supported behavior strategy and keep explicit
 smooth scrolling only for direct user actions such as "jump to player" or
 "scroll to bottom" buttons.

### Task 4.2 Verify

```bash
npm run test
```

---

## Task 4.3 - Clarify audio fallback semantics

**What:** Keep the current manual-play bug fix intact while making the remaining
 browser fallback paths explicit and testable.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/AudioPlayer.tsx` |
| **Modify** | `src/components/AudioPlayer.test.tsx` |
| **Spec** | `BUI-230`, `BUI-231`, `BUI-264` |

### Task 4.3 Notes

Add tests or branches for:

- missing stream reader fallback
- autoplay/manual play distinction
- observer absence or safe no-op behavior where appropriate

### Task 4.3 Verify

```bash
npm run test -- src/components/AudioPlayer.test.tsx
```

---

## Task 4.4 - Add browser API regression tests

**What:** Add focused tests for helper-guarded behavior.

| Item | Detail |
| --- | --- |
| **Create** | `tests/browser-api-fallbacks.test.ts` |
| **Spec** | `BUI-250`, `BUI-251`, `BUI-264` |

### Task 4.4 Verify

```bash
npm run test -- tests/browser-api-fallbacks.test.ts
```
