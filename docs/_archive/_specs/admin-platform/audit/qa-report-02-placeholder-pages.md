# QA Report 02 — Placeholder Pages

**Severity range:** P1 High / P2 Medium  
**Scope:** Admin pages that exist in the router but contain only static placeholder content instead of functional UI.

---

## DEF-009 · P1 High — Users Page Is a Static Placeholder

**File:** `src/app/admin/users/page.tsx`  
**Spec reference:** Sprint 2 — People & Roles  
**Expected:** Card-based, mobile-first user list. Each card shows name, email, role badge, signup date. Search/filter by role. Tap to expand for role management.  
**Actual:**
```tsx
<AdminSection title="Users" description="People and roles land here...">
  <AdminCard title="People surface pending" description="No users yet. Share your site to get your first signup.">
    <p>This placeholder route exists so the admin shell can navigate to a stable users workspace...</p>
  </AdminCard>
</AdminSection>
```
**Problem:** Single static card. No data loading, no user list, no search, no role badges, no interactivity. The description "No users yet" is misleading — users may exist in the database but are never queried.

**Evidence of real users existing:** The affiliate API at `/api/admin/affiliates/[userId]` accepts PATCH requests to modify user affiliate status, proving user records exist in the data layer.

---

## DEF-010 · P1 High — System Page Is a Static Placeholder

**File:** `src/app/admin/system/page.tsx`  
**Spec reference:** Sprint 3 — System Config & Models  
**Expected:** Three card sections — Feature Flags (toggleable switches), Model Policy (tier labels with enable/disable), Referral Settings (current state + toggle). Environment info card showing runtime config.  
**Actual:**
```tsx
<AdminSection title="System" description="Flags, runtime, and model policy will consolidate here...">
  <AdminCard title="System controls pending" description="The system page route is live so the admin shell has a stable destination...">
    <p>The current placeholder keeps navigation honest while the real feature flags and model policy surface is implemented.</p>
  </AdminCard>
</AdminSection>
```
**Problem:** Single static card. No config loading, no flag display, no model information, no referral controls. The backing infrastructure (flags.json, models.json) also doesn't exist (see DEF-002, DEF-003).

---

## DEF-011 · P1 High — Leads Page Is a Static Placeholder

**File:** `src/app/admin/leads/page.tsx`  
**Spec reference:** Sprint 4 — spec.md architecture shows leads as a navigation entry  
**Expected:** Lead queue with triage workflow. Cards showing lead name, source, status, submission date. Actions: contact, qualify, defer. The lead triage API already exists at `/api/admin/leads/[leadId]/triage`.  
**Actual:**
```tsx
<AdminSection title="Leads" description="Lead queue triage and prioritization will expand here...">
  <AdminCard title="Lead queue pending" description="No leads yet. Your referral link is ready to share.">
    <p>This placeholder route preserves a valid admin navigation path while the deeper operator queue surface is implemented.</p>
  </AdminCard>
</AdminSection>
```
**Problem:** The API for triaging leads exists and is tested (`route.test.ts`), but the page that would use it shows only a static card. The description "No leads yet" is potentially false — leads may exist but are never queried on this page.

---

## DEF-012 · P2 Medium — User Detail Route Has No Page

**File:** `src/app/admin/users/[userId]/` (directory exists, no page.tsx)  
**Spec reference:** Sprint 2 — User detail view  
**Expected:** `/admin/users/[userId]` renders full admin view — name, email, role, affiliate status, referral code, signup date, last login, conversation count. Inline role management. Action chips.  
**Actual:** The `[userId]` directory structure exists in the filesystem, and `getAdminUserDetailPath(userId)` is defined in `admin-routes.ts`, but there is no `page.tsx` file. Navigating to this URL will 404.

**Impact:** Even if the user list were implemented, clicking through to a user detail would show a Next.js 404 page.

---

## DEF-013 · P2 Medium — Blog Preview Route Is Empty

**File:** `src/app/admin/blog/preview/`  
**Spec reference:** Journal editorial system  
**Expected:** Blog preview functionality (parallel to journal preview).  
**Actual:** The `blog/preview/` directory exists but contains no functional page files. The journal preview at `admin/journal/preview/[slug]` works correctly. The blog preview route appears to be a vestigial directory.

**Impact:** Low — journal preview handles the use case. But the empty directory creates confusion in the codebase.

---

## DEF-014 · P2 Medium — Placeholder Descriptions Are Developer-Facing, Not Operator-Facing

**Files:** All three placeholder pages (users, system, leads)  
**Spec reference:** Design Principle #4 — Progressive disclosure. "Empty states are opportunities."  
**Expected:** Operator-friendly empty states like "No users yet — share your referral link?" or "Your system is healthy — nothing to configure."  
**Actual:** Descriptions use developer-internal language:
- "This placeholder route exists so the admin shell can navigate to a stable users workspace before the detailed card list and role controls land."
- "The current placeholder keeps navigation honest while the real feature flags and model policy surface is implemented."
- "This placeholder route preserves a valid admin navigation path while the deeper operator queue surface is implemented."

**Problem:** A non-technical operator seeing "placeholder route" and "valid admin navigation path" will be confused. These read as developer notes, not user-facing copy.
