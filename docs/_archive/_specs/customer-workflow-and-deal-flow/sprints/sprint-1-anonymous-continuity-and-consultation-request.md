# Sprint 1 - Anonymous Continuity And Consultation Request

> **Goal:** Build the first complete simple-funnel workflow on top of the existing anonymous-session and lane-aware routing foundation: explain anonymous conversion loss more clearly, preserve the already-shipped signup continuity path, and let serious signed-in users create consultation requests.
> **Spec ref:** `FLOW-001` through `FLOW-004`, `FLOW-017` through `FLOW-025`, `FLOW-060` through `FLOW-072`, `FLOW-081` through `FLOW-088`, `FLOW-100` through `FLOW-106`, `FLOW-120`, `FLOW-134` through `FLOW-147`
> **Prerequisite:** Sprint 0 complete
> **Test count target:** Recalculate the full-suite and focused-suite baseline at implementation start. Do not rely on the earlier 724-test or 4-failure figures without re-measuring them.
> **Historical note (2026-03-24):** This sprint predates the later dashboard-to-operator convergence. References below to dashboard loaders, dashboard page wiring, or dashboard components should be read as historical implementation evidence rather than the current runtime structure.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/chat/resolve-user.ts` | `resolveUserId()` provisions or reuses the anonymous cookie-backed owner id `anon_{uuid}` and `clearAnonSession()` clears that cookie after migration |
| `src/core/use-cases/ConversationInteractor.ts` | `create()` records `session_source`; `getActiveForUser()` restores the current active thread; `migrateAnonymousConversations()` transfers anonymous ownership and records `converted` events |
| `src/lib/chat/migrate-anonymous-conversations.ts` | `migrateAnonymousConversationsToUser(userId, source)` is the current shared migration helper used during login and registration |
| `src/app/api/auth/register/route.ts` | Successful registration already calls `migrateAnonymousConversationsToUser(result.user.id, "registration")` after session creation |
| `src/app/api/auth/login/route.ts` | Successful login already calls `migrateAnonymousConversationsToUser(result.user.id, "login")` after session creation |
| `src/app/api/auth/auth-routes.test.ts` | Existing auth-route tests already verify anonymous conversation migration during both registration and login |
| `src/app/api/conversations/active/route.ts` | `GET /api/conversations/active` returns the active conversation for the resolved user id |
| `src/app/api/conversations/active/route.test.ts` | Existing route tests already prove active-conversation restore for anonymous and authenticated users |
| `src/lib/chat/routing-context.ts` | The chat stream now injects lane-aware routing instructions for `organization`, `individual`, `development`, and `uncertain`, so Sprint 1 can rely on the widened taxonomy already being present in runtime prompts |
| `src/core/entities/lead-record.ts` | The lead model already persists lane, contact info, training goal, problem summary, recommended next action, triage state, founder note, and contact timestamps |
| `src/adapters/LeadRecordDataMapper.ts` | `upsertTriggered()`, `submitCapture()`, `updateStatus()`, and `updateTriageState()` already provide the current structured follow-up storage surface |
| `src/lib/dashboard/dashboard-loaders.ts` | `loadAnonymousOpportunitiesBlock()` and `loadFunnelRecommendationsBlock()` already surface anonymous opportunities, conversion gaps, and drop-off recommendations for admins |
| `src/lib/dashboard/dashboard-loaders.test.ts` | Existing tests already cover anonymous opportunities and funnel recommendation behavior for admins and fail-closed behavior for non-admins |

---

## Task 1.1 - Add explicit anonymous conversion-friction summaries

**What:** Extend the anonymous funnel analytics so the founder gets a clearer explanation of why strong anonymous conversations are leaving before signup or contact capture.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | dashboard block UI/tests only if the payload shape changes visibly |
| **Spec** | `FLOW-001`, `FLOW-017`, `FLOW-022`, `FLOW-082`, `FLOW-087`, `FLOW-142`, `FLOW-147` |

### Task 1.1 Notes

Keep this explanation heuristic and founder-useful.

The friction summary must preserve the widened lane taxonomy. A `development` conversation cannot disappear into an organization-only or individual-only explanation path.

The new output does not need model-generated prose. A simple derived reason is enough, for example:

1. routing still uncertain
2. conversation became high-intent before a signup ask appeared
3. contact capture was triggered too late or not at all
4. the thread stalled after a pricing or consultation signal

The goal is to help the founder act, not to create a false sense of perfect attribution.

### Task 1.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/app/dashboard/page.test.tsx
```

---

## Task 1.2 - Add a minimal consultation request record

**What:** Add the smallest durable record needed for a serious signed-in user to request consultation from an existing conversation.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Create** | `src/core/entities/consultation-request.ts` |
| **Create** | repository interface and data mapper for consultation requests |
| **Create** | focused tests for the new mapper or use-case |
| **Spec** | `FLOW-002`, `FLOW-024`, `FLOW-067` through `FLOW-072`, `FLOW-075`, `FLOW-086`, `FLOW-137` |

### Task 1.2 Notes

Keep the record intentionally small.

Sprint 1 is not responsible for inventing signup continuity from scratch. That foundation already exists and should be reused or regression-tested while the new consultation-request record is added.

Recommended minimum fields:

1. id
2. conversation id
3. user id
4. lane
5. request summary
6. request status
7. created and updated timestamps

Optional founder notes can wait unless the dashboard integration needs them immediately.

Do not introduce an intermediate opportunity object in this sprint.

### Task 1.2 Verify

```bash
npx vitest run src/adapters/ConsultationRequestDataMapper.test.ts src/core/use-cases/RequestConsultationInteractor.test.ts
```

---

## Task 1.3 - Add a signed-in consultation request route

**What:** Provide the server boundary that turns a preserved conversation into a consultation request.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/api/consultation-requests/route.ts` or equivalent server boundary |
| **Create** | route tests near the new route |
| **Modify** | composition-root wiring only if a shared use case or repository factory is introduced |
| **Spec** | `FLOW-019`, `FLOW-024`, `FLOW-084` through `FLOW-088`, `FLOW-136`, `FLOW-137`, `FLOW-143` through `FLOW-145` |

### Task 1.3 Notes

The route should:

1. require an authenticated user
2. verify ownership of the conversation
3. allow the request to reuse existing lead data and current routing data when available
4. persist a single clear founder-facing request rather than a free-form note

Return the created request record or a compact acknowledgement payload.

The created record must preserve the active lane from the conversation snapshot so `organization`, `individual`, and `development` requests remain distinguishable downstream.

If duplicate requests for the same conversation should be prevented, enforce that in the data model now instead of in the UI.

### Task 1.3 Verify

```bash
npx vitest run src/app/api/consultation-requests/route.test.ts src/app/api/auth/auth-routes.test.ts src/app/api/conversations/active/route.test.ts
```

---

## Task 1.4 - Surface consultation requests in the founder workflow

**What:** Ensure founder-side workflow can see newly requested consultations without requiring transcript rereads.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/app/dashboard/page.tsx` and related dashboard components if a new block or queue section is added |
| **Modify** | related tests |
| **Spec** | `FLOW-024`, `FLOW-087`, `FLOW-120`, `FLOW-141`, `FLOW-147` |

### Task 1.4 Notes

Use the lightest founder-facing surface that works.

Two acceptable implementation shapes:

1. a dedicated consultation-requests block
2. an extension of the existing lead queue that clearly marks requests awaiting founder response

Prefer the second option if it keeps the dashboard simpler and avoids duplicate pipeline surfaces.

Sprint 1 should treat the existing anonymous-opportunities and lead-queue surfaces as the baseline. Consultation-request surfacing must compose with those blocks instead of replacing or flattening them.

### Task 1.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 1.5 - Record verification truthfully

**What:** Preserve the real state of the simple funnel after Sprint 1 lands.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a required deviation |
| **Spec** | `FLOW-029` |

### Task 1.5 Notes

The earlier 4-failure full-suite claim is now historical, not authoritative. Record the actual measured baseline at Sprint 1 implementation time and state clearly whether Sprint 1 preserves or changes it.

### Task 1.5 Verify

```bash
npm run typecheck
npx vitest run src/app/api/auth/auth-routes.test.ts src/app/api/conversations/active/route.test.ts src/lib/dashboard/dashboard-loaders.test.ts
```

---

## Completion Checklist

- [x] Anonymous funnel analytics explain likely conversion friction more clearly than raw counts alone
- [x] Existing signup continuity remains intact across registration and login
- [x] Authenticated users can create a consultation request from a preserved conversation
- [x] Founder workflow surfaces consultation requests without transcript rereads
- [x] Sprint 1 verification does not worsen the measured full-suite baseline captured at implementation start

## QA Deviations

- 2026-03-19 QA: No consultation-request entity, repository, mapper, or route currently exists in `src/`, so Sprint 1 remains the first runtime implementation point for that workflow surface.
- 2026-03-19 QA: Sprint 1 should treat login and registration conversation migration as existing foundation, not new implementation scope. The sprint work is to preserve that continuity while adding consultation-request capability.
- 2026-03-19 QA: Task 1.1 must preserve the widened `development` lane in anonymous conversion-friction summaries because Sprint 0 already made `development` a first-class routing and analytics value.
- 2026-03-19 QA: Task 1.2 previously pointed verification at auth and active-conversation routes only, which would miss the new consultation-request persistence surface entirely.
- 2026-03-19 QA: Historical test-count and full-suite failure-baseline numbers are stale and must be re-measured before Sprint 1 implementation is declared green.
- 2026-03-19 QA: The original spec-ref header listed `FLOW-095 through FLOW-106`, but the spec has no IDs FLOW-089 through FLOW-099. Corrected to `FLOW-100 through FLOW-106`. Sprint 1 directly delivers FLOW-102 (signup continuity preservation) and FLOW-104 (conversion to consultation request). FLOW-100, FLOW-101, and FLOW-103 were already addressed by Sprint 0 and existing lead-capture infrastructure. FLOW-105 and FLOW-106 (deal creation and customer decision) are Sprint 2–3 scope.
- 2026-03-19 QA: Added `FLOW-120` (ADMIN can view consultation requests) to the spec-ref header because the consultation-requests dashboard block enforces admin-only access, which directly implements that security requirement.

## Verification Results (2026-03-19)

| Metric | Value |
| --- | --- |
| Full-suite test files | 132 (130 passed, 2 failed) |
| Full-suite tests | 761 (757 passed, 4 failed) |
| Typecheck | Clean — `tsc --noEmit` zero errors |
| Pre-existing failures | ChatInput.test.tsx (3 tests), ChatContainer.send-failure.test.tsx (1 test) |
| Sprint 1–caused failures | 0 |
| Sprint 1 net new tests | ~28 (data mapper 8, interactor 5, route 6, friction 3, consultation loader 3, block component 3) |

All 4 failures are pre-existing and unrelated to Sprint 1 changes. Sprint 1 did not worsen the full-suite baseline.
