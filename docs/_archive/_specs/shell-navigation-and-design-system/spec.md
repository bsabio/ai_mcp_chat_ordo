# Shell Navigation And Design System - Architecture Spec

> **Status:** Implemented v1.1
> **Date:** 2026-03-16
> **Scope:** Remediate the app shell architecture around header, footer,
> command surfaces, route truth, shared brand composition, and shell-level
> spacing and typography discipline.
> **Affects:** `src/components/AppShell.tsx`, `src/components/SiteNav.tsx`,
> `src/components/SiteFooter.tsx`, `src/components/CommandPalette.tsx`,
> `src/components/AccountMenu.tsx`, `src/components/home/HomepageChatStage.tsx`,
> `src/hooks/useCommandRegistry.ts`, `src/frameworks/ui/ChatHeader.tsx`,
> `src/app/layout.tsx`, `src/app/globals.css`, `src/core/commands/NavigationCommands.ts`,
> `src/core/commands/ThemeCommands.ts`, new shell-navigation configuration and
> brand primitives, and new shell regression tests.
> **Motivation:** The current shell is visually promising but architecturally
> split-brain. Navigation truth is duplicated across footer, command palette,
> and chat slash-command sources; the footer exposes routes that do not exist;
> brand markup is duplicated in multiple components; and shell surfaces bypass
> the existing token layer with local spacing, type, and chrome decisions.
> These are not isolated polish issues. They are a structural information
> architecture problem.
> **Requirement IDs:** `SND-XXX`

---

## 1. Problem Statement

### 1.1 Verified Architecture Defects

The current shell has the following verified defects:

1. The footer and slash-command surfaces advertise routes that do not exist in
   the application route tree, including `/training`, `/studio`, `/docs`,
   `/patterns`, `/api`, `/privacy`, and `/terms`. `[SND-010]`
2. Navigation truth is duplicated across at least three places:
   `SiteFooter`, `CommandPalette`, and `useCommandRegistry`. These definitions
   already disagree on labels, destinations, and command ids. `[SND-011]`
3. `SiteNav` calls `usePathname()` but does not use pathname-derived state,
   leaving the header without canonical active navigation behavior while still
   paying the cost of route awareness. `[SND-012]`
4. Brand composition is duplicated in `SiteNav` and `SiteFooter`, which makes
   any future identity refresh or accessibility fix a repeated edit instead of
   a primitive change. `[SND-013]`
5. The shell already has global tokens and utilities in `globals.css`, but key
   shell surfaces still rely on local arbitrary spacing, text sizing, shadows,
   and layout chrome. The design system exists, but the shell is not actually
   using it as a contract. `[SND-014]`
6. Command surfaces are semantically inconsistent: command palette navigation,
   slash-command mentions, footer groups, and header affordances describe the
   same application in four different vocabularies. `[SND-015]`
7. The footer includes a global health/status affordance without a verified
   runtime data source, which risks presenting decorative state as operational
   truth. `[SND-016]`

### 1.2 Root Cause

The shell has evolved by accretion rather than from a canonical model.

The missing architectural layer is a shared shell information model that can
answer all of the following from one source:

1. Which routes are real and user-visible
2. Which routes belong in primary navigation, footer groups, or commands
3. What the brand primitive is
4. Which shell surfaces are allowed to express theme, navigation, and status
5. Which spacing and typography tokens govern shell chrome

Without that layer, the application re-implements navigation and shell identity
per component. `[SND-020]`

### 1.3 Why This Matters

Users experience the shell as product truth. If the shell presents dead links,
inconsistent labels, or decorative status claims, users do not interpret that
as a documentation issue. They interpret it as product unreliability.

From an engineering perspective, this is also high-cost drift: every new shell
surface re-creates the same route and design decisions in a different file.
That violates DRY and makes the browser-hardening and homepage-shell work more
fragile than it needs to be. `[SND-021]`

---

## 2. Design Goals

1. **Single source of navigation truth.** All user-visible shell navigation and
   command destinations must derive from one canonical configuration layer.
   `[SND-030]`
2. **Truthful affordances.** Header, footer, palette, and slash-command entries
   may only expose routes that exist or explicit external destinations. No dead
   placeholders in the live shell. `[SND-031]`
3. **Shared brand primitive.** Brand mark, label, and accessibility semantics
   must be defined once and reused across shell surfaces. `[SND-032]`
4. **Route-aware navigation.** Primary navigation must have an explicit active
   state contract rather than unused pathname access. `[SND-033]`
5. **Token-first shell design.** Shell chrome must adopt shared spacing,
   typography, shadow, and grouping primitives instead of repeating arbitrary
   utility strings. `[SND-034]`
6. **Command parity.** Command palette and slash-command registry must describe
   the same application destinations and theme actions, with channel-specific
   presentation layered on top of shared data. `[SND-035]`
7. **Architectural containment.** The new shell model must work with existing
   homepage-stage and browser-hardening contracts rather than re-litigating
   those responsibilities. `[SND-036]`
8. **Regression visibility.** Route drift, command drift, and brand duplication
   must become test-detectable. `[SND-037]`

---

## 3. Architecture Direction

### 3.1 Canonical Shell Information Model

Introduce a shared shell configuration layer for user-visible destinations,
brand metadata, and command-safe actions.

The model should provide typed primitives such as:

1. Primary navigation items
2. Footer link groups
3. Command-surface navigation items
4. Theme command definitions
5. Optional route metadata such as `kind`, `isLegacy`, `showInHeader`,
   `showInFooter`, and `showInCommandPalette` `[SND-040]`

Rules:

1. The canonical model must only describe routes that exist now or explicit
   external destinations that are intentionally out of app scope. `[SND-041]`
2. Legacy compatibility routes such as `/books/*` or `/book/[chapter]` may be
   represented as compatibility metadata, but they are not primary shell IA.
   `[SND-042]`
3. Component-local arrays for navigation or theme commands become forbidden once
   the shared model exists. `[SND-043]`

### 3.2 Shared Brand Primitive

The shell must have a reusable brand primitive rather than inline duplicated
markup.

Rules:

1. The brand primitive must encapsulate the mark, product name, and required
   accessible labeling. `[SND-050]`
2. Header and footer may vary surrounding layout, but not re-author the brand
   DOM independently. `[SND-051]`
3. Brand visual variants should be a prop-level concern, not a copied JSX
   fragment concern. `[SND-052]`

### 3.3 Surface Responsibility Contract

Each shell surface must own a distinct responsibility:

| Surface | Responsibility |
| --- | --- |
| `AppShell` | Document composition and route-aware shell framing |
| `SiteNav` | Primary navigation and account access |
| `SiteFooter` | Secondary grouped navigation and truthful product context |
| `CommandPalette` | keyboard-first command execution UI |
| `useCommandRegistry` | slash-command lookup and execution mapping |
| `AccountMenu` | authenticated account controls and local UI settings |

Rules:

1. `SiteNav` should not define its own hidden route catalog. `[SND-060]`
2. `SiteFooter` should not invent routes absent from the canonical model.
   `[SND-061]`
3. `CommandPalette` and `useCommandRegistry` should transform shared data into
   UI-specific command objects instead of re-declaring paths inline. `[SND-062]`
4. `AccountMenu` may expose account-only actions, but navigation links it owns
   still need to come from real route truth. `[SND-063]`

### 3.4 Route-Aware Header Contract

The current header is mostly a masthead. It needs an explicit navigation model.

Rules:

1. `SiteNav` must either render real primary navigation with active-state
   feedback or stop subscribing to pathname. `[SND-070]`
2. The chosen primary navigation set must stay intentionally small and map to
   routes that are stable user entry points. `[SND-071]`
3. Header active state must be based on route metadata, not ad hoc string
   comparisons scattered across components. `[SND-072]`

### 3.5 Shell Visual System Contract

The shell already has low-level tokens. It now needs shell-level composition
tokens and utilities.

Rules:

1. Introduce shell-scoped utilities or variables for nav height, footer grid
   rhythm, shell section headings, compact metadata text, and action-row gaps.
   `[SND-080]`
2. Shell surfaces should prefer those tokens over arbitrary pixel and rem
   values when expressing the same visual role. `[SND-081]`
3. Typography must distinguish navigation labels, meta labels, supporting copy,
   and micro-status text through shared roles rather than one-off class stacks.
   `[SND-082]`
4. Decorative operational status should either be removed or wired to a real,
   verified signal. `[SND-083]`

### 3.6 Command And Mention Unification Contract

Command palette and slash-command execution must share the same underlying
definitions where behavior overlaps.

Rules:

1. Navigation commands should be generated from the canonical shell model.
   `[SND-090]`
2. Theme commands should be generated from one shared theme-command definition,
   not duplicated per surface. `[SND-091]`
3. Slash-command labels may be shorter than palette labels, but command ids and
   destinations must stay canonical. `[SND-092]`
4. Placeholder no-op commands must not be used for destinations or capabilities
   that the shell presents as first-class application actions. `[SND-093]`

---

## 4. Security And Product Truthfulness

This feature is mostly IA and design-system work, but it still has product
truthfulness and access-boundary implications.

1. Shell navigation must not advertise routes that do not exist. `[SND-100]`
2. Authenticated-only or role-sensitive destinations must only appear where the
   current product contract actually supports them. `[SND-101]`
3. Decorative status labels must not imply live operational monitoring unless a
   verified runtime signal backs them. `[SND-102]`
4. Legacy compatibility routes may remain implemented for inbound links, but the
   shell should not promote them as canonical navigation. `[SND-103]`

---

## 5. Testing Strategy

The implementation must add or update tests for the following:

1. Route-truth coverage ensuring all shell-config destinations resolve to real
   routes or explicit external links. `[SND-110]`
2. Header rendering and active-state behavior for canonical primary nav items.
   `[SND-111]`
3. Footer rendering from canonical grouped navigation data with no dead links.
   `[SND-112]`
4. Command palette generation from shared navigation and theme definitions.
   `[SND-113]`
5. Slash-command registry parity with the same canonical command ids and route
   destinations. `[SND-114]`
6. Shared brand primitive reuse and semantics. `[SND-115]`
7. Shell token adoption or utility usage where new shell primitives are
   introduced. `[SND-116]`

Target verification remains:

```bash
npm run test -- tests/path/to/targeted-shell-tests
npm run quality
```

### 5.1 QA Evidence Mapping

| Requirement | Evidence |
| --- | --- |
| `[SND-110]` Route-truth coverage for canonical shell destinations | `tests/shell-navigation-model.test.ts` verifies canonical shell destinations stay constrained to real routes or explicit compatibility metadata; Sprint 4 targeted verification passed. |
| `[SND-111]` Header rendering and active-state behavior for canonical primary nav items | `tests/site-shell-composition.test.tsx`, `tests/homepage-shell-layout.test.tsx`, and `tests/shell-acceptance.test.tsx` verify canonical labels, active-state rendering, and rendered shell-header behavior. |
| `[SND-112]` Footer rendering from canonical grouped navigation with no dead links | `tests/site-shell-composition.test.tsx` and `tests/shell-acceptance.test.tsx` verify grouped footer rendering, dead-link removal, and truthful footer treatment. |
| `[SND-113]` Command palette generation from shared navigation and theme definitions | `tests/browser-overlays.test.tsx` and `tests/shell-acceptance.test.tsx` verify the real command palette exposes canonical navigation and theme commands. |
| `[SND-114]` Slash-command registry parity with canonical command ids and destinations | `tests/shell-command-parity.test.ts` verifies slash-command and shared command-source parity for routes, labels, and theme actions. |
| `[SND-115]` Shared brand primitive reuse and semantics | `tests/shell-brand.test.tsx`, `tests/shell-visual-system.test.tsx`, and `tests/shell-acceptance.test.tsx` verify the shared brand primitive, accessible labeling, and cross-surface reuse. |
| `[SND-116]` Shell token and utility adoption for shell chrome | `tests/shell-visual-system.test.tsx` and `tests/browser-motion.test.tsx` verify shared shell-role primitives, token-backed shell classes, and non-regressed shell chrome behavior. |

Sprint 4 final verification passed with the targeted shell/browser suite (`9`
files, `42` tests) and full `npm run quality` (`103` files, `592` tests).

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Establish canonical route truth and the shell information model |
| 1 | Refactor header and footer onto shared brand and navigation primitives |
| 2 | Unify command palette and slash-command registry with the same command sources |
| 3 | Harden shell spacing, typography, and truthful status treatment through shared shell tokens |
| 4 | Add regression coverage, QA evidence, and final shell acceptance checks |

---

## 7. Future Considerations

Out of scope for this feature unless explicitly pulled into a later sprint:

1. Full visual redesign of non-shell page content
2. New top-level routes not already present in `src/app/`
3. Reworking chat runtime behavior outside shell command and header integration
4. Replacing the existing theme system or account menu capabilities wholesale
5. Internationalization of shell labels

This feature is about making the current shell truthful, canonical, and easier
to evolve. It is not a license to broaden product scope. `[SND-120]`
