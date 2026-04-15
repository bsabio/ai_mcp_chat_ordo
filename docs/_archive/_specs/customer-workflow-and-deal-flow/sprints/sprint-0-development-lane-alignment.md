# Sprint 0 - Development Lane Alignment

> **Goal:** Extend the runtime from `organization | individual | uncertain` to `organization | individual | development | uncertain` and align routing, schema-backed persistence, analytics surfaces, and tests around that taxonomy.
> **Spec ref:** `FLOW-010`, `FLOW-016`, `FLOW-026`, `FLOW-054` through `FLOW-058`, `FLOW-073` through `FLOW-088`
> **Prerequisite:** None
> **Test count target:** 724 current tests with 4 known pre-existing failures + 8 new focused tests = 732 total tests, with no increase beyond the current 4-failure baseline during implementation
> **Historical note (2026-03-24):** This sprint captured workflow implementation while dashboard-era admin surfaces were still active. References below to `src/lib/dashboard/*`, dashboard components, or `src/app/dashboard/page.tsx` are historical implementation context rather than the current operator-owned runtime boundary.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/conversation-routing.ts` | Defines `ConversationLane`, `DEFAULT_CONVERSATION_LANE`, `isConversationLane(value)`, and `createConversationRoutingSnapshot(overrides)`; currently only supports `organization`, `individual`, and `uncertain` |
| `src/lib/chat/routing-analysis.ts` | `HeuristicConversationRoutingAnalyzer.analyze()` currently scores organizational and individual signals and returns a `ConversationRoutingSnapshot`; it is the live routing analyzer resolved by the composition root |
| `src/lib/chat/routing-analysis.test.ts` | Existing focused analyzer tests already cover organization, individual, uncertain, and prior-lane preservation behavior |
| `src/core/use-cases/ConversationInteractor.ts` | `updateRoutingSnapshot(conversationId, userId, snapshot)` records `lane_analyzed`, `lane_changed`, and `lane_uncertain` events; lane changes are already observable |
| `src/core/use-cases/ConversationInteractor.test.ts` | Existing tests already verify emitted routing events when lanes change or remain uncertain |
| `src/lib/db/schema.ts` | `conversations.lane` and `lead_records.lane` are persisted as `TEXT NOT NULL DEFAULT 'uncertain'`; no schema-level enum constraint blocks the new lane value |
| `src/core/entities/lead-record.ts` | `LeadRecord`, `LeadRecordSeed`, and `LeadCaptureSubmission` all consume `ConversationLane`, so widening the union propagates directly into lead capture |
| `src/adapters/LeadRecordDataMapper.ts` | Persists and loads lane values from `lead_records`; it currently casts persisted strings back to `LeadRecord["lane"]` |
| `src/lib/dashboard/dashboard-loaders.ts` | Anonymous funnel analytics currently filter anonymous conversations with `lane IN ('organization', 'individual')`, which will exclude `development` until updated |
| `src/lib/chat/conversation-root.ts` | `getConversationRoutingAnalyzer()` currently returns `new HeuristicConversationRoutingAnalyzer()` and is the correct composition root for analyzer changes |

---

## Task 0.1 - Widen the routing type contract

**What:** Update the canonical routing entity so `development` is a first-class runtime lane.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/entities/conversation-routing.ts` |
| **Modify** | tests that assert lane unions or lane validation directly |
| **Spec** | `FLOW-026`, `FLOW-054` through `FLOW-058` |

### Task 0.1 Notes

This task must be the single source of truth for the lane taxonomy.

Required changes:

1. Add `development` to `ConversationLane`
2. Update `isConversationLane()` so it accepts `development`
3. Keep `DEFAULT_CONVERSATION_LANE` as `uncertain`

Do not add any new fallback lane values.

### Task 0.1 Verify

```bash
npx vitest run src/lib/chat/routing-analysis.test.ts src/core/use-cases/ConversationInteractor.test.ts
```

---

## Task 0.2 - Extend the live routing analyzer for development signals

**What:** Teach the heuristic analyzer to classify implementation-heavy demand into the new `development` lane without regressing organization or individual routing.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/routing-analysis.ts` |
| **Modify** | `src/lib/chat/routing-analysis.test.ts` |
| **Modify** | any routing-consumer tests that assert exact lane text |
| **Spec** | `FLOW-030` through `FLOW-043`, `FLOW-083` through `FLOW-085`, `FLOW-113` through `FLOW-118` |

### Task 0.2 Notes

Add a third signal family for development requests, such as build, integrate, implement, platform, automation delivery, or technical environment language.

Minimum behavior:

1. Strong implementation language routes to `development`
2. Mixed signals can still return `uncertain`
3. Existing organizational scoping language stays in `organization`
4. Existing mentorship and training language stays in `individual`
5. `recommendedNextStepFor()` and summary generation should produce development-specific guidance instead of reusing organization text

Prefer small, legible heuristic changes over a broad rewrite.

### Task 0.2 Verify

```bash
npx vitest run src/lib/chat/routing-analysis.test.ts src/lib/chat/routing-consumers.test.ts
```

---

## Task 0.3 - Carry the new lane through persistence and dashboard analytics

**What:** Ensure persisted conversations, lead capture, and anonymous conversion analytics can represent `development` without dropping it on the floor.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/entities/lead-record.ts` |
| **Modify** | `src/adapters/LeadRecordDataMapper.ts` |
| **Modify** | `src/app/api/chat/contact-capture/route.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | founder-facing consumers that summarize anonymous demand, including `src/components/dashboard/AnonymousOpportunitiesBlock.tsx`, `src/app/dashboard/page.tsx`, and `src/core/use-cases/tools/admin-prioritize-offer.tool.ts` |
| **Spec** | `FLOW-010`, `FLOW-011`, `FLOW-059` through `FLOW-066`, `FLOW-082`, `FLOW-087` |

### Task 0.3 Notes

The database schema does not require a structural migration for the lane text columns, but all code paths that filter or summarize lanes must be updated.

At minimum:

1. Anonymous opportunity analytics must decide whether `development` should be included in founder review queues
2. Summary counts should not silently treat development demand as impossible
3. Lead records should accept and persist the widened lane union without unsafe assumptions
4. The contact-capture route must stop narrowing `lane` back to the legacy three-value union at the API boundary
5. Founder-facing dashboard summaries and admin offer tooling must not collapse `development` into organization or individual by omission

If development demand should be surfaced separately from organization in anonymous dashboards, document that explicitly in the implementation.

### Task 0.3 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx src/app/dashboard/page.test.tsx src/core/use-cases/tools/admin-prioritize-offer.tool.test.ts
```

---

## Task 0.4 - Align runtime prompts, docs, and QA evidence

**What:** Update prompt-facing and planning-facing references so the new lane taxonomy is consistent everywhere that matters for the current funnel.

| Item | Detail |
| --- | --- |
| **Modify** | prompt or routing-consumer code that still hard-codes two-lane assumptions, including `src/lib/chat/routing-consumers.ts` |
| **Modify** | `src/lib/chat/routing-context.ts` and focused coverage for prompt-context lane instructions |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a necessary deviation |
| **Modify** | this sprint doc with real verification outcomes |
| **Spec** | `FLOW-028`, `FLOW-029` |

### Task 0.4 Notes

Keep this task narrow.

Do not pull later-phase commercial docs back into active scope. The goal is simply to make the lane taxonomy truthful across runtime and active planning artifacts.

Prompt-context follow-up:

1. The stream route injects `buildRoutingContextBlock(...)` into the live system prompt, so generic non-uncertain guidance is part of runtime behavior, not just internal metadata.
2. `organization`, `individual`, and `development` must each emit distinct routing instructions that reinforce the intended buyer context.
3. `uncertain` should continue to ask for one brief clarifying question, but that clarification must name all three concrete lanes.

### Task 0.4 Verify

```bash
npx vitest run src/lib/chat/routing-analysis.test.ts src/lib/chat/routing-consumers.test.ts src/lib/chat/routing-context.test.ts src/core/use-cases/ConversationInteractor.test.ts src/lib/dashboard/dashboard-loaders.test.ts
npm run typecheck
```

---

## Completion Checklist

- [x] `development` is a first-class value in the runtime routing union
- [x] The live analyzer can route clear implementation-heavy requests to `development`
- [x] Persisted lead, contact-capture, and conversation paths accept the widened lane taxonomy
- [x] Anonymous analytics, dashboard summaries, and admin offer consumers do not silently exclude or flatten development demand
- [x] Focused routing and dashboard tests cover the new lane

## Implementation Verification

- Focused validation passed: `npx vitest run src/lib/chat/routing-analysis.test.ts src/lib/chat/routing-consumers.test.ts src/core/use-cases/ConversationInteractor.test.ts src/app/api/chat/contact-capture/route.test.ts src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx src/app/dashboard/page.test.tsx src/core/use-cases/tools/admin-prioritize-offer.tool.test.ts`
- Type validation passed: `npm run typecheck`

## QA Deviations

- 2026-03-19 QA: Added `src/app/api/chat/contact-capture/route.ts` to Sprint 0 scope because it still narrows `lane` to `organization | individual | uncertain` at the API boundary.
- 2026-03-19 QA: Expanded founder-facing scope to include anonymous-opportunity UI and admin offer consumers because dashboard alignment was otherwise incomplete.
- 2026-03-19 QA: Added `src/lib/chat/routing-consumers.test.ts` and additional dashboard/admin verification targets because the previous verify steps could miss a regression where `development` is treated as `individual` by default.
- 2026-03-19 QA: Added `src/lib/chat/routing-context.ts` to Task 0.4 scope because the chat stream prompt still used generic non-uncertain lane guidance even after the runtime taxonomy widened to include `development`.
- 2026-03-19 Implementation: `development` now ships as a separate anonymous-demand summary count rather than being folded into organization demand inside founder-facing dashboard summaries.
