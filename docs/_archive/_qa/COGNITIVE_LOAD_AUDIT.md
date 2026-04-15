# Cognitive Load & UX Architecture Audit

**Prepared by:** Cognitive Engineering & Information Architecture
**Objective:** Evaluate the `is601_demo` application and the proposed `OFFICE_REFAC_PLAN` against human cognitive constraints (working memory limits, intrinsic vs. extraneous load, and spatial mapping).

---

## 1. Information Architecture (IA) & Chunking

**Current State: The "Flat List" Anti-Pattern**
Currently, the Admin Navigation (`src/lib/admin/admin-navigation.ts`) defines 8-10 primary routes in a flat hierarchy. 
*   **Cognitive Violation (Hick's Law & Miller's Law):** Presenting 10 undifferentiated options forces the user to scan and evaluate linearly every time they open the menu. Working memory is taxed holding the list in mind to make a decision.
*   **Refactor Solution (The "Office" Model):** By grouping menus into functional departments (*Reception, Sales, Operations, Technical*), we employ **Chunking**. The user first selects a broad category, reducing the decision matrix to 3-4 items at a time. This maps to real-world mental models (spatial memory), making the system immediately traversable for non-technical staff.

## 2. Modality & Split-Attention Effect

**Current State: The Chat "Spam" Loop**
Currently, `DeferredJobConversationProjector` injects system-level metadata (Job Queued, Running, Failed) directly into the human-AI conversation feed.
*   **Cognitive Violation (Split-Attention Effect):** The user is forced to process two entirely different types of information—conversational sematics and system execution state—in the exact same visual channel. This forces aggressive context switching, draining mental energy and causing users to lose their train of thought.
*   **Refactor Solution (The "Dispatch" Center):** Decoupling job states into the `NotificationDispatcher` (the Bell icon) creates a dedicated modality for system alerts. The chat remains a pure conversational channel. The user can check the "Dispatch" feed *on their own terms*, restoring locus of control.

## 3. False Affordances & Error Recovery

**Current State: "Ghost" Bulk Actions**
`UsersTableClient` and `ConversationsTableClient` render selecting checkboxes, yet lack actual bulk sever actions to manipulate the data.
*   **Cognitive Violation (Gulf of Execution):** A checkbox universally signals "I can act on this selection." When no action is available, the user assumes user-error. They spend cognitive cycles trying to figure out what they did wrong or searching the UI for a hidden delete button.
*   **Refactor Solution (Interactive Reality):** Hooking up `bulkBlock`, `bulkRoleToggle`, and `bulkArchive` aligns the system with universal design precedents, closing the gulf of execution.

## 4. Visual Stability & Spatial Memory

**Current State: Jagged Rendering & Visual Drift**
The absence of `TableSkeleton` states causes the UI to layout-shift during pagination/search. Furthermore, hardcoded `bg-[color]` tokens for status badges bypass the semantic design system.
*   **Cognitive Violation (Change Blindness & Recalibration):** When a table disappears and snaps back into existence, the user's spatial memory is wiped. Their eyes must re-scan the viewport to find constraints. Additionally, inconsistent status colors prevent the brain from creating subconscious fast-path associations (e.g., Red = Critical).
*   **Refactor Solution (Skeletons & Semantic Badges):** Masking data fetches with `<TableSkeleton />` preserves the structural geometry of the page, allowing the user's eyes to rest on the exact coordinate where the new data will appear. Formalizing `<Badge>` ensures the user can process statuses pre-attentively (without reading the text).

## 5. Recognition vs. Recall

**Current State: The "Hover Guess"**
Icon-only buttons in the `ChatSurfaceHeader` have no text labels or native tooltips.
*   **Cognitive Violation (Recall Dependency):** The user must recall from long-term memory what a specific abstract icon means. 
*   **Refactor Solution:** Adding tooltips shifts the burden from *recall* to *recognition*. The system provides the answer just-in-time via hover.

---

### Conclusion

The current state of the application suffers from **high extraneous cognitive load**. The system forces the user to compensate for poor structural grouping, noisy communication channels, and false interaction promises. 

The proposed `OFFICE_REFAC_PLAN` is an exceptionally strong mitigation strategy. The sequence of establishing a semantic foundation (Sprint 0), restoring expected affordances (Sprint 1), and formalizing the IA through chunky mental models (Sprint 2) will transform the platform from a "developer tool" into a highly legible "Live Business" environment.
