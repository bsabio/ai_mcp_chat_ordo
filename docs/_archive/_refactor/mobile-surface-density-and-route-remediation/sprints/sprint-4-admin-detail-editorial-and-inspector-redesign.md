# Sprint 4 - Admin Detail, Editorial, And Inspector Redesign

> **Status:** Planned
> **Goal:** Turn the admin detail and editorial routes into mobile-first review and edit sequences instead of stacked desktop inspector layouts.
> **Spec ref:** `MSR-017`, `MSR-060` through `MSR-065`, `MSR-070` through `MSR-106`, `MSR-120`
> **Prerequisite:** Sprint 3

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/admin/AdminDetailShell.tsx` | shared structural owner for admin detail layouts |
| `src/app/admin/leads/[id]/page.tsx` | workflow-heavy detail route |
| `src/app/admin/conversations/[id]/page.tsx` | transcript and routing-inspector route |
| `src/app/admin/jobs/[id]/page.tsx` | payload, timeline, and job-control route |
| `src/app/admin/users/[id]/page.tsx` | profile and role-management detail route |
| `src/app/admin/journal/[id]/page.tsx` | confirmed P0 editorial form-heavy outlier |
| `src/app/admin/journal/preview/[slug]/page.tsx` | preview route that must inherit mobile reading improvements |
| `src/app/admin/prompts/[role]/[promptType]/page.tsx` | long-text editing and version-history route |
| `src/app/styles/admin.css` and `src/app/styles/foundation.css` | detail-shell and shared mobile density selectors |

---

## Task 4.1 - Rebuild The Shared Detail Shell For Phones

**What:** Convert `AdminDetailShell` from a desktop inspector that stacks into a mobile-first sequence with clear primary and secondary zones.

**Modify:** `src/components/admin/AdminDetailShell.tsx`, `src/app/styles/admin.css`, any shared detail-shell helper components

### Task 4.1 Required Changes

1. place status and primary actions near the top in a compact mobile action band
2. collapse or demote secondary metadata until after the first editable or reviewable content
3. make section boundaries clear so long detail routes do not read as one continuous wall of panels
4. ensure the shell supports payload, transcript, and form-heavy variants without route-local layout forks

### Task 4.1 Acceptance

1. status and primary actions are visible within the first viewport
2. the first real field or reviewable content is visible without excessive scrolling
3. the mobile shell reads as one authored sequence rather than a desktop sidebar placed underneath content

---

## Task 4.2 - Rework Operational Detail Routes

**What:** Apply the mobile-first detail model to leads, conversations, jobs, and users detail routes.

**Modify:** `src/app/admin/leads/[id]/page.tsx`, `src/app/admin/conversations/[id]/page.tsx`, `src/app/admin/jobs/[id]/page.tsx`, `src/app/admin/users/[id]/page.tsx`

### Task 4.2 Required Changes

1. simplify workflow and status rows on phones
2. move payload, metadata, and related lists behind clearer sections or disclosures
3. give transcript and event views overflow-safe mobile treatments
4. keep destructive or high-consequence actions deliberate and easy to scan

### Task 4.2 Acceptance

1. each route exposes the primary review or action surface inside the initial viewport
2. long transcripts, payloads, or metadata no longer dominate the top of the route
3. no code or JSON panel creates accidental horizontal overflow

---

## Task 4.3 - Rebuild The Editorial Detail Outlier

**What:** Give `/admin/journal/[id]` a dedicated mobile simplification pass rather than relying on the generic detail shell alone.

**Modify:** `src/app/admin/journal/[id]/page.tsx`, any shared editorial form helpers, `src/app/styles/admin.css`

### Task 4.3 Required Changes

1. prioritize title, status, slug, and primary editorial actions near the top
2. sequence metadata forms, editorial body fields, revision history, and media tools into clear mobile sections
3. keep compare and preview tools available without forcing them into the initial viewport stack

### Task 4.3 Acceptance

1. `/admin/journal/[id]` no longer reads like a desktop editorial cockpit squeezed onto a phone
2. the first editable field and primary action band are reachable immediately
3. revision and media tools remain usable but clearly secondary

---

## Task 4.4 - Simplify Prompt Editing On Mobile

**What:** Make prompt editing usable on phones without hiding the important controls or version context.

**Modify:** `src/app/admin/prompts/[role]/[promptType]/page.tsx`

### Task 4.4 Required Changes

1. make the active editor area primary on mobile
2. move version history and secondary metadata below the active editing surface or behind a controlled disclosure
3. ensure long monospaced content wraps or scrolls deliberately

### Task 4.4 Acceptance

1. the active prompt content and primary save or publish controls are visible within the first viewport
2. version context remains accessible without dominating the route
3. no long text block breaks mobile layout

---

## Task 4.5 - Add Focused Detail-Route Mobile Evidence

**What:** Capture route-level mobile evidence for the highest-risk detail routes changed in this sprint.

Land the route-level assertions in `tests/browser-ui/mobile-admin-detail-editorial.spec.ts` so the evidence can be rerun in CI instead of living only as screenshots.

### Required routes

1. `/admin/leads/[id]`
2. `/admin/conversations/[id]`
3. `/admin/jobs/[id]`
4. `/admin/users/[id]`
5. `/admin/journal/[id]`
6. `/admin/prompts/[role]/[promptType]`

### Task 4.5 Required Assertions

1. no accidental horizontal overflow
2. first-viewport visibility of status, primary actions, and first content field
3. overflow-safe handling for transcript, payload, or monospaced surfaces where applicable

---

## Verification

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css`
4. `npm run spacing:audit`
5. `npx playwright test tests/browser-ui/mobile-admin-detail-editorial.spec.ts`
6. focused mobile browser evidence for all required detail routes

## Sprint 4 Exit Criteria

1. `AdminDetailShell` behaves like a mobile-first review and edit shell.
2. Operational detail routes surface status, action, and first content quickly.
3. `/admin/journal/[id]` and prompt editing receive dedicated mobile simplification.
4. The highest-risk detail routes have explicit mobile evidence and assertions.
