# Sprint 2 — Global Search Convergence And QA

> **Goal:** Converge shell search, corpus search, admin/entity search, and chat/tool retrieval on the same role-aware access policy, then close the feature with focused QA.
> **Spec Sections:** `GSCA-065` through `GSCA-097`
> **Prerequisite:** Sprints 0 and 1 complete

---

## Available Assets

| Asset | Verified shape | Why it matters |
| --- | --- | --- |
| `src/lib/admin/search/admin-search.ts` | `searchAdminEntities(query, options?): Promise<AdminSearchResult[]>` | Existing admin-only entity search should be reused, not replaced |
| `src/core/use-cases/tools/search-corpus.tool.ts` | `search_corpus` is `roles: "ALL"` | Discovery is already a separate concern from full-content access |
| `src/core/use-cases/tools/get-section.tool.ts` | `get_section` is member-only | This tool must agree with page and search access outcomes |
| `src/core/tool-registry/ToolResultFormatter.ts` | `RoleAwareSearchFormatter` strips anonymous result detail for `search_corpus` | Keep this as presentation shaping after enforcement, not instead of enforcement |
| `src/lib/chat/tool-composition-root.ts` | `createToolRegistry(...)` composes `ToolRegistry`, `RbacGuardMiddleware`, and `RoleAwareSearchFormatter` | This is the runtime seam for converging tool behavior with the new access model |
| `tests/tool-registry.integration.test.ts` and `tests/tool-result-formatter.test.ts` | existing tool RBAC and formatting coverage | Extend the current protection surface rather than replacing it |
| `tests/shell-navigation-model.test.ts`, `tests/site-shell-composition.test.tsx`, `tests/admin-search-bar.test.tsx` | shell and search UI regression surfaces | Use these to validate shell ownership and route discovery behavior |

---

## Tasks

### 1. Compose One Global Search Backend

**What:** Implement the search service promised in Sprint 0 so one backend composes all relevant sources under role-aware filtering.

**Create or modify:**

1. Add `searchGlobalEntities(query, context)` implementation.
2. Compose results from:
   - role-filtered corpus search/index data
   - admin entity search for `ADMIN` only
3. Return a stable `GlobalSearchResult[]` contract consumed by the top-rail component.

**Implementation details:**

1. Anonymous users should never receive admin results.
2. Anonymous users should never receive member-only corpus results.
3. Member users should receive both `public` and `member` corpus results.
4. Route results should continue to derive from shell-route truth, not hard-coded UI arrays.
**Verify:**

```bash
npx tsc --noEmit
```

### 2. Align Chat Tools With The Shared Access Model

**What:** Make sure tool behavior matches page and shell-search access decisions.

**Create or modify:**

1. Update the corpus tool commands or their underlying use cases so they rely on the new audience filtering.
2. Keep `search_corpus` available to `ALL`, but ensure it only emits items the current role can discover.
3. Keep `get_section`, `get_checklist`, and related member tools consistent with the audience contract.

**Implementation details:**

1. Anonymous output trimming in `RoleAwareSearchFormatter` should remain as a second layer of safety and UX shaping.
2. The formatter should no longer be the only reason anonymous users fail to see member details.
3. Tool execution and direct page access should now agree on the same item set.

**Verify:**

```bash
npx vitest run tests/tool-registry.integration.test.ts tests/tool-result-formatter.test.ts tests/core-policy.test.ts tests/search/tool-integration.test.ts
```

### 3. Close The Shell QA Loop

**What:** Replace admin-local search assumptions in the test surface with top-rail global-search expectations and verify the feature end to end.

**Create or modify:**

1. Update or replace `tests/admin-search-bar.test.tsx` so it validates the new shell/global search component instead of the admin-local owner.
2. Add route-role tests proving anonymous, member, and admin users see different result sets from the same top-rail search.
3. Add focused route tests proving inaccessible content cannot be reached by direct URL.

**Implementation details:**

1. Keep test scope aligned to the spec: shell placement, corpus access, admin privacy, and tool convergence.
2. Do not allow a UI-only change to satisfy the sprint if route and use-case enforcement are still inconsistent.

**Verify:**

```bash
npx vitest run tests/shell-navigation-model.test.ts tests/site-shell-composition.test.tsx tests/tool-registry.integration.test.ts tests/tool-result-formatter.test.ts tests/search/tool-integration.test.ts
npx tsc --noEmit
```
- [x] Corpus tool behavior matches direct page and shell search access rules
- [x] Admin-only entities remain private to admins in the global search surface
- [x] Focused tests, type-check, and build all pass

---

## QA Deviations

- Shell route search, corpus composition, and admin entity search now exist in the global search action. The remaining work is anonymous-member content exposure verification across direct routes and any future inbox/feed work that reuses the deferred-job notification path.