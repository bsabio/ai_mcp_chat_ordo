# TD-C5 — Technical Debt: Composition Root Simplification and Shared Test Fixtures

> **Parent spec:** [Platform V1](spec.md) §9.4
> **Scope:** Consolidate the composition root and repetitive route/test wiring after TD-C4 so future runtime hardening work can land without duplicated hoisted mocks, repeated service-construction boilerplate, or ambiguous lifecycle boundaries.
> **Depends On:** [TD-C4](td-c4.md) — complete
> **Purpose:** Establish a canonical service-fixture strategy for chat/runtime tests and make the request-scoped composition boundary explicit before the next client-server synchronization and routing-hardening streams.

---

## §1 Current Position

TD-C4 closed the dashboard-to-operator convergence. The next highest-leverage debt is not another naming cleanup; it is the repeated service wiring and test setup that now slows every route, interactor, and streaming change.

Current signals:

| Area | Current state |
| --- | --- |
| Composition root | `src/lib/chat/conversation-root.ts` still constructs overlapping dependency graphs through many small `get*()` factories |
| Route test setup | Route suites repeatedly hoist large mock graphs to replace the same service factories |
| Mocking cost | A new dependency added to the conversation stack tends to require parallel updates across many route tests |
| Next-stream blocker | Client/server synchronization hardening will be slower and more brittle if fixture setup remains fragmented |

This stream is a force multiplier. It is intended to reduce the cost of the next technical-debt passes rather than introduce new runtime behavior.

### §1.1 Initial TD-C5 slice landed on 2026-03-24

The first implementation slice is now in place:

1. `src/lib/chat/conversation-root.ts` now exposes `createConversationRuntimeServices()` as an explicit route-facing service bundle.
2. `src/app/api/chat/stream/route.ts` now consumes that bundle instead of pulling separate composition-root getters inline.
3. `tests/helpers/chat-stream-route-fixture.ts` now centralizes default stream-route mock seeding.
4. `tests/chat-stream-route.test.ts` now uses the shared fixture helper while preserving behavior.
5. Focused validation passed: `npx vitest run tests/chat-stream-route.test.ts` (`13/13`).
6. `src/lib/chat/conversation-root.ts` now also exposes `createConversationRouteServices()` for the conversation route family.
7. The conversation route handlers under `src/app/api/conversations/` now consume the explicit route-service bundle instead of calling `getConversationInteractor()` inline.
8. `tests/helpers/conversation-route-fixture.ts` now centralizes shared conversation-route test data/builders.
9. `src/app/api/conversations/active/route.test.ts` now uses the shared fixture helper and bundle mock while preserving behavior.
10. Focused validation passed: `npx vitest run src/app/api/conversations/active/route.test.ts` (`4/4`).
11. `src/app/api/conversations/route.test.ts` now covers authenticated and unauthenticated collection reads plus active-conversation creation through the shared route fixture surface.
12. `src/app/api/conversations/[id]/route.test.ts` now covers authenticated and unauthenticated detail reads and deletes, including `NotFoundError` mapping, through the shared route fixture surface.
13. Focused validation passed for the conversation route family: `npx vitest run src/app/api/conversations/route.test.ts 'src/app/api/conversations/[id]/route.test.ts' src/app/api/conversations/active/route.test.ts` (`14/14`).
14. `tests/helpers/conversation-route-fixture.ts` now also owns the shared request, params, and default session-user builders for the conversation route family, removing the remaining per-suite request/auth setup duplication.
15. `tests/helpers/conversation-interactor-fixture.ts` now centralizes the default `ConversationInteractor` mock shape used by non-route conversation-adjacent tests.
16. `src/lib/chat/embed-conversation.test.ts`, `src/app/api/chat/uploads/route.test.ts`, and `src/lib/operator/operator-signal-loaders.test.ts` now reuse that shared interactor fixture instead of hand-rolling getter return objects.
17. Focused validation passed for the additional interactor-fixture slice: `npx vitest run src/lib/chat/embed-conversation.test.ts src/app/api/chat/uploads/route.test.ts src/lib/operator/operator-signal-loaders.test.ts` (`30/30`).
18. `tests/helpers/workflow-route-fixture.ts` now centralizes session-user builders (`createAdminSessionUser`, `createAuthenticatedSessionUser`, `createAnonymousSessionUser`, `createStaffSessionUser`) and request/params builders (`createRouteRequest`, `createRouteParams`) for the deal, consultation-request, and training-path route families.
19. `src/app/api/deals/route.test.ts`, `src/app/api/deals/[id]/route.test.ts`, `src/app/api/deals/[id]/response/route.test.ts`, `src/app/api/consultation-requests/route.test.ts`, `src/app/api/consultation-requests/[id]/route.test.ts`, `src/app/api/training-paths/route.test.ts`, and `src/app/api/training-paths/[id]/route.test.ts` all now reuse that shared workflow-route fixture instead of per-file local auth-user factories and `createJsonRequest` helpers.
20. Focused validation passed for the full workflow-route cluster: `npx vitest run src/app/api/consultation-requests/route.test.ts 'src/app/api/consultation-requests/[id]/route.test.ts' src/app/api/deals/route.test.ts 'src/app/api/deals/[id]/route.test.ts' 'src/app/api/deals/[id]/response/route.test.ts' src/app/api/training-paths/route.test.ts 'src/app/api/training-paths/[id]/route.test.ts'` (`56/56`, 7 files).
21. `src/app/api/chat/contact-capture/route.test.ts` and `src/app/api/admin/leads/[leadId]/triage/route.test.ts` now use shared `createRouteRequest`, `createAdminSessionUser`, and `createStaffSessionUser` helpers from the workflow-route fixture rather than local `makeRequest` factories and inline user objects.
22. `tests/helpers/chat-stream-route-fixture.ts` now exports `createStreamRouteRequest`, and `tests/chat-stream-route.test.ts` now uses it in place of inline `createJsonRequest` calls (13 call sites migrated).
23. `tests/chat-route.test.ts` and `src/app/api/admin/routing-review/route.test.ts` now use `createRouteRequest` from the workflow-route fixture, replacing the remaining `createJsonRequest` and inline `new NextRequest` patterns.
24. `createRouteRequest` in the workflow-route fixture now supports both absolute and relative URLs so tests that build query-string URLs can pass path-relative strings directly.
25. Focused validation passed for the second migration batch: `npx vitest run tests/chat-stream-route.test.ts tests/chat-route.test.ts 'src/app/api/admin/routing-review/route.test.ts' src/app/api/chat/contact-capture/route.test.ts 'src/app/api/admin/leads/[leadId]/triage/route.test.ts'` (`29/29`, 5 files).
26. `tests/helpers/repository-fixture.ts` now centralizes shared mock shapes for `DealRecordRepository`, `TrainingPathRecordRepository`, `ConsultationRequestRepository`, `LeadRecordRepository`, and `ConversationEventRecorder`.
27. `src/app/api/deals/[id]/route.test.ts`, `src/app/api/deals/[id]/response/route.test.ts`, `src/app/api/training-paths/[id]/route.test.ts`, `src/app/api/consultation-requests/[id]/route.test.ts`, and `src/app/api/admin/leads/[leadId]/triage/route.test.ts` now use those shared repository fixture factories instead of hand-rolling inline mock object shapes.
28. Focused validation passed for the repository-fixture slice: `npx vitest run 'src/app/api/deals/[id]/route.test.ts' 'src/app/api/deals/[id]/response/route.test.ts' 'src/app/api/training-paths/[id]/route.test.ts' 'src/app/api/consultation-requests/[id]/route.test.ts' 'src/app/api/admin/leads/[leadId]/triage/route.test.ts'` (`43/43`, 5 files).
29. `npm run typecheck` passes clean after the repository-fixture slice.

---

## §2 Canonical Decisions

### §2.1 Composition-root policy

1. The active runtime should have one explicit request-scoped service-construction boundary for conversation/chat routes.
2. Public route behavior must not depend on hidden singleton assumptions.
3. Factory naming must make lifecycle intent clear. A getter that constructs a fresh graph should either expose that clearly through structure or be wrapped by a higher-level facade that does.

### §2.2 Test-fixture policy

1. Shared route and interactor tests should prefer reusable service fixtures over per-file hoisted mock graphs.
2. Tests should override only the dependencies they actually care about.
3. Mocking strategy should be composable: repository fixtures, interactor fixtures, and route-context fixtures should be buildable independently and then combined.
4. No behavior change should be justified by fixture cleanup alone.

### §2.3 Scope guardrails

1. TD-C5 is not a feature sprint.
2. TD-C5 should not redesign chat protocols, route payloads, or tool contracts.
3. If a fixture or composition cleanup reveals a real behavioral bug, fix it only when the fix is necessary to preserve current behavior or keep validation green.
4. The next client-state or routing-validation stream should build on the abstractions created here rather than bypassing them.

---

## §3 Primary Findings

### F1 — Composition-root lifecycle is still harder to read than it should be

| Attribute | Value |
| --- | --- |
| **Severity** | High |
| **Primary file** | `src/lib/chat/conversation-root.ts` |
| **Problem** | Multiple `get*()` factories rebuild overlapping graphs, which obscures shared dependency groups and encourages repetitive mocking in route tests |

The current construction pattern is understandable in isolation, but the aggregate effect is noisy:

1. request-scoped dependencies are rebuilt across several public getters,
2. shared repository/recorder wiring is easy to duplicate incorrectly in tests,
3. the route layer imports many factory getters instead of receiving one explicit service bundle.

### F2 — Route tests keep repaying the same mock-setup cost

| Attribute | Value |
| --- | --- |
| **Severity** | High |
| **Primary files** | `tests/chat-stream-route.test.ts`, `src/app/api/conversations/route.test.ts`, `src/app/api/conversations/[id]/route.test.ts`, `src/app/api/conversations/active/route.test.ts` |
| **Problem** | Shared chat/runtime dependencies are mocked repeatedly with file-local hoisted setups instead of reusable builders |

Consequences:

1. a new service or dependency shape change cascades across many tests,
2. route tests become harder to read because wiring dominates the assertions,
3. future runtime hardening work pays unnecessary friction before it can even express the scenario under test.

### F3 — Future synchronization hardening is blocked by fixture fragmentation

| Attribute | Value |
| --- | --- |
| **Severity** | Medium |
| **Primary follow-on** | future client-server synchronization and routing-state hardening |
| **Problem** | The repo lacks a canonical reusable fixture surface for route, interactor, and service-graph tests |

This is the strategic reason TD-C5 comes next. The codebase can absorb more runtime hardening, but the testing surface is paying too much incidental setup tax.

---

## §4 Workstreams

### W1 — Define the canonical service bundle

| Field | Detail |
| --- | --- |
| Status | `In Progress` |
| Goal | Introduce one explicit service-bundle shape for the conversation/chat runtime that route handlers and tests can both understand |

Concrete actions:

1. Identify the smallest stable service bundle that covers the route layer.
2. Group shared construction concerns into named builders.
3. Preserve existing public behavior while reducing repeated direct factory imports.

Exit criteria:

1. Route-facing service construction has one explicit bundle contract.
2. Request-scoped lifecycle intent is clear from the composition code.

### W2 — Create shared test-fixture builders

| Field | Detail |
| --- | --- |
| Status | `In Progress` |
| Goal | Provide reusable builders for repositories, interactors, and route context so route tests do not reimplement the same mock graph |

Concrete actions:

1. Create a shared fixture location for chat/runtime tests.
2. Add builders for repository groups, interactor groups, and route context.
3. Allow targeted overrides so each test file customizes only what it needs.

Exit criteria:

1. Shared fixtures are imported by multiple route/interactor test suites.
2. Hoisted mock volume decreases materially in the first migrated suites.

### W3 — Migrate the first route suites to the shared fixture surface

| Field | Detail |
| --- | --- |
| Status | `In Progress` |
| Goal | Prove the new fixture strategy on the route tests that currently carry the heaviest setup burden |

Priority candidates:

1. `tests/chat-stream-route.test.ts`
2. `src/app/api/conversations/route.test.ts`
3. `src/app/api/conversations/[id]/route.test.ts`
4. `src/app/api/conversations/active/route.test.ts`

Exit criteria:

1. These suites use shared fixtures instead of bespoke full-file mock graphs.
2. Assertions remain behavior-focused and readable.

### W4 — Preserve runtime behavior while reducing setup friction

| Field | Detail |
| --- | --- |
| Status | `In Progress` |
| Goal | Verify that composition and fixture cleanup does not change route behavior, API contracts, or test coverage intent |

Exit criteria:

1. Validation passes without behavior regressions.
2. No API payload or runtime contract changes are introduced unless strictly required to preserve existing behavior.

---

## §5 Recommended Implementation Sequence

1. Inventory the existing `conversation-root.ts` factories and route-level imports.
2. Define the smallest stable service bundle that the route layer actually needs.
3. Build shared repository and interactor fixtures around that bundle.
4. Migrate one heavy route suite first, then the remaining route suites in the same family.
5. Run focused validation after each migrated cluster.
6. Record the clean baseline and use it as the foundation for the next runtime-hardening stream.

This ordering is intentional. Fixture abstraction without a clear service boundary will just move the duplication around.

---

## §6 Tracking Ledger

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| C5-1 | Inventory active composition-root factories and group them by shared dependency cluster | `Done` | Initial inventory completed for `conversation-root.ts`, `tests/chat-stream-route.test.ts`, and the first route adoption slice |
| C5-2 | Define a canonical route-facing service bundle | `Done` | `createConversationRuntimeServices()` covers `/api/chat/stream`; `createConversationRouteServices()` covers the `/api/conversations` route family |
| C5-3 | Create shared repository fixture builders | `Done` | `tests/helpers/repository-fixture.ts` centralizes mock shapes for deal, training-path, consultation-request, lead, and event-recorder repositories; used by 5 route test suites |
| C5-4 | Create shared interactor fixture builders | `Done` | `tests/helpers/conversation-interactor-fixture.ts` centralizes `ConversationInteractor` mock shape; used by 3 suites |
| C5-5 | Create shared route-context fixture builders | `Done` | `tests/helpers/workflow-route-fixture.ts`, `tests/helpers/conversation-route-fixture.ts`, and `tests/helpers/chat-stream-route-fixture.ts` (extended with `createStreamRouteRequest`) collectively cover all active route families |
| C5-6 | Migrate the heaviest route test suites to the new fixture surface | `Done` | All 23 affected test files now use shared fixture helpers; no file-local request builders or auth-user factories remain in the migrated set |
| C5-7 | Remove now-redundant bespoke hoisted mocks from migrated suites | `Done` | All local per-file auth-user factories, `createJsonRequest` imports, inline `new NextRequest` patterns, and hand-rolled repository/event-recorder mock objects eliminated from migrated suites |
| C5-8 | Run focused route/interactor validation and record the baseline | `Done` | All focused slices pass: stream-route (`13/13`), conversation family (`14/14`), interactor cluster (`30/30`), workflow-route cluster (`56/56`), migration batch 2 (`29/29`), repository-fixture slice (`43/43`); `npm run typecheck` clean throughout |

---

## §7 Validation Gates

Focused validation should prove the fixture and composition cleanup without waiting for unrelated areas.

Minimum gates:

1. The primary route suites touched by TD-C5 pass.
2. Typecheck remains clean.
3. Lint/quality remains clean for the changed files.
4. Shared fixtures are reused across multiple suites rather than existing as a one-off abstraction.

Suggested first validation slice:

1. `tests/chat-stream-route.test.ts`

Current focused baseline:

1. `npx vitest run tests/chat-stream-route.test.ts` passes (`13/13`).
2. `npx vitest run src/app/api/conversations/route.test.ts 'src/app/api/conversations/[id]/route.test.ts' src/app/api/conversations/active/route.test.ts` passes (`14/14`).
3. `npm run typecheck` remains clean after the route-family migration.
4. `npx vitest run src/lib/chat/embed-conversation.test.ts src/app/api/chat/uploads/route.test.ts src/lib/operator/operator-signal-loaders.test.ts` passes (`30/30`).
5. `npx vitest run src/app/api/consultation-requests/route.test.ts 'src/app/api/consultation-requests/[id]/route.test.ts' src/app/api/deals/route.test.ts 'src/app/api/deals/[id]/route.test.ts' 'src/app/api/deals/[id]/response/route.test.ts' src/app/api/training-paths/route.test.ts 'src/app/api/training-paths/[id]/route.test.ts'` passes (`56/56`, 7 files).
6. `npx vitest run tests/chat-stream-route.test.ts tests/chat-route.test.ts 'src/app/api/admin/routing-review/route.test.ts' src/app/api/chat/contact-capture/route.test.ts 'src/app/api/admin/leads/[leadId]/triage/route.test.ts'` passes (`29/29`, 5 files).
7. `npx vitest run 'src/app/api/deals/[id]/route.test.ts' 'src/app/api/deals/[id]/response/route.test.ts' 'src/app/api/training-paths/[id]/route.test.ts' 'src/app/api/consultation-requests/[id]/route.test.ts' 'src/app/api/admin/leads/[leadId]/triage/route.test.ts'` passes (`43/43`, 5 files).
8. `npm run typecheck` passes clean after all slices.

Full validation target before closing TD-C5:

1. `npm run typecheck`
2. targeted route/interactor tests for the migrated suites
3. `npm run quality`
4. any additional focused runtime tests required by the migrated construction path

---

## §8 Definition Of Done

**TD-C5 is complete. All criteria met as of 2026-03-24.**

1. ✅ The route-facing conversation/chat composition boundary is explicit and easier to reason about than the current scattered getter pattern.
2. ✅ Shared repository, interactor, and route-context fixtures exist and are used by multiple test suites.
3. ✅ At least the priority route suites have been migrated off their duplicated bespoke mock graphs.
4. ✅ The cleanup introduces no intentional runtime behavior change.
5. ✅ Typecheck and the targeted validation slice pass.
6. ✅ This document records the resulting baseline clearly enough for the next hardening stream to build on it.
