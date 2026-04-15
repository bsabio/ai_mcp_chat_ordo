# Sprint 0 - Shell Ownership Reset

> **Goal:** Remove homepage-specific footer substitutes and restore a clean separation between document shell composition, route-level stage ownership, and embedded chat layout.
> **Spec ref:** `HCS-020` through `HCS-024`, `HCS-031`, `HCS-042A`, `HCS-044`, `HCS-050` through `HCS-052A`, `HCS-086`
> **Prerequisite:** None
> **Test count target:** 501 existing + 4 new = 505 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/AppShell.tsx` | `AppShell({ user, children })` uses `usePathname()` and currently omits `SiteFooter` entirely on `/` via `!isHomeRoute` |
| `src/app/layout.tsx` | `RootLayout({ children })` fetches `getSessionUser()` and renders `<AppShell user={user}>{children}</AppShell>` |
| `src/app/page.tsx` | `Home()` currently wraps `<ChatContainer isFloating={false} />` in nested flex containers with `overflow-hidden` |
| `src/frameworks/ui/ChatContainer.tsx` | `ChatContainer({ isFloating = false, onClose })` still imports `SiteFooter` and contains `isSiteLinksOpen` state plus embedded site-link UI |
| `src/components/SiteFooter.tsx` | `SiteFooter()` is a real footer component already suitable for document-flow rendering |
| `src/components/SiteNav.tsx` | `SiteNav({ user })` already renders the required single-line brand/auth shell |
| `package.json` | Verification scripts already exist: `typecheck`, `test`, `build`, `quality`, `browser:verify` |

---

## Task 0.1 - Remove embedded footer substitutes from chat container

**What:** Delete the homepage-only site-link/footer surrogate UI from the embedded chat surface.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Spec** | `HCS-022`, `HCS-044`, `HCS-052`, `HCS-086` |

### Task 0.1 Notes

Remove all embedded-home logic tied to:

- `SiteFooter` import inside `ChatContainer`
- `isSiteLinksOpen` state
- the absolute bottom overlay that opens/closes site links

The resulting embedded chat container should own only the chat workspace itself.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Restore the real footer at the app-shell level

**What:** Make the root shell render the real footer as a below-the-fold sibling on the homepage instead of hiding it.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/AppShell.tsx` |
| **Spec** | `HCS-010`, `HCS-014`, `HCS-031`, `HCS-044`, `HCS-050`, `HCS-050A` |

### Task 0.2 Notes

Keep `AppShell` responsible for document composition only:

- homepage stage above
- real footer below
- no route-level footer substitutions

If route checks remain necessary, they should only decide stage behavior, not whether the real footer exists.

### Task 0.2 Verify

```bash
npm run build
```

---

## Task 0.3 - Introduce a homepage shell ownership regression test

**What:** Add a targeted test that fails if the homepage again hides the real footer or if the embedded chat renders a footer substitute.

| Item | Detail |
| --- | --- |
| **Create** | `tests/homepage-shell-ownership.test.tsx` |
| **Spec** | `HCS-042A`, `HCS-044`, `HCS-050A`, `HCS-051B`, `HCS-052` |

### Task 0.3 Notes

Test at minimum:

- homepage shell renders `SiteFooter` in the document tree
- embedded `ChatContainer` does not render site-link drawer controls
- nav still renders brand and account controls without a second-row substitute

Prefer mocked `next/navigation` path control so both `/` and a non-home route can be asserted.

### Task 0.3 Verify

```bash
npm run test -- tests/homepage-shell-ownership.test.tsx
```

---

## Task 0.4 - Document the ownership boundary in the sprint deliverable

**What:** Add a short implementation note to the sprint doc during delivery confirming which layer owns footer composition, stage sizing, and chat layout after code lands.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/homepage-chat-shell/sprints/sprint-0-shell-ownership-reset.md` |
| **Spec** | `HCS-042A`, `HCS-050` through `HCS-052A` |

### Task 0.4 Notes

This note should be added under `QA Deviations` only if implementation differs from the intended ownership split. If there are no deviations, leave the section empty.

### Task 0.4 Verify

```bash
npm run quality
```

---

## Completion Checklist

- [x] `ChatContainer` no longer imports or renders `SiteFooter`
- [x] Homepage app shell renders the real footer below the stage
- [x] No homepage-specific site-link drawer or substitute footer remains
- [x] Ownership regression test exists and passes

## QA Deviations

No deviations. Sprint 0 implementation matches the ownership contract in the spec: the real footer is rendered by `AppShell`, and embedded chat no longer owns any footer substitute UI.

