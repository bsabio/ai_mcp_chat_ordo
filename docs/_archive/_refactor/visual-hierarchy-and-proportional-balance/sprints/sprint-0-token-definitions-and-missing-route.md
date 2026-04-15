# Sprint 0 — Token Definitions, Missing Route, And Baseline Verification

> **Goal:** Define all missing and new typography tokens in foundation.css, fix the chat-avatar-size defaults, add the journal-admin route to shell-navigation.ts, and verify the baseline passes all existing quality gates before any visual changes begin.
> **Spec ref:** §4.3, §4.4, §6.3, §8
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/visual-hierarchy-and-proportional-balance/spec.md` | canonical refactor contract |
| `docs/_refactor/visual-hierarchy-and-proportional-balance/census.md` | current-state audit of all affected values |
| `src/app/styles/foundation.css` | global token authority |
| `src/lib/shell/shell-navigation.ts` | shell route definitions and account menu route IDs |
| `src/frameworks/ui/ChatInput.tsx` | consumer of undefined helper tokens |

---

## Task 0.1 — Define new typography tier tokens

**What:** Add `--tier-brand-size`, `--tier-nav-label-size`, and `--tier-nav-label-tracking` to `:root` in foundation.css.

**Modify:** `src/app/styles/foundation.css`

### Required `:root` additions

```css
--tier-brand-size: 0.84rem;
--tier-nav-label-size: 0.72rem;
--tier-nav-label-tracking: 0.08em;
```

### Required density overrides

In `[data-density="compact"]`:

```css
--tier-brand-size: 0.78rem;
--tier-nav-label-size: 0.68rem;
```

In `[data-density="relaxed"]`:

```css
--tier-brand-size: 0.90rem;
--tier-nav-label-size: 0.78rem;
```

### Verification

- `npm run typecheck` passes
- `npm run lint:css` passes
- `npm run spacing:audit` passes at threshold 0
- No existing tests break

---

## Task 0.2 — Define missing chat helper tokens

**What:** Add `--chat-composer-helper-font-size` and `--chat-composer-helper-line-height` to `:root` in foundation.css so ChatInput.tsx's Tailwind utilities resolve correctly.

**Modify:** `src/app/styles/foundation.css`

### Required `:root` additions

```css
--chat-composer-helper-font-size: 0.72rem;
--chat-composer-helper-line-height: 1.3;
```

### Required density overrides

In `[data-density="compact"]`:

```css
--chat-composer-helper-font-size: 0.68rem;
--chat-composer-helper-line-height: 1.25;
```

In `[data-density="relaxed"]`:

```css
--chat-composer-helper-font-size: 0.78rem;
--chat-composer-helper-line-height: 1.35;
```

### Verification

- ChatInput helper text now renders at 0.72rem (11.5px) instead of inheriting 1rem (16px)
- `npm run typecheck` passes
- Existing ChatInput tests pass

---

## Task 0.3 — Fix chat-avatar-size token defaults

**What:** Update `--chat-avatar-size` in foundation.css so the default, compact, and relaxed values reflect the proportional requirements.

**Modify:** `src/app/styles/foundation.css`

### Required changes

In `:root`:

```css
--chat-avatar-size: 2rem;
```

In `[data-density="compact"]`:

```css
--chat-avatar-size: 1.75rem;
```

In `[data-density="relaxed"]` (add if not present):

```css
--chat-avatar-size: 2.25rem;
```

### Verification

- Token values are defined and readable
- `npm run typecheck` passes
- `npm run spacing:audit` passes

---

## Task 0.4 — Add journal-admin route

**What:** Add a journal administration route to `SHELL_ROUTES` and include it in `ACCOUNT_MENU_ROUTE_IDS` so staff and admin users have an account-menu path to journal administration.

**Modify:** `src/lib/shell/shell-navigation.ts`

### Required route definition

Add to `SHELL_ROUTES` array:

```ts
{
  id: "journal-admin",
  label: "Journal",
  href: "/admin/journal",
  kind: "internal",
  accountVisibility: ["STAFF", "ADMIN"],
},
```

### Required account menu update

Change:

```ts
export const ACCOUNT_MENU_ROUTE_IDS = ["jobs", "profile"] as const;
```

To:

```ts
export const ACCOUNT_MENU_ROUTE_IDS = ["jobs", "journal-admin", "profile"] as const;
```

### Verification

- `npm run typecheck` passes
- Existing shell navigation tests pass
- `resolveAccountMenuRoutes(adminUser)` returns 3 routes: Jobs, Journal, Profile

---

## Task 0.5 — Baseline verification gate

**What:** Run the full quality pipeline to confirm that all Sprint 0 token and route changes integrate cleanly with the existing system.

### Required commands

1. `npm run typecheck`
2. `npm run lint:css`
3. `npm run spacing:audit`
4. `npm exec vitest run` (full test suite or focused on shell/chat/navigation tests)

### Acceptance

All commands pass with exit code 0. No existing test has been modified or weakened.

---

## Sprint 0 Deliverables Summary

| Deliverable | File | Change type |
| --- | --- | --- |
| 5 new typography tokens | `foundation.css` | `:root` + density overrides |
| 2 missing helper tokens | `foundation.css` | `:root` + density overrides |
| `--chat-avatar-size` correction | `foundation.css` | `:root` + density overrides |
| journal-admin route | `shell-navigation.ts` | data addition |
| journal-admin in account menu | `shell-navigation.ts` | constant update |
| baseline verification | — | pipeline pass |

Sprint 0 is pure foundation. No visual output changes until Sprint 1 begins consuming the new tokens.
