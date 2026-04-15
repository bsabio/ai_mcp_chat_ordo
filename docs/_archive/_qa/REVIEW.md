# QA Document Review — Critical Findings

This is a rigorous cross-referencing of the three `_qa` documents against the actual codebase. It identifies **factual errors**, **missing context**, and **gaps** that must be resolved before execution.

---

## 🔴 Factual Errors & Misleading Claims

### 1. "Admin Sidebar is hidden on mobile with no replacement"
**Verdict: FALSE — AdminDrawer already exists.**

The codebase already has [AdminDrawer.tsx](file:///Users/kwilliams/Projects/is601_demo/src/components/admin/AdminDrawer.tsx) — a fully implemented hamburger menu with focus trap, Escape-to-close, route-change auto-close, and accessibility features. The `AdminSidebar` (desktop) and `AdminDrawer` (mobile) are a responsive pair. The UX Audit claims mobile admin is "unreachable" — this is wrong. The audit should instead focus on **improving** the drawer (e.g. adding departmental grouping to it), not claiming it doesn't exist.

### 2. "AppShell contains three nearly identical return branches"
**Verdict: MISLEADING — they differ for good reason.**

Looking at [AppShell.tsx](file:///Users/kwilliams/Projects/is601_demo/src/components/AppShell.tsx), the three branches are:
- **Admin route** (L35-56): `document-flow` mode with `data-shell-route-surface="admin"`
- **Non-home content** (L58-78): `document-flow` mode for journal/library/etc.
- **Home route** (L81-108): `viewport-stage` mode with fixed viewport height

The Admin and Non-home branches **look** identical in JSX, but the Home branch is structurally different (viewport-locked layout). The real problem is that Admin and Non-home are copy-paste — but this is 2 redundant branches, not 3. The audit overstates the issue.

### 3. "1,000+ routes to group into departments"
**Verdict: FALSE — there are ~15 shell routes.**

The `SHELL_ROUTES` array in `shell-navigation.ts` has roughly 15 defined routes. Calling it "1,000+" in the implementation plan is wildly inaccurate and undermines credibility.

---

## 🟡 Critical Missing Context

### 4. Notification infrastructure already exists (not acknowledged)
The docs propose building a "Notification Center from scratch" but completely ignore what's already built. Sprint 1 also proved the deferred-job worker already has a separate terminal notification path, so the remaining gap is the inbox/feed surface rather than the underlying dispatcher:

| Component | Status | Location |
|-----------|--------|----------|
| `AdminNotification` entity | ✅ Exists | `src/core/entities/NotificationChannel.ts` |
| `NotificationChannel` interface | ✅ Exists | Same file |
| `NotificationDispatcher` (fan-out) | ✅ Exists | `src/lib/admin/notifications/notification-dispatcher.ts` |
| `ChatNotificationChannel` | ✅ Exists | `src/adapters/ChatNotificationChannel.ts` |
| `PushNotificationChannel` (Web Push) | ✅ Exists | `src/adapters/PushNotificationChannel.ts` |
| `AdminSignalEvaluator` (rule engine) | ✅ Exists | `src/lib/admin/notifications/admin-signal-evaluator.ts` |
| `PushSubscriptionRecord` entity | ✅ Exists | `src/core/entities/push-subscription.ts` |

**The system already has a multi-channel notification dispatcher with Web Push support and a signal rule engine.** The FEATURE_AUDIT and OFFICE_REFAC_PLAN should build on this infrastructure, not propose recreating it.

### 5. The real "chat spam" mechanism was identified and fixed at the projector level
The user's complaint about job retries spamming chat traced to a specific class: [DeferredJobConversationProjector](../src/lib/jobs/deferred-job-conversation-projector.ts). The code now keeps the live job status message in chat but stops terminal result/failure/cancel events from rewriting the conversation. The remaining notification delivery path is handled by the worker runtime's separate dispatcher.

### 6. Consultation Requests are missing from the Feature Audit
The codebase has a full [ConsultationRequest](file:///Users/kwilliams/Projects/is601_demo/src/core/entities/consultation-request.ts) entity with statuses (`pending`, `reviewed`, `scheduled`, `declined`) and it's already a tab in the Leads pipeline. The Feature Audit doesn't mention it at all — it just says "Leads" and "Deals" without acknowledging this middle pipeline stage.

### 7. Referrals are completely unaudited
[Referral.ts](file:///Users/kwilliams/Projects/is601_demo/src/core/entities/Referral.ts) exists with a `referralCode`, `scannedAt`, `convertedAt`, and `outcome` field. It's connected to conversation creation (the stream pipeline reads `lms_referral_code` from cookies). This is a business feature that none of the three docs mention.

---

## 🟡 Structural Problems with the Documents

### 8. No severity or effort estimates
Every finding is listed flat. "Z-index inconsistency" and "Admin navigation unreachable on mobile" are treated with equal weight. The documents need:
- **Severity**: P0 (blocks users) / P1 (significant friction) / P2 (polish)
- **Effort**: S (hours) / M (1-2 days) / L (3+ days)

### 9. No sprint sequencing
The OFFICE_REFAC_PLAN has four sections but no dependency ordering. For example:
- The Notification Hub must exist before job updates can be redirected to it
- The `department` field must exist on routes before the Drawer can group by department
- AppShell consolidation should happen **before** adding new layout layers

### 10. Training detail page is a skeleton
The [Training Detail page](file:///Users/kwilliams/Projects/is601_demo/src/app/admin/training/%5Bid%5D/page.tsx) just shows `Training ID: {record.id}` — it's a placeholder with no actual content. The Feature Audit says "No browse page" but doesn't mention the detail page is also empty. Training has no index page at all — it only exists as a tab within Leads.

### 11. The "Concierge vs Dispatch" metaphor isn't operationalized
The FEATURE_AUDIT proposes "Chat = Concierge, Notifications = Dispatch" which is a good conceptual split, but the plan doesn't specify:
- What notification types get **in-app** display vs **push** vs **both**
- Whether notifications are persisted (inbox model) or transient (toast model)
- How the existing `AdminSignalEvaluator` rules map to the new user-facing notifications (currently it's admin-only)

---

## ✅ What the Documents Get Right

1. **"Ghost" bulk actions** — confirmed. Tables have selection but no action handlers.
2. **Badge color drift** — confirmed. `AdminSearchBar` uses hardcoded Tailwind colors.
3. **Training purpose is unclear** — confirmed. The entity is rich but the UI is skeletal.
4. **Job status updates pollute chat** — confirmed via `DeferredJobConversationProjector`.
5. **The departmental grouping concept** — solid organizational model.
6. **Global Command Bar need** — the existing `AdminSearchBar` with Cmd+K is admin-only.

---

## 📋 Recommended Revisions

1. **Fix factual errors**: Remove "mobile dead end" claim, correct route count, acknowledge existing notification infrastructure.
2. **Add the `DeferredJobConversationProjector`** as the specific surgical target for the chat spam fix.
3. **Add Consultation Requests and Referrals** to the Feature Audit.
4. **Add severity/effort ratings** to every UX finding.
5. **Create a dependency-ordered sprint plan** in the OFFICE_REFAC_PLAN.
6. **Operationalize the notification model**: Define which events get push vs in-app vs both, and whether there's an inbox.
