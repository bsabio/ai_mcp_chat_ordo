# Sprint 2 - Public Routes, Discovery, And Reading Remediation

> **Status:** Completed
> **Goal:** Compact public discovery, reading, auth, and landing routes so they use phone screens efficiently while preserving editorial calm and route clarity.
> **Spec ref:** `MSR-013` through `MSR-015`, `MSR-060` through `MSR-065`, `MSR-070` through `MSR-098`, `MSR-120`
> **Prerequisite:** Sprint 1

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/library/[document]/[section]/page.tsx` | public reading route with metadata and navigation stack pressure |
| `src/app/journal/page.tsx` | editorial listing route |
| `src/app/journal/[slug]/page.tsx` | public editorial reading route |
| `src/components/journal/PublicJournalPages.tsx` | shared public journal listing and reading composition |
| `src/app/login/page.tsx` | mobile auth form surface |
| `src/app/register/page.tsx` | mobile auth form surface with longer support copy |
| `src/app/access-denied/page.tsx` | status and recovery surface |
| `src/app/r/[code]/page.tsx` | referral landing hero surface |
| `src/app/styles/foundation.css` | shared tokens for compact route framing |
| `src/app/styles/shell.css` | route framing and section spacing |
| public route browser tests to be added in Sprint 5 | planned regression coverage |

---

## Task 2.1 - Compact Auth, Status, And Landing Routes

**What:** Rebuild the mobile entry state for `/login`, `/register`, `/access-denied`, and `/r/[code]` so the page title and primary CTA are visible immediately.

**Modify:** `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/access-denied/page.tsx`, `src/app/r/[code]/page.tsx`, shared auth or status helpers if present

### Task 2.1 Required Changes

1. reduce top framing and support-copy depth on phones
2. keep the primary action visible without scrolling
3. move secondary explanatory copy lower in the sequence or behind a lighter-weight disclosure where appropriate

### Task 2.1 Acceptance

1. page title and main CTA are both visible at `390x844`
2. no auth or status route depends on tall hero spacing to feel premium
3. referral landing preserves persuasion while reducing above-the-fold chrome

---

## Task 2.2 - Compact The Library Reading Surface

**What:** Reduce header-band height and stabilize metadata and chapter navigation on the library reading route.

**Modify:** `src/app/library/[document]/[section]/page.tsx`, any shared sidebar or chapter-navigation component involved

### Task 2.2 Required Changes

1. shorten the title, metadata, and introduction stack before body content
2. give previous or next controls a deliberate mobile pattern rather than an awkward wrap
3. preserve section context and navigation discoverability without spending the first screen on chrome

### Task 2.2 Acceptance

1. the user reaches real reading content within the first viewport or immediately after one short header stack
2. chapter navigation remains usable and legible on phones
3. metadata no longer expands into a heavy multi-row preface

---

## Task 2.3 - Compact The Journal Index

**What:** Rebalance `/journal` so the feature shelf, article groupings, and archive access feel editorial but not over-framed on phones.

**Modify:** `src/app/journal/page.tsx`, `src/components/journal/PublicJournalPages.tsx`

### Task 2.3 Required Changes

1. reduce feature-card padding and top-of-page framing
2. increase the amount of real article inventory visible in the first viewport
3. keep section identity strong while removing excess banding between shelves

### Task 2.3 Acceptance

1. `/journal` feels faster to scan on phones
2. the route still reads as editorial rather than generic utility UI
3. the first viewport shows route identity plus real article content, not just framing

---

## Task 2.4 - Compact Journal Article Reading

**What:** Shorten the journal article header sequence so the user reaches the body sooner without stripping the route of its editorial hierarchy.

**Modify:** `src/app/journal/[slug]/page.tsx`, `src/components/journal/PublicJournalPages.tsx`, any shared article header component involved

### Task 2.4 Required Changes

1. compress title, dek, metadata, and hero-media sequencing on phones
2. ensure media ratios and support copy do not bury the first paragraph
3. keep article hierarchy crisp through typography and proportion rather than large empty bands

### Task 2.4 Acceptance

1. the first paragraph or clear start of body content appears within the initial viewport or immediately after one short header stack
2. article metadata remains readable but subordinate
3. the mobile route feels elegant, not sparse or collapsed

---

## Task 2.5 - Public Route Mobile Assertions

**What:** Add focused assertions for public-route overflow and first-viewport quality as each route family lands.

**Modify:** `tests/browser-ui/mobile-public-reading.spec.ts` introduced or expanded for `/library/[document]/[section]`, `/journal`, `/journal/[slug]`, `/login`, `/register`, `/access-denied`, and `/r/[code]`

### Task 2.5 Minimum Assertions

1. no horizontal overflow on the route root
2. title plus primary action or first content visible within the first viewport
3. no floating-chat overlap on public routes where the launcher is present

---

## Verification

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css`
4. `npm run spacing:audit`
5. `npx playwright test tests/browser-ui/mobile-public-reading.spec.ts`
6. focused browser evidence for `/library/[document]/[section]`, `/journal`, `/journal/[slug]`, `/login`, `/register`, `/access-denied`, and `/r/[code]`

## Sprint 2 Exit Criteria

1. Public entry and reading routes satisfy the first-viewport contract.
2. Journal and library reading flows retain editorial quality while becoming shorter on phones.
3. Auth, status, and referral landing routes keep their primary CTA above the fold.
4. Focused public-route mobile assertions exist for the changed surfaces.
