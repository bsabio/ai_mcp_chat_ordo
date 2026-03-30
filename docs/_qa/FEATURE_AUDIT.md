# Feature Audit — Vol 2

This updated review adds the missing pipeline stages (`ConsultationRequests`, `Referrals`) and accurately maps the existing notification framework to identify gaps in usage.

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
1.  **Chat Spam**: `DeferredJobConversationProjector` bypasses the `NotificationDispatcher` and writes directly to chat using `messageRepo.create`.
2.  **Admin Monopoly**: `AdminSignalEvaluator` and `AdminNotification` are strictly for *Admins*. Authenticators/Users have no equivalent system for receiving personalized "Dispatch" alerts (e.g. "Your consultation was approved" or "Your profile generation finished").
3.  **No Inbox Model**: Notifications trigger via PUSH or CHAT, but there is no persistent "Bell icon" dropdown (in-app feed) to review missed alerts.

**Actionable Path:**
*   Extend `NotificationDispatcher` to support `UserNotification` events via an In-App feed.
*   Redirect `DeferredJobConversationProjector` to the `NotificationDispatcher` (or an inbox layer) instead of appending to conversations.
