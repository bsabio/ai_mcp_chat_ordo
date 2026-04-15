# Active Spec Inventory

> **Parent spec:** [Platform Convergence And Spec Rationalization](../spec.md)
> **Date:** 2026-03-23
> **Purpose:** Classify the current `docs/_specs/` feature families against Platform V1 so the repository has an explicit boundary between authoritative, supporting, legacy, and archive-ready specs.

---

## 1. Classification Rules Used

This inventory applies the authority model defined in [the parent spec](../spec.md):

1. `platform-v1` is the only top-level `authoritative` product contract.
2. `supporting` means the feature still defines required architecture, runtime behavior, or preserved platform capability under Platform V1.
3. `legacy` means the feature still explains shipped code or historical reasoning but no longer represents the preferred product direction.
4. `archive-ready` means the feature is already superseded enough that it can move under `docs/_specs/archive/` after an archive note is written.

---

## 2. Active Inventory

| Feature | Status | Listed In Active Index | Rationale | Successor / Authority | Code Dependency Note |
| --- | --- | --- | --- | --- | --- |
| `platform-v1` | `authoritative` | Yes | Primary product contract for the current chat-first business platform. | `platform-v1` | Active runtime and cleanup work are explicitly being steered by this spec. |
| `platform-v0` | `supporting` | No | Defines the foundational refactors that V1 depends on and still references directly. | `platform-v1` | Current chat architecture and prompt/composition seams still reflect these refactors. |
| `platform-convergence-and-spec-rationalization` | `supporting` | Yes | Governs the cleanup process that aligns the repo and spec set to Platform V1. | `platform-v1` | Drives documentation classification, archive workflow, and future cleanup tasks. |
| `rbac` | `supporting` | Yes | Auth, roles, and policy boundaries remain core cross-cutting platform infrastructure. | `platform-v1` | Runtime auth and protected tool access still depend on this contract. |
| `tool-architecture` | `supporting` | Yes | Registry-based tool execution is core to the chat-first product model. | `platform-v1` | Current tool wiring, dispatch, and role-aware execution depend on it. |
| `vector-search` | `supporting` | Yes | Retrieval remains a core knowledge and grounding substrate. | `platform-v1` | Search/index/embedding behavior is part of the shipped knowledge pipeline. |
| `librarian` | `supporting` | Yes | Defines the core knowledge-ingestion and corpus-management substrate preserved by V1. | `platform-v1` | Build-time and admin-managed content workflows depend on this model. |
| `interactive-chat-actions` | `supporting` | No | Strong fit for V1 because it turns business actions into chat-native controls rather than separate UI surfaces. | `platform-v1` | Rich content rendering and next-step action affordances are active chat-surface concerns. |
| `web-search` | `supporting` | Yes | Remains a valid admin/tool capability behind the conversational interface. | `platform-v1` | Existing tool infrastructure and admin search workflows still use it. |
| `conversation-memory` | `supporting` | Yes | Supports the long-lived relationship model and continuity expected by V1. | `platform-v1` | Chat continuity and persistence behavior still rely on these concepts. |
| `chat-runtime-hardening` | `supporting` | Yes | Operational runtime hardening remains relevant to the shipped chat system. | `platform-v1` | Current `/api/chat` and `/api/chat/stream` behavior reflects this work. |
| `chat-experience` | `supporting` | Yes | Message semantics, scroll behavior, and calmer conversation UX remain active chat-surface requirements. | `platform-v1` | Existing UI behavior and tests still reflect this spec family. |
| `homepage-chat-shell` | `supporting` | Yes | Homepage-first chat stage remains aligned with V1's front-door requirement. | `platform-v1` | Current homepage chat surface and related tests still depend on this framing. |
| `browser-ui-hardening` | `supporting` | Yes | Cross-browser and mobile verification remain necessary for a phone-first product. | `platform-v1` | Playwright/browser coverage and shell robustness still depend on it. |
| `footer-information-architecture` | `supporting` | Yes | Sparse, footer-led information architecture remains aligned with a chat-first product surface. | `platform-v1` | Shell route truth and informational-page organization still use this reasoning. |
| `conversation-lane-routing` | `supporting` | Yes | Lane-aware prompt and workflow behavior remains part of the business system. | `platform-v1` | Current routing context and workflow logic still reference this concept. |
| `progressive-contact-capture` | `supporting` | Yes | In-thread capture is compatible with V1's conversational intake model. | `platform-v1` | Contact and funnel flow depend on structured capture from chat. |
| `customer-workflow-and-deal-flow` | `supporting` | Yes | Defines downstream business handling that still belongs behind the chat interface. | `platform-v1` | Deal, consultation, and workflow records still reflect this contract. |
| `live-eval-and-funnel-validation` | `supporting` | Yes | Verification of funnel completion and tool reliability remains strategically important. | `platform-v1` | Current evaluation scripts and QA evidence depend on this workstream. |
| `shell-navigation-and-design-system` | `legacy` | Yes | Still explains some shipped shell primitives, but its broader shell-centered framing predates the stricter V1 chat-first IA. | `platform-v1` | Current shell code still inherits parts of this contract, so it should not be archived until successor notes are explicit. |
| `fab-shell-refactor` | `legacy` | Yes | Important historical context for the floating shell, but the product is converging toward fewer modality-specific specs. | `platform-v1` | Existing floating shell behavior still reflects this work, but it is not the long-term product center. |
| `floating-chat-visual-authority` | `legacy` | Yes | Valuable visual refinement notes remain, but the spec is tied to a floating-shell modality that is no longer primary. | `platform-v1` | Some current styling/tests still align with it, so it needs preservation notes before archiving. |

---

## 3. Archive Batch Executed On 2026-03-23

The following feature families have now moved under `docs/_specs/archive/2026-platform-v1-superseded/`.

| Feature | Prior Status | Archive Reason | Governing Contract | Preservation Note |
| --- | --- | --- | --- | --- |
| `dashboard-ai-action-workspace` | `archive-ready` | Dashboard-first action workspace behavior is superseded as a primary product modality. | `platform-v1` | Dashboard-to-chat handoff ideas and backend helpers remain worth repurposing. |
| `dashboard-rbac-blocks` | `archive-ready` | Dashboard block composition is no longer current product truth for V1. | `platform-v1` | Dashboard-derived query, visibility, and loader logic remain relevant for repurposing. |
| `swiss-layout-precision` | `archive-ready` | Platform V1 explicitly superseded this visual direction. | `platform-v1` | Reusable typography and spacing ideas can still be consulted historically. |
| `theme-consistency` | `legacy` | Non-conforming implementation package archived to restore `_specs` folder structure discipline. | `platform-v1` | Theme notes remain available as historical design guidance. |

---

## 4. Inventory Findings

### 3.1 Active-index drift

The current active index does not fully match the current spec corpus.

Verified drift:

1. `platform-v0` existed and was still relevant to V1, but it was not listed in the active table before this cleanup wave.
2. `interactive-chat-actions` existed and was strategically aligned with V1, but it was not listed in the active table before this cleanup wave.
3. `theme-consistency` existed under `docs/_specs/` without a `spec.md`, which made it structurally inconsistent with the process guide until it was archived.

### 4.2 First archive candidates

The first archive wave has now moved:

1. `dashboard-ai-action-workspace`
2. `dashboard-rbac-blocks`
3. `swiss-layout-precision`

These families were superseded at the product-contract level even though selected implementation ideas or backend helpers remain useful.

### 4.3 Legacy-but-not-yet-archive-safe families

The following families are strong legacy candidates but should keep active visibility until their successor notes are more explicit:

1. `shell-navigation-and-design-system`
2. `fab-shell-refactor`
3. `floating-chat-visual-authority`

Review outcome on 2026-03-23:

1. `shell-navigation-and-design-system` remains `legacy` because current shell route truth, footer grouping, and account-menu behavior still directly depend on its architecture.
2. `fab-shell-refactor` remains `legacy` because the current floating chat shell, launcher, emitted hooks, and browser tests still map directly to its delivered contract.
3. `floating-chat-visual-authority` remains `legacy` because current floating-shell styling and test surfaces still overlap its refinement scope, even though it is not the primary product direction.

These three families should be reconsidered only after the chat-first shell cleanup removes their remaining direct runtime dependencies.

---

## 4.5 Runtime Cleanup Progress

Runtime cleanup status on 2026-03-24:

1. Active chat runtime now uses `task-origin` vocabulary for the handoff path, and the legacy `dashboardHandoff` request field has been removed.
2. Operator signal ids and payloads now live in `src/lib/operator/operator-signal-types.ts` instead of aliasing dashboard type names directly.
3. `src/lib/operator/operator-signal-loaders.ts` now exposes operator-named data aliases and operator-named loader aliases across admin, customer-workflow, analytics, and health loader families.
4. `src/lib/operator/operator-signal-backend.ts` now owns the active backend barrel for operator signal loading, so the public operator facade no longer depends on `src/lib/dashboard/dashboard-loaders.ts`.
5. Current admin tool composition and selected eval/test consumers now import operator loader aliases instead of dashboard loader names.
6. Local QA fixture entrypoints in `src/lib/db/fixtures.ts` and `src/lib/db/schema.ts` now use operator naming rather than dashboard naming.
7. The deprecated `src/lib/chat/dashboard-handoff.ts` shim has been removed; `src/lib/chat/task-origin-handoff.ts` is now the sole handoff implementation.
8. The temporary `src/lib/dashboard/` compatibility shims have been removed, and the active backend implementation boundary now lives entirely in `src/lib/operator/`.

---

## 5. Immediate Follow-Up

1. Continue code cleanup of dashboard-first leftovers using the archive notes as the preservation boundary, with priority on prompt text, fixtures, and tests that still frame operator work as dashboard work.
2. Start the next Platform V1 technical-debt stream as composition-root and shared test-fixture consolidation so future route, hook, and sync-hardening work does not keep re-paying the same mocking/setup cost.
3. Add archive notes to any future superseded feature families before moving them.
4. Keep the active feature table in [docs/_specs/README.md](../../README.md) aligned with future archive moves.
