# Sprint 3 — Admin Operations And Credit Review

> **Goal:** Give admins a truthful global view of affiliate performance, unresolved attribution issues, and manual-first credit review.
> **Spec ref:** §3.6, §3.7, §3.8, §4, §5.4
> **Prerequisite:** Sprint 2 complete.

---

## Sprint Scope

1. Ship the admin affiliate overview, leaderboard, pipeline views, and exception queue.
2. Add admin-only datasets and MCP tools for program health, leaderboard visibility, and unresolved attribution issues.
3. Add manual-first credit review, auditable state changes, and payout-export support without implementing payment rails.
4. Add admin and release-readiness checks for referral-origin configuration and anonymous referrer-verification behavior.

## Out Of Scope

1. No automated payout processor integration.
2. No default STAFF access to global affiliate analytics.
3. No open-ended analytics query surface or ad hoc SQL entry.

---

## Task 3.1 — Ship The `/admin/affiliates` Workspace

**What:** Build the global admin surface for affiliate program performance and exception review.

| Item | Detail |
| --- | --- |
| **Create** | `/admin/affiliates` route and page composition |
| **Modify** | supporting admin loaders and overview services for totals, leaderboard, pipeline, and exceptions |
| **Modify** | existing `/admin/users/[id]` referral detail surfaces as needed for drill-down continuity |
| **Spec** | §3.6 |
| **Reqs** | `AFR-090`, `AFR-091`, `AFR-092`, `AFR-093`, `AFR-095`, `AFR-125`, `AFR-139`, `AFR-163` |

Deliverables:

1. Admins can see global affiliate totals and pipeline health.
2. Exceptions are surfaced as a first-class queue instead of hidden data cleanup work.
3. Per-user referral drill-down remains in the user detail route rather than splitting into competing detail pages.
4. Existing admin-only affiliate enable or disable flows remain the source of truth, and non-admin visitors get a truthful denial path instead of silent route hiding.

---

## Task 3.2 — Add Admin-Only Datasets And MCP Tools

**What:** Expose referral program health and unresolved attribution records through the existing analytics stack.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/analytics/analytics-dataset-registry.ts` and graph source integration surfaces |
| **Modify/Create** | admin referral analytics loaders and policy registry entries for `admin_affiliate_overview`, `admin_affiliate_leaderboard`, `admin_affiliate_pipeline`, and `admin_referral_exceptions` |
| **Modify** | `mcp/analytics-tool.ts` or a dedicated internal referral analytics module only if implementation details need it |
| **Modify** | relevant tool descriptors in `src/core/use-cases/tools/` for `get_admin_affiliate_summary` and `list_admin_referral_exceptions` |
| **Spec** | §3.7, §4 |
| **Reqs** | `AFR-100`, `AFR-101`, `AFR-102`, `AFR-104`, `AFR-105`, `AFR-106`, `AFR-107`, `AFR-127`, `AFR-140` |

Rules:

1. Implement the exact admin dataset and tool names from the registry spec. Do not create parallel contract names for the same surfaces.
2. Admin datasets require `ADMIN`.
3. `STAFF` remains denied unless a later spec explicitly changes that decision.
4. Tool and graph authorization must stay aligned with route-level admin access.
5. Low-level MCP changes are an implementation detail. The app-facing contract remains named registry-backed datasets plus purpose-built admin tools.

---

## Task 3.3 — Add Manual-First Credit Review And Export

**What:** Let admins review credit state and produce payout-ready exports without building automated payout execution.

| Item | Detail |
| --- | --- |
| **Modify/Create** | admin credit-state update flows and audit event writers |
| **Modify/Create** | payout-ready export surface or endpoint |
| **Spec** | §3.2, §3.3, §3.6, §4.2 |
| **Reqs** | `AFR-023`, `AFR-066`, `AFR-067`, `AFR-094`, `AFR-126`, `AFR-141` |

Deliverables:

1. Admins can move referral credit state through manual review without silently rewriting lifecycle history.
2. Every credit-state change emits an auditable `credit_state_changed` event with actor id, reason, timestamp, and canonical `referral_id`.
3. Exported rows are payout-ready review artifacts only and do not imply automated payment execution.

---

## Task 3.4 — Add Admin Exception Notifications

**What:** Notify admins about unresolved referral problems and review backlog without pushing routine affiliate activity.

| Item | Detail |
| --- | --- |
| **Modify/Create** | admin notification writers and feed surfaces for exceptions |
| **Spec** | §3.8 |
| **Reqs** | `AFR-110`, `AFR-112`, `AFR-113`, `AFR-154` |

Deliverables:

1. Admin exception notifications land in the existing in-app feed first.
2. Disabled-code traffic, unresolved attribution problems, and credit-review backlog produce admin-facing notifications; routine affiliate milestones do not.
3. Stable dedupe keys prevent refreshes and retries from repeatedly notifying admins about the same unresolved item.

---

## Task 3.5 — Add Referral Entry And Identity Verification Operational Checks

**What:** Give admins and release reviewers a reliable way to validate public referral origin handling and anonymous `who referred me?` behavior after rollout.

| Item | Detail |
| --- | --- |
| **Modify/Create** | admin diagnostics, release evidence, or exception surfaces for referral-origin configuration |
| **Modify/Create** | operational checks that prove anonymous referral identity responses match validated session state |
| **Spec** | §3.1, §3.4, §5.4, §6 |
| **Reqs** | `AFR-057`, `AFR-058`, `AFR-074`, `AFR-075`, `AFR-076`, `AFR-142`, `AFR-143`, `AFR-150`, `AFR-151`, `AFR-157`, `AFR-165`, `AFR-166` |

Rules:

1. This task verifies and surfaces the existing public referral-entry and anonymous identity behavior. It does not rebuild the Sprint 0 or Sprint 1 public flows.
2. Diagnostics should produce observable admin or release evidence, not hidden one-off scripts or manual-only tribal knowledge.

Deliverables:

1. Admin and release-readiness evidence can confirm which origin QR and share assets are using, including expected localhost fallback in development.
2. Operational checks can confirm that an anonymous referred session answers `who referred me?` from validated referral state.
3. Misconfigured public origin or broken referral-identity context shows up in exception handling or release evidence instead of staying silent.

---

## Validation

1. RBAC tests prove `/admin/affiliates`, admin APIs, admin tools, payout export surfaces, and admin datasets remain inaccessible to `STAFF` and ordinary affiliate-enabled users, with branded page denials and structured API 403s where appropriate.
2. Admin analytics tests prove `admin_affiliate_overview`, `admin_affiliate_leaderboard`, `admin_affiliate_pipeline`, and `admin_referral_exceptions` are accurate, policy-enforced, and do not expose open-ended backend filters.
3. Credit-review tests prove manual state changes emit auditable `credit_state_changed` events with actor, reason, and timestamp, and payout exports do not imply automated payment execution.
4. Notification tests prove feed ordering, stable dedupe, and exception-only admin notification behavior without mirroring routine affiliate milestones.
5. Operational diagnostics prove the configured public origin, localhost fallback, referral validation outcomes, and anonymous `who referred me?` verification are observable in admin or release evidence after rollout.

---

## Sprint 3 — Completion Checklist

- [ ] `/admin/affiliates` exposes global affiliate performance and exception handling.
- [ ] Admin-only tools and graph datasets are live and policy-correct.
- [ ] Credit review and payout export are available without adding payment rails.
- [ ] Admin notifications focus on exceptions and review backlog rather than routine affiliate milestones.
- [ ] Admin and release-readiness checks cover referral origin configuration and anonymous referral-identity verification.
