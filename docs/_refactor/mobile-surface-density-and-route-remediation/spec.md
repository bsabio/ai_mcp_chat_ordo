# Mobile Surface Density And Route Remediation - Refactor Spec

> **Status:** In Progress
> **Date:** 2026-04-06
> **Scope:** Rebuild mobile density, overflow behavior, first-viewport prioritization, and route-family ergonomics across chat, discovery, workspace, and admin surfaces so Studio Ordo feels authored, compact, and confident on phones rather than desktop layouts collapsed into a narrow column.
> **Affects:** `src/app/styles/foundation.css`, `src/app/styles/chat.css`, `src/app/styles/shell.css`, `src/app/styles/admin.css`, `src/components/AppShell.tsx`, `src/components/SiteNav.tsx`, `src/frameworks/ui/FloatingChatFrame.tsx`, `src/frameworks/ui/FloatingChatLauncher.tsx`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/components/admin/AdminSection.tsx`, `src/components/admin/AdminCard.tsx`, `src/components/admin/AdminStatusCounts.tsx`, `src/components/admin/AdminDetailShell.tsx`, route files under `src/app/library`, `src/app/journal`, `src/app/jobs`, `src/app/profile`, `src/app/referrals`, `src/app/admin`, and mobile/browser regression tests.
> **Motivation:** The current mobile UI is not suffering from dozens of isolated route bugs. It is suffering from a small set of repeated density, overflow, and prioritization failures that recur across shared surface families. The fix should be delivered as one governed refactor program instead of route-by-route improvisation.
> **Requirement IDs:** `MSR-XXX`

---

## Primary Evidence Inputs

1. `docs/_qa/MOBILE_ROUTE_SWEEP.md`
2. `docs/_qa/MOBILE_SCREENSHOT_AUDIT.md`

These QA documents are the factual evidence base for this workstream. They identify the route families, confirmed render findings, and route-specific outliers that the remediation program must convert into implementation and verification. `[MSR-001]`

---

## 1. Problem Statement

### 1.1 Verified current defects

Eight route-family defects are verified through the current QA audit set. `[MSR-010]`

1. **Floating chat is too large on phones.** The floating chat shell, helper copy, suggestion chips, textarea growth, and send rail consume too much vertical space and leave too little room for transcript or page content. `[MSR-011]`
2. **Floating launcher overlap is a structural defect.** `/library` and similar routes can place the floating launcher on top of actual content because the app does not reserve route-level clearance for the floating affordance. `[MSR-012]`
3. **Public discovery routes are under-dense.** `/library` and `/journal` spend too much mobile space on card padding, framing, and shelf atmosphere before the user reaches useful content. `[MSR-013]`
4. **Public reading routes are over-framed.** Library section and journal article routes stack title, metadata, support copy, and media in ways that push real reading too far down on phones. `[MSR-014]`
5. **Signed-in workspaces collapse instead of recompose.** `/jobs`, `/profile`, and `/referrals` retain desktop panel weight and simply stack it, which creates long, wrap-heavy pages with weak scan order on narrow screens. `[MSR-015]`
6. **Admin list routes front-load chrome before data.** Count cards, filters, tabs, hero bands, and bulk controls accumulate ahead of the actual list or table across `/admin`, `/admin/leads`, `/admin/jobs`, `/admin/users`, `/admin/journal`, and related routes. `[MSR-016]`
7. **Admin detail routes are still desktop inspectors in a vertical stack.** `AdminDetailShell` and the detail/edit routes built on top of it produce long mobile documents where actions, metadata, forms, and payload viewers compete equally for attention. `[MSR-017]`
8. **Current regression coverage is too structural.** Existing tests prove presence and layout survival, but they do not prove first-viewport quality, overflow safety, compact-mode behavior, or route-level mobile fidelity. `[MSR-018]`

### 1.2 Root cause

The system already has tokens, semantic surfaces, and responsive breakpoints, but mobile composition is still governed by desktop assumptions. `[MSR-020]`

Root causes:

1. mobile layout often means `flex-wrap`, stacking, or smaller spacing, not a deliberate task-first phone composition
2. the spacing and visual systems are not yet calibrated around a phone first-viewport contract
3. tabs, chips, filters, tables, monospace content, and floating controls do not share one explicit narrow-screen overflow model
4. route-level QA is not yet strong enough to catch density regressions before they ship

Those failures recur because the same shared surfaces are reused across many routes. `[MSR-021]`

### 1.3 Why this matters

This is a product-quality issue, not just a responsive-cleanup exercise. `[MSR-030]`

Why it matters:

1. mobile users lose trust when the first screen is mostly chrome, helper copy, or stacked support panels instead of the actual task
2. operational routes become slower to scan because the user must cross too many equal-weight blocks before finding the data or action they need
3. editorial routes lose their calm because generous desktop framing becomes wasteful rather than elegant on phones
4. route-by-route patching will create drift unless the remediation is governed by shared mobile rules and shared test gates

---

## 2. Governing Constraints

### 2.1 Active authorities

1. `docs/_qa/MOBILE_ROUTE_SWEEP.md` and `docs/_qa/MOBILE_SCREENSHOT_AUDIT.md` are the current evidence sources for what is wrong and which route families are highest priority. `[MSR-040]`
2. `docs/_refactor/spacing_refactor/spec.md` owns the spacing grammar and density-mode model. This work must consume that contract rather than invent a competing spacing doctrine. `[MSR-041]`
3. `docs/_refactor/chat-control-surface-redesign/spec.md` owns the chat composer object and action hierarchy. This work may further compact mobile behavior, but it must preserve that authored control-surface direction. `[MSR-042]`
4. `docs/_refactor/visual-hierarchy-and-proportional-balance/spec.md` and `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` remain the design-system authorities for token ownership, surface contrast, and semantic CSS boundaries. `[MSR-043]`

### 2.2 Product boundaries

This workstream must not solve mobile density by weakening product quality. `[MSR-044]`

It must not:

1. reduce touch targets below a 44px usable footprint
2. shrink primary reading text or primary action labeling into illegibility
3. change routing, authorization, data semantics, or chat runtime behavior unless a route already relies on purely presentational ordering
4. bypass the shared style system with route-local art direction or one-off magic margins

### 2.3 Delivery rules

1. Shared primitive fixes land before bespoke route fixes whenever one change can improve three or more routes. `[MSR-048]`
2. Redirect-only routes inherit the canonical route behavior and do not get standalone redesign tracks. `[MSR-049]`
3. A route-specific fix is allowed only when the audit proves that the route is a true outlier beyond its shared family. `[MSR-050]`

---

## 3. Design Goals

1. Make phone layouts feel authored, calm, and decisive rather than collapsed. `[MSR-060]`
2. Ensure the first viewport communicates page identity plus the first task, first data, or first meaningful body content. `[MSR-061]`
3. Replace passive wrap-and-stack behavior with deliberate overflow patterns for tabs, chips, filters, tables, and payload surfaces. `[MSR-062]`
4. Preserve elegance through hierarchy and rhythm rather than excess whitespace. `[MSR-063]`
5. Align chat, public, workspace, and admin surfaces around one compact mobile density language. `[MSR-064]`
6. Prove the result with route-level mobile regression coverage and visible evidence. `[MSR-065]`

---

## 4. Mobile Experience Contract

### 4.1 First-viewport contract

The primary baseline viewport is `390x844`. Secondary validation must also cover `430x932`, and a lower-bound sanity pass should cover `360x800`. `[MSR-070]`

Required outcomes:

1. the first screen must reveal route identity and either the first task, first data row or card, or first real reading content without crossing multiple decorative bands first
2. floating or fixed controls must never occlude the first actionable content item
3. admin list routes must surface the first real record or queue entry within the initial 100vh
4. admin detail routes must surface status plus the first editable or reviewable field within the initial 100vh
5. public reading routes must surface the start of body copy within the initial viewport or immediately after one short header stack

### 4.2 Density contract

Compaction must come from shared roles, not random reductions. `[MSR-075]`

Rules:

1. phone panel insets, card padding, and section gaps must step down from desktop defaults through shared mobile roles
2. duplicate summary bands are not allowed on phones
3. helper copy, secondary metadata, and low-value chrome must be collapsible or suppressible in compact states
4. chip, tab, and filter systems must choose one mobile mode: compact wrap, horizontal tray, segmented control, or disclosure

### 4.3 Overflow contract

No route may rely on plain `flex-wrap` as its only narrow-screen strategy. `[MSR-079]`

Rules:

1. tables must either transform into structured cards or live inside a purposeful horizontal-scroll container with visible affordances
2. code, JSON, URLs, environment values, and long metadata must wrap, truncate with reveal, or sit behind an explicit expand pattern
3. action rows must either stack intentionally or become grouped trays with stable spacing and ordering
4. floating-launcher offsets and route-bottom clearances must respect safe area and page content

### 4.4 Visual-fidelity contract

This program is not allowed to win density by making the interface feel cheap. `[MSR-083]`

Rules:

1. each mobile screen band should have one dominant heading tier, one subordinate support tier, and one quiet metadata tier
2. compaction should preserve edge definition, readable hierarchy, and authored contrast
3. editorial routes should feel calmer and shorter, not generic or stripped down
4. operational routes should feel faster and cleaner, not merely more crowded

### 4.5 Viewport matrix

| Viewport | Role | Required use |
| --- | --- | --- |
| `390x844` | primary acceptance baseline | every P0 and P1 route family must pass this size |
| `430x932` | large-phone validation | confirm the compact model still feels intentional on taller devices |
| `360x800` | lower-bound sanity check | catch cramped edge cases before release |

---

## 5. Surface Families And Required Changes

### 5.1 Shared mobile primitives

The refactor must establish shared mobile roles for panel inset, section gap, sticky-bottom clearance, chip density, compact metric rows, and overflow-safe content shells. `[MSR-090]`

Required outcomes:

1. route families can opt into shared mobile behaviors through semantic selectors or stable component props
2. floating-chat clearance is owned centrally, not by per-route spacing hacks
3. the compact mobile grammar is visible across shell, chat, public, workspace, and admin surfaces

### 5.2 Embedded chat and floating chat

The mobile chat system must become shorter, clearer, and less layered. `[MSR-093]`

Required outcomes:

1. helper copy is quieter or conditional in mobile-compact states
2. textarea growth is capped more aggressively on phones
3. suggestion chips use a denser mobile treatment
4. the launcher no longer collides with route content on `/library` or any similar surface

### 5.3 Public discovery and reading

`/library`, `/journal`, library section pages, journal articles, auth routes, and referral landing routes must spend less space on framing and more space on task or reading value. `[MSR-096]`

Required outcomes:

1. listing routes surface more real content per viewport without losing scan quality
2. reading routes shorten the header and metadata stack before body content
3. auth, status, and referral landing routes keep their primary CTA above the fold

### 5.4 Signed-in workspaces

`/jobs`, `/profile`, and `/referrals` need a mobile sequence, not a stack of equal-weight panels. `[MSR-099]`

Required outcomes:

1. metrics and summaries are compact and secondary to the core task
2. long link, code, and share surfaces are overflow-safe
3. `/referrals` has a clear mobile order for summary, share, QR, and activity

### 5.5 Admin overview and list routes

Admin mobile quality depends on pre-data compaction and consistent overflow patterns. `[MSR-101]`

Required outcomes:

1. hero and count-card stacks are shorter and more selective
2. tabs and filters use one governed mobile model
3. tables and count cards stop degrading into cramped wrap-heavy clusters
4. `/admin/system` gets a deliberate narrow-screen treatment for monospace content and diagnostics payloads

### 5.6 Admin detail, editorial, and inspector routes

Admin detail routes require more than spacing tweaks. `[MSR-104]`

Required outcomes:

1. `AdminDetailShell` becomes a mobile-first review and edit sequence
2. primary actions and status remain near the top while secondary metadata can collapse
3. payload, transcript, and code surfaces are readable and overflow-safe on phones
4. `/admin/journal/[id]` and prompt editing receive dedicated simplification instead of generic stacking

---

## 6. Delivery Sequence

| Sprint | Focus | Primary route families | Main outcome |
| --- | --- | --- | --- |
| 0 | Baseline contract and acceptance gates | all audited families | freeze authority map, thresholds, and regression harness plan |
| 1 | Shared mobile primitives and floating chat | `/`, floating chat, `/library` index | fix first-viewport density, chat compaction, launcher collision |
| 2 | Public discovery, reading, auth, and landing routes | `/library/[document]/[section]`, `/journal`, `/journal/[slug]`, `/login`, `/register`, `/access-denied`, `/r/[code]` | compact public framing without losing editorial quality |
| 3 | Signed-in workspaces and admin overview/list routes | `/jobs`, `/profile`, `/referrals`, `/admin`, `/admin/leads`, `/admin/*` lists | reduce pre-data chrome and stabilize overflow behavior |
| 4 | Admin detail and editorial inspector redesign | `/admin/*/[id]`, `/admin/prompts/[role]/[promptType]`, `/admin/journal/[id]` | mobile-first edit and review sequences |
| 5 | Regression coverage and release closeout | all P0 and P1 families | prove the remediation with browser evidence and route-level tests |

---

## 7. Verification And Release Gates

### 7.1 Required automated coverage

The final program must add or strengthen the following automated checks. `[MSR-120]`

1. route-level mobile screenshot coverage for priority routes
2. no-horizontal-overflow assertions for critical admin and public routes
3. viewport-occupancy assertions for home, floating chat, and admin list/detail entry states
4. focused browser specs for public reading and admin detail outliers

### 7.2 Required manual evidence

Capture before and after evidence for these routes at `390x844` and `430x932`: `/`, `/library`, `/journal/[slug]`, `/referrals`, `/admin`, `/admin/leads`, `/admin/system`, and `/admin/journal/[id]`. `[MSR-124]`

Each evidence set must state whether the improvement came from a shared primitive fix or a route-specific refinement. `[MSR-125]`

### 7.3 Release acceptance

The remediation program is complete only when all of the following are true. `[MSR-126]`

1. no P0 route family still violates the first-viewport contract
2. no route with floating chat shows launcher or composer overlap on content
3. no admin list or detail route exhibits accidental horizontal overflow without a deliberate container
4. the QA route matrix is updated to reflect the post-remediation state

---

## 8. Non-Goals

This refactor does not include the following. `[MSR-130]`

1. a desktop redesign
2. new product capabilities or route architecture changes beyond mobile presentation sequencing
3. one-off route art direction that bypasses the shared style system
4. acceptance by verbal review alone without browser evidence and regression checks
