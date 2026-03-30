# Visual Theme Runtime And Semantic Surface Architecture — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-26
> **Scope:** Establish a single runtime theme contract, replace repeated visual class composition with semantic surface primitives, and give MCP-driven UI tooling safe, high-leverage control over the live design system without sacrificing build or runtime performance.
> **Affects:** `src/components/ThemeProvider.tsx`, `src/components/ThemeSwitcher.tsx`, `src/core/entities/theme.ts`, `src/core/entities/ui-command.ts`, `src/core/use-cases/ThemeManagementInteractor.ts`, `src/core/use-cases/tools/set-theme.tool.ts`, `src/core/use-cases/tools/adjust-ui.tool.ts`, `src/core/use-cases/tools/UiTools.ts`, `src/hooks/useUICommands.ts`, `src/app/styles/*.css`, high-churn UI surfaces such as chat, jobs, shell, and journal routes, plus any config or docs that describe available theme modes

---

## 1. Problem Statement

The repository already has the beginnings of a real design system, but the
current theme architecture stops one layer too early.

Verified evidence:

1. Global tokens and theme overrides already exist in
   `src/app/styles/foundation.css`.
2. Styling concerns were recently partitioned into
   `foundation.css`, `shell.css`, `utilities.css`, `editorial.css`,
   `jobs.css`, and `chat.css`, which means the repo no longer needs a
   monolithic stylesheet to operate.
3. Runtime theme state already exists in `src/components/ThemeProvider.tsx`,
   including theme selection, dark mode, density, and accessibility settings.
4. MCP-driven UI commands already exist through `set_theme` and `adjust_ui`,
   which means the system can already change visual state at runtime.
5. The supported runtime theme set is defined in TypeScript as exactly four
   themes in `src/core/entities/theme.ts`: `fluid`, `bauhaus`, `swiss`, and
   `skeuomorphic`.
6. The current documentation describing theme coverage in
   `docs/theme-brand-audit.md` is stale relative to runtime behavior because it
   still describes a `Postmodern` theme that no longer exists in the codebase.
7. Several of the most important UI surfaces still encode visual decisions as
   long component-local class strings rather than semantic style primitives.
   Verified hotspots include:
   - `src/frameworks/ui/MessageList.tsx`
   - `src/frameworks/ui/ChatInput.tsx`
   - `src/components/jobs/JobsPagePanel.tsx`
   - `src/components/journal/PublicJournalPages.tsx`
8. Those component-local strings duplicate gradients, radii, shadows, state
   transitions, and color-mix logic that should be owned by theme-aware
   surface contracts instead of being recopied per component.

Result: the repo is partway to a strong token-driven UI system, but MCP tools,
future design work, and routine maintenance still have to fight through
component-owned visual strings that are hard to reason about, hard to change
globally, and easy to let drift.

This is now a control-plane problem, not a syntax problem. A Sass migration by
itself would improve authoring ergonomics but would not solve runtime theme
authority, semantic reuse, or MCP-safe customization.

---

## 2. Current-State Audit

### 2.1 What Is Already Working

1. Theme state is already runtime-driven rather than compile-time only.
2. CSS custom properties are already used as the core token mechanism.
3. Tailwind v4 is already integrated and works well as the layout and utility
   layer.
4. The repo already has a CSS lint path through `npm run lint:css`.
5. The existing `ThemeProvider` model already supports design themes,
   dark-mode state, density, and accessibility controls without needing a page
   reload.

### 2.2 Verified Architectural Gaps

1. **Theme truth is split across CSS, React, and tool schemas.**
   The same conceptual theme system is currently described in multiple places:
   CSS theme classes, `ThemeProvider`, `Theme` type definitions, and tool
   schema enums.
   Verified additional drift points include local UI arrays and class-reset
   lists in `ThemeSwitcher` and `ThemeProvider`, which means a manifest
   refactor is not complete unless those call sites also derive from the same
   source.
   Theme metadata is also currently modeled separately in
   `ThemeManagementInteractor`, so the refactor must either make that
   interactor consume the manifest or explicitly retire it as a parallel source
   of truth.
2. **Visual primitives are not semantic enough.**
   Many repeated visual patterns still exist only as inline arbitrary-value
   Tailwind strings rather than named surfaces such as `ui-panel`,
   `ui-bubble-user`, or `ui-composer`.
3. **MCP tools lack structured token visibility.**
   Current tooling can switch among named themes, but it cannot reason about
   token groups, surface contrast, shadow depth, accent strategy, or motion
   intent because that information is not exposed as one machine-readable
   contract.
   The repo also already has two separate UI command surfaces with overlapping
   responsibility: `set_theme` for narrow theme switches and `adjust_ui` for
   density, accessibility, dark mode, and optional theme persistence.
   That split is workable today, but this refactor must make the future command
   boundary explicit instead of letting both surfaces evolve independently.
4. **Documentation drift is already visible.**
   The brand audit doc no longer matches runtime theme support, which proves
   the current theme contract is too easy to let drift.
5. **Performance authority is informal.**
   The repo currently avoids CSS-in-JS overhead, which is good, but there is no
   explicit contract stating that theme changes must remain CSS-variable driven,
   avoid per-render style object generation, and keep semantic extraction from
   inflating the runtime work.

### 2.3 High-Value Refactor Targets

These files should be treated as first-wave extraction targets because they
combine high visibility with heavy repeated visual composition:

1. `src/frameworks/ui/MessageList.tsx`
2. `src/frameworks/ui/ChatInput.tsx`
3. `src/components/jobs/JobsPagePanel.tsx`
4. `src/frameworks/ui/ChatHeader.tsx`
5. `src/frameworks/ui/ChatMessageViewport.tsx`
6. `src/components/journal/PublicJournalPages.tsx`
7. `src/components/AccountMenu.tsx`
8. `src/components/profile/ProfileSettingsPanel.tsx`

---

## 3. Design Goals

1. Create one authoritative runtime theme contract that both UI code and MCP
   tools can trust.
2. Keep the system DRY by moving repeated visual patterns out of component
   strings and into semantic surface primitives.
3. Preserve high performance by keeping theme switching CSS-variable driven and
   avoiding runtime style computation per component render.
4. Make theme customization more expressive than a fixed theme-name enum while
   still keeping it safe and bounded.
5. Reduce documentation drift by defining one source of truth for supported
   themes, variants, and token groups.
6. Keep Tailwind v4 and the existing CSS partitioning model as the baseline
   rather than replacing them with a second styling system.
7. Preserve accessibility controls as a first-class axis, not an afterthought.

---

## 4. Non-Goals

1. Do not migrate the repo to CSS-in-JS.
2. Do not adopt Sass as the primary design-system runtime.
3. Do not replace Tailwind v4 with another utility framework.
4. Do not let MCP tools mutate arbitrary CSS files directly.
5. Do not introduce unconstrained user-authored theming that can bypass
   contrast, brand, or performance guardrails.

---

## 5. Architecture Direction

### 5.0 Command And Persistence Boundary

This refactor must explicitly preserve or replace the existing runtime command
contract instead of informally broadening `set_theme`.

Current grounded behavior:

1. `set_theme` exists as a narrow UI command for selecting a named theme.
2. `adjust_ui` already owns broader visual adjustments including density,
   accessibility presets, dark mode, color-blind settings, and optional theme
   changes.
3. authenticated preference persistence currently happens through the broader
   `adjust_ui` execution path.

Required contract decision:

1. either keep `set_theme` and `adjust_ui` as separate manifest-backed tools
   with clearly distinct responsibilities
2. or formally consolidate them behind one bounded theme-control tool and
   migrate the command, presenter, and persistence paths intentionally

This workstream must not leave both models half-active with overlapping
authority.

### 5.1 Single Theme Manifest

The repo should introduce a typed theme manifest as the canonical source of
truth for visual modes and token families.

Recommended ownership:

1. `src/lib/theme/theme-manifest.ts` for the typed source of truth
2. optional generated JSON artifact only if MCP tooling needs static external
   inspection outside the app runtime

The manifest should define:

1. supported themes
2. light and dark token overrides
3. semantic token groups
4. motion intent and shadow intent
5. density defaults and compatibility rules
6. accessibility-safe overrides
7. optional brand metadata such as label, description, and intended use

The `Theme` domain type, `ThemeProvider`, command schemas, and user-facing
theme selectors should all derive from this same source rather than manually
repeating the enum.

Minimum consumers that must be covered explicitly:

1. `src/core/entities/theme.ts`
2. `src/components/ThemeProvider.tsx`
3. `src/components/ThemeSwitcher.tsx`
4. `src/core/use-cases/ThemeManagementInteractor.ts`
5. `src/core/entities/ui-command.ts`
6. `src/adapters/CommandParserService.ts`
7. `src/core/use-cases/tools/set-theme.tool.ts`
8. `src/core/use-cases/tools/adjust-ui.tool.ts`
9. any command or presenter mapping that emits theme-related UI commands

### 5.1.1 Sprint 0 Authority Map

Before the manifest exists, Sprint 0 should treat the following files as the
current authority map that later work must unify deliberately.

| Concern | Current owner |
| --- | --- |
| Theme membership and compile-time union | `src/core/entities/theme.ts` |
| Theme class reset and document application | `src/components/ThemeProvider.tsx` |
| User-facing theme labels and selector ordering | `src/components/ThemeSwitcher.tsx` |
| Theme metadata and descriptive labels | `src/core/use-cases/ThemeManagementInteractor.ts` |
| Narrow theme tool schema | `src/core/use-cases/tools/set-theme.tool.ts` |
| Broad UI-adjustment tool schema | `src/core/use-cases/tools/adjust-ui.tool.ts` |
| Authenticated UI preference persistence | `src/core/use-cases/tools/UiTools.ts` |
| UI command type contract | `src/core/entities/ui-command.ts` |
| Legacy text-command parsing | `src/adapters/CommandParserService.ts` |
| Tool-call to UI-command mapping | `src/adapters/ChatPresenter.ts` |
| Client-side command application | `src/hooks/useUICommands.ts` |

### 5.2 Semantic Token Groups

Raw tokens such as `--background` and `--accent` should remain, but the system
needs a stronger semantic layer above them.

Minimum semantic groups:

1. canvas and page atmosphere
2. text hierarchy
3. borders and separators
4. surfaces: base, muted, elevated, floating, selected
5. actions: primary, secondary, neutral, destructive
6. status tones
7. radii scale
8. shadow scale
9. motion scale and transition presets
10. density-related spacing groups

The important shift is that component authors should stop constructing these
patterns ad hoc from low-level tokens whenever a shared semantic equivalent is
appropriate.

### 5.3 Semantic Surface Primitives

The CSS layer should expose reusable semantic primitives for the recurring
surfaces currently duplicated across TSX.

Examples of expected primitives:

1. `ui-panel`
2. `ui-panel-elevated`
3. `ui-card`
4. `ui-card-selected`
5. `ui-chip`
6. `ui-chip-primary`
7. `ui-bubble-user`
8. `ui-bubble-assistant`
9. `ui-composer-frame`
10. `ui-composer-field`
11. `ui-metric-pill`
12. `ui-shell-glass`

These can be implemented as Tailwind v4 utilities, component classes under
`@layer utilities` or `@layer components`, or a combination of both. The
implementation detail matters less than the authority contract: a shared visual
surface should have one named owner.

### 5.4 Variant Ownership In TypeScript

State-heavy React components should use typed variant maps instead of large
template literals that fuse structure, state, and theme concerns into one
string.

Expected variant axes include:

1. emphasis
2. tone
3. selected
4. disabled
5. density
6. size
7. route context when a component intentionally changes by route family

This variant layer should be small and explicit. It is a control surface for
component state, not a replacement theme engine.

### 5.5 MCP Theme Control Contract

The current MCP-facing theme-control model should evolve into a single explicit
manifest-backed contract.

Future-safe capabilities should include:

1. select a named theme preset
2. adjust density or accessibility preset
3. optionally select approved accent families or contrast modes
4. inspect the active theme profile and token groups
5. reject unsupported or unsafe mutations cleanly

This must remain bounded. MCP tools should operate on approved manifest-backed
inputs rather than arbitrary CSS properties.

If the repo keeps both `set_theme` and `adjust_ui`, the spec owner must define:

1. which fields each tool is allowed to own
2. which tool is responsible for authenticated preference persistence
3. how `useUICommands`, `ChatPresenter`, and tool schemas remain aligned
4. whether `set_theme` remains as a compatibility alias or first-class surface

### 5.6 Performance Contract

This refactor must preserve or improve runtime performance.

Hard requirements:

1. theme changes remain document-level CSS-variable updates
2. no per-component runtime style generation for shared surfaces
3. no CSS-in-JS runtime injection
4. no material increase in interaction cost for chat, shell, or jobs surfaces
5. semantic extraction should reduce repeated arbitrary utility strings rather
   than multiplying them
6. browser verification and production build must remain part of the quality
   gate

---

## 6. Implementation Strategy

### 6.1 Phase 0 - Authority Freeze

Before introducing new primitives, document the current truth and explicitly
mark drift.

Required actions:

1. define the canonical set of supported runtime themes from code
2. retire or update stale descriptive docs that mention non-existent themes
3. identify the top component hotspots with repeated visual composition

### 6.2 Phase 1 - Theme Manifest Extraction

Create the typed manifest and make runtime code consume it.

Required outcomes:

1. `Theme` type derives from the manifest
2. `ThemeProvider` reads supported themes and token payloads from the manifest
3. all hard-coded theme lists and class-reset logic derive from the same
   supported theme list
4. `set_theme` and `adjust_ui` derive their theme-related schema values from
   the same manifest-backed authority
5. `ThemeManagementInteractor` either derives its metadata from the manifest
   or is explicitly removed from authority-critical runtime paths
6. optional theme metadata becomes inspectable by future MCP tools
7. the repo explicitly documents whether `set_theme` remains standalone,
   becomes a compatibility alias, or is subsumed by a broader control surface

### 6.3 Phase 2 - Semantic Surface Layer

Extract repeated surfaces from TSX into shared primitives.

Priority order:

1. chat bubbles, chips, suggestion frames, and composer surfaces
2. jobs panels, selected cards, detail panes, and progress bars
3. shell and account chrome
4. journal and profile high-polish cards

### 6.3.1 Ordered Hotspot Buckets

Sprint 0 should preserve the following extraction order for later semantic
surface work.

| Bucket | Files | Why high leverage | Surface sensitivity | Browser verification |
| --- | --- | --- | --- | --- |
| Chat transcript and composer | `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/ChatHeader.tsx` | Highest repetition of gradients, bubble chrome, chips, and composer states; most visible user-facing interaction surface | command-sensitive and route-sensitive | mandatory |
| Shell and account chrome | `src/components/AccountMenu.tsx` plus shell route-aware surfaces | shared navigational chrome appears across routes and carries theme tone changes into account affordances | selector-sensitive and route-sensitive | mandatory |
| Jobs desk panels and cards | `src/components/jobs/JobsPagePanel.tsx` | dense repeated panel, card, selected-state, and progress styles with lower interaction complexity than chat | primarily visual with some state sensitivity | recommended, mandatory if structure changes materially |
| Journal and profile polished surfaces | `src/components/journal/PublicJournalPages.tsx`, `src/components/profile/ProfileSettingsPanel.tsx` | high-polish marketing/editorial surfaces that should consume shared semantic primitives after the core interactive layers are stable | primarily visual | recommended |

### 6.4 Phase 3 - Variant Simplification

Refactor stateful components so they compose semantic classes through explicit
variant maps rather than string concatenation with embedded visual formulas.

### 6.5 Phase 4 - MCP And QA Hardening

Extend tool and test coverage so theme state becomes a governed runtime API.

Expected outputs:

1. expanded UI-command tests for manifest-backed theme changes
2. regression checks that confirm semantic classes preserve route tone,
   density, and accessibility behavior
3. persistence and hydration coverage for authenticated preferences,
   localStorage restore, and remount-safe document state
4. selector-level coverage proving the user-facing theme picker reflects the
   same manifest-backed theme set used by runtime state and tool schemas
5. documentation for supported theme controls and safe boundaries

### 6.6 Phase 5 - Theme Profile Introspection And Governance

Complete the remaining manifest-backed design-system contract so the runtime is
not only unified, but also inspectable and defensible against drift.

Expected outputs:

1. manifest-backed theme profiles include semantic token groups, surface intent,
   motion intent, shadow intent, density defaults, and approved control axes
2. a bounded read-only inspection surface exposes supported theme profiles and
   safe control metadata without broadening mutation authority
3. governance tests fail if runtime consumers reintroduce local theme lists or
   covered hotspot surfaces regress back to duplicated shared visual formulas
4. performance-oriented guardrails remain explicit: document-level theme
   application, CSS-variable ownership, and no new runtime style-generation
   pattern for shared surfaces
5. runtime-facing docs clearly describe supported theme controls and profile
   metadata in their current shipped form rather than leaving that contract
   implicit in code

---

## 7. Verification Strategy

| Category | Minimum evidence |
| --- | --- |
| Type authority | `npm run typecheck` passes after manifest extraction |
| CSS authority | `npm run lint:css` passes after semantic utility expansion |
| Focused UI regressions | chat, shell, jobs, and journal tests remain green |
| Browser confidence | `npm run test:browser-ui` or focused browser suites stay green |
| Build safety | `npm run build` passes |
| MCP safety | UI command tests prove only supported theme controls can execute |
| Preference continuity | hydration and persistence tests prove theme state survives server restore, localStorage restore, and remounts |
| Selector integrity | the theme selector reflects the manifest-backed theme set rather than a stale local list |

Baseline verification commands:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/hooks/useUICommands.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/browser-overlays.test.tsx tests/browser-motion.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx
npm run build
```

Additional targeted suites should be added per sprint for the surfaces being
extracted.

Minimum additional targeted verification after manifest extraction:

```bash
npm exec vitest run src/adapters/ChatPresenter.test.ts src/hooks/useUICommands.test.tsx
```

Minimum selector and metadata verification after manifest extraction:

```bash
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts
```

If the sprint introduces a dedicated selector-level test for `ThemeSwitcher`,
that test should be added to the same verification package and treated as the
preferred guard for user-facing theme-list drift.

If command ownership or persistence paths are changed, the sprint must also run
the focused tests that cover theme command routing and authenticated preference
write behavior.

---

## 8. Done Criteria

1. One typed manifest defines the supported runtime themes and their token
   families.
2. `ThemeProvider`, domain theme types, and theme-related MCP tools no longer
   duplicate the supported theme contract manually.
3. user-facing theme selectors and internal theme reset lists also derive from
   the same source of truth.
4. The command boundary between `set_theme` and `adjust_ui` is explicit and
   tested, with persistence ownership defined.
5. `ThemeManagementInteractor` no longer acts as an unmanaged parallel source
   of theme metadata truth.
6. The highest-churn visual surfaces no longer rely on repeated inline class
   strings for shared visual patterns.
7. Shared surfaces are expressed through semantic primitives that are easier to
   audit and easier for MCP tooling to influence safely.
8. Runtime theme switching remains CSS-variable driven and performant.
9. Persistence and hydration paths for theme state remain intact.
10. Documentation accurately reflects the supported theme system and no longer
   drifts away from runtime reality.
11. Theme profiles expose inspectable semantic token and intent metadata to
   runtime and future MCP-safe read-only consumers.
12. Governance tests protect the refactor from regressing into duplicated theme
   authority or component-owned shared visual formulas on covered surfaces.

---

## 9. Recommended Sprint Breakdown

| Sprint | Goal |
| --- | --- |
| 0 | Freeze theme authority, correct stale docs, and map extraction hotspots |
| 1 | Introduce the typed theme manifest and unify runtime/tool theme contracts |
| 2 | Extract semantic chat and shell surfaces, then simplify variant ownership |
| 3 | Extract jobs and journal surfaces, then close the first semantic-extraction and hardening wave with browser and build QA |
| 4 | Enrich theme profiles with semantic token metadata, add read-only inspection, and install governance/performance drift audits |

This workstream should be sequenced after the completed style partitioning
refactor because it builds on the new CSS ownership boundaries rather than
replacing them.