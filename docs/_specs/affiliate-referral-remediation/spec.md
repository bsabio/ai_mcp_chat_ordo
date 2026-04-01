# Affiliate Referral Remediation

> **Status:** Draft v0.1
> **Date:** 2026-04-01
> **Scope:** Restore trustworthy referral entry, make attribution commission-ready, add simple affiliate self-service, and expose role-safe referral analytics through MCP-backed tools and graph datasets.
> **Dependencies:** [RBAC](../rbac/spec.md), [Admin Platform](../admin-platform/spec.md), [Flexible Graphing System](../flexible-graphing-system/spec.md), [Tool Architecture](../tool-architecture/spec.md), [Progressive Contact Capture](../progressive-contact-capture/spec.md), [Customer Workflow And Deal Flow](../customer-workflow-and-deal-flow/spec.md), [Affiliate Analytics Registry](../affiliate-analytics-registry/spec.md)
> **Affects:** `src/proxy.ts`, `src/app/api/referral/[code]/route.ts`, `src/app/api/qr/[code]/route.ts`, `src/hooks/useGlobalChat.tsx`, `src/hooks/chat/chatState.ts`, `src/adapters/ReferralDataMapper.ts`, `src/lib/chat/stream-pipeline.ts`, `src/core/use-cases/RegisterUserInteractor.ts`, `src/core/use-cases/LeadCaptureInteractor.ts`, `src/core/use-cases/RequestConsultationInteractor.ts`, `src/core/use-cases/CreateDealFromWorkflowInteractor.ts`, `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.ts`, `src/components/profile/ProfileSettingsPanel.tsx`, `src/app/admin/users/[id]/page.tsx`, `src/lib/graphs/graph-data-sources.ts`, `src/core/use-cases/tools/`, `mcp/analytics-tool.ts`, and branded app-router error surfaces in `src/app/`
> **Motivation:** Studio Ordo already has partial referral capture and referral-aware chat copy, but the live referral experience is not trustworthy enough for affiliates or commission tracking.
> **Requirement IDs:** `AFR-001` through `AFR-199`

---

## 1. Problem Statement

### 1.1 Verified current state

| Area | Verified state | Implication |
| --- | --- | --- |
| Live referral entry | External probes returned HTTP 404 for both `https://studioordo.com/` and `https://studioordo.com/?ref=...`, while the local app still serves `/` from `src/app/page.tsx` | Referral trust starts with deployment and domain routing, not only local route code. `[AFR-001]` |
| Referral capture | `src/proxy.ts` captures `?ref=` and writes `lms_referral_code` | Entry capture exists, but it currently trusts raw codes too early. `[AFR-002]` |
| Referral lookup | `src/app/api/referral/[code]/route.ts` resolves a referrer only when `affiliate_enabled = 1` | The app already has a validation boundary for active affiliate codes. `[AFR-003]` |
| Referral-aware greeting | `src/hooks/useGlobalChat.tsx`, `src/hooks/chat/chatState.ts`, and `config/prompts.json` already support `withReferral` and `referralSuggestions` | Personalized AI welcome is partially implemented and should be preserved, not redesigned from scratch. `[AFR-004]` |
| Affiliate enablement | `src/app/api/admin/affiliates/[userId]/route.ts` is admin-only and toggles `affiliate_enabled` plus `referral_code` | Affiliate access is already a capability on top of existing roles, not a standalone role. `[AFR-005]` |
| Self-service surfaces | `src/lib/profile/profile-service.ts` and `src/components/profile/ProfileSettingsPanel.tsx` expose referral link and QR assets only | Affiliates can share links, but they cannot see results, milestones, or credit status. `[AFR-006]` |
| Attribution persistence | `src/lib/chat/stream-pipeline.ts` forwards the raw referral cookie into conversation creation, and `conversations.referral_source` stores that raw value | Invalid or disabled codes can pollute attribution data today. `[AFR-007]` |
| Referral ledger | `src/adapters/ReferralDataMapper.ts` and the `referrals` table already exist, but the active app flow does not currently write scan and conversion lifecycle records into it | The repository has a dormant attribution ledger that needs to become the canonical source of truth. `[AFR-008]` |
| Sales lifecycle hooks | Lead, consultation, deal, and training-path use cases exist, but they do not currently append referral lifecycle events | There is no commission-ready record of how a referred prospect moved through the funnel. `[AFR-009]` |
| Notifications | Existing push notification infrastructure is tied to deferred jobs only | Affiliates receive no milestone visibility even when referral events happen. `[AFR-010]` |
| Error UX | The app has scoped admin `error.tsx` files, but no global branded `not found`, `access denied`, or generic public failure contract | Referral failures currently feel like broken product instead of managed product state. `[AFR-011]` |
| MCP and graphing | `mcp/analytics-tool.ts`, `generate_graph`, and `src/lib/graphs/graph-data-sources.ts` already exist; some approved graph data sources call admin-only loaders even though the graph tool itself is visible to signed-in users | Referral analytics must use dataset-level authorization, not only tool-level visibility. `[AFR-012]` |

### 1.2 Why the current state is not good enough

1. Affiliates need a link they can trust, a landing experience that feels intentional, and a clear answer to "what happened after I shared this?" The current product fails all three. `[AFR-013]`
2. Solopreneur operators need attribution they can explain and defend. Raw cookie strings in `conversations.referral_source` are not strong enough for commission or payout review. `[AFR-014]`
3. The app already knows how to personalize the first AI message, but it does not preserve that trust through lifecycle tracking, dashboard visibility, or notifications. `[AFR-015]`
4. Admins can enable affiliate access today, but they do not have a truthful global affiliate overview, exception queue, or credit review path. `[AFR-016]`
5. The current graphing and MCP surface proves that role-safe analytics are possible, but it also exposes the exact RBAC drift this feature must avoid. `[AFR-017]`

### 1.3 Product decision

1. Referral entry becomes a first-class public product flow, not a fragile query-param side effect. `[AFR-020]`
2. Attribution is written only after code validation, and lifecycle history moves into explicit referral records plus append-only referral events. `[AFR-021]`
3. Affiliate access remains a capability overlay on existing signed-in roles through `affiliate_enabled`; this feature does **not** introduce a new `AFFILIATE` role. `[AFR-022]`
4. The first release is commission-ready, not payout-automated. Affiliates and admins can see pipeline and credit state, but payment processing remains out of scope. `[AFR-023]`
5. MCP tools and graph datasets must be authorized per dataset and per scope. Tool visibility alone is not authorization. `[AFR-024]`

---

## 2. Design Goals

1. **Trust the first click.** Referral links must open a real branded experience on the production domain, including private-browser entry. `[AFR-030]`
2. **Make the referral feel personal.** The referred visitor should see who introduced them and why that matters before the first chat turn. `[AFR-031]`
3. **Keep affiliate self-service simple.** One dashboard, one set of share assets, one recent-activity feed, and a small number of charts are better than a sprawling partner portal. `[AFR-032]`
4. **Track lifecycle, not just traffic.** The system must connect referral visit, conversation, registration, lead capture, and downstream sales milestones. `[AFR-033]`
5. **Be commission-ready without overbuilding.** Credit status and payout review must be visible, but payment rails, contracts, and accounting integrations are not needed in this phase. `[AFR-034]`
6. **Preserve RBAC clarity.** Anonymous, signed-in, affiliate-enabled, staff, and admin audiences must see exactly the surfaces and datasets they are supposed to see. `[AFR-035]`
7. **Reuse existing tool and graph foundations.** The solution should extend current MCP analytics and `generate_graph` patterns instead of inventing a second analytics stack. `[AFR-036]`
8. **Prefer explicit empty states over false capability.** If an affiliate has no activity yet, the UI should say so plainly instead of hiding the surface or showing broken charts. `[AFR-037]`

### 2.1 Non-goals

1. No new global `AFFILIATE` role or role-switching branch in `RoleName`. `[AFR-038]`
2. No multi-touch or weighted attribution model in the first release. This phase is first-touch, single-referrer attribution. `[AFR-039]`
3. No automated payout processor integration. Credit review and export are enough for the first release. `[AFR-040]`
4. No open-ended analytics query surface where callers can author SQL, table names, or arbitrary database filters. `[AFR-041]`

---

## 3. Architecture

### 3.1 Canonical public referral flow

The public referral contract should move to a single canonical landing path.

1. New referral links and QR codes should resolve to `/r/{code}` on the active site origin. Production should use the configured public site address, while local and preview environments should default to `http://localhost:{port}` until an explicit public origin is configured. `src/app/api/qr/[code]/route.ts`, `src/lib/referrals/referral-links.ts`, and profile share surfaces should generate this canonical form. `[AFR-050]`
2. Share-asset generation should use one shared origin resolver so QR codes, profile links, and tool or presenter outputs do not drift across protocol, host, or port handling. `[AFR-057]`
3. Existing `/?ref={code}` links must remain backward compatible, but they should pass through the same resolver contract as `/r/{code}` instead of bypassing it. `[AFR-051]`
4. A valid referral code should render a lightweight branded landing page that names the referrer, shows their public credential when present, and offers a small number of clear next actions such as `Start chat` and `Book consult`. `[AFR-052]`
5. The referral resolver should issue a signed `lms_referral_visit` cookie that stores a generated visit id plus canonical code metadata. Raw query-param codes should not be trusted after the resolver boundary. `[AFR-053]`
6. Invalid, disabled, or expired codes should render a branded referral-unavailable state and must not set attribution cookies or mutate conversation state. `[AFR-054]`
7. The public app should add shared branded primitives for `not found`, `access denied`, and `unexpected error` states so referrals do not degrade into generic browser failure pages. `[AFR-055]`
8. Port derivation for local and preview share URLs should come from explicit config when available and otherwise from the active request or runtime context. Hardcoded production-only origins are not acceptable in development. `[AFR-058]`

Recommended public error states:

| Surface | Trigger | Primary CTA |
| --- | --- | --- |
| Referral unavailable | invalid, disabled, or expired referral code | Return home and start a normal conversation |
| Not found | unknown public route or asset | Return home or open library |
| Access denied | signed-in user reaches a disallowed page | Return to allowed workspace |
| Unexpected error | unhandled runtime fault | Retry or return home |

`[AFR-056]`

### 3.2 Canonical attribution model

The current `referrals` table should evolve from a dormant log into the canonical attribution ledger.

Recommended domain status values:

```typescript
type ReferralStatus =
  | "visited"
  | "engaged"
  | "registered"
  | "lead"
  | "consultation"
  | "deal"
  | "training"
  | "credited"
  | "void";

type CreditStatus = "tracked" | "pending_review" | "approved" | "paid" | "void";
```

Rules:

1. `referrals` becomes the source of truth for validated referral attribution, keyed by referral id rather than by raw cookie string. `[AFR-060]`
2. Extend `referrals` with visit and lifecycle fields such as `referral_visit_id`, `referred_user_id`, `status`, `credit_status`, `last_event_at`, `credited_at`, and `metadata_json`. Existing `scanned_at`, `converted_at`, and `outcome` fields may be migrated into this richer state model. `[AFR-061]`
3. Add a new append-only `referral_events` table with `referral_id`, `event_type`, `conversation_id`, `related_record_type`, `related_record_id`, `payload_json`, and `occurred_at`. `[AFR-062]`
4. Add `referral_id` to conversations as the canonical join. `conversations.referral_source` should remain as a backward-compatible debug field and must store only validated canonical codes, never arbitrary raw inputs. `[AFR-063]`
5. The initial attribution model is first-touch and single-referrer across a referral visit and its downstream user journey. Multi-touch attribution is intentionally out of scope. `[AFR-064]`
6. Invalid or disabled codes must never create `referrals` rows and must never populate `conversations.referral_source`. `[AFR-065]`
7. Admin overrides must append auditable events instead of silently mutating lifecycle history. `[AFR-066]`

### 3.3 Lifecycle event contract

The implementation should attach referral events at the existing product boundaries that already define funnel progress.

| Event type | Emitted from | Purpose |
| --- | --- | --- |
| `visit_created` | `/r/[code]` resolver | Records a validated landing and creates the referral visit id |
| `conversation_started` | `ConversationInteractor` or `stream-pipeline` | Connects the visit to the first conversation |
| `registered` | `RegisterUserInteractor` and anonymous migration path | Connects anonymous referral state to a real user account |
| `lead_submitted` | `LeadCaptureInteractor` | Marks a qualified sales-intent milestone |
| `consultation_requested` | `RequestConsultationInteractor` | Captures a higher-intent funnel milestone |
| `deal_created` | `CreateDealFromWorkflowInteractor` | Marks downstream commercial progression |
| `training_path_created` | `CreateTrainingPathFromWorkflowInteractor` | Captures non-deal educational conversion paths |
| `credit_state_changed` | admin affiliate review flow | Tracks manual credit review, approval, and payout state |

`[AFR-067]`

Rules:

1. Lifecycle writers should be idempotent. The same milestone must not create duplicate events on retry or refresh. `[AFR-068]`
2. A referral record can be linked by visit id, conversation id, or referred user id, but each emitted event must resolve to one canonical `referral_id` before being stored. `[AFR-069]`

### 3.4 Referral-aware chat experience

1. Anonymous chat bootstrap should read the signed referral-visit cookie, resolve a trusted referrer snapshot, and continue using the existing `withReferral` greeting plus `referralSuggestions` contract. `[AFR-070]`
2. The first greeting should mention the referrer's display name and public credential when available. If the referral context is missing or invalid, the app must fall back to the default anonymous greeting without error. `[AFR-071]`
3. The referral-aware greeting should apply to new referred sessions, not to every later turn in an already-active conversation. `[AFR-072]`
4. Once a referred user signs in or registers, the system should preserve attribution silently and may show a compact acknowledgement banner or chip in the new-session shell, but it should not keep restating the referral in the conversation transcript. `[AFR-073]`
5. The trusted referral snapshot should also be available to the server-side chat runtime for a new anonymous referred session so the assistant can answer direct questions such as `Who referred me?` with the validated referrer name and public credential when present. `[AFR-074]`
6. That answer must come from validated referral-visit state or the canonical referral ledger when available, not from user-supplied text, prompt injection, or raw cookies. `[AFR-075]`
7. If no validated referrer is attached to the current session, the assistant must say it cannot identify a referrer rather than inventing one. `[AFR-076]`

### 3.5 Affiliate self-service surface

Affiliate self-service should stay intentionally small and legible.

1. Add a signed-in `/referrals` workspace route for accounts where `affiliate_enabled = 1`. `[AFR-080]`
2. The page should lead with five default metrics: `Introductions`, `Started chats`, `Registered`, `Qualified opportunities`, and `Credit status`. `[AFR-081]`
3. `Qualified opportunities` should aggregate downstream milestones such as lead submitted, consultation requested, deal created, and training-path created. `[AFR-082]`
4. The page should include share assets: canonical link, referral code, QR code, and short CTA copy that can be copied without leaving the page. `[AFR-083]`
5. The page should include a recent-activity feed and a small set of charts: introductions over time, referred funnel conversion, and recent milestone outcomes. `[AFR-084]`
6. The existing profile referral block should remain, but it should become a compact summary card that links into `/referrals` instead of trying to host the whole affiliate experience inline. `[AFR-085]`
7. If affiliate access is disabled, the user should see a truthful explanatory empty state instead of a 404 or a hidden route. `[AFR-086]`

### 3.6 Admin affiliate operations

1. The existing admin-only enable or disable API remains the source of truth for affiliate access. `[AFR-090]`
2. Add a dedicated `/admin/affiliates` overview route for global affiliate performance, leaderboard views, pipeline health, and exceptions. `[AFR-091]`
3. Retain `/admin/users/[id]` referral history as the detailed per-user drill-down rather than creating a second competing detail route. `[AFR-092]`
4. Add an attribution-exceptions view for legacy invalid `referral_source` values, missing referral joins, disabled-code visits, and records awaiting credit review. `[AFR-093]`
5. Commission review is manual-first: admins can change credit state and export payout-ready rows, but payment execution itself remains out of scope. `[AFR-094]`
6. `STAFF` does not gain global affiliate visibility by default. Any future staff access must be an explicit follow-up decision across route gates, tools, and graph datasets. `[AFR-095]`

### 3.7 MCP analytics, chat tools, and graph datasets

Detailed registry design, dataset audience rules, and graph source policy are delegated to [Affiliate Analytics Registry](../affiliate-analytics-registry/spec.md). This section keeps the product contract only.

The referral system should extend the existing analytics and graphing stack, not bypass it.

Recommended named dataset contracts:

| Source type | Audience | Scope | Purpose |
| --- | --- | --- | --- |
| `affiliate_my_overview` | affiliate-enabled signed-in account | current user only | Summary cards and compact narrative answers |
| `affiliate_my_timeseries` | affiliate-enabled signed-in account | current user only | Visits, chats, and registrations over time |
| `affiliate_my_pipeline` | affiliate-enabled signed-in account | current user only | Funnel and milestone conversion graphing |
| `affiliate_my_recent_activity` | affiliate-enabled signed-in account | current user only | Recent activity feed and latest outcomes |
| `admin_affiliate_overview` | admin | global | Global affiliate program totals and health |
| `admin_affiliate_leaderboard` | admin | global | Top-performing referrers and rankable metrics |
| `admin_affiliate_pipeline` | admin | global | Program-level funnel performance |
| `admin_referral_exceptions` | admin | global | Invalid, missing, disabled, or unresolved attribution records |

`[AFR-100]`

Recommended tool surface:

| Tool | Audience | Result |
| --- | --- | --- |
| `get_my_affiliate_summary` | affiliate-enabled signed-in account | Returns summary metrics, current credit state, and short narrative guidance |
| `list_my_referral_activity` | affiliate-enabled signed-in account | Returns recent referral milestones and status changes |
| `get_admin_affiliate_summary` | admin | Returns global affiliate totals, funnel summary, and leaderboard highlights |
| `list_admin_referral_exceptions` | admin | Returns unresolved attribution and credit-review items |
| `get_my_referral_qr` | affiliate-enabled signed-in account | Existing tool retained for link and asset retrieval |

`[AFR-101]`

Rules:

1. Extend `mcp/analytics-tool.ts` or a dedicated referral analytics MCP module with named metrics that return validated rows plus provenance metadata. The app contract should remain named datasets, not ad hoc query text. `[AFR-102]`
2. Self-service datasets must always scope to the current signed-in account. Caller-provided user ids are not accepted for self-service affiliate metrics. `[AFR-103]`
3. Admin datasets must require `ADMIN`. `STAFF` is explicitly denied unless a later spec changes that decision. `[AFR-104]`
4. `generate_graph` should be extended to allow the new referral `sourceType` values, but each dataset resolver must enforce its own permission policy. Tool visibility is not enough. `[AFR-105]`
5. The new summary and activity tools should be `system` tools, while graph rendering should continue through the existing `generate_graph` `ui` tool. This avoids a second graph tool. `[AFR-106]`
6. Add a small dataset-policy registry so graph datasets and MCP-backed loaders derive from the same scope metadata instead of duplicating role checks in multiple places. `[AFR-107]`

### 3.8 Notifications

1. The canonical user-facing notification surface should be the in-app notification feed, with existing browser push opt-in reused as an optional transport. `[AFR-110]`
2. Affiliates should receive milestone notifications for first validated visit, first started chat, registration, qualified opportunity, credit pending review, and credit approved or paid. `[AFR-111]`
3. Admins should receive exception-oriented notifications such as unresolved attribution errors, disabled-code traffic, and credit-review backlog rather than a push notification for every ordinary affiliate milestone. `[AFR-112]`
4. Notification events must dedupe by `referral_id + milestone` so refreshes and retries do not spam affiliates. `[AFR-113]`
5. Email and third-party affiliate-network webhooks are out of scope for the first release. `[AFR-114]`

---

## 4. RBAC And Security

### 4.1 Audience model

| Audience | Definition | Allowed referral surfaces |
| --- | --- | --- |
| Anonymous visitor | no session or anonymous session | canonical referral landing, referral-unavailable page, generic public error states, referral-aware chat entry |
| Signed-in non-affiliate | signed-in account where `affiliate_enabled = 0` | standard chat and profile only; no affiliate dashboard or affiliate analytics tools |
| Affiliate-enabled account | any signed-in role with `affiliate_enabled = 1` | `/referrals`, self-service affiliate tools, self-service graph datasets, own referral notifications |
| Staff | `STAFF` without `ADMIN` | same as signed-in or affiliate-enabled self-service only; no global affiliate analytics by default |
| Admin | `ADMIN` | affiliate enablement, global affiliate analytics, exception review, credit-state adjustments, admin datasets |

`[AFR-120]`

### 4.2 Security rules

1. Do not add `AFFILIATE` to `RoleName`. Affiliate access is a capability overlay checked alongside existing role checks. `[AFR-121]`
2. `affiliate_enabled` must be enforced consistently in page loaders, route handlers, tool descriptors, and graph dataset resolvers. `[AFR-122]`
3. Public referral resolution may reveal a referrer's display name and public credential only after validating an active affiliate code. `[AFR-123]`
4. Referral cookies must be signed or otherwise tamper-evident and should store visit ids plus canonical code references, not only raw untrusted codes. `[AFR-124]`
5. Page-level denials should render branded access-denied UI, while API 403 responses remain structured JSON with stable error codes. `[AFR-125]`
6. Admin attribution overrides and credit-state changes must emit audit events with actor id, reason, and timestamp. `[AFR-126]`
7. No MCP tool or graph dataset may accept raw SQL, table names, or open-ended backend filter expressions from the caller. `[AFR-127]`

---

## 5. Delivery Plan

| Phase | Sprint File | Focus |
| --- | --- | --- |
| **0** | [sprints/sprint-0-trust-recovery.md](sprints/sprint-0-trust-recovery.md) | Restore trustworthy public referral entry and branded public failure handling |
| **1** | [sprints/sprint-1-attribution-integrity.md](sprints/sprint-1-attribution-integrity.md) | Make referral attribution canonical, validated, and lifecycle-aware |
| **2** | [sprints/sprint-2-affiliate-self-service.md](sprints/sprint-2-affiliate-self-service.md) | Ship the affiliate-facing workspace, tools, datasets, and milestone visibility |
| **3** | [sprints/sprint-3-admin-operations-and-credit-review.md](sprints/sprint-3-admin-operations-and-credit-review.md) | Ship admin oversight, exception handling, and manual-first credit review |
| **4** | [sprints/sprint-4-governance-reconciliation-and-release-follow-through.md](sprints/sprint-4-governance-reconciliation-and-release-follow-through.md) | Convert the shipped referral system into a durable operational contract with reconciliation audits, registry parity checks, and one explicit release bundle |

`[AFR-128]`

### 5.1 Phase 0: Trust Recovery

1. Verify production domain routing for apex and `www`, add canonical `/r/[code]` handling, and switch QR generation to the canonical route. `[AFR-130]`
2. Add branded public `not found`, `access denied`, and generic failure surfaces so referral failures look intentional instead of broken. `[AFR-131]`
3. Preserve backward compatibility for existing `/?ref=` links while routing them into the same validated resolver path. `[AFR-132]`
4. Switch share-link and QR origin building to the active site origin, defaulting local and preview environments to `http://localhost:{port}` through one shared resolver so profile, QR, and tool surfaces stay aligned. `[AFR-142]`

### 5.2 Phase 1: Attribution Integrity

1. Migrate `referrals` into the canonical ledger, add `referral_events`, and attach validated `referral_id` values to conversations. `[AFR-133]`
2. Update conversation creation so invalid codes are ignored instead of being persisted as `referral_source`. `[AFR-134]`
3. Append lifecycle events from registration, lead capture, consultation, deal, and training-path flows. `[AFR-135]`
4. Expose the validated referrer snapshot to the anonymous chat runtime so the assistant can answer `who referred me?` without hallucinating or trusting raw client input. `[AFR-143]`

### 5.3 Phase 2: Affiliate Self-Service

1. Ship `/referrals`, summary metrics, share assets, charts, and recent-activity feed. `[AFR-136]`
2. Add self-service MCP tools and referral graph datasets scoped to the current affiliate-enabled account. `[AFR-137]`
3. Add in-app milestone notifications with optional push transport. `[AFR-138]`

### 5.4 Phase 3: Admin Operations And Credit Review

1. Ship `/admin/affiliates` overview, leaderboard, pipeline charts, and exception queue. `[AFR-139]`
2. Add admin MCP tools and admin-only graph datasets for program health and unresolved attribution records. `[AFR-140]`
3. Add manual-first credit review and payout export without implementing automated payment rails. `[AFR-141]`
4. Add admin and release-readiness diagnostics for public referral origin configuration and anonymous `who referred me?` verification so these flows can be validated and monitored after rollout. `[AFR-166]`

### 5.5 Phase 4: Governance, Reconciliation, And Release Follow-Through

1. Formalize the recurring operator routine for exception review, credit review, payout-export inspection, and release-readiness checks so the shipped referral system does not depend on tribal knowledge. `[AFR-167]`
2. Add explicit reconciliation and drift audits across the canonical referral ledger, compatibility readers, analytics dataset registry, graph allowlists, tool bundles, role-tool manifests, and release evidence. `[AFR-168]`
3. Publish one focused verification bundle and browser smoke matrix for future referral changes so public trust, affiliate self-service, admin oversight, and anonymous referrer verification stay easy to validate. `[AFR-169]`
4. Record the still-deferred roadmap boundary so automated payout execution, third-party affiliate-network integrations, STAFF global visibility, and multi-touch attribution remain deliberate follow-on scope rather than silent creep. `[AFR-170]`

---

## 6. Testing Strategy

1. **Hosting and origin smoke matrix:** verify the configured production origin, `www`, canonical `/r/{code}`, legacy `/?ref={code}`, and local development `http://localhost:{port}` behavior in desktop Safari, private Safari, and Chromium. `[AFR-150]`
2. **Referral validation matrix:** valid code, disabled code, invalid code, and expired code must each produce the correct cookie, landing UI, and persistence behavior. Invalid codes must never be stored as attribution. `[AFR-151]`
3. **Lifecycle event matrix:** visit, conversation start, registration, lead, consultation, deal, training-path, and credit review events must each write exactly one idempotent referral event. `[AFR-152]`
4. **RBAC matrix:** test anonymous, authenticated, apprentice, staff, admin, and affiliate-enabled combinations across route exposure, API access, MCP tools, and graph datasets. `[AFR-153]`
5. **Notification matrix:** verify milestone dedupe, feed ordering, push opt-in behavior, and admin exception notifications. `[AFR-154]`
6. **Graph dataset matrix:** each referral dataset must prove both data correctness and dataset-level authorization, especially for signed-in tools that expose a mix of self-service and admin-only sources. `[AFR-155]`
7. **Regression matrix:** preserve existing referral-aware greeting behavior, preserve current profile QR access, and ensure branded error surfaces do not regress unrelated public routes. `[AFR-156]`
8. **Referral identity verification matrix:** a referred anonymous user can ask who referred them and receive the validated referrer name or credential; a session without trusted referral state must return a truthful absence response. `[AFR-157]`
9. **Operational governance matrix:** after future referral edits, verify the reconciliation audits, dataset-registry parity checks, focused verification bundle, and browser smoke routine still cover the shipped trust boundary end to end. `[AFR-171]`

---

## 7. Success Criteria

1. A QR scan or shared referral link opens a working branded referral experience on the active site origin: production uses the configured site address, and local development resolves to `localhost` on the active app port. `[AFR-160]`
2. Invalid referral codes do not appear in conversations, referral history, or admin analytics. `[AFR-161]`
3. An affiliate can answer "how many people clicked, started chatting, registered, and became qualified opportunities?" from one self-service page. `[AFR-162]`
4. An admin can answer "which affiliates are driving results, which records need review, and which referrals are credit-ready?" from one global overview. `[AFR-163]`
5. Every MCP tool and graph dataset added by this feature has an explicit scope and permission rule with no role drift between app UI, tool surface, and backend resolver. `[AFR-164]`
6. A referred anonymous visitor can ask who introduced them and receive a truthful answer drawn from validated referral context rather than a guessed or stale value. `[AFR-165]`
7. Future referral changes can be validated through one explicit reconciliation and release routine rather than depending on memory of how Sprints 0 through 3 were closed out. `[AFR-172]`
