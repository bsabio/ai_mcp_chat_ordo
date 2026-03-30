# Spacing And Layout Refactor Spec

> **Status:** Implemented v1.0
> **Date:** 2026-03-27
> **Scope:** Define one governed spacing and layout contract for shell, hero, chat, account, admin, journal, jobs, and shared panel surfaces so Ordo expresses hierarchy, density, and grouping through semantic roles rather than scattered utility choices.
> **Affects:** `src/app/styles/foundation.css`, any future global spacing stylesheet imported by the app style partition, `src/components/SiteNav.tsx`, `src/components/AccountMenu.tsx`, `src/components/AudioPlayer.tsx`, `src/components/BookSidebar.tsx`, `src/components/ContentModal.tsx`, `src/components/GraphRenderer.tsx`, `src/components/MarkdownProse.tsx`, `src/components/ThemeSwitcher.tsx`, `src/components/WebSearchResultCard.tsx`, `src/components/jobs/JobsPagePanel.tsx`, `src/components/journal/JournalLayout.tsx`, `src/components/journal/PublicJournalPages.tsx`, `src/frameworks/ui/ChatHeader.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatMarkdown.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/RichContentRenderer.tsx`, `src/app/admin/journal/page.tsx`, `src/app/admin/journal/[id]/page.tsx`, `src/app/library/page.tsx`, `src/app/library/[document]/[section]/page.tsx`, `src/components/profile/ProfileSettingsPanel.tsx`, `src/components/MentionsMenu.tsx`, `src/components/ToolCard.tsx`, `scripts/spacing-audit.js`, `package.json`, tests covering shell, homepage, chat, journal, library, shared components, jobs, and audit enforcement.
> **Motivation:** The codebase already has a strong architectural shell and a partial token system, but spacing still mixes semantic precision with component-local utility choices. That weakens hierarchy, makes density feel improvised, and prevents the shell, hero stage, account rail, and product workspaces from reading as one authored language.
> **Requirement IDs:** `SLR-XXX`

---

## 1. Problem Statement

### 1.1 Verified current defect

The product currently mixes two spacing grammars:

1. semantic or tokenized spacing in high-leverage shell and chat surfaces
2. literal utility spacing in many admin, journal, jobs, menu, profile, table, and panel surfaces

Verified examples:

1. `src/components/SiteNav.tsx` uses named shell tokens such as `--shell-rail-gap`, `--shell-nav-item-gap`, and `--shell-nav-item-padding-*`. `[SLR-010]`
2. `src/components/AccountMenu.tsx` and `src/frameworks/ui/ChatInput.tsx` already use shell or composer role tokens, proving the current system can support semantic spacing. `[SLR-011]`
3. `src/components/jobs/JobsPagePanel.tsx` uses a tokenized page frame but falls back to `gap-5`, `p-4`, `px-4`, `py-3`, and related literals inside cards and panels. `[SLR-012]`
4. `src/components/journal/JournalLayout.tsx` and the admin journal routes still use literal rhythm for most internal spacing even when semantic classes and editorial surfaces already exist. `[SLR-013]`
5. `src/frameworks/ui/RichContentRenderer.tsx`, `src/components/profile/ProfileSettingsPanel.tsx`, and `src/components/MentionsMenu.tsx` already expose semantic hooks or surface labels while still relying on local spacing utilities. `[SLR-014]`

This mixed grammar is the main reason the UI can feel disciplined in places and improvised in others. `[SLR-015]`

### 1.2 Root cause

The repository already has low-level spacing tokens, runtime density controls, and semantic surface naming, but it does not yet have a complete spacing contract that answers all of the following from one system:

1. what the operational spacing scale is
2. which spacing roles exist
3. how density modifies those roles
4. where spacing ownership lives
5. when literal spacing utilities are forbidden

Without that contract, teams and future agents default back to case-by-case utility choices. `[SLR-020]`

### 1.3 Why this matters

Spacing is not decoration. It communicates relationship, grouping, density, and hierarchy. If the shell, hero, account rail, and operational surfaces do not share one governed spacing language, the interface will continue to read like adjacent local solutions rather than one product system. `[SLR-021]`

---

## 2. Governing Constraints

### 2.1 Active authorities

1. `Platform V1` is the governing product contract. This work must serve the deployable chat-first system rather than revive older presentation-first modes. `[SLR-030]`
2. `Homepage Chat Shell` owns stage sizing, scroll ownership, footer relationship, and composer placement. This spec must not reopen those boundaries. `[SLR-031]`
3. `Shell Navigation And Design System` already established token-first shell chrome. This work extends that principle from shell into the wider surface taxonomy. `[SLR-032]`
4. `Visual Theme Runtime And Semantic Surface Architecture` is the active direction for semantic surfaces and machine-safe design authority. Spacing work must fit inside that semantic-surface model rather than create a separate styling doctrine. `[SLR-033]`

### 2.2 Provenance-only input

`Swiss Layout Precision` is archived and is not an active implementation authority. However, the following diagnoses remain valid and should be preserved in updated form:

1. shell roles still need stronger rhythm and typographic hierarchy
2. hero state and conversation state need distinct but continuous spacing contracts
3. anonymous and authenticated account rails should feel like two states of one subsystem
4. shell, hero, and account surfaces still need one precise visual contract

Those truths remain useful. The archived visual philosophy does not. `[SLR-034]`

### 2.3 Architecture boundaries

This refactor must not:

1. reopen shell ownership, footer composition, or navigation scope
2. redesign chat runtime behavior or conversation semantics
3. replace the theme runtime, Tailwind, or CSS-variable model
4. restore the archived Swiss direction as current product truth

This is a system-level spacing contract layered on top of already-defined product architecture. `[SLR-035]`

---

## 3. Design Goals

1. One governed spacing grammar across shell, hero, account, admin, journal, jobs, and shared panel surfaces. `[SLR-040]`
2. Spacing expresses meaning rather than personal preference. `[SLR-041]`
3. Density is controlled through a small number of allowed modes rather than local tuning. `[SLR-042]`
4. High-leverage components inherit spacing behavior from semantic role tokens instead of inventing component-local micro-systems. `[SLR-043]`
5. The shell should read as one authored language from nav rail to hero stage to account controls to operational panels. `[SLR-044]`
6. Verification must be regression-visible through semantic hooks, token audits, and lintable restrictions against unauthorized literal spacing. `[SLR-045]`

---

## 4. Layout Grammar

### 4.1 Operational base unit

The everyday spacing grammar should move to a strict modular ladder with a **4px base unit** (`0.25rem`) for implementation. `[SLR-050]`

`--space-0` may exist as a neutral reset token for zero-spacing states, but it is not part of the operational ladder and must not be used as a substitute for semantic spacing roles. `[SLR-050A]`

Required operational ladder:

| Token | Value | Use band |
| --- | --- | --- |
| `--space-1` | `0.25rem` | hairline offsets, micro corrections |
| `--space-2` | `0.5rem` | dense control gaps, micro insets |
| `--space-3` | `0.75rem` | compact rows, compact chips |
| `--space-4` | `1rem` | default inset and default cluster spacing |
| `--space-6` | `1.5rem` | section-internal separation, panel insets |
| `--space-8` | `2rem` | major section gaps, frame padding |
| `--space-10` | `2.5rem` | relaxed section breaks |
| `--space-12` | `3rem` | page-region separation |
| `--space-16` | `4rem` | major page rhythm and desktop frame breathing room |

Not every token must be used everywhere. The important constraint is that daily implementation should come from this small discrete ladder rather than arbitrary literals. `[SLR-051]`

### 4.2 Relationship to existing phi scale

Phi tokens may remain as a provenance or macro-composition layer where they already support larger compositional relationships such as hero widths, display scale, or authored atmosphere. They must **not** remain the default operational grammar for routine gaps and padding. `[SLR-052]`

Rules:

1. routine gap, inset, stack, and panel spacing should resolve from the modular ladder
2. phi-derived values may remain only where they describe intentionally exceptional macro composition or an existing token already tied to a strong visual identity
3. new implementation work must not choose phi values directly when a semantic role token exists

This keeps repeatability and grouping clarity primary while still allowing a few larger compositional relationships to preserve current brand atmosphere. `[SLR-053]`

### 4.3 Semantic role families

Spacing must be expressed through semantic roles, not raw scale picks.

Required role families:

1. **Stack spacing**: vertical rhythm between related items in one reading sequence
2. **Cluster spacing**: horizontal or wrapped grouping for peers such as chips, action rows, and metadata clusters
3. **Inset spacing**: internal padding for cards, forms, menus, dropdown sections, and controls
4. **Rail spacing**: spacing for shell/header/account/navigation systems
5. **Section spacing**: separation between conceptual blocks inside one page or panel
6. **Page-frame spacing**: outer shell or route-level frame padding

These roles should be expressed as global tokens rather than per-component utilities. `[SLR-054]`

### 4.4 Required token families

Minimum semantic token families:

| Role family | Token examples |
| --- | --- |
| Stack | `--space-stack-tight`, `--space-stack-default`, `--space-stack-section` |
| Cluster | `--space-cluster-tight`, `--space-cluster-default`, `--space-cluster-actions` |
| Inset | `--space-inset-compact`, `--space-inset-default`, `--space-inset-panel`, `--space-inset-menu` |
| Rail | `--space-rail-gap`, `--space-rail-item-gap`, `--space-rail-item-inline`, `--space-rail-item-block` |
| Section | `--space-section-tight`, `--space-section-default`, `--space-section-loose` |
| Page frame | `--space-frame-compact`, `--space-frame-default`, `--space-frame-wide` |

Existing shell and chat tokens should be mapped into this naming system rather than abandoned. Example: `--shell-rail-gap` becomes either an alias to `--space-rail-gap` or a shell-scoped consumer of that global semantic role. `[SLR-055]`

### 4.5 Density modes

The product should support exactly three density modes:

1. `compact`
2. `default`
3. `relaxed`

Rules:

1. density changes shift semantic role tokens, not raw classes
2. `compact` reduces one step within the role family where safe, but must preserve target sizes and readable line-height
3. `relaxed` increases stack, section, and frame spacing more than chip or control spacing
4. component authors may not invent local density variants outside these modes

This preserves the current runtime density model while removing improvisation from how it applies. `[SLR-056]`

### 4.6 Typography relationship

Spacing and typography must align through rhythm rather than independent tuning.

Required rules:

1. body and support text line-heights should resolve to multiples of the 4px base where possible
2. section and stack spacing should reinforce reading hierarchy: support copy stays closer to its heading than to the next conceptual block
3. display or hero typography may use optical exceptions, but those exceptions must be documented and limited to the hero/display layer

Spacing should read as reading instruction, not merely whitespace. `[SLR-057]`

### 4.7 Allowed exceptions

Optical overrides are allowed only when all of the following are true:

1. the surface has a justified macro-compositional need
2. no existing semantic token communicates the intent correctly
3. the override is documented in CSS or the spec as an intentional exception
4. the override does not create a new component-local spacing system

One-off optical fixes must be rare and explicit. `[SLR-058]`

---

## 5. Surface Taxonomy

### 5.1 Shell rail

Includes `SiteNav`, `AccountMenu`, shell brand, primary nav, and shell-level settings.

Rules:

1. shell rails use rail tokens only
2. anonymous and authenticated account rails share the same rail and inset contracts
3. dropdown sections inherit menu inset and stack tokens rather than local paddings

[SLR-060]

### 5.2 Homepage hero

Includes hero intro stack, first-message composition, suggestion-chip band, and composer relationship.

Rules:

1. hero state uses stack and section tokens distinct from normal transcript rhythm
2. hero chip clusters use cluster tokens, not arbitrary chip padding decisions
3. hero-to-conversation transition preserves shared frame and bubble logic while changing only the relevant role-token layer

[SLR-061]

### 5.3 Conversation view

Includes transcript plane, message bubbles, attachments, action ladders, composer row, and scroll CTA.

Rules:

1. transcript spacing uses stack, cluster, and inset roles
2. message attachments and action chips must not bypass the chat token layer with unrelated literals
3. the viewport frame uses page-frame or panel-frame spacing depending on mode

[SLR-062]

### 5.4 Account and menu surfaces

Includes account dropdowns, mentions menus, profile menus, and related shell-adjacent popovers.

Rules:

1. menu surfaces use shared menu inset and menu stack tokens
2. shell-adjacent menus inherit shell density modes
3. menu rows must not choose `px-3` or `py-3` case by case once semantic tokens exist

[SLR-063]

### 5.5 Admin lists and forms

Includes admin journal routes and future operational forms.

Rules:

1. admin pages use page-frame, section, and inset tokens from the same global contract
2. forms, alerts, and metadata rails use shared inset roles for controls and cards
3. admin surfaces are not exempt from spacing governance because they are internal

[SLR-064]

### 5.6 Card and panel surfaces

Includes jobs cards, rich content blocks, tool cards, graph tables, detail panels, event rows, and profile panels.

Rules:

1. cards and panels use a shared inset and stack contract
2. selected, muted, empty, and detail states may change color or border semantics without changing spacing grammar
3. card families should be readable as one authored subsystem even when used on different routes

[SLR-065]

### 5.7 Editorial and journal surfaces

Includes journal landing pages, archive rows, feature cards, article headers, and public editorial blocks.

Rules:

1. editorial pages may preserve their own typographic voice
2. editorial voice does not justify local spacing ladders unrelated to the global role-token contract
3. journal surfaces should consume page-frame, section, stack, and inset roles with documented editorial exceptions where needed

[SLR-066]

---

## 6. Token Contract

### 6.1 Ownership location

Canonical spacing tokens must live in the global style authority layer.

Preferred ownership:

1. `src/app/styles/foundation.css` as the root token owner
2. optional extracted `spacing.css` only if imported from the same app style partition and treated as global system authority

Canonical spacing tokens must not be defined in random component files. `[SLR-070]`

### 6.2 Inheritance rules

1. low-level scale tokens define the modular ladder
2. semantic role tokens map role meaning onto the ladder
3. surface-specific tokens may resolve from semantic role tokens where a surface has a stable specialized contract, but Sprint 0 should not introduce new legacy shell or chat aliases
4. components consume semantic or surface tokens; they do not choose raw ladder values directly unless the token layer is being authored

This creates a clear chain of authority from scale to role to surface to component. `[SLR-071]`

### 6.3 Utility restrictions

Raw spacing utilities such as `gap-*`, `p-*`, `px-*`, `py-*`, `space-y-*`, and `space-x-*` should be treated as restricted in app-level product surfaces once the semantic contract exists.

Rules:

1. forbidden by default in `src/components/**`, `src/frameworks/ui/**`, and route UI in `src/app/**` for governed surfaces
2. allowed only for narrowly justified exceptions, low-level layout scaffolding, or content-renderer internals that have not yet been migrated
3. every exemption must be deliberate, documented, and auditable

[SLR-072]

### 6.4 Semantic classes and data hooks

Existing semantic classes and `data-*` hooks should be preserved and extended because they provide:

1. browser-visible regression hooks
2. test selectors
3. future machine-readable surface mapping

Spacing governance should build on these hooks rather than replace them. `[SLR-073]`

---

## 7. Migration Strategy

### 7.1 Phase 0: authority and audit reset

1. map current shell/chat tokens to the new semantic role families
2. define the modular ladder and density mapping in the global style authority
3. create a spacing audit command or lintable search path to identify unauthorized literals
4. keep the Sprint 0 enforcement path in reporting mode while jobs, journal, admin, profile, and shared panel families remain explicitly deferred

[SLR-080]

### 7.2 Phase 1: shell and shared high-leverage surfaces

Targets:

1. `SiteNav`
2. `AccountMenu`
3. `ChatHeader`
4. `ChatInput`
5. `MessageList`
6. `ChatMessageViewport`

Goal: finish the shell and chat contract first so the most visible product surfaces fully speak the new grammar. `[SLR-081]`

### 7.3 Phase 2: shared panel, menu, and card families

Targets:

1. `JobsPagePanel`
2. `RichContentRenderer`
3. `ProfileSettingsPanel`
4. `MentionsMenu`
5. `ToolCard`
6. `GraphRenderer`

Goal: convert recurring panel/menu/card patterns into reusable semantic spacing behavior. `[SLR-082]`

### 7.4 Phase 3: journal and admin surfaces

Targets:

1. `JournalLayout`
2. `PublicJournalPages`
3. `src/app/admin/journal/page.tsx`
4. `src/app/admin/journal/[id]/page.tsx`

Goal: bring editorial and operational surfaces into the same authored spacing language while preserving their typographic voice. `[SLR-083]`

### 7.5 Phase 4: enforcement and evidence

1. add lint or audit rules against unauthorized literal spacing in governed surfaces
2. update tests to assert semantic classes or data attributes on migrated surfaces
3. record browser QA evidence for shell, homepage hero, jobs, and journal after migration

[SLR-084]

---

## 8. Verification Strategy

### 8.1 Regression-visible markers

Verification should rely on markers that the browser and tests can observe.

Required markers:

1. semantic classes such as `ui-shell-*`, `ui-chat-*`, `jobs-*`, and `journal-*`
2. `data-*` surface hooks already present across shell, chat, jobs, journal, and profile
3. computed CSS custom properties for role tokens where targeted tests need stronger assurance

[SLR-090]

### 8.2 Lint and audit rules

Required enforcement:

1. add a lintable rule or scripted audit for unauthorized literal spacing utilities in governed folders
2. allow explicit file-level exclusions only where justified and documented in the Sprint 0 authority map
3. keep Sprint 0 in report-only mode, then fail CI when new unauthorized spacing literals appear in migrated surface families beginning with Sprint 1

[SLR-091]

### 8.3 Browser and test evidence

Required verification paths should include:

1. existing shell and homepage browser checks to ensure spacing work does not reopen architecture regressions
2. targeted component tests asserting semantic class and surface-hook continuity
3. focused browser QA for jobs, journal, and account dropdown surfaces after migration
4. `npm run lint:css` and the existing quality path as part of acceptance

[SLR-092]

---

## 9. Anti-Goals

This refactor explicitly does not do the following:

1. restore the archived Swiss direction as active product style `[SLR-100]`
2. redesign route architecture, footer IA, or homepage shell ownership `[SLR-101]`
3. create separate spacing systems per feature family `[SLR-102]`
4. replace semantic surfaces with component-local utility strings `[SLR-103]`
5. turn density into an unconstrained per-component tuning interface `[SLR-104]`
6. require every prose or markdown rendering edge case to share the exact same spacing tokens as shell chrome `[SLR-105]`

---

## 10. Acceptance Criteria

The spacing refactor is complete when all of the following are true:

1. a global modular spacing ladder and semantic role-token layer exist in the app style authority `[SLR-110]`
2. shell, hero, conversation, account, panel, menu, section, and page-frame roles each have named spacing tokens `[SLR-111]`
3. `compact`, `default`, and `relaxed` density modes shift semantic role tokens rather than local utility classes `[SLR-112]`
4. shell and chat surfaces no longer depend on unauthorized literal spacing utilities for their primary layout grammar `[SLR-113]`
5. jobs, journal, and admin surfaces consume the same authored spacing language with documented editorial exceptions only where justified `[SLR-114]`
6. lint or audit rules exist that flag new unauthorized literal spacing in migrated surface families `[SLR-115]`
7. targeted tests and browser QA evidence demonstrate that the new contract is visible, durable, and does not reopen shell architecture boundaries `[SLR-116]`

---

## 11. Implementation Recommendation Summary

1. keep global tokens and semantic primitives as the control plane
2. treat raw spacing literals as temporary debt, not a normal authoring mode
3. preserve existing shell and chat semantic hooks as the verification backbone
4. migrate the most visible and repeated surfaces first
5. use a modular ladder for daily implementation and reserve phi for rare macro-compositional exceptions

The required outcome is not “cleaner CSS.” The required outcome is a spacing and layout system that feels inevitable: calm, legible, scalable, and precise enough that future product growth still reads like one authored interface.
