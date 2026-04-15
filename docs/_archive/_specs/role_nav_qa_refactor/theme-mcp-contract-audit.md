# Theme And MCP Contract Audit For Role/Nav Refactor

> **Status:** Research note
> **Date:** 2026-03-31
> **Scope:** Ground the role-aware navigation and admin dashboard refactor in the actual theme runtime, tool, and MCP-adjacent contracts already implemented in the repository.
> **Related:** [Role Navigation QA Refactor](./spec.md), [Admin Dashboard And Navigation Audit](./admin-dashboard-nav-audit.md)

---

## 1. Why This Audit Matters

The current navigation and admin-workspace refactor is not only an information architecture problem.

It also sits inside two existing system contracts:

1. the live runtime theme and UI-command contract
2. the live tool and MCP boundary contract

If the refactor ignores those contracts, it will introduce a cleaner menu shape while still drifting from the actual product architecture.

The goal of this note is to identify what is already true in code, what is only planned in refactor docs, and what the upcoming role/nav work must preserve.

---

## 2. Verified Live Theme Contract

### 2.1 Source of truth is already manifest-backed

The active theme system is already centralized in code.

| Concern | Live source of truth |
| --- | --- |
| Supported theme IDs | `src/lib/theme/theme-manifest.ts` |
| Theme domain type | `src/core/entities/theme.ts` |
| Selector labels and ordering | `src/lib/theme/theme-manifest.ts` via `THEME_SELECTOR_OPTIONS` |
| Approved control axes | `src/lib/theme/theme-manifest.ts` via `THEME_CONTROL_AXES` |
| Theme metadata | `src/lib/theme/theme-manifest.ts` via `THEME_MANIFEST` |

Verified current theme IDs:

1. `bauhaus`
2. `swiss`
3. `skeuomorphic`
4. `fluid`

This means the refactor should treat the manifest as the active authority, not as a future aspiration.

### 2.2 Runtime theme authority lives in `ThemeProvider`

`src/components/ThemeProvider.tsx` is the live runtime owner for theme application and persistence behavior.

Verified current behavior:

1. hydrates initial state from server-seeded snapshot props
2. restores client state from local storage
3. hydrates authenticated preferences from `/api/preferences`
4. applies theme state to `document.documentElement`
5. writes cookies for theme, dark mode, density, font size, line height, letter spacing, and color-blind mode
6. syncs persisted preferences back to `/api/preferences`
7. uses a view-transition path when supported
8. preserves an overlay fallback transition when theme changes

### 2.3 The document contract is explicit

`src/lib/theme/theme-state.ts` shows that theme is not a loose visual convention. It is a runtime document contract.

Verified document-level outputs:

1. root class `theme-{themeId}`
2. optional root class `dark`
3. `data-theme`
4. `data-theme-mode`
5. `data-theme-transition`
6. `data-density`
7. optional `data-color-blind`
8. CSS variables for base font size, line height, and letter spacing

Implication:

Any nav or dashboard refactor that tries to bypass `ThemeProvider` with component-local state, ad hoc document mutations, or hard-coded theme assumptions would violate the current runtime contract.

### 2.4 The theme command loop is already implemented end-to-end

The live theme-control plane is not limited to a selector component.

Verified path:

1. theme-related internal tool descriptors are registered in `src/lib/chat/tool-bundles/theme-tools.ts`
2. tool schemas derive from manifest data in `src/core/use-cases/tools/set-theme.tool.ts`, `src/core/use-cases/tools/adjust-ui.tool.ts`, and `src/core/use-cases/tools/inspect-theme.tool.ts`
3. `src/adapters/ChatPresenter.ts` converts `set_theme` and `adjust_ui` tool results into bounded UI commands
4. `src/hooks/useUICommands.ts` applies those commands through `ThemeProvider`
5. invalid theme values are filtered through `getSupportedTheme()` before they can mutate runtime state

This is important because the navigation refactor should treat theme control as a bounded runtime API, not as a styling side effect.

### 2.5 `inspect_theme` is live, read-only, and manifest-backed

The repo currently ships a real theme inspection tool.

Verified current behavior from `src/core/use-cases/tools/inspect-theme.tool.ts` and its tests:

1. returns supported theme IDs
2. returns ordered theme profiles from the manifest
3. returns approved control axes
4. explicitly reports that active theme state is not available from the server-side tool execution path
5. uses an empty read-only input schema

That means the refactor can assume there is already a safe introspection path for theme metadata, even though live active-theme observation remains client-owned.

---

## 3. Verified Theme Governance Guardrails

### 3.1 Theme authority is enforced by tests

The repo already has test-backed guardrails around theme drift.

Important coverage surfaces:

1. `src/components/ThemeProvider.test.tsx`
   Verifies server-seeded hydration, invalid stored-theme rejection, document attributes, CSS variable application, and the transition overlay.
2. `src/core/use-cases/tools/tool-schema-compatibility.test.ts`
   Verifies `set_theme` and `adjust_ui` theme enums remain aligned to the manifest and `inspect_theme` stays schema-safe.
3. `src/hooks/useUICommands.test.tsx`
   Verifies command application, remount continuity, and rejection of invalid theme IDs such as `postmodern`.
4. `tests/theme-governance-qa.test.ts`
   Verifies supported theme authority stays out of component-local hotspots and that covered shell/chat/journal surfaces remain bound to dedicated CSS partitions.

### 3.2 Covered semantic surface ownership is selective, not universal

The current theme governance tests explicitly cover shell, chat, journal, and now admin semantic surface hotspots.

Verified covered partitions:

1. `src/app/styles/shell.css`
2. `src/app/styles/chat.css`
3. `src/app/styles/editorial.css`
4. `src/app/styles/admin.css`

Verified current admin reality:

1. `src/components/admin/AdminSection.tsx` uses `admin-hero-surface`
2. `src/components/admin/AdminCard.tsx` uses `admin-panel-surface` plus `admin-status-*`
3. `src/components/admin/AdminSidebar.tsx` and `src/components/admin/AdminDrawer.tsx` use `admin-panel-surface` and `admin-nav-*` classes sourced from canonical admin metadata
4. `src/app/admin/layout.tsx` mounts `AdminDrawer` and the mobile toolbar wrappers that participate in the same admin surface family
5. `src/components/AccountMenu.tsx` already integrates `useTheme()` controls correctly and now derives admin workspace links from the canonical admin-nav model
6. `tests/theme-governance-qa.test.ts` now asserts admin surface ownership in `src/app/styles/admin.css`

Implication:

Sprint 3 closed the core architectural gap by formalizing admin as a first-class semantic surface family. Remaining governance work is about broader regression depth, not missing admin ownership.

### 3.3 What this means for the admin refactor

Sprint 3 chose the second path.

1. It formalized a true admin surface partition and gave it explicit semantic ownership in `src/app/styles/admin.css`.

The codebase no longer leaves admin visually defined by `jobs-*` class names, and future admin chrome work should stay in that partition rather than reintroducing borrowed semantics.

### 3.4 What Sprint 3 preserved while fixing admin theming

The current theme-system integration now has one preserved positive path, two closed gaps, and one remaining follow-up.

1. Positive preserved: `AccountMenu` theme controls still flow through `ThemeProvider`, persisted UI state, and the existing bounded UI-command system.
2. Closed gap: admin content primitives now use `admin-hero-surface`, `admin-panel-surface`, and `admin-status-*` classes in `src/app/styles/admin.css`.
3. Closed gap: the mobile admin navigator is now mounted in production and participates in the same grouped route model and admin surface family as desktop.
4. Remaining follow-up: broader role-and-route regression hardening still belongs to Sprint 4.

Sprint 3 preserved the positive path and fixed the two gaps without rebuilding theme behavior from scratch.

---

## 4. Verified Tool And MCP Architecture

### 4.1 Internal chat tools and MCP are different layers

The repository already states this clearly in architecture docs, and the code confirms it.

Live internal tool execution path:

1. `src/lib/chat/tool-composition-root.ts`
2. `src/core/tool-registry/ToolRegistry`
3. registry middleware including RBAC and logging

Live MCP server entrypoints:

1. `mcp/calculator-server.ts`
2. `mcp/embedding-server.ts`

This distinction matters because the nav/dashboard refactor should not talk about all operational tooling as though it comes from one MCP plane.

### 4.2 Theme tools are internal app tools, not MCP server tools

Theme control is currently part of the internal chat tool surface, not part of the standalone MCP servers.

Verified internal theme tools:

1. `set_theme`
2. `adjust_ui`
3. `inspect_theme`
4. `set_preference`

These are registered in the app tool registry by `registerThemeTools()`.

Implication:

The navigation refactor should think about theme as an app-runtime concern governed by the internal tool registry and `ThemeProvider`, not as an external MCP service dependency.

### 4.3 MCP server capability groups are real and specific

The repository currently ships two MCP servers.

| Server | Command | Verified tool groups |
| --- | --- | --- |
| Calculator MCP server | `npm run mcp:calculator` | `calculator` |
| Embedding MCP server | `npm run mcp:embeddings` | embeddings/search, corpus management, prompt management, conversation analytics |

Verified tool names exposed by `mcp/embedding-server.ts`:

1. `embed_text`
2. `embed_document`
3. `search_similar`
4. `rebuild_index`
5. `get_index_stats`
6. `delete_embeddings`
7. `corpus_list`
8. `corpus_get`
9. `corpus_add_document`
10. `corpus_add_section`
11. `corpus_remove_document`
12. `corpus_remove_section`
13. `prompt_list`
14. `prompt_get`
15. `prompt_set`
16. `prompt_rollback`
17. `prompt_diff`
18. `conversation_analytics`
19. `conversation_inspect`
20. `conversation_cohort`

### 4.4 The app consumes some `@mcp/*` modules as local code, not remote RPC

`tsconfig.json` maps `@mcp/*` to the local `mcp/*` folder.

Verified current application usage:

1. `src/lib/operator/loaders/admin-review-loaders.ts` imports `conversationAnalytics` from `@mcp/analytics-tool`
2. `src/lib/operator/loaders/analytics-funnel-loaders.ts` imports `conversationAnalytics` from `@mcp/analytics-tool`
3. `src/app/api/admin/routing-review/route.ts` also imports `conversationAnalytics` from `@mcp/analytics-tool`

This means those admin analytics surfaces are currently coupled to a local code module contract, not to a running external MCP stdio process.

That distinction is important when discussing resilience and architecture.

For the dashboard/nav refactor, the relevant dependency is:

1. local analytics module contract availability
2. database access for those analytics functions
3. admin-only gating in the loaders and routes

It is not a browser-to-MCP network dependency.

### 4.5 Instance config currently adds very little tool variance

`src/lib/config/instance.ts` loads `identity.json`, `prompts.json`, `services.json`, and `tools.json`, validates them, and merges with defaults.

For this specific refactor, the important live facts are:

1. `config/tools.json` is currently empty
2. `config/services.json` is currently minimal and not shaping admin navigation
3. instance-level tool filtering exists in `src/lib/chat/tool-composition-root.ts`, but there is no current rich tool policy in config driving this refactor

Implication:

The role/nav refactor should be grounded first in code-level registry and RBAC truth, not in an assumption that instance config is already defining the operational surface.

---

## 5. Verified Documentation Drift

### 5.1 Theme docs are split between accurate and incomplete sources

`docs/theme-brand-audit.md` is relatively aligned with the live theme contract. It documents:

1. `inspect_theme`
2. `set_theme`
3. `adjust_ui`
4. the four current theme IDs
5. the bounded control axes

But the more general product docs are incomplete.

Verified current drift:

1. `README.md` lists `set_theme` and `adjust_ui` in the internal tool layer but omits `inspect_theme`
2. `docs/operations/user-handbook.md` also omits `inspect_theme` from the internal tool guide

### 5.2 Some refactor docs are architectural intent, not live source of truth

`docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` is useful because it identifies the right architectural direction, but it must not be treated as the only authority.

Reason:

1. several of its goals are already partially implemented in live code
2. the active authority today is still the manifest/provider/tool/test chain described above

Use that spec as target-state rationale, not as a replacement for the current runtime contract.

---

## 6. What The Role/Nav Refactor Must Preserve

### 6.1 Preserve runtime theme authority

The refactor must keep `ThemeProvider` as the owner for live theme state application and persistence.

Required preservation points:

1. no component-local theme enum duplication
2. no direct document mutations outside the theme runtime helpers
3. no new route-shell logic that bypasses `ThemeProvider`
4. no local visual-state model that fights `data-theme`, `data-theme-mode`, or `data-density`

### 6.2 Preserve semantic CSS partitioning

Shell surfaces already have dedicated ownership in `src/app/styles/shell.css`, and that ownership is test-backed.

For the upcoming drawer/sidebar work:

1. keep shell nav and account/drawer chrome grounded in `shell.css`
2. avoid scattering long arbitrary-value strings across new nav components
3. extend admin chrome inside `src/app/styles/admin.css` rather than falling back to `jobs-*` naming or scattered arbitrary-value strings

### 6.3 Preserve the bounded UI-command model

The app already has a bounded command vocabulary:

1. `set_theme`
2. `adjust_ui`
3. `navigate`

The nav refactor should stay compatible with that model.

Examples:

1. route changes should continue to work through `navigate`
2. theme changes should continue to work through `set_theme` or `adjust_ui`
3. the UI should not require a new unbounded theme-mutation path just to support the drawer/dashboard refactor

### 6.4 Preserve analytics-backed admin blocks as server-owned summaries

Current admin dashboard insight blocks depend on server-side loaders that call local analytics modules under `@mcp/analytics-tool`.

That means:

1. analytics summaries should stay server-owned
2. admin-only gating must remain in loaders and page access
3. the drawer/nav refactor should not move those calculations into client state
4. `unavailableCard(...)` style fail-soft behavior remains a useful pattern for blocks with operational dependencies

### 6.5 Preserve the internal-tool versus MCP boundary

The role/nav refactor should continue to reflect the repo’s stated rule that MCP is part of the system boundary, not the whole system.

Translated into practical terms:

1. theme control belongs to the internal tool/runtime/UI layer
2. analytics-backed admin summaries depend on local `@mcp/*` module contracts today
3. standalone MCP servers remain operational interfaces, not the defining architecture for page navigation

---

## 7. Concrete Requirements For The Upcoming Refactor

### 7.1 Information architecture requirements

1. derive shell, account, and admin nav from shared route metadata rather than local arrays
2. keep route visibility aligned with page gates and RBAC
3. keep admin analytics and jobs surfaces represented as workspaces, not hidden side channels
4. ensure desktop and mobile admin shells describe the same shipped workspace model once the mobile navigator is mounted

### 7.2 Theme-system requirements

1. new shell or admin surfaces should bind to named semantic classes in an owned CSS partition
2. if admin stops borrowing jobs primitives, replace them with extracted operational primitives rather than inline visual strings
3. extend or add tests when the refactor introduces a new first-class admin surface family
4. do not fork theme-control state just to support responsive admin navigation

### 7.3 Tool and MCP requirements

1. do not describe theme mutation as an MCP server concern when it is an internal tool concern
2. do not assume `tools.json` is currently shaping the live navigation surface; it is not
3. keep analytics-dependent dashboard summaries server-side and admin-gated
4. keep documentation aligned with the real internal tool surface, including `inspect_theme`

---

## 8. Bottom Line

The codebase already has stronger contracts than the current admin/navigation surface suggests.

The live theme system is already manifest-backed, command-driven, persisted, and test-governed. The live tool architecture already distinguishes internal chat tools from MCP servers. The live admin analytics blocks already depend on local `@mcp/*` module contracts rather than external RPC.

So the safe path for the role/nav refactor is:

1. keep shell and theme behavior inside the existing manifest/provider/command contract
2. make admin navigation derive from one shared route model
3. give admin a real semantic surface model instead of continuing to borrow jobs class names
4. mount a real mobile admin navigator through that same route and theme system rather than leaving mobile as an implicit no-nav state
5. treat MCP accurately as a supporting operational boundary, not as the UI system or the primary tool model
