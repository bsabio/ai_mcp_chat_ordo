# Sprint Plan Code Verification

This document verifies that every item in the `OFFICE_REFAC_PLAN` maps exactly to physical implementation details within the codebase, ensuring the plan is 100% actionable and grounded in reality.

---

## 🏗️ Sprint 0: Foundation & Dead Code Cleanup

**1. AppShell Consolidation**
*   **Target:** `src/components/AppShell.tsx` (Lines 37-58 and 60-81)
*   **Proof:** The `isAdminRoute` and `!isHomeRoute` branches currently render functionally identical `document-flow` HTML wrappers. They can be merged into a single layout dictionary.

**2. Centralized Token Registry**
*   **Target:** `src/app/globals.css` and arbitrary UI files.
*   **Proof:** My `grep` identified exactly 7 arbitrary Z-Index rings currently hardcoded in the application:
    *   `z-10`: `AdminBulkActionBar.tsx`
    *   `z-50`: `SiteNav.tsx`, `AdminSearchBar.tsx`, `AdminDrawer.tsx`, `BookSidebar.tsx`
    *   `z-100` & `z-101`: `AccountMenu.tsx`, `ContentModal.tsx`
    *   `z-9999` & `z-100000`: `ThemeProvider.tsx`, `AudioPlayer.tsx`, `ToolCard.tsx`

**3. Unified Badge Component**
*   **Target:** Extract styling from `src/components/admin/LeadsTableClient.tsx` and `ConversationsTableClient.tsx`.
*   **Proof:** `bg-amber-500/15 text-amber-600` is currently copy-pasted in multiple files for the "OVERDUE", "HUMAN", and "PREVIEW" pills. `bg-blue-100 text-blue-800` is hardcoded in `AdminSearchBar.tsx`. These will map perfectly to a central `<Badge>` component.

**4. Department Interface**
*   **Target:** `src/lib/shell/shell-navigation.ts` (Line 8)
*   **Proof:** `ShellRouteDefinition` currently supports `id`, `label`, `href`, `kind`, and `visibility`. We will append `department?: string`.

---

## ⚡️ Sprint 1: Quick Wins

**1. Surgical Chat Spam Fix**
*   **Target:** `src/lib/jobs/deferred-job-conversation-projector.ts` (Line 23)
*   **Proof:** The `project(job, event)` method currently triggers `this.messageRepo.create({ role: "assistant", parts: [nextPart] })`. This explicitly injects system events into the human chat DB. We will rewire this class to trigger `NotificationDispatcher.dispatch()`.

**2. Drawer Departments**
*   **Target:** `src/components/admin/AdminDrawer.tsx` (Line 97+)
*   **Proof:** Currently maps over `accountMenuRoutes` as a flat list. It will be trivial to `.reduce()` these into department groups.

**3. The "Hover Guess" Fix**
*   **Target:** `src/frameworks/ui/ChatSurfaceHeader.tsx`
*   **Proof:** Contains the standalone SVG buttons for expanding/minimizing the Chat surface with no `title` or tooltip wrappers.

---

## ⚙️ Sprint 2: The Interactive Office

**1. "Ghost Actions" Reality**
*   **Target:** `src/components/admin/UsersTableClient.tsx` and `ConversationsTableClient.tsx`
*   **Proof:** The tables render `<AdminBulkTableWrapper>` but the server actions hook passed to them lacks the implementation branches for actually toggling flags or archiving.

**2. The Dispatch Feed (Inbox)**
*   **Target:** `src/core/entities/NotificationChannel.ts`
*   **Proof:** The `AdminNotification` entity exists, but there is no `UserNotification`. This requires extending the database schema/entity to support in-app Feed drops.

---

## 💎 Sprint 3: Premium Polish & Deep UI

**1. Table Skeletons**
*   **Target:** `src/components/admin/AdminDataTable.tsx`
*   **Proof:** The table currently disappears entirely during re-render/suspense. Wrapping the standard table rows in an animated pulse CSS skeleton frame will fix the visual pop.

**2. Consultation & Referral Hooks**
*   **Target:** `src/core/entities/consultation-request.ts` & `Referral.ts`
*   **Proof:** We've verified these systems are actively tracking data. We will add triggers to `src/lib/admin/notifications/admin-signal-evaluator.ts` so that when a Consultation flips to `reviewed`, the Dispatch Feed fires an event.
