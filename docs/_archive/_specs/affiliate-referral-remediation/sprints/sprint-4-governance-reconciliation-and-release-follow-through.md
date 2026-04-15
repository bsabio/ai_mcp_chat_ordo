# Sprint 4 — Governance, Reconciliation, And Release Follow-Through

> **Goal:** Convert the shipped referral system into a durable operational contract by formalizing the operator review rhythm, adding reconciliation and parity audits around the canonical ledger and analytics registry, and documenting the focused release bundle for future referral changes.
> **Spec ref:** §3.2, §3.6, §3.7, §3.8, §4, §5.5, §6
> **Prerequisite:** Sprint 3 complete.
> **Status:** follow-on sprint created after Sprint 3 closeout; not part of the original scheduled chain.

---

## Sprint Status Input

Sprint 4 assumes the original delivery chain is complete.

Verified shipped foundations from earlier sprints:

1. Sprint 0 established canonical public referral entry, signed visit state, and branded public failure handling.
2. Sprint 1 made referral attribution canonical, lifecycle-aware, and trusted by the server-side chat runtime.
3. Sprint 2 shipped affiliate self-service surfaces, scoped analytics tools and datasets, and milestone visibility.
4. Sprint 3 shipped admin oversight, exception review, manual-first credit-state handling, payout export, and release-readiness diagnostics.

Verified post-closeout reality in the repo:

1. The core product scope is now implemented and validated.
2. The remaining risk is no longer missing product capability; it is operational drift across the ledger, compatibility readers, analytics registry, tool manifests, and release evidence.
3. The admin exception queue and manual-first payout review flow exist, but the recurring operator routine for reviewing and closing those surfaces is still implicit.
4. The focused verification sequence that closed out Sprints 0 through 3 was successful, but it is still too dependent on memory and recent chat history.

## Why Sprint 4 Exists

The original referral remediation plan ended at Sprint 3. Sprint 4 exists because the referral system now spans enough runtime, analytics, and operator surface area that post-closeout governance needs to be explicit.

Sprint 4 is not a new product-expansion sprint.

It exists to answer these operational questions clearly:

1. what routine should operators follow when `/admin/affiliates` shows exceptions or credit-review backlog
2. which audits should fail if the canonical referral ledger and the compatibility or analytics surfaces drift apart
3. which automated and browser checks must run after future referral edits
4. which roadmap items are still intentionally deferred so later work does not widen the shipped contract accidentally

---

## Sprint Scope

1. Formalize the operator cadence for exception review, credit review, payout-export inspection, and release-readiness checks.
2. Add explicit reconciliation and drift audits around the canonical ledger, compatibility readers, analytics dataset registry, graph source allowlists, tool bundles, role-tool manifests, and release evidence.
3. Publish one focused verification bundle and browser smoke matrix for future referral changes.
4. Freeze the deferred roadmap boundary so future changes remain deliberate follow-on work rather than silent scope creep.

## Out Of Scope

1. No automated payout execution or payment processor integration.
2. No third-party affiliate-network webhooks, outbound email, or partner portal expansion.
3. No default `STAFF` access to global affiliate analytics.
4. No multi-touch or weighted attribution model.
5. No open-ended analytics query surface or arbitrary reporting interface.

---

## Task 4.1 — Formalize The Operator Review Rhythm

**What:** Define the minimal recurring routine for keeping admin affiliate operations healthy after the implementation sprint chain is complete.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Create/Modify** | `docs/operations/referral-affiliate-runbook.md` and related admin operations notes as needed |
| **Spec** | §3.6, §3.8, §5.5 |
| **Reqs** | `AFR-167`, `AFR-169` |

Required outputs:

1. Define the review cadence for unresolved attribution exceptions, credit-review backlog, and payout-ready export inspection.
2. Define which admin diagnostics and release-evidence checks must be reviewed before rollout or major referral-surface edits.
3. Define the stop condition for closing an exception item versus filing follow-on work.

Task 4.1 outcome:

1. `/admin/affiliates` becomes part of an explicit operating loop rather than a page that only exists when someone remembers it.
2. Release-readiness evidence stays coupled to real operator behavior instead of one-time implementation validation.

Implemented artifact for this sprint: `docs/operations/referral-affiliate-runbook.md`.

---

## Task 4.2 — Add Reconciliation And Drift Audits

**What:** Install the focused audits that should fail if the canonical referral contract drifts away from its dependent surfaces.

| Item | Detail |
| --- | --- |
| **Modify/Create** | focused ledger, dataset-registry, tool-manifest, and release-evidence tests or audit helpers |
| **Modify as needed** | `src/lib/referrals/referral-ledger.test.ts`, `src/lib/analytics/analytics-dataset-registry.ts`, `src/lib/graphs/graph-data-sources.test.ts`, `tests/core-policy.test.ts`, `tests/tool-registry.integration.test.ts`, `tests/helpers/role-tool-sets.ts`, `tests/evals/eval-release-evidence.test.ts`, or equivalent focused guards |
| **Spec** | §3.2, §3.7, §4.2, §5.5 |
| **Reqs** | `AFR-168`, `AFR-171` |

Required guard scope:

1. Canonical referral rows, `referral_events`, and compatibility readers such as `conversations.referral_source` must not silently diverge.
2. Registry-backed dataset declarations, graph source allowlists, tool bundle registration, and role-tool manifests must stay aligned.
3. Unauthorized dataset access must continue to fail before admin-only loaders execute.
4. Release evidence must continue to surface referral-origin and anonymous referral-identity verification failures as blocking conditions.

Required constraints:

1. Keep the audits narrow and history-driven.
2. Prefer contract checks over broad snapshot tests.
3. Do not add blanket guards that make normal affiliate-surface iteration noisy.

Task 4.2 outcome:

1. The repo catches real referral-system drift at the same seams where the implementation has already shown it can happen.
2. Future edits fail quickly when they break the agreement between the ledger, datasets, tools, and release evidence.

---

## Task 4.3 — Publish The Release Verification Bundle

**What:** Turn the closeout validation sequence into one explicit maintenance bundle for future referral changes.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Create/Modify** | a lightweight referral QA or maintenance note as needed |
| **Spec** | §3.1, §3.4, §5.5, §6 |
| **Reqs** | `AFR-169`, `AFR-171`, `AFR-172` |

Required outputs:

1. Publish the focused automated bundle for public referral entry, anonymous referral identity, referral-ledger, analytics-registry, graph-source, role-manifest, notification, and release-evidence regressions.
2. Publish the browser smoke matrix for the trust boundary:
   - canonical `/r/{code}` landing
   - anonymous `who referred me?` verification
   - `/referrals` share assets and milestone surfaces
   - `/admin/affiliates` exception queue and payout export
3. Define when the focused automated bundle is enough and when full lint, typecheck, build, and browser QA are required.

Task 4.3 outcome:

1. Future referral edits have one repeatable validation path.
2. The workstream no longer depends on remembering how the Sprint 3 closeout was validated.

Baseline verification bundle to operationalize in this sprint:

Primary command:

```bash
npm run qa:sprint-4
```

Expanded command sequence:

```bash
npm run test -- src/app/api/referral/[code]/route.test.ts src/app/api/referral/visit/route.test.ts src/lib/referrals/referral-visit.test.ts src/app/r/[code]/page.test.tsx src/app/referrals/page.test.tsx tests/chat-stream-route.test.ts src/lib/referrals/referral-ledger.test.ts src/core/use-cases/LeadCaptureInteractor.test.ts src/core/use-cases/RequestConsultationInteractor.test.ts src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts src/lib/referrals/admin-referral-analytics.test.ts src/core/use-cases/tools/affiliate-analytics.tool.test.ts src/lib/graphs/graph-data-sources.test.ts tests/core-policy.test.ts tests/tool-registry.integration.test.ts src/app/api/admin/affiliates/export/route.test.ts src/app/api/notifications/feed/route.test.ts tests/evals/eval-release-evidence.test.ts
npx vitest run tests/admin-shell-and-concierge.test.tsx tests/ux-layout-navigation.test.tsx
npx playwright test tests/browser-ui/admin-shell-responsive.spec.ts
npm run lint
npm run typecheck
npm run build
```

Why this is the floor:

1. The first group keeps public referral entry, signed visit validation, anonymous identity verification, canonical ledger writes, registry or graph parity, role-manifest parity, admin affiliate tooling, notifications, and release evidence under one focused contract.
2. The targeted shell and navigation suite keeps the admin workspace regression surface aligned with the shared shell contract.
3. The responsive Playwright spec preserves the real mobile drawer behavior that already regressed once during the admin-workspace rollout.
4. `npm run qa:sprint-4` operationalizes the same bundle as one repeatable repo command.

Minimum browser smoke matrix to keep explicit in this sprint:

1. Open a canonical `/r/{code}` referral landing and verify the branded referral-unavailable fallback still appears for invalid or disabled codes.
2. Verify an anonymous referred session can still ask `who referred me?` and get the validated referrer identity, while a non-referred session gets a truthful absence response.
3. Verify `/referrals` still exposes share assets, recent activity, and truthful empty states.
4. Verify `/admin/affiliates` still shows the exception queue, review controls, and payout export path without duplicated workspace navigation regressions.

---

## Task 4.4 — Freeze The Deferred Boundary

**What:** Make the post-Sprint-3 roadmap boundary explicit so the governance sprint does not smuggle in new product scope.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Modify as needed** | parent referral-remediation or analytics-registry specs if deferred items need clearer placement |
| **Spec** | §2.1, §3.6, §3.8, §5.5 |
| **Reqs** | `AFR-170` |

Required outputs:

1. Record that automated payout execution is still deferred.
2. Record that third-party affiliate-network integrations, outbound email, and expanded partner tooling are still deferred.
3. Record that `STAFF` global visibility and multi-touch attribution remain separate follow-on decisions.

Task 4.4 outcome:

1. Future product expansion remains deliberate and spec-driven.
2. Sprint 4 stays a governance sprint rather than becoming a vague catch-all backlog bucket.

---

## Validation

1. Focused reconciliation and contract tests prove the canonical referral ledger, analytics dataset registry, graph source allowlists, tool bundles, role-tool manifests, and release evidence remain aligned after future edits.
2. Browser smoke checks prove the public referral landing, anonymous referral identity, affiliate self-service workspace, admin affiliate workspace, and payout export still behave truthfully.
3. Documentation proves the operator cadence and the release verification bundle are explicit enough that a future editor can run them without prior sprint context.
4. Full lint, typecheck, and build remain required whenever a change crosses shared runtime contracts, registry policy, or release evidence behavior.

---

## Implemented Sprint 4 Outputs

Sprint 4 is implemented through lightweight operational assets and focused contract guards rather than new referral runtime features.

Implemented outputs:

1. The operator review rhythm is documented in `docs/operations/referral-affiliate-runbook.md`.
2. The admin operations entrypoint now links to the referral-specific runbook from `docs/operations/admin-runbook.md`.
3. The focused governance parity checks now live in `tests/sprint-4-referral-governance-qa.test.ts`.
4. The full maintenance bundle is operationalized as `npm run qa:sprint-4` through `scripts/run-sprint-4-qa.ts`.
5. The Sprint 4 spec now points to the concrete runbook and repo command instead of leaving those outputs implicit.

---

## Sprint 4 — Completion Checklist

- [x] The admin affiliate review rhythm is documented and repeatable.
- [x] Reconciliation and drift audits cover the ledger, registry, manifests, and release evidence seams that matter.
- [x] One explicit referral verification bundle exists for future changes.
- [x] Browser smoke checks cover the shipped trust boundary end to end.
- [x] Deferred roadmap items remain explicit instead of leaking into governance work.

## QA Result

Status: complete

Validated with:

```bash
npm run qa:sprint-4
```

Observed result:

1. The focused referral governance bundle passed: 20 files, 115 tests.
2. The targeted admin shell regression suite passed: 2 files, 40 tests.
3. The responsive browser smoke passed: 3 Playwright tests.
4. Lint passed.
5. Typecheck passed.
6. Production build passed.
