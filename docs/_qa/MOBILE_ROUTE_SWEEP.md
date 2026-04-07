# Mobile Route Sweep

This document expands the screenshot-driven mobile audit into a route-pattern sweep across the current app router surfaces.

Implementation package: `docs/_refactor/mobile-surface-density-and-route-remediation/` converts this audit into a sprinted remediation plan.

It is based on:

- direct review of the active route inventory under `src/app/**/page.tsx`
- inspection of the shared shells and reusable route components that drive most pages
- live mobile spot-check screenshots of the home route and library index at `390x844`
- review of the current mobile/browser test coverage

Important scope note:

- This repo has roughly forty route files, but many of them are redirects or wrappers around the same shared surfaces.
- The useful unit of mobile risk is the route pattern plus the shared surface family behind it, not the raw page file count.
- Where a route is only a redirect, it is listed as such and does not get its own standalone mobile remediation track.

## Summary

The route sweep confirms the same conclusion as the screenshot audit: mobile quality is mostly being limited by repeated surface-level design decisions rather than isolated one-off bugs.

The biggest repeated issues are:

1. The floating chat system is too tall and too dense on mobile.
2. Public discovery pages use large cards and large spacing, which wastes too much vertical space on phones.
3. Admin list pages stack too many metric cards, filters, and tabs before the actual data.
4. Admin detail pages are still desktop-first forms and inspector shells that only happen to stack on mobile.
5. Route-specific mobile test coverage is thin outside the shared home shell, chat shell, and admin shell.

## Confirmed Rendered Findings

These points were confirmed by rendered `390x844` screenshots during this audit.

### Home route confirmed findings

- The home route still reproduces the large mobile chat problem documented earlier.
- The headline, chip cluster, suggestion frame, composer shell, helper copy, and fixed-width send area compete for the same first viewport.
- The composer remains too visually heavy even before the user types.

### Library index confirmed findings

- Library cards are too tall relative to their information value on mobile.
- The card stack feels under-dense rather than readable.
- The floating chat launcher overlaps the content area near the second visible card, which is a route-specific collision problem on top of the general floating chat issues.

Development-only note:

- The red Next.js issue badge visible in dev screenshots is not a production UI issue and should not be treated as part of the app audit.

## Severity Legend

- `P0`: materially hurts mobile usability and should lead implementation
- `P1`: clearly degraded mobile experience but not a total blocker
- `P2`: polish or consistency problem that should be fixed after the main density work
- `Redirect only`: no separate surface; inherits destination route behavior

## Route Matrix

## Shared Shell And Public Entry Routes

| Route pattern | Surface family | Mobile status | Key issues |
| --- | --- | --- | --- |
| `/` | Embedded chat hero | P0 | Confirmed oversized mobile composer, suggestion frame density, helper copy always visible, very tall first viewport composition. |
| `/login` | Authentication form | P2 | Simple and structurally safe, but lacks explicit mobile assertions for touch targets, alert wrapping, and form-state overflow. |
| `/register` | Authentication form | P2 | Similar to login; longer helper copy and validation states increase vertical pressure on narrow screens. |
| `/access-denied` | Public status surface | P2 | Simple status page, but it still uses the same tall hero/status framing pattern rather than a tighter mobile recovery screen. |
| `/r/[code]` | Referral landing hero | P1 | Tall hero stack, extra explanatory card before the main CTA, and action buttons likely push meaningful interaction below the fold on phones. |

## Public Discovery And Reading Routes

| Route pattern | Surface family | Mobile status | Key issues |
| --- | --- | --- | --- |
| `/library` | Public content listing | P1 | Confirmed tall cards, oversized whitespace, and floating chat launcher overlap near the lower cards. Search is intentionally collapsed on mobile, which reduces discovery power further. |
| `/library/[document]` | Library redirect | Redirect only | Redirects to the first section. No separate mobile surface to fix. |
| `/library/[document]/[section]` | Library reading surface | P1 | Large chapter header stack, metadata pill cluster, previous/next pills that can wrap awkwardly, and sidebar-collapse discoverability risk on first mobile visit. |
| `/library/section/[slug]` | Library resolver | Redirect only | Resolver route; mobile behavior is inherited from the canonical library section route. |
| `/journal` | Public editorial listing | P1 | Feature card, essay shelf, briefing shelf, and archive shell are likely too roomy on mobile. Strong editorial composition, but too much top-of-page framing on narrow screens. |
| `/journal/[slug]` | Public editorial reading | P1 | Article header, dek, metadata, standfirst, and hero image stack can push actual reading content too far down on phones. Likely readable, but not compact. |
| `/blog` | Legacy redirect | Redirect only | Redirects to `/journal`. |
| `/blog/[slug]` | Legacy redirect | Redirect only | Redirects to `/journal/[slug]`. |
| `/corpus` | Legacy redirect | Redirect only | Redirects to `/library`. |
| `/corpus/[document]` | Legacy redirect | Redirect only | Redirects to canonical library routes. |
| `/corpus/[document]/[section]` | Legacy redirect | Redirect only | Redirects to canonical library section routes. |
| `/corpus/section/[slug]` | Legacy redirect | Redirect only | Resolver-only; no separate mobile surface. |
| `/books` | Legacy library surface | Redirect only | Legacy route family; should inherit canonical library remediation rather than getting its own treatment. |
| `/books/[book]` | Legacy library surface | Redirect only | Same as above. |
| `/books/[book]/[chapter]` | Legacy library surface | Redirect only | Same as above. |
| `/book/[chapter]` | Legacy library surface | Redirect only | Same as above. |

## Signed-In Workspace Routes

| Route pattern | Surface family | Mobile status | Key issues |
| --- | --- | --- | --- |
| `/jobs` | Signed-in workspace dashboard | P1 | Large hero, three metric cards, stacked job cards, and a desktop-oriented master/detail pattern that simply collapses on mobile. Existing browser coverage is desktop-focused. |
| `/profile` | Signed-in settings workspace | P1 | Multiple rich panels, referral summaries, push notification controls, and CTA groups create a long, wrap-heavy mobile account page. |
| `/referrals` | Signed-in analytics workspace | P1 | Metric cards, QR/share panel, link/copy controls, charts, and activity feed make this one of the heaviest non-admin mobile routes. Code and URL fields are especially prone to wrap and overflow pressure. |

## Admin Overview And List Routes

| Route pattern | Surface family | Mobile status | Key issues |
| --- | --- | --- | --- |
| `/admin` | Admin dashboard overview | P1 | Large hero plus heavy card stack; too much framing before urgent operational state. |
| `/admin/leads` | Admin list + workspace tabs | P0 | Confirmed route-family hotspot: duplicate metric rows, non-mobile tab treatment, too many controls before data, cramped status cards. |
| `/admin/affiliates` | Admin list + analytics hybrid | P1 | Summary cards, view pills, tables, pipeline cards, and exception review forms all compete for the same narrow viewport. |
| `/admin/conversations` | Admin list + review workspaces | P1 | Inbox mode stacks multiple metric rows and filters; review/opportunities/themes views use dense card clusters that will become tall on mobile. |
| `/admin/jobs` | Admin queue list | P1 | Status count cards plus filters plus bulk actions create a dense pre-table stack. Existing browser tests verify behavior more than mobile density. |
| `/admin/journal` | Admin inventory table | P1 | Search/filter controls followed by a wide inventory table and action links; likely horizontal pressure and weak small-screen scanning. |
| `/admin/journal/attribution` | Admin analytics table | P1 | Filter form plus wide attribution table with multiple numeric columns; likely requires horizontal scrolling on phones. |
| `/admin/users` | Admin browse + role counts | P1 | Search and role filter are fine, but role count cards plus bulk role management table still inherit the same density problem as other admin lists. |
| `/admin/prompts` | Admin card grid | P1 | Grid of prompt-slot cards is lighter than the table routes, but still uses roomy cards and hardcoded badge colors rather than a true compact mobile treatment. |
| `/admin/system` | Admin diagnostics surface | P1 | Long monospace values, environment rows, tool lists, and diagnostics text are a genuine narrow-screen truncation risk. This route has a real mobile-specific overflow problem, not just generic panel density. |

## Admin Detail, Edit, And Inspector Routes

| Route pattern | Surface family | Mobile status | Key issues |
| --- | --- | --- | --- |
| `/admin/leads/[id]` | Admin detail shell + forms | P1 | Workflow bars, two-column detail grids, textarea forms, date inputs, and side panels stack into a very tall mobile inspector. Deal and consultation variants inherit the same problem. |
| `/admin/conversations/[id]` | Admin detail shell + transcript inspector | P1 | Message bubbles, tool invocation payloads, routing intelligence sidebars, and session metadata create a long, dense stacked inspector on phones. |
| `/admin/jobs/[id]` | Admin detail shell + code/payload inspector | P1 | JSON payload panels, event timeline, metadata sidebars, and retry/cancel controls make this one of the most overflow-prone admin detail routes. |
| `/admin/users/[id]` | Admin detail shell + management forms | P1 | Profile summary, role form, affiliate toggles, and sidebar lists are manageable but still desktop-first and wrap-heavy on narrow screens. |
| `/admin/journal/[id]` | Editorial form-heavy detail route | P0 | One of the heaviest mobile routes in the app: large metadata forms, workflow actions, editorial textareas, revision compare surfaces, and sidebar media tools. This needs its own mobile simplification pass. |
| `/admin/journal/preview/[slug]` | Editorial preview surface | P1 | Inherits editorial reading patterns; less dangerous than the journal detail form, but still roomy and likely tall on mobile when hero media is present. |
| `/admin/prompts/[role]/[promptType]` | Code/text editing detail route | P1 | Active prompt content, long monospaced text blocks, large textarea, and version-history sidebar create a long editing surface with high wrapping pressure on mobile. |
| `/admin/deals/[id]` | Redirect to leads detail | Redirect only | Canonical route is `/admin/leads/[id]`; mobile fixes belong there. |
| `/admin/training/[id]` | Redirect to leads detail | Redirect only | Canonical route is `/admin/leads/[id]`; mobile fixes belong there. |

## Route Families With Similar Problems

### Family 1: Embedded chat and floating chat routes

Routes:

- `/`
- all routes where the floating chat launcher overlays content, especially `/library` and other non-home non-admin pages

Shared issues:

- oversized composer plane
- helper copy always visible
- tall suggestion chips
- fixed floating launcher or shell can collide with page content

### Family 2: Public discovery shelves

Routes:

- `/library`
- `/journal`
- `/referrals` partial overlap because of card stacks
- `/admin/prompts` partial overlap because of card-grid density

Shared issues:

- cards are too tall on phones
- generous panel inset makes lines too short
- vertical rhythm is beautiful on desktop but wasteful on narrow screens

### Family 3: Admin list routes

Routes:

- `/admin/leads`
- `/admin/affiliates`
- `/admin/conversations`
- `/admin/jobs`
- `/admin/journal`
- `/admin/users`

Shared issues:

- too many controls before data
- metric counts use fixed minimums that wrap poorly
- tables are only partially adapted for mobile
- filters and tabs lack a unified small-screen overflow model

### Family 4: Admin detail routes

Routes:

- `/admin/leads/[id]`
- `/admin/conversations/[id]`
- `/admin/jobs/[id]`
- `/admin/users/[id]`
- `/admin/journal/[id]`
- `/admin/prompts/[role]/[promptType]`

Shared issues:

- desktop inspector layouts merely stack on mobile
- long code or metadata content increases overflow risk
- forms and sidebars become very long vertical documents
- workflow/action rows are not intentionally redesigned for touch-first flow

## Routes That Stand Out Beyond The Existing Screenshot Audit

These are the additional route-specific mobile concerns that stood out during the route sweep.

1. `/library` has a launcher-overlap problem in addition to the known chat-density problem.
2. `/admin/system` has a real monospace truncation/overflow problem for environment values and tool lists.
3. `/referrals` is likely one of the longest and busiest non-admin mobile routes in the app, with QR, copy, charts, and activity all on one page.
4. `/admin/journal/[id]` is a separate P0 route because its editorial form density is much heavier than the generic admin detail shell.
5. `/admin/affiliates` combines several patterns that are each individually expensive on mobile: counts, pills, tables, cards, and inline exception review forms.
6. `/journal/[slug]` is probably readable but still too tall above the body copy when article metadata and hero media stack together on phones.

## Existing Test Coverage By Route Family

### Coverage that exists now

- `tests/browser-fab-mobile-density.test.tsx`
  - explicit mobile structural coverage for the floating chat shell
- `tests/browser-ui/admin-shell-responsive.spec.ts`
  - shared mobile admin navigation shell coverage
- `tests/browser-ui/home-shell-header.spec.ts`
  - shared mobile home and library header coverage
- `tests/browser-ui/jobs-page.spec.ts`
  - jobs route browser coverage, but primarily desktop
- `tests/browser-ui/admin-jobs.spec.ts`
  - admin jobs route browser coverage, including a mobile card-stack path

### Coverage that is missing or weak

1. No mobile screenshot regression coverage for `/library`, `/journal`, `/profile`, `/referrals`, `/admin`, `/admin/leads`, or `/admin/system`.
2. No route-level mobile overflow checks for public discovery shelves.
3. No mobile tests for admin detail routes like `/admin/journal/[id]`, `/admin/conversations/[id]`, or `/admin/prompts/[role]/[promptType]`.
4. No viewport-occupancy tests for home or floating chat on real content routes.
5. No route-level mobile tests for referral landing, profile settings, or the referrals analytics workspace.

## Recommended Fix Order

### First wave

1. Fix the floating chat composer and floating launcher collision behavior.
2. Fix `/admin/leads` mobile metric, tab, and filter density.
3. Add route-level mobile screenshot tests for `/`, `/library`, `/admin`, and `/admin/leads`.

### Second wave

1. Compact `/admin` dashboard and `/admin/system`.
2. Compact `/referrals`, `/profile`, and `/journal` index/detail header stacks.
3. Add overflow assertions for `/library`, `/admin/system`, `/admin/journal`, and `/admin/affiliates`.

### Third wave

1. Redesign admin detail shells for touch-first editing and inspection.
2. Simplify `/admin/journal/[id]` and `/admin/prompts/[role]/[promptType]` for smaller screens.
3. Normalize card, badge, chip, and monospaced content treatment across all remaining route families.

## Implementation Notes

- Do not treat every route as a bespoke redesign problem.
- Fix the shared systems first: spacing roles, count-card behavior, tab overflow, floating chat density, and admin detail-shell ergonomics.
- After those fixes land, rerun this route matrix. Many `P1` routes should drop automatically because they inherit the same layout primitives.
