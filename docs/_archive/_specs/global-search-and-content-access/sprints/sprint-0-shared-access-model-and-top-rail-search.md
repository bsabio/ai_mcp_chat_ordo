# Sprint 0 — Shared Access Model And Top-Rail Search

> **Goal:** Introduce the shared content-access authority and move search ownership from the admin page layout into the shell top rail.
> **Spec Sections:** `GSCA-020` through `GSCA-065`
> **Prerequisite:** None

---

## Available Assets

| Asset | Verified shape | Why it matters |
| --- | --- | --- |
| `src/components/AppShell.tsx` | `AppShell({ user, children })` renders `SiteNav user={user}` for home, default, and admin surfaces | The shell already owns the top rail and is the correct path for a global search prop or wrapper |
| `src/components/SiteNav.tsx` | `SiteNav({ user })` renders brand, primary links, and account access | Search UI should be added here rather than in page layouts |
| `src/app/admin/layout.tsx` | currently imports `AdminSearchBar` and `searchAction` and renders the search above the admin grid | This is the misplaced search owner that must be removed |
| `src/lib/shell/shell-navigation.ts` | `resolveCommandRoutes(user?)`, `resolvePrimaryNavRoutes(user?)`, `resolveAccountMenuRoutes(user?)` | Canonical shell route truth already exists for route-discovery search |
| `src/lib/auth.ts` | `getSessionUser(): Promise<SessionUser>` | The shell and search action should resolve the same role source as the rest of the app |
| `src/core/entities/user.ts` | `RoleName` union already includes `ANONYMOUS`, `AUTHENTICATED`, `APPRENTICE`, `STAFF`, `ADMIN` | Reuse the existing role model; do not create a second account-level enum |
| `src/components/admin/AdminSearchBar.tsx` | current admin search UI already contains slash-command route navigation and async result state | Useful as an implementation donor, but no longer the final owning surface |
| `tests/shell-navigation-model.test.ts` and `tests/site-shell-composition.test.tsx` | existing shell regressions | Extend these rather than inventing unrelated shell tests |

---

## Tasks

### 1. Add The Shared Content-Access Contract

**What:** Introduce a shared runtime module for content-audience resolution.

**Create or modify:**

1. Add a new shared access-policy module under `src/core/` or `src/lib/` that exports:
   - `ContentAudience = "public" | "member" | "staff" | "admin"`
   - audience-to-role resolution helpers
   - `canAccessAudience(audience, role)`
2. Keep the new access contract independent from UI so corpus routes, tool code, and search services can all import the same functions.

**Implementation details:**

1. `public` must include `ANONYMOUS`.
2. `member` must include `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN`.
3. `staff` and `admin` should be implemented now even if the first content rollout only uses `public` and `member`.
4. Do not replace `ToolDescriptor.roles`; this module complements it for content and search policy.

**Verify:**

```bash
npx tsc --noEmit
```

### 2. Move Search Ownership Into The Shell

**What:** Introduce a global search component in the top rail and remove page-local ownership from the admin layout.

**Create or modify:**

1. Add a new shell/global search component rather than reusing the admin-specific name.
2. Update `SiteNav` to render the new search surface between brand and account access.
3. Update `AppShell` and/or the root layout so the top rail receives any required server action or search context.
4. Remove the search bar block from `src/app/admin/layout.tsx`.

**Implementation details:**

1. Preserve the sparse-header rule from the business docs: brand, search, account/workspace access.
2. Keep slash-command route navigation, but source route results from shell-route truth (`resolveCommandRoutes()` or an equivalent helper), not admin-local arrays.
3. The new component should accept a role-aware search action contract that can expand beyond admin search.
4. Existing admin-only entity search should not be the only backend anymore.

**Verify:**

```bash
npx vitest run tests/shell-navigation-model.test.ts tests/site-shell-composition.test.tsx tests/admin-shell-and-concierge.test.tsx
```

### 3. Establish A Global Search Result Contract

**What:** Define the shared result shape for top-rail search so later sprints can add corpus and member-content sources without reshaping the UI.

**Create or modify:**

1. Add a `GlobalSearchResult` type with route/content/admin result kinds.
2. Add a new global search service or action module with a stable API such as:

```ts
searchGlobalEntities(query, { role, userId })
```

3. For Sprint 0, it is sufficient to return canonical route results and preserve admin-only entities for admins.

**Implementation details:**

1. Route search must come from shell-route truth.
2. Admin entity results must remain admin-only.
3. Corpus/member content sources are added in later sprints, so the result contract must already accommodate them.

**Verify:**

```bash
npx tsc --noEmit
```

---

## Completion Checklist

- [ ] Shared content-audience module exists and is imported from a neutral runtime location
- [ ] `SiteNav` owns the visible search surface
- [ ] `src/app/admin/layout.tsx` no longer owns page-local search UI
- [ ] Global search result contract exists and supports future corpus/admin composition
- [ ] Shell regression tests pass

---

## QA Deviations

- Shell placement is already implemented in `SiteNav` and `AppShell`; remaining work is limited to search composition and result coverage.