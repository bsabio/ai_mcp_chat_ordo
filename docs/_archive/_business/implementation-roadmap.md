# Business Implementation Roadmap

## Objective

Turn every document in `docs/_business/` into a concrete implementation program for Studio Ordo.

This roadmap translates strategy, offers, and business specs into a phased build sequence so the team can move from business intent to product execution without overstating what is already built or pretending deferred work is current focus.

---

## 1. Delivery Principles

1. Keep the chat as the primary entry point.
2. Keep all informational pages in the footer.
3. Build the simple funnel before deeper commercial automation.
4. Build founder-leverage systems before adding polish or breadth.
5. Preserve founder review anywhere scope, pricing, proposal, or client access is involved.

---

## 2. Implementation Phases

### Phase 1. Shell And Public Story

**Goal:** make the public UX match the business model.

**Outcomes:**

- header stays sparse and non-informational
- footer becomes the canonical information architecture for research pages
- homepage clearly presents the two lanes
- public messaging aligns with advisory, training, and supervised execution

**Primary source docs:**

- [README.md](README.md)
- [brand-strategy.md](brand-strategy.md)
- [positioning.md](positioning.md)
- [go-to-market.md](go-to-market.md)
- [services.md](services.md)
- [individual-training-offers.md](individual-training-offers.md)

**Implementation tasks:**

1. Keep informational navigation out of the header.
2. Add or refine footer-linked informational pages for services, training, founder story, proof assets, and library access.
3. Keep homepage copy focused on lane selection and next-step clarity.
4. Ensure metadata, footer copy, and chat opener all reflect the business model.

**Status:** started

### Phase 2. Simple Funnel Foundation

**Goal:** make the product understand the visitor, preserve continuity, and explain where anonymous conversion is failing.

**Outcomes:**

- routing between organization, individual, and development demand with `uncertain` as a holding state
- progressive contact capture after value is demonstrated
- anonymous conversion insight and dropout explanation
- signup continuity for preserved conversations
- consultation-request flow for serious signed-in users

**Primary source docs:**

- [specs/contact-capture/spec.md](specs/contact-capture/spec.md)
- [specs/conversation-intelligence/spec.md](specs/conversation-intelligence/spec.md)
- [specs/lane-routing-and-training-path/spec.md](specs/lane-routing-and-training-path/spec.md)
- [individual-training-offers.md](individual-training-offers.md)

**Implementation tasks:**

1. Extend routing to cover organization, individual, development, and uncertain.
2. Keep lane-aware contact-capture prompts and storage aligned with the simpler funnel.
3. Add better explanation of anonymous drop-off and missed conversion.
4. Keep signup continuity tied to preserved conversations instead of resetting the funnel.
5. Add a direct consultation-request flow for serious signed-in users.

**Status:** active focus

### Phase 3. Minimal Deal Flow

**Goal:** convert serious conversations into the smallest viable commercial workflow.

**Outcomes:**

- draft deals for organization and development demand
- simple founder-reviewed estimate framing
- customer agree or decline state
- keep client-facing commercial views lightweight until real deals exist

**Primary source docs:**

- [services.md](services.md)
- [specs/deals-and-estimation/spec.md](specs/deals-and-estimation/spec.md)
- [specs/pricing-policy-and-overrides/spec.md](specs/pricing-policy-and-overrides/spec.md)
- [specs/later-phase/proposal-and-sow-generation/spec.md](specs/later-phase/proposal-and-sow-generation/spec.md)
- [specs/later-phase/authenticated-client-workspace/spec.md](specs/later-phase/authenticated-client-workspace/spec.md)

**Implementation tasks:**

1. Create a deal model scoped to organization and development demand.
2. Add estimate generation using the current pricing baseline.
3. Add founder review and simple override controls.
4. Add customer decision handling for agree or decline.
5. Defer proposal generation and full client workspace until the deal flow is real.

**Status:** active focus after Phase 2

### Phase 4. Founder Control Plane

**Goal:** let one operator run the whole business from a compact dashboard.

**Outcomes:**

- hot leads, consultation requests, and deals needing attention
- high-intent anonymous traffic review
- lane split and market theme visibility
- recommendations for copy, prompts, follow-up, and offer changes

**Primary source docs:**

- [specs/solo-operator-dashboard/spec.md](specs/solo-operator-dashboard/spec.md)
- [specs/conversation-intelligence/spec.md](specs/conversation-intelligence/spec.md)
- [specs/deals-and-estimation/spec.md](specs/deals-and-estimation/spec.md)

**Implementation tasks:**

1. Add dashboard views for leads, consultation requests, deals, and high-intent anonymous conversations.
2. Add recurring demand themes and lane split reporting.
3. Add recommendation widgets for messaging, prompt, and offer adjustments.
4. Add fast links back to source conversations and records.

**Status:** planned

---

## 3. Document-To-Build Map

| Business Document | What It Decides | What Must Be Built |
| --- | --- | --- |
| [README.md](README.md) | overall business model and IA rules | shell contract, footer-only info nav, roadmap discipline |
| [brand-strategy.md](brand-strategy.md) | brand, tone, trust model | homepage framing, footer content direction, public copy rules |
| [positioning.md](positioning.md) | value proposition and lane framing | homepage positioning, offer framing, lane-specific UX copy |
| [go-to-market.md](go-to-market.md) | acquisition and conversion logic | footer-linked proof pages, chat funnel behavior, conversion tracking |
| [services.md](services.md) | service ladder and delivery boundaries | offer packaging, pricing display rules, implementation boundaries |
| [individual-training-offers.md](individual-training-offers.md) | individual lane packages | training recommendation engine, package pages, apprenticeship gating |
| [specs/contact-capture/spec.md](specs/contact-capture/spec.md) | lead capture contract | lane-aware capture prompts and lead persistence |
| [specs/conversation-intelligence/spec.md](specs/conversation-intelligence/spec.md) | market intelligence contract | summaries, signals, recommendations, aggregate analytics |
| [specs/lane-routing-and-training-path/spec.md](specs/lane-routing-and-training-path/spec.md) | routing logic | lane classifier, routing questions, training-path outputs |
| [specs/deals-and-estimation/spec.md](specs/deals-and-estimation/spec.md) | minimal deal process | deal records, statuses, estimates, visibility rules |
| [specs/pricing-policy-and-overrides/spec.md](specs/pricing-policy-and-overrides/spec.md) | estimate framing | draft estimate math and founder override controls |
| [specs/later-phase/proposal-and-sow-generation/spec.md](specs/later-phase/proposal-and-sow-generation/spec.md) | later commercial artifact generation | deferred until the direct deal flow is real |
| [specs/later-phase/authenticated-client-workspace/spec.md](specs/later-phase/authenticated-client-workspace/spec.md) | later client continuity layer | deferred until approved deal data exists |
| [specs/solo-operator-dashboard/spec.md](specs/solo-operator-dashboard/spec.md) | founder operating console | dashboard views, prioritization, recommendations |
| [specs/README.md](specs/README.md) | system-level business loop | implementation sequencing and dependency checks |

---

## 4. Dependency Order

1. Shell and public story first.
2. Routing and conversation continuity before consultation-request flow.
3. Contact capture and conversation intelligence before deals.
4. Deals before proposal generation.
5. Deals and conversation intelligence before the full dashboard.
6. Client workspace only after founder-reviewed records exist.

---

## 5. Suggested Engineering Translation

Each business document should produce one or more implementation specs in `docs/_specs/`.

Recommended first engineering specs:

1. Footer information architecture and shell navigation contract
2. Homepage two-lane messaging and lane-entry UX
3. Conversation lane classifier and routing state model
4. Progressive contact capture and lead storage
5. Anonymous conversion intelligence and founder analytics
6. Signup continuity plus consultation-request flow
7. Direct deal and estimate model
8. Solo-operator dashboard refinement around the simple funnel

---

## 6. Definition Of Done For The Business Folder

The `_business` folder is implemented when:

1. The public shell and homepage match the stated business model.
2. The system can distinguish organization, individual, development, and uncertain demand appropriately.
3. Serious conversations can move from anonymous chat to signup continuity and consultation request without losing context.
4. Qualified organizational or development demand can move into a founder-reviewed deal with a clear customer agree or decline step.
5. The founder can review business activity without transcript-by-transcript manual triage.
6. Informational pages support the funnel from the footer without competing with the chat.
