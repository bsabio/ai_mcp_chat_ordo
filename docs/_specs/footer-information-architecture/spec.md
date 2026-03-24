# Footer Information Architecture - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-18
> **Scope:** Formalize the shell contract in which informational destinations live in the footer, the header remains sparse, and command surfaces stay aligned to the same canonical route truth.
> **Dependencies:** Shell Navigation And Design System (implemented), Homepage Chat Shell (draft), Business Planning Guide, Business Implementation Roadmap
> **Affects:** `src/lib/shell/shell-navigation.ts`, `src/lib/shell/shell-commands.ts`, `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`, `src/components/CommandPalette.tsx`, footer-linked informational routes under `src/app/`, and shell regression tests.
> **Motivation:** The product is chat-first. Informational pages should support trust, proof, pricing explanation, and research from the footer without competing with the homepage conversation surface.
> **Requirement IDs:** `FIA-XXX`

---

## 1. Problem Statement

### 1.1 Business Requirement

The business layer now defines one explicit UX rule:

1. The header is for brand and account/workspace access.
2. Informational pages belong in the footer.
3. The chat remains the primary call to action. `[FIA-010]`

### 1.2 Current State

The shell already moved `Library` out of the primary header nav and into the footer-driven information model, but there is not yet an engineering spec governing how future informational destinations should be added. `[FIA-011]`

Current shell truth lives in verified code:

1. `resolvePrimaryNavRoutes(user?)` returns header-visible routes from `SHELL_ROUTES`. `[FIA-012]`
2. `resolveFooterGroups(user?)` and `resolveFooterGroupRoutes(group, user?)` derive grouped footer navigation from the same route model. `[FIA-013]`
3. `resolveCommandPaletteRoutes(user?)` now derives command-safe navigation destinations independently of header visibility. `[FIA-014]`

### 1.3 Missing Contract

Without an engineering spec for footer-only informational IA, the project is vulnerable to three regressions:

1. Informational routes drift back into the header because there is no explicit architectural boundary. `[FIA-020]`
2. Footer pages get added ad hoc without a canonical grouping model or route purpose rule. `[FIA-021]`
3. Command palette and shell navigation drift again because future informational pages are not classified consistently. `[FIA-022]`

---

## 2. Design Goals

1. **Footer-only information model.** Informational destinations must be footer-first rather than header-first. `[FIA-030]`
2. **Sparse header.** The header should remain limited to brand identity and account/workspace access. `[FIA-031]`
3. **Canonical route purpose.** Each shell route should have a clear purpose: informational, workspace, access, or compatibility. `[FIA-032]`
4. **Command parity.** The command palette may expose footer informational destinations, but it must not depend on header visibility. `[FIA-033]`
5. **Future-proof grouping.** Footer informational pages should scale beyond `Library` to services, training, proof, founder story, and related research pages. `[FIA-034]`
6. **Chat primacy.** Informational navigation must support the chat funnel rather than compete with it. `[FIA-035]`

---

## 3. Current Architecture Inventory

### 3.1 Shell Route Model

Current route truth is defined in `src/lib/shell/shell-navigation.ts`.

Verified types and functions:

```typescript
export interface ShellRouteDefinition {
  id: string;
  label: string;
  href: string;
  kind: ShellRouteKind;
  isLegacy?: boolean;
  showInCommandPalette?: boolean;
  headerVisibility?: ShellVisibility;
  footerVisibility?: ShellVisibility;
  accountVisibility?: ShellVisibility;
}

export interface ShellFooterGroup {
  id: string;
  label: string;
  routeIds: string[];
  visibility: ShellVisibility;
}

export function resolvePrimaryNavRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[];

export function resolveCommandPaletteRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[];

export function resolveFooterGroups(
  user?: Pick<SessionUser, "roles"> | null,
): ShellFooterGroup[];

export function resolveFooterGroupRoutes(
  group: ShellFooterGroup,
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[];
```

### 3.2 Shell Command Model

Current command generation lives in `src/lib/shell/shell-commands.ts`.

Verified function:

```typescript
export function resolveShellNavigationCommandDefinitions(
  user?: Pick<SessionUser, "roles"> | null,
): ShellNavigationCommandDefinition[];
```

This function already derives palette-safe destinations from `resolveCommandPaletteRoutes(user)`, which is the correct base for footer informational pages. `[FIA-040]`

### 3.3 Surface Responsibilities

Current surfaces already divide responsibility correctly:

1. `SiteNav` renders brand, optional primary links, and account access. `[FIA-041]`
2. `SiteFooter` renders grouped footer navigation via `resolveFooterGroups()`. `[FIA-042]`
3. `CommandPalette` consumes shared shell command definitions. `[FIA-043]`
4. `AppShell` composes the header, viewport stage, and footer. `[FIA-044]`

What is missing is the product rule for how new informational routes enter that system. `[FIA-045]`

---

## 4. Architecture Direction

### 4.1 Route Purpose Contract

The shell model should explicitly treat routes as one of the following purposes:

1. **informational**: research, proof, pricing explanation, training explanation, library, founder story `[FIA-050]`
2. **workspace**: dashboard, profile, authenticated client workspace `[FIA-051]`
3. **access**: login, register `[FIA-052]`
4. **compatibility**: legacy redirects not promoted in shell IA `[FIA-053]`

This may be represented either by a new `purpose` field on `ShellRouteDefinition` or by an equivalent derived classification rule, but the classification must be explicit and testable. `[FIA-054]`

### 4.2 Header Contract

The header must not promote informational routes. `[FIA-055]`

Required rules:

1. `resolvePrimaryNavRoutes()` should remain empty or near-empty for public informational content. `[FIA-056]`
2. Informational pages must not be reintroduced into `headerVisibility`. `[FIA-057]`
3. The header may still render workspace links if product direction changes later, but those are not informational pages. `[FIA-058]`

### 4.3 Footer Contract

The footer is the canonical informational navigation surface. `[FIA-059]`

Required rules:

1. Informational pages must be discoverable from `SHELL_FOOTER_GROUPS`. `[FIA-060]`
2. Footer groups should support growth beyond `Library` without inventing dead links. `[FIA-061]`
3. Footer link labels and destinations must come from the canonical shell route model, not local arrays. `[FIA-062]`
4. Footer group naming should reflect user intent, such as `Information`, `Proof`, `Services`, or equivalent canonical group labels. `[FIA-063]`

### 4.4 Command Surface Contract

The command palette may expose informational routes, but that exposure must derive from `resolveCommandPaletteRoutes()`, not from header visibility. `[FIA-064]`

Required rules:

1. An informational page can be footer-only and still command-discoverable. `[FIA-065]`
2. Command parity tests must not assume that command navigation equals header navigation. `[FIA-066]`
3. Slash-command and palette navigation ids must remain canonical for informational routes. `[FIA-067]`

### 4.5 Informational Page Inventory Contract

New informational pages should be added only if all three are defined together:

1. real route under `src/app/` `[FIA-068]`
2. canonical shell-route definition `[FIA-069]`
3. footer group placement `[FIA-070]`

This prevents speculative IA entries and keeps the shell truthful. `[FIA-071]`

---

## 5. Security And Product Truthfulness

1. The footer must not advertise routes that do not exist. `[FIA-080]`
2. Informational pages must not bypass role restrictions on workspace or access routes. `[FIA-081]`
3. Command palette exposure must use the same visibility model as the shell route source of truth. `[FIA-082]`
4. Compatibility routes may continue to exist for redirects, but they must not appear as canonical informational destinations. `[FIA-083]`

---

## 6. Testing Strategy

Add or maintain coverage for:

1. header contract: informational routes absent from primary nav `[FIA-090]`
2. footer contract: informational routes grouped canonically in the footer `[FIA-091]`
3. command contract: informational routes remain available in palette/mentions where intended `[FIA-092]`
4. route-truth coverage: no footer informational destination points to a nonexistent route `[FIA-093]`
5. future page onboarding: adding a footer informational page requires route + shell model + tests in one change `[FIA-094]`

Target verification:

```bash
npx vitest run tests/homepage-shell-ownership.test.tsx tests/shell-navigation-model.test.ts tests/site-shell-composition.test.tsx tests/shell-acceptance.test.tsx tests/shell-command-parity.test.ts
```

---

## 7. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Formalize route-purpose rules and footer-only informational IA contract |
| 1 | Add footer-linked informational page inventory for services, training, founder story, and proof assets |
| 2 | Ensure command palette and footer grouping stay aligned as new informational pages are added |

---

## 8. Future Considerations

1. Separate footer groups for `Services`, `Proof`, and `Library` once those routes exist
2. Footer-linked pricing and training package pages
3. Footer-linked founder story and case-study pages
4. Search or filter UX inside the footer informational system if the page inventory grows substantially
