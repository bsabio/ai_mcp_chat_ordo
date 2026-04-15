# Sprint 2 - Scroll Boundary Lock And Browser Coverage

> **Goal:** Make homepage message scrolling resilient across Safari, touch, and dynamic viewport changes by adding explicit boundary-lock behavior and browser-focused interaction coverage.
> **Spec ref:** `HCS-033` through `HCS-049A`, `HCS-054` through `HCS-069`, `HCS-074` through `HCS-076`, `HCS-084`, `HCS-087`, `HCS-088`
> **Prerequisite:** Sprint 1 complete
> **Test count target:** 510 existing + 7 new = 517 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/hooks/useChatScroll.ts` | Existing hook already isolates auto-scroll concerns and should remain separate from any page-scroll interception logic |
| `src/frameworks/ui/ChatContainer.tsx` | Message viewport is the `div` using `ref={scrollRef}` with `overflow-y-auto overscroll-contain`, and embedded mode now wires `useMessageScrollBoundaryLock(scrollRef, !isFloating)` |
| `src/lib/ui/browserSupport.ts` | Browser support helpers already exist and are the right place for low-level browser capability helpers if any are needed |
| `tests/browser-support.test.ts` | Existing browser helper tests provide a pattern for capability-focused assertions |
| `tests/browser-api-fallbacks.test.ts` | Existing browser fallback tests provide a pattern for lower-level non-visual behavior |
| `src/hooks/useMessageScrollBoundaryLock.ts` | New hook attaches `wheel`, `touchstart`, and `touchmove` listeners only to the message viewport and ignores interactive descendants |
| `src/hooks/useMessageScrollBoundaryLock.test.tsx` | Hook-level coverage now exercises top/bottom wheel and touch boundaries plus non-interference scenarios |
| `package.json` | `browser:verify` now composes `test:browser-ui` plus `test:homepage-shell` so homepage shell coverage stays in the browser regression path |
| `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` | Manual verification checklist now exists for Safari, iOS Safari, Chrome, and Android Chrome |

---

## Task 2.1 - Create a dedicated message boundary-lock hook

**What:** Add a separate hook for wheel/touch boundary containment without overloading `useChatScroll`.

| Item | Detail |
| --- | --- |
| **Create** | `src/hooks/useMessageScrollBoundaryLock.ts` |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Spec** | `HCS-043`, `HCS-043A` through `HCS-043G`, `HCS-054A`, `HCS-054B`, `HCS-066`, `HCS-068`, `HCS-084`, `HCS-088` |

### Task 2.1 Notes

Keep the hook narrowly scoped:

- attach only to the message viewport element
- preserve inner scrolling and momentum when inner scroll remains possible
- avoid keyboard/focus/text-selection interference
- clean up listeners reliably on unmount and Fast Refresh

### Task 2.1 Verify

```bash
npm run typecheck
```

---

## Task 2.2 - Add hook-level interaction tests

**What:** Add direct tests for top-boundary and bottom-boundary wheel/touch handling.

| Item | Detail |
| --- | --- |
| **Create** | `src/hooks/useMessageScrollBoundaryLock.test.tsx` |
| **Spec** | `HCS-043A` through `HCS-043G`, `HCS-074`, `HCS-075A`, `HCS-088` |

### Task 2.2 Notes

Test at minimum:

- gesture started inside message viewport and tries to escape upward
- gesture started inside message viewport and tries to escape downward
- gesture started outside the message viewport is never intercepted
- keyboard-like interactions are not blocked

### Task 2.2 Verify

```bash
npm run test -- src/hooks/useMessageScrollBoundaryLock.test.tsx
```

---

## Task 2.3 - Expand homepage interaction tests and browser verify coverage

**What:** Extend homepage tests and browser verification scripts so the new behavior is protected by the existing browser-hardening workflow.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/homepage-shell-layout.test.tsx` |
| **Modify** | `package.json` |
| **Optional Modify** | `tests/browser-api-fallbacks.test.ts` |
| **Spec** | `HCS-074` through `HCS-076`, `HCS-084`, `HCS-087`, `HCS-088` |

### Task 2.3 Notes

Add the homepage shell tests to a named verification path, preferably by extending `browser:verify` or by creating a sibling script such as `test:homepage-shell` and composing it into `browser:verify`.

### Task 2.3 Verify

```bash
npm run browser:verify
```

---

## Task 2.4 - Capture manual browser checks for boundary behavior

**What:** Record the browser scenarios that must be executed once the code lands, with explicit focus on Safari and mobile keyboard behavior.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` |
| **Spec** | `HCS-047` through `HCS-049A`, `HCS-075A`, `HCS-076`, `HCS-087`, `HCS-088` |

### Task 2.4 Notes

Document pass criteria for:

- iOS Safari keyboard-open composer visibility
- desktop Safari trackpad momentum at top and bottom boundaries
- Android Chrome reduced-height behavior
- intentional outer scroll to the footer started outside the message region

### Task 2.4 Verify

```bash
npm run build
```

---

## Completion Checklist

- [x] Separate boundary-lock hook exists and is wired only to the message viewport
- [x] Hook tests cover top/bottom boundary and non-interference behavior
- [x] Homepage browser verification path includes the new coverage
- [x] Manual verification checklist exists for Safari and mobile keyboard scenarios

## QA Deviations

No architectural deviations. Clarification: Sprint 2 adds event-level boundary protection for the embedded homepage message viewport only; real cross-browser momentum and software-keyboard behavior still require manual confirmation using `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` and remain part of Sprint 3 acceptance evidence.

