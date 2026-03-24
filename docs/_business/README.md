# Business Planning Guide

> This directory is the business planning layer for the Studio Ordo bottega. It exists separately from `docs/_specs/` so strategy, offers, market assumptions, and commercial product requirements can evolve together without being mixed into implementation-only feature specs.

---

## 1. Directory Layout

```text
docs/_business/
├── README.md
├── brand-strategy.md
├── positioning.md
├── go-to-market.md
├── implementation-roadmap.md
├── individual-training-offers.md
├── services.md
└── specs/
    ├── README.md
    ├── contact-capture/
    │   └── spec.md
    ├── conversation-intelligence/
    │   └── spec.md
    ├── deals-and-estimation/
    │   └── spec.md
    ├── lane-routing-and-training-path/
    │   └── spec.md
    ├── later-phase/
    │   ├── README.md
    │   ├── authenticated-client-workspace/
    │   │   └── spec.md
    │   └── proposal-and-sow-generation/
    │       └── spec.md
    ├── pricing-policy-and-overrides/
    │   └── spec.md
    └── solo-operator-dashboard/
        └── spec.md
```

---

## 2. Purpose Of This Layer

`docs/_business/` answers questions that are adjacent to product and engineering but not identical to them:

1. What business are we actually building?
2. Who is the buyer?
3. What is the offer ladder?
4. How does the product support the consulting model?
5. Which product capabilities are commercial infrastructure rather than optional UX?

This directory should make it possible for an agent or collaborator to understand not just how the software works, but why certain features matter commercially.

---

## 3. Business Model Summary

The current business model is:

1. Founder-led AI bottega based in Newark, serving Newark and NYC.
2. Studio Ordo as the flagship software product and proof-of-method.
3. Chat-first interaction as the top of funnel.
4. All informational pages live in the footer as the deeper trust and research layer.
5. A one-man practice built around strategic AI advisory, high-skill training, and selectively supervised execution.

The public story still has two clear lanes:

1. Organizations: strategic AI advisory, workflow design, team training, and supervised implementation when needed.
2. Individuals: high-skill training in orchestrating AI agents, evaluating output, and working with professional discipline.

Internally, the runtime may also need to distinguish implementation-heavy `development` demand when deciding how to qualify and route serious conversations.

The simplest way to understand the business right now is this loop:

1. Anonymous chat qualifies the visitor.
2. The system identifies likely lane and missed-conversion signals.
3. Serious users sign up and keep the same conversation.
4. The system captures contact and consultation intent when justified.
5. Founder reviews and creates a simple deal when warranted.
6. The customer can agree or decline.
7. The dashboard turns every conversation, lead, and deal into business intelligence.

The software is not only a product. It is also:

1. The demonstration of capability.
2. The qualification surface.
3. The research engine.
4. The lead-capture mechanism.
5. The operator dashboard for the founder.

---

## 4. Relationship To `docs/_specs/`

Use `docs/_business/` when the work is about:

1. Business strategy
2. Service design
3. Offer structure
4. Funnel design
5. Commercial feature requirements
6. Founder operating model

Use `docs/_specs/` when the work is about:

1. Engineering implementation
2. UI architecture
3. Runtime behavior
4. Data model changes
5. Testing and QA plans for product features

If a feature matters because it enables the business, it should usually have:

1. A business-facing spec in `docs/_business/specs/`
2. A product-facing implementation spec in `docs/_specs/` when the team is ready to build it

---

## 5. Current Business Priorities

1. Keep the consulting offer narrow and clear.
2. Put strategy and training ahead of generic implementation in the public story.
3. Separate the organization lane from the individual training lane.
4. Use the chat as the primary qualification and demonstration surface.
5. Convert strong conversations into signup continuity, consultation requests, and simple deals.
6. Keep pricing, proposals, and client access disciplined and founder-reviewed without pulling deferred systems forward too early.
7. Use the dashboard to learn what the market wants and what to improve next.

## 5A. Current Build Focus

The active product focus is intentionally narrow:

1. anonymous conversion insight
2. signup continuity
3. consultation request flow
4. simple deal creation with agree or decline

Proposal generation, full client workspace, and broader commercial automation remain later-phase work.

## 6. Implementation Rule

The shell should follow one clear UX rule:

1. The header is for brand and account/workspace access.
2. Informational pages belong in the footer.
3. The chat remains the primary entry point and primary call to action.

The build plan for every document in this folder lives in [implementation-roadmap.md](implementation-roadmap.md).

---

## 7. Working Rule

Any new business-facing feature spec added here must answer three questions:

1. What business problem does this solve?
2. How does it help the founder operate a lean consulting practice?
3. How does it strengthen the connection between product behavior and commercial strategy?
