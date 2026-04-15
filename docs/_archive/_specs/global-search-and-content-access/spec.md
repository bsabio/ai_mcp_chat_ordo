# Global Search And Content Access

> **Status:** In progress v1.0
> **Date:** 2026-03-30
> **Scope:** Define one global top-rail search surface for all users, move search ownership out of admin page layouts, and make content/search access enforce the same role-aware policy across shell UI, library routes, chat tools, and future member-content expansion.
> **Dependencies:** RBAC, Shell Navigation And Design System, Footer Information Architecture, Librarian
> **Affects:** `src/components/SiteNav.tsx`, `src/components/AppShell.tsx`, `src/lib/shell/shell-navigation.ts`, `src/lib/auth.ts`, `src/lib/admin/search/admin-search.ts`, `src/core/entities/corpus.ts`, `src/core/use-cases/CorpusRepository.ts`, `src/adapters/FileSystemCorpusRepository.ts`, `src/lib/corpus-library.ts`, `src/app/library/**`, `src/core/use-cases/tools/search-corpus.tool.ts`, `src/core/use-cases/tools/get-section.tool.ts`, `src/core/tool-registry/ToolResultFormatter.ts`
> **Motivation:** The business needs search and retrieval to reflect account level at the core of the system. Anonymous users may search public content. Signed-in members may search public plus member content. Admin/operator search remains role-gated. The current codebase now composes corpus content into the shell search surface, and the remaining work is direct-route enforcement plus any future inbox/feed surface that consumes the notification path.
> **Requirement IDs:** `GSCA-XXX`

---

## 1. Problem Statement

### 1.1 Search Ownership Has Already Moved Into The Shell

The current runtime already renders search from the shell top rail, not from the admin layout.

Verified current state:

1. `AppShell({ user, children, searchAction })` passes the search action to `SiteNav` for home, default, and admin surfaces. `[GSCA-001]`
2. `SiteNav({ user, searchAction })` renders `GlobalSearchBar` between brand and account access. `[GSCA-002]`
3. `src/app/admin/layout.tsx` no longer owns search UI. `[GSCA-003]`

The remaining question is not shell placement, but whether the search backend composes all permitted sources, especially corpus content. `[GSCA-004]`

### 1.2 Access Control Is Partially Shared Across Layers

The runtime already has a shared content-audience model, and the remaining question is whether every direct-navigation path and future alert surface stays aligned to it.

Verified current state:

1. `ToolDescriptor.roles` still expresses role access as `RoleName[] | "ALL"`. `[GSCA-005]`
2. `ToolExecutionContext` still carries `role` and `userId`. `[GSCA-006]`
3. `search_corpus` remains available to `ALL`, while `get_section`, `get_checklist`, and `list_practitioners` remain member-only. `[GSCA-007]`
4. `RoleAwareSearchFormatter` still strips passage and slug detail for anonymous `search_corpus` results. `[GSCA-008]`
5. `src/lib/access/content-access.ts` now provides the shared `ContentAudience` contract and audience-role helpers. `[GSCA-009]`

Tool-layer policy is no longer the only protection, and search composition now catches up with corpus visibility. `[GSCA-010]`

### 1.3 Library Routes Already Enforce Audience Metadata

The library route path already resolves the viewer role and uses audience metadata to gate chapter access.

Verified current state:

1. `src/app/library/[document]/[section]/page.tsx` resolves the viewer role with `getViewerRole()` and passes it into `getSectionFull(...)`. `[GSCA-011]`
2. `src/lib/corpus-library.ts` threads role options through `GetChapterInteractor`, `LibrarySearchInteractor`, and the other corpus facades. `[GSCA-012]`
3. `FileSystemCorpusRepository` parses `book.json` audience metadata and chapter frontmatter audience overrides. `[GSCA-013]`
4. `Document` and `Section` now carry `audience: ContentAudience`. `[GSCA-014]`

The remaining work is making every discoverability surface use that same model, especially direct-route enforcement and any future inbox/feed surface. `[GSCA-015]`

### 1.4 The Business Requirement Is Stronger Than A UI Move

The business case is not only “move the search box.” The system must ensure that the data a user can discover through search, chat, and direct navigation is controlled by account level.

That requirement is already reflected in project documentation:

1. Brand and business docs require a sparse header with account/workspace access in the top rail. `[GSCA-015]`
2. RBAC and operations docs describe anonymous access as limited/demo-like and authenticated access as full member library access. `[GSCA-016]`
3. The current code enforces that distinction in the content model, library routes, tool boundary, and the global search composition layer. `[GSCA-017]`

Without a shared content-access contract, the product can continue to drift into contradictory behavior: one role policy in chat tools, another in shell search, and none in direct content routes. `[GSCA-018]`

---

## 2. Design Goals

1. **One shell-owned search surface.** Search already belongs in the top rail, not inside admin pages. `[GSCA-020]`
2. **Role-aware search for every user.** Anonymous, member, staff, and admin users should all see search, but only for content they are allowed to discover. `[GSCA-021]`
3. **Shared access authority.** UI search, chat retrieval, and direct library routes should all use one access model instead of duplicating policy. `[GSCA-022]`
4. **Public-plus-member content model.** The current implementation already supports at least `public` and `member` content tiers, with an extension path for staff/admin-only content later. `[GSCA-023]`
5. **Reuse existing RBAC seams.** The design must leverage `RoleName`, tool role arrays, `ToolExecutionContext`, `getSessionUser()`, and shell-route visibility instead of introducing a second RBAC system. `[GSCA-024]`
6. **Header stays sparse.** The top rail may gain search, but it must not turn into a dashboard-style primary navigation bar. `[GSCA-025]`
7. **Admin data remains private.** Admin entities stay role-gated even when search becomes global. `[GSCA-026]`
8. **Member content is real content, not formatting.** Search hiding alone is insufficient; direct route and retrieval access must also be enforced. `[GSCA-027]`

---

## 3. Verified Current Architecture

### 3.1 Shell And Navigation

Verified files and signatures:

```ts
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode })

export function SiteNav({ user }: { user: SessionUser })

export function resolvePrimaryNavRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[]

export function resolveCommandRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[]

export function resolveAccountMenuRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[]
```

Observations:

1. `SiteNav` is already the correct place for a global search rail. `[GSCA-030]`
2. `resolveCommandRoutes(user?)` already gives role-aware route visibility for slash-command style navigation. `[GSCA-031]`
3. `src/app/admin/layout.tsx` already no longer owns search UI. `[GSCA-032]`

### 3.2 Auth And Role Model

Verified files and signatures:

```ts
export type RoleName = "ANONYMOUS" | "AUTHENTICATED" | "APPRENTICE" | "STAFF" | "ADMIN"

export async function getSessionUser(): Promise<SessionUser>

export async function requireRole(allowedRoles: RoleName[])
```

Observations:

1. The project already has one canonical role union. `[GSCA-033]`
2. Anonymous fallback is explicit in `getSessionUser()`, which is the correct runtime default for public routes. `[GSCA-034]`
3. The new feature should extend this model, not replace it. `[GSCA-035]`

### 3.3 Tool RBAC And Search Formatting

Verified files and signatures:

```ts
export interface ToolDescriptor<TInput = unknown, TOutput = unknown> {
  name: string
  schema: AnthropicToolSchema
  command: ToolCommand<TInput, TOutput>
  roles: RoleName[] | "ALL"
  category: ToolCategory
}

export interface ToolExecutionContext {
  role: RoleName
  userId: string
  conversationId?: string
}

export class ToolRegistry {
  getSchemasForRole(role: RoleName): ...
  execute(name: string, input: Record<string, unknown>, context: ToolExecutionContext): Promise<unknown>
  canExecute(name: string, role: RoleName): boolean
}
```

Observations:

1. The tool registry already owns per-role capability exposure. `[GSCA-036]`
2. `search_corpus` and `get_section` prove the project already distinguishes discovery from full-content access. `[GSCA-037]`
3. The new feature should make pages and shell search converge on the same distinction. `[GSCA-038]`

### 3.4 Corpus And Library Model

Verified files and signatures:

```ts
export interface Document {
  slug: string
  title: string
  id?: string
  number: string
}

export class Section {
  constructor(
    documentSlug: string,
    sectionSlug: string,
    title: string,
    content: string,
    contributors: string[],
    supplements: string[],
    headings: string[],
  )
}

export interface CorpusRepository extends CorpusQuery, SectionQuery {}
```

Observations:

1. The corpus model now includes visibility metadata. `[GSCA-039]`
2. `FileSystemCorpusRepository` is the correct adapter seam for manifest and chapter-level audience parsing. `[GSCA-040]`
3. `LibrarySearchInteractor` and `GetChapterInteractor` are the correct use-case seams for enforcing content access. `[GSCA-041]`

---

## 4. Architecture Direction

### 4.1 New Shared Access Model

Introduce one shared content-access contract used by shell search, library routes, corpus use cases, and chat tools. This is now implemented in `src/lib/access/content-access.ts`.

Recommended shape:

```ts
export type ContentAudience = "public" | "member" | "staff" | "admin"

export interface AccessContext {
  role: RoleName
  userId?: string
}

export function canAccessAudience(audience: ContentAudience, role: RoleName): boolean
export function getAudienceRoles(audience: ContentAudience): readonly RoleName[]
```

Rules:

1. `public` means all roles including `ANONYMOUS`. `[GSCA-050]`
2. `member` means `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN`. `[GSCA-051]`
3. `staff` means `STAFF` and `ADMIN`. `[GSCA-052]`
4. `admin` means `ADMIN` only. `[GSCA-053]`

This does not replace `ToolDescriptor.roles`; it gives content and search a role-aware contract with the same semantics. `[GSCA-054]`

### 4.2 Corpus Metadata Upgrade

The corpus already carries audience metadata.

Required fields:

1. `book.json` already accepts an `audience` field with default `public`. `[GSCA-055]`
2. Chapter markdown already optionally overrides book-level audience through frontmatter. `[GSCA-056]`
3. `Document` and `Section` already include `audience: ContentAudience`. `[GSCA-057]`

Rules:

1. If a chapter omits audience, it inherits from the book manifest. `[GSCA-058]`
2. Search and retrieval must use the effective audience, not the raw book default when an override exists. `[GSCA-059]`
3. Member content must never be emitted to anonymous users through search results, page render, or direct retrieval. `[GSCA-060]`

### 4.3 Global Search Rail

Search moves into the main top rail and becomes available to all users.

Required behavior:

1. `SiteNav` already owns the rendered search UI. `[GSCA-061]`
2. `src/app/admin/layout.tsx` already removed the page-local search bar. `[GSCA-062]`
3. The search UI currently supports command-style route navigation from canonical shell routes and admin entity search from a role-aware backend. `[GSCA-063]`
4. The top rail stays sparse: brand, search, account/workspace access. `[GSCA-064]`

### 4.4 Global Search Service

Introduce a server-side search service that composes multiple sources behind one role-aware contract. The current implementation covers shell routes and admin entities, but not corpus content.

Recommended shape:

```ts
export interface GlobalSearchResult {
  kind: "route" | "document" | "section" | "admin-entity"
  id: string
  title: string
  subtitle: string
  href: string
  audience: ContentAudience | "route"
  source: "shell" | "corpus" | "admin"
  updatedAt?: string
}

export async function searchGlobalEntities(
  query: string,
  context: { role: RoleName; userId: string },
): Promise<GlobalSearchResult[]>
```

Source rules:

1. Shell routes come from `resolveCommandRoutes(user)` or an equivalent shell-truth helper. `[GSCA-065]`
2. Corpus results are now added from role-filtered corpus search/index services. `[GSCA-066]`
3. Admin entities are included only for `ADMIN`, via `searchAdminEntities()`. `[GSCA-067]`
4. Member-only future entities can be added later without changing the shell UI contract. `[GSCA-068]`

### 4.5 Library Route Enforcement

Library delivery must stop assuming that every section is public.

Required behavior:

1. The index page may show public items to everyone and member items only to eligible roles. `[GSCA-069]`
2. A direct request to a member-only library route by an anonymous user should redirect to login with return-path intent, rather than leak content; the redirect semantics still need to be verified across every route family. `[GSCA-070]`
3. A request to a role-restricted route outside the current role should never render inaccessible content. `[GSCA-071]`
4. SEO metadata and static param generation must not publish member-only sections as public crawlable inventory. `[GSCA-072]`

### 4.6 Tool Convergence

The tool layer already has partial protections. The feature should make those protections authoritative rather than merely cosmetic.

Required behavior:

1. `search_corpus` must only return results the current role can actually navigate to; the tool formatter and corpus use cases already support part of this contract. `[GSCA-073]`
2. `get_section`, `get_checklist`, and `list_practitioners` must continue to respect member-only rules. `[GSCA-074]`
3. `RoleAwareSearchFormatter` should remain a presentation layer, not the only enforcement layer. `[GSCA-075]`
4. Tool calls, shell search, and direct pages must agree about what a role can access. `[GSCA-076]`

---

## 5. Security And Access Rules

1. Anonymous users may search and view only `public` content. `[GSCA-080]`
2. Signed-in members may search and view `public` plus `member` content. `[GSCA-081]`
3. Staff/admin-only content must never be exposed by public routes, search snippets, or client-side filtering alone. `[GSCA-082]`
4. Admin entity search must remain unavailable outside `ADMIN`. `[GSCA-083]`
5. Content access is already enforced server-side in routes and use cases, and the shell search composition layer now adopts the same filtering. `[GSCA-084]`
6. The role used for chat/tool access and the role used for page/search access comes from the same session model. `[GSCA-085]`

---

## 6. Testing Strategy

Add or extend coverage in these groups:

1. **Shell placement:** search appears in `SiteNav`, not `admin/layout`, across home/default/admin shells. `[GSCA-090]`
2. **Route visibility:** slash-command route search respects `resolveCommandRoutes()` and account visibility. `[GSCA-091]`
3. **Corpus access model:** repository parsing, inherited audience, chapter override, and audience filtering all work. `[GSCA-092]`
4. **Library routes:** anonymous users cannot render member-only content by direct URL. `[GSCA-093]`
5. **Tool convergence:** `search_corpus` and `get_section` agree with page access rules. `[GSCA-094]`
6. **Admin privacy:** admin entities never appear for non-admin users in global search results. `[GSCA-095]`
7. **Regression alignment:** existing tool-registry, formatter, shell, and library tests remain green after the new authority is introduced. `[GSCA-096]`

Target verification set:

```bash
npx vitest run tests/shell-navigation-model.test.ts tests/site-shell-composition.test.tsx tests/admin-search-bar.test.tsx tests/tool-registry.integration.test.ts tests/tool-result-formatter.test.ts tests/core-policy.test.ts
npx tsc --noEmit
npm run build
```

The implementation sprint docs refine this verification set further. `[GSCA-097]`

---

## 7. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Shared access contract and shell search placement are implemented; validate remaining edge cases |
| 1 | Corpus audience metadata and library enforcement are implemented; verify route and inventory coverage |
| 2 | Converge global search, chat/tool retrieval, and admin/entity search on the same role-aware policy and close QA |

---

## 8. Future Considerations

1. Per-record customer workspace search can join the same search contract later without changing shell ownership. `[GSCA-100]`
2. Vector and BM25 indexes may later store audience metadata directly for faster filtered retrieval. `[GSCA-101]`
3. Staff-only and admin-only corpus content is intentionally reserved in the audience model even if the first rollout only seeds `public` and `member`. `[GSCA-102]`
4. An admin/editorial surface for setting content audience is out of scope for this package; the first rollout can use manifests/frontmatter. `[GSCA-103]`
5. Personalized ranking, recent-item boosting, and conversation-aware search expansion are deferred until access enforcement is correct. `[GSCA-104]`