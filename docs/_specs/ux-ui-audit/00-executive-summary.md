# UX / UI Audit — Executive Summary

**Auditor:** Platform QA  
**Date:** 2026-03-30 · Second pass: 2026-03-31  
**Scope:** Full admin platform + public shell · UX, information architecture, navigation, accessibility, forms, pagination, and page structure  
**Severity scale:** P0 Critical · P1 High · P2 Medium · P3 Low · P4 Cosmetic

---

## Verdict

The admin platform is functionally feature-complete across its 8 major surfaces, but the **information architecture, navigation model, and form ergonomics have not been updated since the initial scaffolding sprint.** Five systemic problems stand out:

1. **Navigation model is wrong for mobile** — a left-side hamburger drawer was shipped for mobile when the user's expectation is that admin links live in the upper-right account menu, consistent with how every SaaS product handles it.
2. **No breadcrumbs anywhere** — users navigating deep detail pages have no persistent wayfinding. Every admin page except the dashboard is effectively orphaned from its parent context.
3. **No pagination on any index** — all admin lists are full scans with no offset/limit. A production database with 10 000 jobs or leads will return the entire table on every page load.
4. **Search bar is entity search only; no `/` command navigation** — the top-rail search exists but only does free-text entity search. The user explicitly wants command navigation (`/users`, `/journal`, etc.) integrated into it.
5. **Form fields have no help text, no proper labels on inline controls, and accessibility is inconsistent** — several forms in detail pages use placeholder text as the only label, and dynamic errors are not announced to screen readers.

Beyond those five systemic issues, there are additional defects spanning residual CSS coupling, one unfixed server→client boundary violation in the conversations page, missing back-link navigation from detail pages, the overlay `jobs-page-shell` CSS class leaking into the admin layout, and several public-nav IA questions.

A **second audit pass** was completed on 2026-03-31 covering all admin detail pages, public auth forms, `ProfileSettingsPanel`, library pages, and every admin component. The pass produced 10 new defects, corrected 4 errors in the first-pass reports (UX-17, UX-27, UX-28, UX-29), and confirmed all first-pass findings remain open except UX-27 (bulk checkbox labels already implemented correctly).

---

## Defect Distribution (post second pass)

| Severity | Count | Area |
|----------|-------|------|
| **P0 Critical** | 1 | Server→client boundary violation (conversations page) |
| **P1 High** | 6 | Navigation model, pagination absence, no breadcrumbs, command search, form labels, auth error roles |
| **P2 Medium** | 16 | Admin IA/layout coupling, public nav IA, back-links, form help text, mobile density, detail page gaps, accessibility, journal layout, conversations takeover |
| **P3 Low** | 5 | Letter icons in drawer, empty-state text, CSS namespace pollution, prompts index layout, register password max |
| **P4 Cosmetic** | 1 | Admin layout page title duplication |
| **Total** | **29 open** (45 filed, 1 resolved UX-27, 4 corrected in-place) | |

---

## Report Index

| Report | Focus |
|--------|-------|
| [01 — Navigation & Information Architecture](01-navigation-ia.md) | Hamburger removal, admin links in account menu, breadcrumbs, back-links |
| [02 — Pagination](02-pagination.md) | Missing pagination on all admin index pages |
| [03 — Search & Command Navigation](03-search-commands.md) | Upgrading AdminSearchBar to full `/` command palette |
| [04 — Page Structure & One-Table Rule](04-page-structure.md) | Jobs residual section, conversations server→client bug, journal layout inconsistency (UX-36) |
| [05 — Form Fields & Controls](05-form-fields.md) | Missing labels, no help text, wrong input types, register password max (UX-37), ProfileSettingsPanel aria-describedby (UX-38) |
| [06 — Accessibility & Usability](06-accessibility-usability.md) | WCAG gaps, keyboard nav, focus management, auth errors role="alert" (UX-39/40), table structure (UX-41/42/43), aside label (UX-44), save notices (UX-45) |
| [07 — Public Shell & Footer IA](07-public-shell.md) | Moving content links to footer, top-rail simplification |

---

## Top 5 Priority Fixes

1. **Fix conversations page server→client boundary** (P0) — `ColumnDef` render functions are still defined in the server component `src/app/admin/conversations/page.tsx` and passed to `AdminBulkTableWrapper`, exactly the same violation fixed for users/jobs/leads.

2. **Replace hamburger with account menu admin links** (P1) — Remove `AdminDrawer` on mobile. Ensure the 8 admin nav items appear in the `AccountMenu` dropdown for admin users. Add a collapsible admin-section group inside the account menu to keep it scannable.

3. **Add breadcrumbs to all admin pages** (P1) — A single `AdminBreadcrumb` component that reads the current path and renders `Admin / Users / Jane Smith` resolves wayfinding for every detail and sub-page in the admin hierarchy.

4. **Implement cursor/offset pagination on all admin index loaders** (P1) — `loadAdminUserList`, `loadAdminJobList`, `loadAdminConversations`, `loadAdminLeadsPipeline` all need a `page` or `cursor` param. Add a shared `AdminPagination` component.

5. **Add `role="alert"` to all dynamic error messages** (P1) — Login, register, and profile forms render errors into the DOM without `role="alert"`, making errors invisible to screen readers. 10-minute fix per form.
