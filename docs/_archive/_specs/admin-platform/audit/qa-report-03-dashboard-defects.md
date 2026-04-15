# QA Report 03 — Dashboard Defects

**Severity range:** P1 High / P2 Medium / P3 Low  
**Scope:** The admin dashboard page (`/admin`) — signal cards, data display, layout, empty states.

---

## DEF-015 · P1 High — 4 of 6 Dashboard Signal Cards Are Missing

**File:** `src/app/admin/page.tsx`  
**Spec reference:** spec.md §Operator Dashboard, Sprint 4  
**Expected cards (6):**
1. System Health → `loadSystemHealthBlock()` ✅ Implemented
2. Lead Queue → `loadLeadQueueBlock()` ✅ Implemented
3. User Analytics → `loadAnalyticsBlock()` ❌ Missing
4. Routing Quality → `loadRoutingReviewBlock()` ❌ Missing
5. Active Jobs → job stats from DeferredJob queries ❌ Missing
6. Recent Signups → user registration data ❌ Missing

**Actual:** Only 2 signal cards (health + leads) plus a static "Workspace policy" info card that provides no operational data.

**Impact:** The dashboard shows only 33% of the spec'd operational intelligence. The operator gets no view of analytics, routing quality, job status, or new signups without navigating away.

---

## DEF-016 · P2 Medium — "Workspace Policy" Card Provides No Operational Value

**File:** `src/app/admin/page.tsx`  
**Spec reference:** Design Principle #5 — "People over dashboards. No dashboards for dashboards' sake."  
**Expected:** Every card on the dashboard answers "what does the operator do with this information?"  
**Actual:** The third card is a "Workspace policy" explanation containing three paragraphs of internal design rationale:
- "Use the sidebar on larger screens and the floating bottom dock on smaller screens."
- "Preview badges mark routes that still need their full operator surface."
- "Jobs remains the richer operational detail view."

**Problem:** This is documentation, not operational data. It violates Design Principle #5. An operator checking their phone at a coffee shop gains nothing from this card. It should be replaced with one of the 4 missing signal cards (analytics, routing, jobs, signups).

---

## DEF-017 · P2 Medium — Dashboard Grid Does Not Scale to 6 Cards

**File:** `src/app/admin/page.tsx`  
**Current layout:** `grid gap-(--space-section-default) lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`  
**Problem:** The 2-column grid works for 2-3 cards but will create awkward layouts when the spec's 6 cards are added. The spec's "glanceable → informative → actionable" progressive disclosure pattern requires a denser card grid at the dashboard level.

**Recommendation:** Plan for a 2×3 or 3×2 grid on desktop, single-column stack on mobile. Current CSS will need revision.

---

## DEF-018 · P2 Medium — Dashboard Has No Loading State

**File:** `src/app/admin/page.tsx`  
**Spec reference:** Sprint 4 — card design: "Status dot (green/amber/red) + metric + trend + 1-2 action chips"  
**Expected:** Cards should handle loading gracefully (skeleton states or loading indicators) since they fetch data via `loadSystemHealthBlock()` and `loadLeadQueueBlock()`.  
**Actual:** The page is a server component that blocks on both `Promise.all([...])` calls. If either loader is slow, the entire page hangs with no visual feedback. No Suspense boundaries wrap individual cards.

**Impact:** On slow connections or when health probes time out, the operator sees a blank page until all data resolves.

---

## DEF-019 · P3 Low — Health Card Status Mapping Is Binary

**File:** `src/app/admin/page.tsx`  
**Spec reference:** Sprint 4 — "Status dot (green/amber/red)"  
**Expected:** Three-state status (green/amber/red) for health.  
**Actual:**
```tsx
status={healthSummary.overallStatus === "ok" ? "ok" : "warning"}
```
All non-"ok" states map to "warning" (red). There's no amber/intermediate state. A minor degradation and a critical failure look identical.

---

## DEF-020 · P3 Low — Lead Queue Card Shows Raw Count Without Context

**File:** `src/app/admin/page.tsx`  
**Actual:**
```tsx
<p className="text-3xl font-semibold">{leadSummary.submittedLeadCount}</p>
```
**Problem:** The large number is `submittedLeadCount` but has no label next to it. The sub-metrics (New, Contacted, Qualified) appear below, but the hero number has no unit or description. An operator glancing at "3" in large text doesn't immediately know what "3" means.

**Recommendation:** Add a unit label like "leads" or "submitted" next to the number, or show the most actionable count (new leads requiring attention) as the hero metric.

---

## DEF-021 · P3 Low — Dashboard Cards Have No Action Chips

**File:** `src/app/admin/page.tsx`  
**Spec reference:** Sprint 4 — "metric + trend + 1-2 action chips. Tap to expand for detail."  
**Expected:** Each card has action chips like "View all leads", "Run health check", "Review routing."  
**Actual:** Cards display data but have no actionable links or buttons. The operator sees information but has no next-step affordance.

**Impact:** Violates the "glanceable → informative → actionable" progressive disclosure pattern. Cards are informative but not actionable.
