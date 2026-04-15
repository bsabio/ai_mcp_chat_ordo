# Office Reorganization — Sprint Plan

This sequenced plan prioritizes a strong DRY/SOLID foundation (Sprint 0) followed immediately by high-value, low-effort wins (Sprint 1), before tackling deeper structural features.

---

## 🏗️ Sprint 0: Foundation & Dead Code Cleanup
**Goal:** Establish DRY patterns, centralize tokens, and remove redundant logic so later sprints move faster.

1.  **AppShell Consolidation**:
    *   **Task**: Refactor `AppShell.tsx` to merge the redundant `document-flow` branches (Admin & Non-Home) into a single composition block.
    *   **Cleanup**: Remove duplicate layout wrappers and unused conditional logic.
2.  **Centralized Token Registry**:
    *   **Task**: Extract all arbitrary `z-index` values (`z-50`, `z-100`, `z-9999`) across AccountMenu, SiteNav, and Toast into `globals.css` variables (`--z-index-dropdown`, etc.).
3.  **Unified Badge Component**:
    *   **Task**: Create a `Badge` component mapping semantic states (Info, Success, Warning, Critical) to tokens.
    *   **Cleanup**: Rip out hardcoded Tailwind color overrides in `AdminSearchBar.tsx`, `AdminStatusCounts.tsx`, and `JobsTableClient.tsx`.
4.  **Department Interface**:
    *   **Task**: Extend `ShellRouteDefinition` in `shell-navigation.ts` with `department` and `order`. Update `SHELL_ROUTES` to use these.

---

## ⚡️ Sprint 1: Quick Wins (High Value, Low Effort)
**Goal:** Immediately resolve the most painful user friction points with minimal structural risk.

1.  **Surgical Chat Spam Fix**:
    *   **Task**: Update `DeferredJobConversationProjector.project()`. 
    *   **Action**: Instead of appending job updates to the conversation via `messageRepo`, route them sequentially to `NotificationDispatcher`. Retain only the initial "Queued" tool call in chat.
2.  **Drawer Departments**:
    *   **Task**: Update `AdminDrawer.tsx` to visually group the flat list of links by the new `department` property defined in Sprint 0.
3.  **The "Hover Guess" Fix**:
    *   **Task**: Add native `title` wrappers or a global Tooltip provider to the icon-only buttons in `ChatSurfaceHeader` (Expand/Minimize).

---

## ⚙️ Sprint 2: The Interactive Office (Action & Notification)
**Goal:** Make the remaining "empty" UI components functional, building on the search and deferred-job fixes already completed in the prior sprints.

1.  **"Ghost Actions" Reality**:
    *   **Task**: Implement server actions for the existing checkboxes in `UsersTableClient` (bulkBlock, bulkRoleToggle) and `ConversationsTableClient` (bulkArchive).
2.  **The Dispatch Feed (Inbox)**:
    *   **Task**: Extend `AdminNotification` to support standard `UserNotification` events.
    *   **Action**: Build the `NotificationFeed.tsx` dropdown attached to a Bell icon in `SiteNav.tsx` to catch general platform alerts. Sprint 1 already moved terminal deferred-job delivery out of chat, so the feed now needs to consume that cleaner notification path instead of compensating for chat spam.

---

## 💎 Sprint 3: Premium Polish & Missing UI
**Goal:** Complete the "Live Business" feel and patch missing feature UI.

1.  **Table Skeletons**:
    *   **Task**: Introduce `<TableSkeleton />` for `AdminDataTable.tsx` to prevent the UI from "snapping" abruptly during pagination and filter changes.
2.  **Training Dashboard**:
    *   **Task**: Convert the empty `[id]/page.tsx` for `TrainingPathRecord` into a populated view of user skill paths.
3.  **Consultation & Referral Hooks**:
    *   **Task**: Add lightweight notification triggers for Consultation Request status changes and Referral conversions via the `NotificationDispatcher`.
