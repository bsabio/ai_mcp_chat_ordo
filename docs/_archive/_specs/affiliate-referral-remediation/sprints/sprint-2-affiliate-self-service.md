# Sprint 2 — Affiliate Self-Service

> **Goal:** Give affiliate-enabled users one clear workspace for sharing links, seeing results, and receiving milestone visibility.
> **Spec ref:** §3.5, §3.7, §3.8, §5.3
> **Prerequisite:** Sprint 1 complete.

---

## Sprint Scope

1. Ship the signed-in `/referrals` workspace and keep the profile referral surface as a compact entry point.
2. Add self-service analytics datasets and MCP tools scoped to the current affiliate-enabled account.
3. Add milestone visibility through the in-app notification feed with optional push transport.

## Out Of Scope

1. No admin global affiliate overview yet.
2. No global exception queue or credit-review workspace yet.
3. No automated payout processing or third-party network webhooks.

---

## Task 2.1 — Ship The `/referrals` Workspace

**What:** Build the main affiliate-facing surface for link sharing, performance summary, and recent activity.

| Item | Detail |
| --- | --- |
| **Create** | signed-in `/referrals` route and page composition |
| **Modify** | `src/components/profile/ProfileSettingsPanel.tsx` to reduce the profile block to a compact summary card |
| **Modify** | supporting affiliate profile or referral-service loaders |
| **Spec** | §3.5 |
| **Reqs** | `AFR-080`, `AFR-081`, `AFR-083`, `AFR-084`, `AFR-085`, `AFR-086` |

Deliverables:

1. Default metrics lead the page.
2. Share assets remain available without leaving the workspace.
3. Empty-state behavior is truthful for affiliate-enabled users with no activity.

---

## Task 2.2 — Add Self-Service Datasets And MCP Tools

**What:** Extend the existing analytics and graph stack with affiliate-scoped data sources and tool contracts.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/graphs/graph-data-sources.ts` |
| **Modify/Create** | self-service referral analytics loaders and dataset-policy registry helpers |
| **Modify** | `mcp/analytics-tool.ts` or dedicated referral analytics MCP module |
| **Modify** | relevant tool descriptors in `src/core/use-cases/tools/` |
| **Spec** | §3.7 |
| **Reqs** | `AFR-100`, `AFR-101`, `AFR-102`, `AFR-103`, `AFR-105`, `AFR-106`, `AFR-107` |

Rules:

1. Self-service datasets always scope to the current affiliate-enabled account.
2. Tool visibility never substitutes for dataset authorization.
3. Graph rendering continues through the existing `generate_graph` contract.

---

## Task 2.3 — Add Affiliate Milestone Notifications

**What:** Surface referral progress in the in-app feed and optionally reuse browser push for delivery.

| Item | Detail |
| --- | --- |
| **Modify/Create** | notification event writers and feed loaders for referral milestones |
| **Modify** | existing push-notification transport integration as needed |
| **Spec** | §3.8 |
| **Reqs** | `AFR-110`, `AFR-111`, `AFR-113`, `AFR-154` |

---

## Task 2.4 — Enforce Affiliate Capability Gates Consistently

**What:** Make sure the same `affiliate_enabled` rules govern the page, tools, datasets, and notifications.

| Item | Detail |
| --- | --- |
| **Modify** | route guards, page loaders, tool descriptors, and dataset resolvers touched by self-service referral access |
| **Spec** | §4 |
| **Reqs** | `AFR-120`, `AFR-121`, `AFR-122` |

---

## Validation

1. Route and UI tests prove affiliate-enabled users can access `/referrals` and non-affiliate users get a truthful denial or empty state.
2. Dataset and MCP tests prove self-service data stays scoped to the current account with no caller-supplied user-id escape hatch.
3. Notification tests prove milestone dedupe, feed ordering, and optional push behavior work without spamming users.

---

## Sprint 2 — Completion Checklist

- [ ] `/referrals` provides metrics, share assets, charts, and recent activity for affiliate-enabled users.
- [ ] Self-service MCP tools and graph datasets are live and correctly scoped.
- [ ] Referral milestone notifications appear in the feed with deduped optional push delivery.
- [ ] Affiliate capability checks are consistent across UI, tools, datasets, and notifications.
