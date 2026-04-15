# UX / UI Audit 07 — Public Shell & Footer Information Architecture

**Severity:** P2 Medium  
**Scope:** Public top-rail navigation, footer groups, content link placement, public page structure

---

## UX-32 · P2 Medium — Content Links (Home / Library / Blog) Belong in the Footer, Not the Top Rail

**File:** `src/lib/shell/shell-navigation.ts`

### Current state

Three routes have `headerVisibility: "all"`, causing them to appear in the top-rail pill nav on every public page:

```typescript
{ id: "home",   label: "Home",    headerVisibility: "all" }  // → pill: "Home"
{ id: "corpus", label: "Library", headerVisibility: "all", footerVisibility: "all" }
{ id: "blog",   label: "Blog",    headerVisibility: "all", footerVisibility: "all" }
```

This produces the triple-pill navigation: **Home · Library · Blog** between the brand mark and the AccountMenu on the top rail.

### The problem

The "Home / Library / Blog" links are **destination content links**, not wayfinding links. The user is already home when they're at `/`. The Library and Blog are content areas that belong in the footer discovery layer, not in persistent chrome.

Modern single-product web apps (Linear, Notion, Vercel, Raycast) use the top rail for:
- Brand (left)
- One-to-three product areas or feature tabs (centre) — only when navigating between product modes
- Account and utility actions (right)

The content link model only makes sense for marketing sites, not for a product with an AI concierge as the primary CTA.

### Impact assessment

Removing `headerVisibility` does not break routing — it only affects what `resolvePrimaryNavRoutes()` returns, which drives the pill list. If the list is empty, `SiteNav` already falls back to `flex justify-between` layout (brand + account menu only).

Both `corpus` and `blog` already have `footerVisibility: "all"`, so they remain discoverable through the footer.

### Recommendation

1. Remove `headerVisibility: "all"` from `home`, `corpus`, and `blog`.
2. Ensure `footerVisibility: "all"` is confirmed on `corpus` and `blog`.
3. The top rail becomes: `[Brand Mark] ——————————————— [AccountMenu]` for logged-out visitors, which is clean and uncluttered.
4. Logged-in users use the AccountMenu dropdown to access Library, Blog, Jobs, Admin, etc.

---

## UX-33 · P2 Medium — Footer Groups Are Partially Populated

**File:** `src/lib/shell/shell-navigation.ts`

**Observed:**  
The `SHELL_FOOTER_GROUPS` configuration groups routes for the footer. Current state:
- `corpus`, `blog` have `footerVisibility: "all"` — appear in footer
- `jobs`, `journal-admin`, `admin-users`, etc. have `footerVisibility: SIGNED_IN_ROLES` — appear for authenticated users
- `admin-dashboard`, `admin-leads`, `admin-conversations`, `admin-prompts`, `admin-system` have no `footerVisibility` — **not in footer**

If the hamburger drawer is removed (UX-01) and content links leave the top rail (UX-32), the footer becomes the primary discovery surface for secondary content and admin links. It needs to be complete.

**Recommendation:**  
Add `footerVisibility: ["ADMIN"]` to all admin routes:
```typescript
{ id: "admin-dashboard",     footerVisibility: ["ADMIN"] }
{ id: "admin-users",         footerVisibility: ["ADMIN"] }
{ id: "admin-leads",         footerVisibility: ["ADMIN"] }
{ id: "admin-conversations", footerVisibility: ["ADMIN"] }
{ id: "admin-prompts",       footerVisibility: ["ADMIN"] }
{ id: "admin-system",        footerVisibility: ["ADMIN"] }
```
Group them under a footer section "Admin" visible only to admins.

---

## UX-34 · P2 Medium — Public Pages Use Inconsistent Page Width Containers

**Files:** `src/app/library/page.tsx`, `src/app/journal/[slug]/page.tsx`, `src/app/login/page.tsx`

**Observed:**  
Different public pages use different container class patterns:
- Library index: `mx-auto max-w-5xl px-(--container-padding)`
- Journal article: varies per article renderer
- Login: unconfirmed — redirects to register

There is no shared `site-container` class used consistently across public content pages. The admin shell uses `max-w-7xl` for its container. The public pages use `max-w-5xl`.

**Problem:**  
Without a consistent page-width system, adding new public pages requires a developer to manually choose and match a container width. This leads to visual inconsistency as the product grows.

**Recommendation:**  
Define two named width tokens in the design system:
- `--content-width-prose` (e.g. 720px) — for article/reading content
- `--content-width-index` (e.g. 1280px) — for index/grid pages

Use these via CSS custom properties and a shared `site-container` utility that applies the correct max-width per page type.

---

## UX-35 · P3 Low — `/blog` and `/jobs` Are Legacy Redirect Routes Without Meta Tags

**Files:** `src/app/blog/page.tsx`, `src/app/jobs/page.tsx`

**Observed:**  
Both pages redirect immediately:
```tsx
// /blog → /journal
// /jobs → /admin/jobs
export default function BlogIndexPage() { redirect("/journal"); }
export default function JobsPage() { redirect("/admin/jobs"); }
```

These are legitimate redirects, but:
- `/jobs` has hardcoded redirect to `/admin/jobs` which is an admin-protected route. An unauthenticated visitor following the `/jobs` link will hit the auth wall and then the redirect, creating an awkward two-step.
- The metadata on `/blog` says "Legacy Journal Redirect" — this title could be briefly visible before the redirect, and would show in search engine results if Google indexes it before following the redirect.

**Recommendation:**  
- For `/jobs`: redirect to `/admin/jobs` only if user is admin/staff; otherwise redirect to home or show an appropriate message.
- For `/blog`: use HTTP 308 permanent redirect (already a `redirect()` call which Next.js defaults to 307). Confirm it's a 301/308 for SEO canonicalisation.

---

## Public Page Inventory

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Home — AI concierge entry | ✅ Live |
| `/library` | Library index (books) | ✅ Live |
| `/library/[document]` | Book detail | ✅ Live |
| `/library/[document]/[section]` | Chapter | ✅ Live |
| `/journal` | Journal index | ✅ Live (check: 404s on empty) |
| `/journal/[slug]` | Article detail | ✅ Live |
| `/blog` | Legacy redirect → `/journal` | ✅ Redirect |
| `/books` | Legacy redirect → `/library` | ⚠️ Needs verification |
| `/corpus` | Legacy redirect → `/library` | ⚠️ Needs verification |
| `/register` | Registration | ✅ Live |
| `/login` | Login | ✅ Live |
| `/profile` | User preferences | ✅ Live (auth-gated) |
| `/jobs` | Legacy redirect → `/admin/jobs` | ⚠️ Unauthenticated visitors hit auth wall |

**Missing public pages:**
- `/about` — who is this product for? No "about" page referenced anywhere.
- `/contact` — the AI concierge captures leads but there is no dedicated contact page for users who want a direct email.
- `/pricing` — no pricing discovery surface (the AI concierge may handle this in-conversation, but a static pricing route was common for lead funnel completeness).
