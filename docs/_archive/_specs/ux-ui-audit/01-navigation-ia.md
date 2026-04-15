# UX / UI Audit 01 — Navigation & Information Architecture

**Severity range:** P1 High · P2 Medium · P3 Low  
**Scope:** Admin shell navigation, mobile access pattern, breadcrumbs, back-links, public top-rail

---

## UX-01 · P1 High — Hamburger Drawer Should Not Exist

**File:** `src/components/admin/AdminDrawer.tsx`, `src/app/admin/layout.tsx`

**Observed behaviour:**  
On mobile (below `sm` breakpoint), `AdminLayout` renders `<AdminDrawer />` — a hamburger button that opens a slide-from-left modal drawer containing all 8 admin nav links. The `AdminSidebar` (desktop) is hidden on mobile with `hidden sm:flex`.

```tsx
// src/app/admin/layout.tsx
<div className="sm:hidden">
  <AdminDrawer />
</div>
<AdminSearchBar searchAction={searchAction} />
```

**Problem:**  
1. Left-side hamburger drawers are a mid-2010s pattern. Modern mobile SaaS products (Linear, Notion, Vercel, Stripe) put admin navigation in the upper-right account menu or a top-right dropdown, not a left drawer. The user explicitly confirmed this: "that needs to be removed and the links need to be put in the upper right menu."
2. The drawer duplicates the nav items already available in `AccountMenu` for admin users — it's two inconsistent nav surfaces for the same destination set.
3. The letter-icon avatars in the drawer (`D`, `U`, `L`, `J`…) look like a prototype. Standard practice is to use recognisable SVG icons.
4. On mobile, the top bar currently shows `[☰ menu] [search bar]`. With the drawer removed, the top bar becomes search-only, which is cleaner.

**Recommendation:**  
- Remove `AdminDrawer` and its `sm:hidden` wrapper from `AdminLayout`.  
- Extend `AccountMenu` with an "Admin" section group that lists all `ADMIN_NAV_CONFIG` items for users whose role includes `ADMIN`.  
- The `AccountMenu` is in `src/components/AccountMenu.tsx` and already resolves routes via `resolveAccountMenuRoutes`. Add an `adminItems` group rendered inside the dropdown.  
- On desktop, the `AdminSidebar` remains unchanged.

---

## UX-02 · P1 High — No Breadcrumbs on Any Admin Page

**Files:** All pages under `src/app/admin/**`

**Observed behaviour:**  
Every admin detail page shows only an `AdminSection` title and description. There is no wayfinding trail — clicking into a user detail gives no indication of how to get back to the user list, or that the user list is under `/admin/users`.

```
/admin/users/abc123   → Title: "Jane Smith"  Subtitle: "jane@example.com"
                        No breadcrumb, no "back to Users" link
```

**Pages affected:**
| Page | Title shown | Missing breadcrumb |
|------|-------------|-------------------|
| `/admin/users/[id]` | User name | `Admin / Users / {name}` |
| `/admin/jobs/[id]` | Tool name | `Admin / Jobs / {toolName}` |
| `/admin/leads/[id]` | Entity title | `Admin / Leads / {name}` |
| `/admin/conversations/[id]` | Conversation title | `Admin / Conversations / {title}` |
| `/admin/journal/[id]` | Post title | `Admin / Journal / {title}` |
| `/admin/prompts/[role]/[type]` | Prompt type label | `Admin / Prompts / {role} / {type}` |
| `/admin/journal/attribution` | "Content Attribution" | `Admin / Journal / Attribution` |

**Problem:**  
Without breadcrumbs, an admin user:
- Cannot tell they are two levels deep in the hierarchy
- Has no one-click path back to the parent list
- On mobile, with no sidebar visible, is completely without orientation

**Recommendation:**  
Create a shared `AdminBreadcrumb` component:

```tsx
// src/components/admin/AdminBreadcrumb.tsx
interface Crumb { label: string; href?: string; }
function AdminBreadcrumb({ crumbs }: { crumbs: Crumb[] }) { ... }
```

Server components pass `crumbs` derived from route params. On the `AdminSection` component, add an optional `breadcrumbs` prop that renders `<AdminBreadcrumb>` above the title.

Alternatively, implement an automatic breadcrumb hook using `usePathname()` and the admin route config in `admin-navigation.ts`.

---

## UX-03 · P2 Medium — Detail Pages Have No "Back" Link

**Files:** `src/app/admin/*/[id]/page.tsx`

**Observed behaviour:**  
Job detail, user detail, lead detail, and conversation detail pages provide no "← Back to Jobs" link. The only way back is the browser back button or the sidebar (on desktop).

**Problem:**  
On mobile where the sidebar is hidden, users are trapped. On desktop, the sidebar provides an escape, but it goes back to the list's root (ignoring any filters the user had applied). A proper back-link would ideally preserve the `?status=failed&toolName=foo` query string the user navigated from.

**Note on the conversations page:** The `Referer` header is available server-side but inconsistent. The simplest fix is a "Back" link to the parent list route (without filter preservation) as a minimum.

**Recommendation:**  
- Add a `backHref` prop to `AdminDetailShell` that renders a small `← Back to {label}` anchor above the main content.
- In each detail page, derive `backHref` from the list route file (e.g., `getAdminJobsListPath()`).

---

## UX-04 · P2 Medium — AdminSection Title Is Repeated in `<h1>`

**File:** `src/components/admin/AdminSection.tsx`

**Observed behaviour:**  
`AdminSection` renders a `<h1>` with the title, and the sidebar also renders a `<h1>` with "Admin". On detail pages, `AdminSection title={detail.user.name}` creates a new `<h1>` — making the page have two visible `<h1>` elements (sidebar brand `<h1>` + content `<h1>`), which is a heading hierarchy violation.

**Recommendation:**  
- Change `AdminSection` to render `<h2>` for the content title.  
- Use a single `<h1>` in the admin layout for "Admin" (site-wide). All content sections become `<h2>`.

---

## UX-05 · P3 Low — Letter Icons in Drawer / Nav Config

**File:** `src/lib/admin/admin-navigation.ts`

**Observed behaviour:**  
```typescript
{ routeId: "admin-dashboard", icon: "D" }
{ routeId: "admin-users",     icon: "U" }
{ routeId: "admin-leads",     icon: "L" }
// etc.
```
The icon field holds single uppercase letters, rendered in a small badge. This produces "D", "U", "L", "J", "P", "C", "B", "S" — meaningless to a first-time user.

**Recommendation:**  
Replace letter strings with recognisable SVG icon names or inline SVG paths. If `AdminDrawer` is removed per UX-01, the letter icons move to `AccountMenu`. Either way, proper icons are needed.

---

## UX-06 · P3 Low — Admin Sidebar Copy Is Developer-Facing

**File:** `src/components/admin/AdminSidebar.tsx`

**Current text:**  
> "Queue health, editorial operations, and upcoming operator surfaces live here without the public marketing chrome."

**Problem:** "Marketing chrome" and "upcoming operator surfaces" are developer jargon. An admin operator doesn't think in those terms.

**Recommendation:**  
> "Manage your business — health, content, and operations."

---

## Public Shell Navigation

### UX-07 · P2 Medium — Primary Nav Has Home / Library / Blog in the Top Rail

**File:** `src/lib/shell/shell-navigation.ts`

**Observed behaviour:**  
`headerVisibility: "all"` is set on `home`, `corpus` (Library), and `blog` (Blog). These three links appear in the top-rail pill list on every public page.

**User's intent:** Move these "content" links to the footer so the top rail is brand + search + account menu only.

**Impact Assessment:**  
- The footer already has a group system (`ShellFooterGroup`).  
- `corpus` and `blog` both have `footerVisibility: "all"` already.  
- Removing `headerVisibility: "all"` from `home`, `corpus`, and `blog` clears the top-rail pill list for logged-out users.  
- `SiteNav` already handles the case where `primaryNavItems.length === 0` (falls back to `justify-between` layout).

**Recommendation:**  
1. Remove `headerVisibility` from `home`, `corpus`, and `blog` route definitions.  
2. Ensure `footerVisibility: "all"` is set on both `corpus` and `blog`.  
3. This leaves the top rail clean: `[Brand] ... [AccountMenu]` on public pages. Admin users see admin links in the account dropdown.
