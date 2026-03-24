# Business System Audit - 2026-03-19

> **Historical note (2026-03-24):** This audit captures the repo state before the later dashboard-to-operator convergence was completed. References below to `src/lib/dashboard/dashboard-loaders.ts` or dashboard page wiring are historical evidence, not the current runtime boundary.

## Scope

This audit reviews:

1. The implementation spec in `docs/_specs/customer-workflow-and-deal-flow/spec.md`
2. The current runtime and data model in `src/`
3. The business planning layer in `docs/_business/`
4. The business feature specs in `docs/_business/specs/`

The purpose is to decide what is already present, what is redundant or deferrable, and what should be the near-term focus.

---

## QA Verdict On The New Workflow Spec

### Verdict

Pass with corrections applied.

### Corrections Made During QA

1. The spec now acknowledges that anonymous conversation continuity already exists through anonymous-session migration and active-conversation restore, rather than describing signup continuity as fully absent.
2. The spec now distinguishes between existing anonymous opportunity analytics and the still-missing consultation-request and deal workflow.
3. Duplicate requirement IDs were removed so the spec is internally consistent.

### Alignment Summary

After QA, the spec is aligned with the current simplified product direction:

1. Understand anonymous drop-off and missed conversion
2. Get serious users to sign up and continue the same conversation
3. Let the founder create deals that customers can agree to or decline

---

## What The System Already Has

### 1. Anonymous Conversation Continuity

Already implemented:

1. Anonymous conversations persist and are tagged with `session_source` in the conversation lifecycle.
2. Anonymous conversations are migrated to a registered user during registration and login.
3. Active-conversation restore exists for the current user, including anonymous users.

Evidence:

1. `ConversationInteractor.create()` and `migrateAnonymousConversations()` in `src/core/use-cases/ConversationInteractor.ts`
2. registration migration flow in `src/app/api/auth/register/route.ts`
3. registration and login migration tests in `src/app/api/auth/auth-routes.test.ts`
4. active conversation restore route in `src/app/api/conversations/active/route.ts`

### 2. Founder Visibility Into Anonymous Conversion Risk

Already implemented:

1. Anonymous opportunities block for founder review
2. Funnel recommendations that call out anonymous conversion gaps and anonymous drop-off

Evidence:

1. `loadAnonymousOpportunitiesBlock()` in `src/lib/dashboard/dashboard-loaders.ts`
2. `loadFunnelRecommendationsBlock()` in `src/lib/dashboard/dashboard-loaders.ts`
3. dashboard block wiring in `src/app/dashboard/page.tsx`

### 3. Lead Capture And Founder Triage

Already implemented:

1. Lead records persisted in the database
2. Founder triage state, founder notes, and last-contacted metadata
3. Lead queue surfaced in the dashboard

Evidence:

1. `lead_records` schema in `src/lib/db/schema.ts`
2. lead entity in `src/core/entities/lead-record.ts`
3. lead persistence in `src/adapters/LeadRecordDataMapper.ts`

### 4. Conversation Routing Foundation

Already implemented:

1. Routing snapshot stored on conversations
2. Current lane model for `organization`, `individual`, and `uncertain`
3. Routing-change events recorded during conversation updates

Evidence:

1. routing entity in `src/core/entities/conversation-routing.ts`
2. routing updates in `src/core/use-cases/ConversationInteractor.ts`
3. lane columns in `src/lib/db/schema.ts`

---

## What The System Does Not Have Yet

### 1. Development Lane

Missing:

1. No `development` value in the runtime lane union
2. No `development`-specific qualification or dashboard reporting

Impact:

The current runtime cannot support the third customer type you now want.

### 2. Consultation Request Workflow

Missing:

1. No consultation-request entity
2. No route or server action for requesting consultation
3. No founder workflow that turns a signed-in conversation into a consultation object

Impact:

The product can preserve conversations across signup, but it cannot yet turn that continuity into the next explicit business step.

### 3. Deals, Customer Decision State, And Client-Facing Commercial Flow

Missing:

1. No deal table or runtime deal entity
2. No agree or decline customer response state
3. No client-facing deal surface

Impact:

The commercial process stops before a structured customer decision point.

---

## Document Review

## A. Keep As Core Source Documents

These still add value and should remain active.

### `docs/_business/README.md`

Keep.

Why:

1. It still correctly explains the purpose of the business layer.
2. It remains the best short explanation of why the business docs are separate from implementation specs.

### `docs/_business/services.md`

Keep.

Why:

1. It is the clearest statement of the offer ladder.
2. It already contains the simple service rule that maps well to the funnel you want.

### `docs/_business/go-to-market.md`

Keep, but treat as strategy rather than near-term implementation truth.

Why:

1. It explains acquisition and conversion logic well.
2. Its funnel section still matches the product direction.

### `docs/_business/positioning.md`

Keep.

Why:

1. It is positioning and messaging guidance, not implementation burden.
2. It remains useful for homepage and public copy decisions.

### `docs/_business/individual-training-offers.md`

Keep, but later than current core work.

Why:

1. It is the clearest package definition for the individual lane.
2. It will matter once signup continuity and recommendation flow are in place.

---

## B. Merge Or Collapse In Practice

These docs are not wrong, but they currently create too much fragmentation for the simple funnel you want.

### Qualification Cluster

Includes:

1. `docs/_business/specs/contact-capture/spec.md`
2. `docs/_business/specs/conversation-intelligence/spec.md`
3. `docs/_business/specs/lane-routing-and-training-path/spec.md`

Recommendation:

Treat these three as one practical workstream: anonymous conversion plus qualification.

Why:

1. Contact capture, anonymous intelligence, and lane routing are the same near-term product loop.
2. Reading them separately makes the planned work feel larger and more disconnected than it really is.
3. The new implementation spec already unifies these concerns more effectively for execution.

Action:

Do not delete them yet, but stop treating them as independent priorities. The new implementation spec should be the active build contract.

### Deal And Pricing Cluster

Includes:

1. `docs/_business/specs/deals-and-estimation/spec.md`
2. `docs/_business/specs/pricing-policy-and-overrides/spec.md`

Recommendation:

Treat pricing as a subsection of the deal workflow until real deal objects exist.

Why:

1. A standalone pricing policy is premature when there is no deal runtime yet.
2. For the near term, the important truth is simply: draft estimate, founder review, not binding.

Action:

Keep both docs, but focus implementation only on the minimum deal record and customer decision state.

---

## C. Defer Hard

These are valid later-phase docs, but they are not the right focus while consultation requests and deals do not exist.

### `docs/_business/specs/later-phase/proposal-and-sow-generation/spec.md`

Defer.

Reason:

Proposal generation only matters after deals exist and founder-reviewed scope is real.

### `docs/_business/specs/later-phase/authenticated-client-workspace/spec.md`

Defer.

Reason:

The current authenticated value is conversation continuity first. A full client workspace is downstream of actual deal state and approved commercial information.

---

## D. Partly Implemented Already

These docs describe areas where the system has meaningful partial implementation.

### `docs/_business/specs/solo-operator-dashboard/spec.md`

Status:

Partly implemented.

Already present:

1. Lead queue
2. Anonymous opportunities
3. Recurring pain themes
4. Funnel recommendations
5. Admin chat workflows for prioritization and routing risk

Still missing:

1. Real deals pipeline
2. Customer decision tracking
3. Dashboard views over consultation requests and deal entities

### `docs/_business/specs/conversation-intelligence/spec.md` As Implemented Analytics Surface

Status:

Partly implemented.

Already present:

1. Anonymous opportunity scoring
2. Drop-off recommendations
3. Recurring pain themes
4. Lane-aware funnel signals

Still missing:

1. Rich per-conversation conversion-loss diagnosis
2. Broader aggregate business analytics beyond the current dashboard slices

---

## What To Eliminate

Nothing should be hard-deleted right now.

The bigger problem is not bad documents. It is active-document sprawl.

What should be eliminated is the habit of treating all drafts as equally live.

Practical elimination means:

1. Stop using `docs/_business/implementation-roadmap.md` as the literal current-state map without revision.
2. Stop treating the three qualification docs as separate implementation efforts.
3. Stop pulling proposal generation and client workspace into near-term planning before consultation request and deals exist.

---

## What To Focus On Now

### Focus 1. Anonymous Conversion Insight

Goal:

Move from aggregate anonymous signals to conversation-linked dropout explanation that helps the founder improve conversion.

### Focus 2. Signup Continuity Plus Consultation Request

Goal:

Use the already-working conversation migration path to support a true next step for serious users: preserve conversation, sign up, request consultation.

### Focus 3. Minimal Deal Flow

Goal:

Create the smallest possible deal model that lets the founder prepare a deal and lets the customer respond with agree or decline.

### Focus 4. Development Lane

Goal:

Extend the routing model from two main lanes plus uncertainty to three main customer types plus uncertainty.

This should happen early because it changes analytics, qualification, and future deal classification.

---

## Recommended Active Build Sequence

1. Add `development` to routing, schema validation, and dashboard analytics.
2. Add consultation-request workflow on top of the existing signup and conversation-migration flow.
3. Add the smallest viable deal record with founder review and customer agree or decline.
4. Keep the workflow direct from lead or signed-in conversation to consultation request or deal when possible.
5. Defer proposal generation, pricing sophistication, and client workspace until deals are real.

---

## Bottom Line

The business-doc layer is directionally strong, but it is ahead of the product.

The runtime already has more of the funnel foundation than the docs initially gave it credit for:

1. anonymous conversation preservation
2. anonymous founder analytics
3. lead capture and founder triage
4. dashboard operator tooling

The missing center of gravity is not more analysis. It is the business-state layer between chat and commercial decision:

1. consultation request
2. direct consultation request or deal workflow
3. deal with agree or decline

That is the narrowest path to making the system match the business.
