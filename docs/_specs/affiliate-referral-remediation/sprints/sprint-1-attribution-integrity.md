# Sprint 1 — Attribution Integrity

> **Goal:** Turn referral attribution into a validated canonical ledger with append-only lifecycle history.
> **Spec ref:** §3.2, §3.3, §3.4, §5.2
> **Prerequisite:** Sprint 0 complete.

---

## Sprint Scope

1. Promote `referrals` into the canonical attribution ledger.
2. Add append-only `referral_events` and canonical `referral_id` joins.
3. Attach lifecycle milestones from chat, registration, lead capture, consultation, deal, and training-path flows.
4. Extend trusted referral context into the anonymous chat runtime so users can verify who introduced them.
5. Preserve attribution continuity across anonymous-to-authenticated migration and existing compatibility readers.

## Out Of Scope

1. No affiliate dashboard or chart UX yet.
2. No admin affiliate overview or global leaderboard yet.
3. No payout automation or external affiliate-network integrations.

---

## Task 1.1 — Migrate To The Canonical Referral Ledger

**What:** Make validated referral records the source of truth instead of raw cookie strings.

| Item | Detail |
| --- | --- |
| **Modify** | referral persistence and mapper layers such as `src/adapters/ReferralDataMapper.ts` |
| **Modify** | core referral and conversation entities plus repository contracts such as `src/core/entities/Referral.ts`, `src/core/entities/conversation.ts`, and `src/core/use-cases/ConversationRepository.ts` |
| **Modify** | conversation persistence paths that currently use `referral_source`, including `src/adapters/ConversationDataMapper.ts` |
| **Create/Modify** | storage migration artifacts for richer `referrals` fields, `referral_id` joins, and any compatibility indexes needed for old reads during cutover |
| **Spec** | §3.2 |
| **Reqs** | `AFR-060`, `AFR-061`, `AFR-063`, `AFR-065` |

Deliverables:

1. Validated referrals persist as first-class records keyed by `referral_id`.
2. `conversations.referral_source` becomes a backward-compatible debug field only.
3. Invalid or disabled codes never create canonical attribution rows.
4. The canonical referral record stores enough state to link visit id, conversation id, and eventual authenticated user id without relying on string matching.
5. Existing readers that still rely on `referral_source` have an explicit compatibility path until they are migrated to canonical joins.

---

## Task 1.2 — Add Append-Only Referral Events

**What:** Capture milestone history as auditable event rows rather than scattered implicit state.

| Item | Detail |
| --- | --- |
| **Create** | `referral_events` persistence model, repository, and dedicated writer or orchestration service |
| **Modify** | referral attribution services to resolve one canonical `referral_id` before appending events |
| **Avoid** | overloading the existing generic `conversation_events` stream as the canonical referral ledger |
| **Spec** | §3.2, §3.3 |
| **Reqs** | `AFR-062`, `AFR-066`, `AFR-067`, `AFR-069` |

Rules:

1. Every recorded milestone resolves to one canonical `referral_id`.
2. Admin overrides append events instead of silently rewriting lifecycle history.
3. Event payloads remain auditable and structured.
4. Event writes are deduped with a stable idempotency key per referral and milestone source so login retries, repeated chat refreshes, and admin resubmits cannot double-create lifecycle history.

---

## Task 1.3 — Wire Lifecycle Writers Into Existing Product Boundaries

**What:** Attach referral lifecycle events to the existing use cases that already define funnel progress.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/stream-pipeline.ts` |
| **Modify** | anonymous-to-user migration paths such as `src/lib/chat/migrate-anonymous-conversations.ts` |
| **Modify** | auth routes and registration or login boundaries that trigger migration |
| **Modify** | `src/core/use-cases/RegisterUserInteractor.ts` |
| **Modify** | `src/core/use-cases/LeadCaptureInteractor.ts` |
| **Modify** | `src/core/use-cases/RequestConsultationInteractor.ts` |
| **Modify** | `src/core/use-cases/CreateDealFromWorkflowInteractor.ts` |
| **Modify** | `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.ts` |
| **Spec** | §3.3 |
| **Reqs** | `AFR-067`, `AFR-068`, `AFR-069`, `AFR-152` |

Deliverables:

1. A validated anonymous referral visit links to the first conversation event without creating duplicate records on refresh.
2. Login and registration preserve that attribution by resolving the same canonical referral record to the new authenticated user identity.
3. Lead, consultation, deal, and training milestones append referral events through one shared resolver instead of each flow inventing its own referral lookup rules.

---

## Task 1.4 — Preserve Referral-Aware Chat And Expose Trusted Referrer Identity

**What:** Keep the existing personalized greeting behavior while removing trust in invalid referral state and making the validated referrer available for direct user verification.

| Item | Detail |
| --- | --- |
| **Modify** | `src/hooks/useGlobalChat.tsx` |
| **Modify** | `src/hooks/chat/chatState.ts` |
| **Modify** | server-side chat context builders such as `src/lib/chat/stream-pipeline.ts`, `src/lib/chat/policy.ts`, and `src/core/use-cases/SystemPromptBuilder.ts` |
| **Modify** | chat bootstrap or resolver code that hydrates referral context |
| **Spec** | §3.4 |
| **Reqs** | `AFR-070`, `AFR-071`, `AFR-072`, `AFR-073`, `AFR-074`, `AFR-075`, `AFR-076` |

Deliverables:

1. A newly referred anonymous user can ask the assistant who referred them and receive the validated referrer name plus public credential when available.
2. The assistant answer is sourced from trusted referral state, not from raw client input or promptable user text.
3. Sessions without validated referral state fall back to a truthful "I can't identify a referrer for this session" style response.
4. Referral identity reaches the server prompt through an explicit server-owned context block rather than depending only on the client bootstrap greeting.

## Task 1.5 — Update Compatibility Readers And Admin Debug Surfaces

**What:** Keep existing debug and reporting surfaces aligned while the canonical referral model lands.

| Item | Detail |
| --- | --- |
| **Modify** | existing consumers of `conversations.referral_source` such as admin conversation detail views and attribution helpers |
| **Modify** | compatibility read models or mappers needed during the transition to `referral_id` |
| **Spec** | §3.2, §3.6 |
| **Reqs** | `AFR-063`, `AFR-065`, `AFR-161` |

Rules:

1. Existing debug surfaces may continue to show `referral_source`, but canonical affiliate and attribution logic must read from validated referral records.
2. Any reader that would become misleading after `referral_id` is introduced must be migrated or explicitly marked as debug-only in the same sprint.

---

## Validation

1. Lifecycle event tests prove visit, conversation, registration, lead, consultation, deal, training-path, and credit-review events each write idempotently.
2. Conversation tests prove invalid referral codes do not persist into canonical attribution or polluted debug fields.
3. Referral-aware chat tests prove valid referrers still personalize the first-turn experience and can be answered on demand when the user asks who referred them, without leaking invalid context into later transcript behavior.
4. Auth-boundary tests prove login and registration preserve validated referral linkage when anonymous conversations are migrated to a real user.
5. Compatibility tests prove admin and debug readers do not silently drift after `referral_id` and `referral_events` become canonical.

---

## Sprint 1 — Completion Checklist

- [ ] `referrals` is the canonical validated attribution ledger.
- [ ] `referral_events` captures append-only lifecycle history.
- [ ] Existing product milestones write idempotent referral events.
- [ ] Chat personalization is preserved and trusted referrer identity can be verified without storing invalid referral attribution.
- [ ] Anonymous-to-authenticated migration and compatibility readers stay aligned during the cutover.
