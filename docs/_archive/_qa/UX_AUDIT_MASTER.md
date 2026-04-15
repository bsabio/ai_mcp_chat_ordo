# UX Audit Master — Vol 2

This updated audit synthesizes all UX friction points across the platform with accurate severity ratings, level of effort (LOE), and corrected architectural context.

## 🔴 P0 Critical (Blocks User/Admin Success)

**1. "Ghost" Bulk Actions in Tables**
* **Symptom**: `AdminDataTable` allows row selection with checkboxes, but provides zero bulk actions for most data types (Users, Leads, Conversations).
* **Impact**: Data management scales poorly for admins. It’s a "tease" of functionality.
* **LOE**: M (1-2 days) — implement server actions inside `UsersTableClient`, `ConversationsTableClient`.

**2. Job Status Updates Spam the Chat [Root Cause Identified]**
* **Symptom**: When deferred jobs are running (or especially when retried in bulk), the chat gets flooded with status messages, destroying the conversation flow.
* **Root Cause**: `DeferredJobConversationProjector` blindly creates new Chat messages (or updates them) for every job event.
* **Fix**: Redirect terminal/progress job events to the `NotificationDispatcher` instead of the conversation projector. Only keep the original "Job Queued" tool call in chat.
* **LOE**: S (hours).

## 🟠 P1 High Friction (Degrades Premium Feel)

**3. Uncanny Feedback / Silent Waits**
* **Symptom**: Pagination and filtering transitions snap jaggedly. The UI disappears and reappears instead of showing intermediate loading states.
* **Fix**: Introduce a centralized `TableSkeleton`.
* **LOE**: M (1-2 days).

**4. The "Hover Guess" (Missing Tooltips)**
* **Symptom**: `ChatSurfaceHeader` uses icon-only buttons for Expand/Minimize with no tooltips.
* **Fix**: Centralized global tooltip registry. 
* **LOE**: S (hours).

**5. Z-Index Conflict (The "Layering War")**
* **Symptom**: `z-50`, `z-100`, `z-9999` are scattered across AccountMenu, SiteNav, and Toast, posing collision risks.
* **Fix**: Standardize with CSS variables (e.g. `--z-index-dropdown`).
* **LOE**: S (hours).

## 🟡 P2 Polish (Visual Drift & Architecture)

**6. AppShell Logic Duplication**
* **Symptom**: `AppShell.tsx` has two redundant branches for "Admin" and "Non-Home" document-flow routes. 
* **Details**: Home route is a separate structural branch (`viewport-stage`), which is correct, but the document-flow branches are identical copy-pastes.
* **Fix**: Refactor `AppShell.tsx` into a cleaner configuration to reduce duplication.
* **LOE**: M (1-2 days).

**7. Hardcoded Badge Drift**
* **Symptom**: Colors in `AdminSearchBar` are hardcoded Tailwind (`bg-blue-100`) rather than semantic tokens (`bg-status-info`).
* **Fix**: Standardized `Badge` component.
* **LOE**: S (hours).

**8. Admin Mobile Drawer Grouping**
* **Symptom**: Mobile admin capabilities *do* exist via `AdminDrawer.tsx` (a well-built component with focus traps and shrouding), but the links are a flat list of 10+ items.
* **Fix**: Enhance the Drawer by grouping links by "Department" (Reception, Sales, Operations, Technical).
* **LOE**: S (hours).

---

## ✅ Resolved Claims from Review
- **Admin Mobile Access**: Verified as existing via `AdminDrawer.tsx`. The goal is to improve it with Departments, not build it from scratch.
- **AppShell**: Verified as 2 redundant branches (not 3).
- **Routes**: Verified as ~15 primary routes (not 1000+).
