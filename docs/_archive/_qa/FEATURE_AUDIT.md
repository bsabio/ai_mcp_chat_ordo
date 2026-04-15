# Feature Audit — Vol 2

This updated review adds the missing pipeline stages (`ConsultationRequests`, `Referrals`) and maps the existing notification framework against the current codebase state. Sprint 1 now already routes deferred-job terminal notifications out of chat, so the remaining gaps are inbox-style delivery and role-specific user alerts, not chat-spam suppression.

---

## 📈 1. Sales & Growth Features

**A. Leads (`LeadRecord`)**
*   **Purpose**: Top-of-funnel capture via AI.
*   **Gap**: No admin notification when a High-Intent lead jumps the queue.

**B. Consultations (`ConsultationRequest`) [Previously Missed]**
*   **Purpose**: Middle-of-funnel scheduled 1:1 time requests (`pending`, `reviewed`, `scheduled`).
*   **Current State**: Integrated in the pipeline view, but users get no automatic acknowledgement if their consultation status changes from `pending` -> `reviewed`.

**C. Deals (`DealRecord`)**
*   **Purpose**: Organizational contracts (Bottom-of-funnel).
*   **Gap**: Direct customer notification currently missing for state `estimate_ready`.

**D. Referrals (`Referral`) [Previously Missed]**
*   **Purpose**: Referral codes tracked at the start of a conversation.
*   **Gap**: No automated tracking/notification to the referrer when their code leads to a converted user or deal.

---

## 🎓 2. Individual Development

**A. Trainings (`TrainingPathRecord`)**
*   **Purpose**: Mentorship/Labs career path.
*   **State**: Exists as an entity and within Leads Pipeline, but has *no dedicated user browse page*, and the Detail page is an empty skeleton (`Training ID: <id>`).
*   **Gap**: Huge missing UI surface. The user needs a "Training Dashboard" to view Recommended Paths.

---

## 👤 3. Platform Growth

**A. User Signups (`User`)**
*   **Gap**: Missing an "Onboarding" hook. No immediate welcome notification/system message telling them how to use the Concierge or the Dispatch notification center.

---

## 🔔 4. Core Mechanism: The "Dispatch" System

**What already exists:**
The system *has* a robust, multi-channel architecture (`NotificationDispatcher`, `PushNotificationChannel`, `ChatNotificationChannel`). It also features the `AdminSignalEvaluator` rule engine containing 6 pre-built rules for "System degraded", "Overdue follow-ups", etc.

**What is flawed/missing:**
1.  **Admin Monopoly**: `AdminSignalEvaluator` and `AdminNotification` are still strictly for *Admins*. Authenticators/Users have no equivalent system for receiving personalized "Dispatch" alerts (e.g. "Your consultation was approved" or "Your profile generation finished").
2.  **No Inbox Model**: Notifications trigger via PUSH or CHAT, but there is no persistent "Bell icon" dropdown (in-app feed) to review missed alerts.
3.  **Historical note on terminal delivery**: this audit section reflected the pre-Phase-10 contract where `DeferredJobConversationProjector` did not rewrite the in-chat job message on terminal events. As of the Phase 10 terminal-projection fix, chat, jobs, and notifications should converge on the same terminal job truth instead of leaving chat on a stale live-running state.

**Actionable Path:**
*   Extend `NotificationDispatcher` to support `UserNotification` events via an In-App feed.
*   Build the inbox layer and route user-facing alerts there instead of relying on chat history.
