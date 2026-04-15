# Cognitive Load & UX Interaction Audit — Part 2

**Prepared by:** Cognitive Engineering & Information Architecture
**Objective:** A secondary, deep-dive evaluation of micro-interactions, affordances, and physical effort constraints discovered during specific component analysis of `is601_demo`.

---

## 6. Fitts's Law & Physical Fatigue

**Current State: Mobile Bulk Selection**
In `AdminDataTable.tsx`, the desktop view renders a `<table/>` with a master "Select All" checkbox in the header. To accommodate mobile bounds, the view structurally snaps into a stacked card layout (`<div className="sm:hidden">`). However, the "Select All" checkbox is omitted entirely from this mobile DOM structure.
*   **Cognitive/Physical Violation (Fitts's Law & Repetitive Strain):** A user managing dozens of rows on a mobile device is forced into aggressive repetitive tapping. The physical travel distance and effort required to bulk-administer 50 rows scales linearly to `O(N)`, whereas desktop scales to `O(1)`.
*   **Refactor Solution:** Reintroduce a global "Select All" toggle button specific to the mobile DOM stack, placed persistently at the top of the feed or docked to the bulk action bar.

## 7. Principle of Least Astonishment (Inconsistent Mental Models)

**Current State: Admin Search Form Submission**
The `AdminBrowseFilters.tsx` component uses a standard `<form method="get">` with a physical "Filter" button. However, any toggle input inside the form binds an `onChange` event that forces `form.requestSubmit()`. Text inputs and dropdowns do not.
*   **Cognitive Violation (Interaction Inconsistency):** The user's mental model is shattered. They type a search term, hit a toggle, and the page randomly reloads before they can click "Filter." The system is unpredictably "listening" to some inputs but ignoring others until formal submission.
*   **Refactor Solution:** Standardize the interaction. Either make the entire form auto-submit via a debounced `onChange` observer (removing the Filter button entirely, lowering interaction cost), or remove the hidden auto-submit from toggles so the user retains complete locus of control.

## 8. Gulf of Evaluation (Dead-End Empty States)

**Current State: Filtering to Zero**
When an admin applies a filter (e.g. searching for a User the system doesn't have) in `AdminUsersPage.tsx`, the system returns the `AdminEmptyState` component. It tells the user "No users match the current filters," but provides no action.
*   **Cognitive Violation (Dead End):** The user is marooned on a 0-result screen. To undo this, they must cognitively shift back up to the search bar, highlight their text, delete it, and manually click "Filter" again.
*   **Refactor Solution:** Provide an explicit "Clear all filters" CTA prop (which the component supports but is not being passed) to immediately reset the state. This maps directly to established error-recovery heuristics.

## 9. Conceptual Clutter in the Account Menu

**Current State: System vs. Identity Settings**
The `AccountMenu.tsx` crams Identity (Profile, Logout), Site Navigation (Admin routes), System Rendering (Type Scale, Contrast), and Developer Toggles (Simulation Mode) into a single popover.
*   **Cognitive Violation (Categorization Noise):** The menu is acting as a monolithic dumping ground rather than a focused identity hub. This overwhelms scanning patterns.
*   **Refactor Solution:** The upcoming Departmental Navigation Refactor (moving Admin links to the Drawer/Sidebar) will naturally evacuate ~8 links from this dropdown. The remaining Legibility and Simulation toggles should be visually demarcated (perhaps moving to an explicit "Settings" modal) to preserve the dropdown as a pure "Account" interface.

---

### Conclusion to Part 2

These deeper architectural flaws reveal that the system currently forces the user into high-friction micro-interactions. The lack of a mobile "Select All," unpredictable form submissions, and dead-end empty states are classic examples of forcing the human operator to conform to the machine's constraints.

The solutions detailed here (Debounced Auto-Submit, Empty State Hooks, and Mobile Bulk Selectors) are incredibly low-effort code changes that yield a massive compounding ROI on operational efficiency.
