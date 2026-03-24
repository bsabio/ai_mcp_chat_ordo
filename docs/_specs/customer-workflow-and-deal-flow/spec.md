# Customer Workflow And Deal Flow

> **Status:** Draft v0.2
> **Date:** 2026-03-19
> **Implementation Priority:** High
> **Scope:** Define the runtime workflow contract for three customer types — organization, individual, and development — and map the end-to-end flow from conversation routing through qualification, founder review, commercial handling, and client-facing continuity.
> **Business Context:** The product already supports conversation routing, contact capture, lead triage, consultation requests, organization and development deal flow, the individual training-path workflow, founder dashboard operations, and deterministic workflow eval coverage. The remaining runtime gap before this becomes a complete customer-value slice is founder-approved client continuity: signed-in users still need a discoverable, customer-safe view of reviewed downstream records, and owner reads must consistently honor founder-approval rules. Larger proposal, enrollment, and full client-workspace mechanics remain later-phase work. This spec aligns the current implementation surface with the broader business-system vision for deals, proposals, training paths, and founder operations.
> **Requirement IDs:** `FLOW-XXX`
> **Historical note (2026-03-24):** This family records workflow work across the dashboard-to-operator transition. References below to dashboard-named loaders, blocks, or page surfaces should be read as historical implementation context. The surviving business logic now lives under the operator-owned runtime, not `src/lib/dashboard/`.

---

## 0. Simple Product Goals

This feature should stay anchored to three simple business outcomes:

1. Anonymous visitors should be observable so the founder can see what high-intent users wanted, where they dropped, and what likely prevented conversion. `[FLOW-001]`
2. Serious users should be encouraged to sign up so they can save and continue their conversation and request a consultation when appropriate. `[FLOW-002]`
3. Qualified conversations and captured leads should be convertible into founder-reviewed downstream records, including deals or training-path follow-up, that a customer can explicitly act on. `[FLOW-003]`

These goals are the primary product contract. The lane and workflow model exists to support them, not to add process for its own sake. `[FLOW-004]`

---

## 1. Problem Statement

### 1.1 Current System Audit

The current implementation only partially supports the desired workflow.

1. The runtime routing model now recognizes `organization`, `individual`, `development`, and `uncertain` in `src/core/entities/conversation-routing.ts`, and the live chat stream injects lane-aware routing context through `src/lib/chat/routing-context.ts`. The remaining gap is downstream workflow completion, not lane taxonomy. `[FLOW-010]`
2. The database now persists `lane` on `conversations` and `lead_records`, and `src/lib/db/schema.ts` defines `consultation_requests`, `deal_records`, and `training_path_records`. The remaining schema gap is later proposal, enrollment, and client-workspace objects rather than core workflow records. `[FLOW-011]`
3. `src/core/entities/lead-record.ts` now models contact capture, structured qualification, and founder triage. That lead layer can feed consultation requests, organization and development deals, and individual training-path records with deterministic recommendation defaults and founder follow-up metadata. `[FLOW-012]`
4. The implementation specs in `docs/_specs/` now cover routing, contact capture, dashboard blocks, consultation requests, structured qualification, organization and development deal flow, the individual training-path workflow, and deterministic workflow eval coverage. The remaining operational gap is no longer core workflow creation; it is customer continuity from founder-approved downstream records, followed later by proposal, enrollment, and full client-workspace rollout. `[FLOW-013]`
5. Broader business workflow docs already exist under `docs/_business/specs/`, including lane routing, deals and estimation, proposal generation, and client workspace. The shipped runtime now reflects the lane-routing, deal, and training-path layers, while proposal and client-workspace business specs still extend beyond the implemented app. `[FLOW-014]`
6. The current dashboard can prioritize anonymous loss, leads, routing risk, offer focus, consultation requests, training paths, and deals for admins. The remaining dashboard gap needed for workflow completeness is a signed-in customer continuity surface for founder-approved downstream records, followed later by revenue forecasting, proposal tracking, and a fuller client workspace. `[FLOW-015]`

### 1.2 Why This Matters

Without a unified workflow contract:

1. The three workflow types can now all progress into founder-managed downstream records, which means the remaining work should stay focused on later-phase artifacts instead of reopening lane-specific workflow basics. `[FLOW-016]`
2. Anonymous conversations can already be reviewed through dashboard analytics and anonymous-session continuity, and the founder can now connect individual demand to training-path recommendations and follow-up outcomes in the same dashboard. `[FLOW-017]`
3. Qualified `organization`, `development`, and `individual` conversations can now become consultation, deal, or training-path records instead of stopping at lead-only signals. `[FLOW-018]`
4. Users can already sign up, retain anonymous conversation ownership, request consultation, and receive founder-approved downstream follow-up records, but customer-facing continuity remains too narrow because those approved records are not yet surfaced through a clear signed-in workspace flow. `[FLOW-019]`
5. Founder actions after qualification are now structured for consultation requests, deals, and training-path records, leaving proposal generation, enrollment mechanics, and customer portal continuity as the next later-phase concerns. `[FLOW-020]`
6. The repo still has a narrower split-brain architecture only in the later operating model: proposal, enrollment, and client-workspace business specs describe a larger system than the implemented app currently supports. `[FLOW-021]`

---

## 2. Design Goals

1. **Anonymous conversion visibility.** Preserve enough anonymous-session signal to understand what high-intent users wanted and why they likely left before signup or contact capture. `[FLOW-022]`
2. **Signup continuity.** Make signup feel like continuation of the same conversation, not a reset. `[FLOW-023]`
3. **Consultation path.** Give qualified users a straightforward path to request consultation without forcing admin-only workflows too early. `[FLOW-024]`
4. **Deal decision clarity.** Let the founder create deals and let customers clearly agree or disagree. `[FLOW-025]`
5. **Three-type routing.** Support `organization`, `individual`, and `development` as first-class customer workflow types while preserving `uncertain` during discovery. `[FLOW-026]`
6. **Lean operator control.** Keep state models small enough for a solo operator while still covering the real business process. `[FLOW-027]`
7. **Business-doc alignment.** Reconcile the shipped runtime with the existing business specs for deals, proposals, and client-facing continuity. `[FLOW-028]`
8. **Testable workflow.** Make every workflow transition observable and verifiable through unit tests, integration tests, and scenario evals. `[FLOW-029]`

---

## 3. Customer Workflow Types

### 3.1 Organization

The `organization` workflow type covers conversations where the primary buyer need is consulting, workflow architecture, advisory support, or team enablement for an organization. `[FLOW-030]`

Typical signals include:

1. Team or company workflow pain `[FLOW-031]`
2. Adoption, governance, or operating-model questions `[FLOW-032]`
3. Budget, scope, stakeholders, or timelines for an organizational initiative `[FLOW-033]`

### 3.2 Individual

The `individual` workflow type covers personal training, operator development, mentorship, apprenticeship screening, or career-transition demand. `[FLOW-034]`

Typical signals include:

1. Personal skill development `[FLOW-035]`
2. Coaching, mentorship, or apprenticeship interest `[FLOW-036]`
3. Training-fit and pace questions rather than organizational buying behavior `[FLOW-037]`

### 3.3 Development

The `development` workflow type covers implementation-oriented demand where the user wants Studio Ordo to build, configure, ship, or directly execute a technical solution rather than only advise or train. `[FLOW-038]`

Typical signals include:

1. Requests to build or integrate a system `[FLOW-039]`
2. Product, platform, or automation delivery scope `[FLOW-040]`
3. Technical-environment, feasibility, or delivery-constraint questions `[FLOW-041]`

This is intentionally a separate workflow type because implementation demand requires different qualification fields, risk review, pricing logic, and founder actions than advisory or training. `[FLOW-042]`

### 3.4 Uncertain And Reclassification

The system must continue to support an `uncertain` state while signal is incomplete, and it must allow reclassification when stronger evidence appears later in the conversation. `[FLOW-043]`

---

## 4. Architecture

### 4.1 Runtime Model Layers

The workflow should be modeled in three practical layers:

1. **Routing layer:** `ConversationRoutingSnapshot` continues to store the best current workflow type and confidence for the conversation. `[FLOW-050]`
2. **Lead layer:** `LeadRecord` remains the early capture and founder-triage object and should also support anonymous conversion analysis before signup. `[FLOW-051]`
3. **Consultation, deal, or training outcome layer:** downstream records should capture the customer-visible object that can be acted on, accepted, declined, or deferred. `[FLOW-052]`

### 4.2 Required Runtime Contracts

#### 4.2.1 Routing Contract

The runtime `ConversationLane` union in `src/core/entities/conversation-routing.ts` is:

1. `organization` `[FLOW-054]`
2. `individual` `[FLOW-055]`
3. `development` `[FLOW-056]`
4. `uncertain` `[FLOW-057]`

All current helpers, default values, validation functions, persistence mappers, and prompt-context builders that depend on `ConversationLane` must be updated accordingly. `[FLOW-058]`

The routing context injected by `src/app/api/chat/stream/route.ts` must preserve a distinct instruction for `organization`, `individual`, and `development`, while `uncertain` continues to request one brief clarifying question before a lane-specific recommendation is made. `[FLOW-058]`

#### 4.2.2 Lead Contract

`LeadRecord` should remain the contact-capture object, but it should gain the minimum additional fields needed to support downstream qualification without overloading it into a deal record. `[FLOW-059]`

At minimum, the lead layer should support:

1. Anonymous-versus-authenticated origin `[FLOW-060]`
2. Buyer role or authority signal `[FLOW-061]`
3. Timing or urgency signal `[FLOW-062]`
4. Budget or commercial seriousness signal when relevant `[FLOW-063]`
5. Technical environment or implementation context for `development` workflows `[FLOW-064]`
6. Training-fit signal for `individual` workflows `[FLOW-065]`
7. Exit-friction or likely conversion-loss reason when the user leaves before signup or capture is completed `[FLOW-066]`

#### 4.2.3 Outcome Contracts

The lead layer should feed different downstream records by workflow type without requiring an intermediate business object:

1. Serious signed-in conversations should be able to create a consultation request record. `[FLOW-067]`
2. `organization` conversations or leads may create or attach directly to a `DealRecord` aligned with `docs/_business/specs/deals-and-estimation/spec.md`. `[FLOW-068]`
3. `development` conversations or leads may also create a `DealRecord`, but with development-specific scoping and feasibility fields. `[FLOW-069]`
4. `individual` conversations or leads should create a training-path or enrollment record rather than forcing the user into an organizational deal model. `[FLOW-070]`
5. Customer-visible deal records should support an explicit response state such as `estimate_ready`, `agreed`, or `declined`, and owner-side responses must be rejected until the founder has marked the deal `estimate_ready`. `[FLOW-071]`

This keeps the workflow simple while still separating training from deal flow. `[FLOW-072]`

### 4.3 Stage Model

The founder-facing workflow stages should stay intentionally small:

1. `routed` `[FLOW-073]`
2. `captured` `[FLOW-074]`
3. `requested` `[FLOW-075]`
4. `draft` `[FLOW-076]`
5. `agreed` `[FLOW-077]`
6. `declined` `[FLOW-078]`
7. `deferred` `[FLOW-079]`

Type-specific sub-status can exist within downstream records, but the shared workflow stage model should remain simple enough for dashboard use. `[FLOW-080]`

### 4.4 Workflow Map

The intended end-to-end process is:

1. Conversation begins in `uncertain` or an inferred workflow type. `[FLOW-081]`
2. The system preserves anonymous intent and dropout clues even if the visitor never signs up. `[FLOW-082]`
3. Routing logic and lane-aware prompt context gather enough signal to classify the conversation and keep the response aligned to the active workflow type. `[FLOW-083]`
4. The user is encouraged to sign up when continuity or consultation becomes valuable. `[FLOW-084]`
5. Contact capture and workflow-specific qualification fields are collected when justified. `[FLOW-085]`
6. Serious signed-in conversations can create a consultation request or direct deal draft depending on the workflow type. `[FLOW-086]`
7. Founder-facing dashboard views operate on anonymous loss, captured leads, consultation requests, training paths, and deals. `[FLOW-087]`
8. Client-facing continuity is produced only from founder-reviewed downstream records, including deal decision states when relevant. `[FLOW-088]`

---

## 5. Lane-Specific Workflow Requirements

### 5.1 Organization Workflow

The organization workflow should support:

1. Problem clarification and buyer-role understanding `[FLOW-100]`
2. Commercial seriousness detection `[FLOW-101]`
3. Signup and continuation when the conversation becomes serious enough to preserve `[FLOW-102]`
4. Lead capture with organization-specific fields `[FLOW-103]`
5. Direct conversion to a consultation request or reviewed deal draft when the conversation becomes actionable `[FLOW-104]`
6. Conversion to a reviewed deal and estimate when scoping is warranted `[FLOW-105]`
7. A clear customer decision step to agree or disagree with the deal `[FLOW-106]`

### 5.2 Individual Workflow

The individual workflow should support:

1. Skill-level and goal assessment `[FLOW-107]`
2. Recommendation of a concrete training or apprenticeship next step `[FLOW-108]`
3. Signup and continuity when the person wants to continue the conversation or request follow-up `[FLOW-109]`
4. Contact capture only when a real follow-up path exists `[FLOW-110]`
5. Direct creation of a consultation request, screening record, or training-path follow-up when the founder needs to review the person `[FLOW-111]`
6. A lightweight training-path or enrollment record rather than a consulting deal by default `[FLOW-112]`

### 5.3 Development Workflow

The development workflow should support:

1. Capture of product, platform, or automation scope `[FLOW-113]`
2. Technical-environment and integration-context capture `[FLOW-114]`
3. Signup and continuity when the user wants to preserve requirements or request consultation `[FLOW-115]`
4. Feasibility and delivery-risk review `[FLOW-116]`
5. Direct creation of a consultation request or scoping-ready deal when the request is serious enough for founder review `[FLOW-117]`
6. Conversion to a scoping-ready deal when the request becomes commercially actionable `[FLOW-118]`

This workflow may share commercial artifacts with the organization workflow, but it must preserve its own qualification and scoping requirements. `[FLOW-119]`

---

## 6. Security And Access

1. `ADMIN` can view and edit all leads, consultation requests, deals, and downstream workflow records. `[FLOW-120]`
2. `AUTHENTICATED` users can view only founder-approved records associated with their identity. `[FLOW-121]`
3. Anonymous users cannot directly access internal workflow records. `[FLOW-122]`
4. Internal-only scoring, founder notes, and routing diagnostics must remain hidden from client-facing views. `[FLOW-123]`
5. Workflow transitions exposed by routes or server actions must validate both RBAC and stage legality. `[FLOW-124]`

---

## 7. Testing Strategy

The workflow requires verification at three levels.

### 7.1 Unit Tests

Add focused tests for:

1. Expanded workflow-type validation and reclassification rules `[FLOW-130]`
2. Lead qualification field validation by workflow type `[FLOW-131]`
3. Consultation request and deal stage-transition guards `[FLOW-132]`
4. Mapping between lead and downstream records `[FLOW-133]`

### 7.2 Integration Tests

Add route and repository tests for:

1. Anonymous-session analytics that preserve useful conversion-loss signals `[FLOW-134]`
2. Conversation-to-signup continuity for preserved chats `[FLOW-135]`
3. Consultation request creation from signed-in conversations `[FLOW-136]`
4. Consultation request creation from qualified conversations or captured leads `[FLOW-137]`
5. Direct deal creation for `organization` and `development` flows `[FLOW-138]`
6. Individual training-path creation for `individual` flows `[FLOW-139]`
7. Deal response handling for customer agreement or rejection, including the guard that only `estimate_ready` owner-visible deals may transition to `agreed` or `declined` `[FLOW-140]`
8. Admin dashboard loaders and actions that surface consultation requests, training paths, and deals alongside leads `[FLOW-141]`

### 7.3 Scenario Evals

Create workflow evals that cover at minimum:

1. Anonymous high-intent visitor leaves without signing up and the system records a useful likely-friction explanation `[FLOW-142]`
2. Organizational buyer progresses from chat to signup to consultation request to qualified deal draft `[FLOW-143]`
3. Individual learner progresses from chat to signup to training recommendation and founder follow-up `[FLOW-144]`
4. Development prospect progresses from chat to signup to scoped implementation deal draft `[FLOW-145]`
5. A misclassified conversation is correctly re-routed after new evidence appears `[FLOW-146]`
6. Founder daily dashboard review surfaces the right `NOW`, `NEXT`, and `WAIT` actions across anonymous loss, leads, consultation requests, deals, and training paths `[FLOW-147]`

---

## 8. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Complete: align workflow taxonomy across routing, prompt context, analytics, and implementation docs; add `development` to the runtime model |
| 1 | Complete: add anonymous conversion-friction summaries, preserve signup continuity, and implement consultation-request creation flow |
| 2 | Complete: extend lead qualification with structured signals and add founder-facing consultation-request triage workflow with stage transitions |
| 3 | Complete: implement organization and development deal flow, including founder-created draft deals, owner-scoped deal routes, customer agree or decline states, and admin dashboard deal queue visibility |
| 4 | Complete: implement individual training-path workflow using qualified leads and consultation follow-up, add founder dashboard visibility for recommendation mix and apprenticeship candidates, and add deterministic workflow eval coverage |
| 5 | Complete: owner visibility guards, signed-in continuity block, owner-safe detail links, and focused regression/eval coverage now close the approved-customer continuity gap |

---

## 9. Future Considerations

1. Proposal and SOW runtime implementation after the deal layer is real
2. Full client workspace rollout after the minimal founder-approved continuity surface is shipped
3. Revenue forecasting and pipeline analytics built on leads, consultation requests, training paths, and deals rather than raw transcripts
4. CRM synchronization after the internal workflow model is stable
5. Separate reporting for advisory, training, and development revenue streams
