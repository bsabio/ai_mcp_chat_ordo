# UX / UI Audit 06 — Accessibility & Usability

**Severity:** P1 High · P2 Medium · P3 Low  
**Scope:** WCAG 2.1 AA compliance, keyboard navigation, focus management, mobile density, screen-reader ergonomics

---

## UX-22 · P1 High — No Skip Navigation Link on Any Page

**Files:** `src/app/layout.tsx`, `src/app/admin/layout.tsx`

**Observed:**  
Neither the public layout nor the admin layout provides a skip-to-main-content link. A screen-reader or keyboard-only user navigating to `/admin/jobs` must Tab through the entire top navigation rail (brand + account menu) before reaching any content.

**WCAG reference:** 2.4.1 Bypass Blocks (Level A)

**Recommendation:**  
At the very top of `<body>` in both layouts, add:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-foreground/30"
>
  Skip to main content
</a>
```
And add `id="main-content"` to the `<main>` element.

---

## UX-23 · P1 High — Focus Is Not Trapped in Admin Drawer When Open (Partial)

**File:** `src/components/admin/AdminDrawer.tsx`

**Observed:**  
`AdminDrawer` implements a custom focus trap using a `keydown` listener that intercepts Tab to cycle focus within the drawer. However:
1. The drawer is being removed per UX-01, so this becomes moot if that change is implemented.
2. If the drawer is retained for any reason, the focus trap uses `querySelector` timing with `setTimeout(50ms)` which is fragile. A ResizeObserver or `aria-modal="true"` + browser-native focus scoping would be more robust.

**Status:** Superseded by UX-01 (remove the drawer). Mark as resolved when UX-01 is implemented.

---

## UX-24 · P2 Medium — AdminSearchBar Dropdown is Not a Proper ARIA Combobox

**File:** `src/components/admin/AdminSearchBar.tsx`

**Observed:**  
The search input opens a results dropdown when query length ≥ 2. The results are rendered as a `<ul>` but:
- The `<input>` has no `role="combobox"` or `aria-controls`
- The `<ul>` has no `role="listbox"`
- Results have no `role="option"`
- `aria-expanded` is not set on the input
- Arrow keys do not move through results (noted in UX-10)

A screen-reader user typing in the search box receives no announcement that results are available, no way to navigate them, and no confirmation when an item is selected.

**WCAG reference:** 4.1.2 Name, Role, Value (Level A) | ARIA 1.2 `combobox` pattern

**Recommendation:**  
Upgrade to a proper ARIA combobox:
```tsx
<input
  role="combobox"
  aria-autocomplete="list"
  aria-expanded={open}
  aria-controls="admin-search-listbox"
  aria-activedescendant={selectedId ?? undefined}
  ...
/>
<ul
  id="admin-search-listbox"
  role="listbox"
  aria-label="Search results"
>
  {results.map((r, i) => (
    <li
      key={r.id}
      id={`result-${i}`}
      role="option"
      aria-selected={selectedId === `result-${i}`}
    >
      ...
    </li>
  ))}
</ul>
```

---

## UX-25 · P2 Medium — `<main>` in Admin Layout Has No `id` Attribute for Skip Link

**File:** `src/app/admin/layout.tsx`

The admin layout `<main>` element:
```tsx
<main
  className="jobs-page-shell ..."
  data-admin-scroll-region="true"
>
```
Has no `id` attribute. This prevents the skip-to-content link (UX-22) from working.

**Fix:** Add `id="main-content"` to this element.

---

## UX-26 · P2 Medium — AdminDataTable Has No `<caption>` or `aria-label`

**File:** `src/components/admin/AdminDataTable.tsx`

**Observed:**  
`<table>` elements have no `<caption>` or `aria-label`. A screen reader announces this as simply "table, N rows" with no context about what the table represents ("Jobs table", "Users table", etc.).

**WCAG reference:** 1.3.1 Info and Relationships (Level A) — tables should have a name.

**Recommendation:**  
Add an `aria-label` derived from the page context, or add `ariaLabel` as a prop:
```tsx
<table aria-label={ariaLabel ?? "Data table"}>
```

---

## UX-27 · ~~P2 Medium~~ RESOLVED — Bulk Action Checkboxes Already Have `aria-label`

**File:** `src/components/admin/AdminDataTable.tsx`

**Second-pass review:**  
Source inspection confirms that `AdminDataTable` already implements `aria-label` on every selection checkbox:

```tsx
// Select-all checkbox:
<input
  type="checkbox"
  checked={selectedIds.size === rows.length}
  onChange={toggleAll}
  aria-label="Select all rows"
/>

// Per-row checkboxes:
<input
  type="checkbox"
  checked={checked}
  onChange={() => toggleRow(id)}
  aria-label={`Select row ${id}`}
/>
```

**Status: Resolved.** No action required. The per-row label uses the row `id`; a future improvement would be to use a human-readable field (e.g. `name` or `title`) instead of the UUID, but WCAG 1.3.1 is already satisfied.

---

## UX-28 · P2 Medium — Conversations Takeover Form Has No Confirmation Dialog

**Files:** `src/app/admin/conversations/[id]/page.tsx`, `src/components/admin/AdminWorkflowBar.tsx`

**Second-pass correction:**  
A previous version of this defect incorrectly stated that `AdminWorkflowBar` has no confirmation. Source inspection shows that `AdminWorkflowBar` **already implements a two-step inline confirmation** using a `confirming` state: the first click sets `confirming = true` and shows "Confirm / Cancel", and only the second click on "Confirm" submits the form.

**Actual remaining issue:**  
The conversations detail page has **two unconfirmed server action forms**: "Take Over" and "Return to AI". Both use a plain `<form action={serverAction}>` with a single `<button type="submit">`, with no intermediate confirmation step.

```tsx
// src/app/admin/conversations/[id]/page.tsx
<form action={takeOverConversationAction} className="flex items-center justify-between">
  <input type="hidden" name="id" value={conv.id} />
  <span>Conversation is in AI mode.</span>
  <button type="submit" ...>Take Over</button>  {/* fires immediately on click */}
</form>
```

Taking over a conversation switches the conversation to human mode, instantly silencing the AI for a live user. Accidentally clicking "Take Over" on the wrong conversation is hard to undo gracefully.

**Recommendation:**  
Apply the same `confirming` state pattern that `AdminWorkflowBar` uses to the takeover/hand-back buttons on the conversations detail page. Alternatively, extract a shared `ConfirmButton` wrapper component.

---

## UX-29 · P2 Medium — Mobile Touch Targets for Admin Count Pills (Pending UX-17 Fix)

**File:** `src/components/admin/AdminStatusCounts.tsx`

**Second-pass correction:**  
The original text said count pills "link to filtered views" and cited touch target size. Source inspection confirmed that `AdminStatusCounts` renders non-interactive `<div>` elements with no `<a>`, `<button>`, or click handler. Touch target sizing is **not applicable to non-interactive elements**.

**Revised finding:**  
Once UX-17 is addressed (converting count cards to filter `<a>` links), the touch target concern applies. At that point, the link padding must meet `min-h-[44px]` per WCAG 2.5.5 (Target Size, Level AA) and Apple HIG.

**Action:**  
Block on UX-17. When count cards become `<a>` links, add `min-h-[44px] flex items-center` to the pill container and ensure `px-4 py-2.5` minimum padding.

---

## UX-30 · P3 Low — No `loading` State on Admin Forms After Submission

**Files:** All admin detail pages with `<form action={serverAction}>`

**Observed:**  
Form submissions use Next.js Server Actions. Between submission and response, there is no loading indicator — the UI appears frozen. On slow connections, this leads to double-submits (user clicks again because nothing happened).

**Recommendation:**  
Add `useFormStatus()` (React 19 / Next.js 15+) to action buttons to show a loading state:
```tsx
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}
```

---

## UX-31 · P3 Low — Detail Page `<dl>` Items Overflow on Narrow Screens

**Files:** `src/app/admin/users/[id]/page.tsx`, `src/app/admin/jobs/[id]/page.tsx`

**Observed:**  
Many `<dt>/<dd>` pairs use `flex justify-between`. On mobile, if the `<dd>` value is long (e.g. a UUID, an email address), it overflows or wraps in unexpected ways rather than truncating cleanly.

**Recommendation:**  
Add `min-w-0 truncate` to `<dd>` elements wherever the value could be long (IDs, emails, URLs), or switch to a stacked layout on narrow viewports.

---

## UX-39 · P1 High — Login and Register Error Divs Have No `role="alert"`

**Files:** `src/app/login/page.tsx`, `src/app/register/page.tsx`

**Observed:**  
Both forms render error messages as `<div className="alert-error">` with no ARIA live region:

```tsx
// login/page.tsx
{error && (
  <div className="alert-error">
    {error}
  </div>
)}

// register/page.tsx
{generalError && (
  <div className="alert-error">
    {generalError}
  </div>
)}
```

When a login or registration fails, the error text appears in the DOM dynamically. A screen reader only announces dynamic content changes if the element has `role="alert"` (or `aria-live="assertive"`). Without it, a screen-reader user submitting incorrect credentials receives no feedback.

**WCAG reference:** 4.1.3 Status Messages (Level AA)

**Fix:**
```tsx
{error && (
  <div role="alert" className="alert-error">
    {error}
  </div>
)}
```

---

## UX-40 · P2 Medium — Register Field-Level Errors Not Linked to Inputs via `aria-describedby`

**File:** `src/app/register/page.tsx`

**Observed:**  
Field-level validation errors are rendered as `<p className="field-error">` immediately below the corresponding input, but they are not programmatically associated with the input:

```tsx
<input
  id="email"
  type="email"
  className={`input-field ${fieldErrors.email ? "ring-2 ring-red-500/50" : ""}`}
  ...
/>
{fieldErrors.email && (
  <p className="field-error">{fieldErrors.email}</p>  {/* not linked to input */
)}
```

A screen reader announces "Email, email input, required" with no indication that "This email is already registered" is associated with that field.

**WCAG reference:** 1.3.1 Info and Relationships (Level A)

**Fix:**
```tsx
<input
  id="email"
  type="email"
  aria-describedby={fieldErrors.email ? "email-error" : undefined}
  aria-invalid={fieldErrors.email ? "true" : undefined}
  className={`input-field ${fieldErrors.email ? "ring-2 ring-red-500/50" : ""}`}
  ...
/>
{fieldErrors.email && (
  <p id="email-error" role="alert" className="field-error">{fieldErrors.email}</p>
)}
```
Apply to all three fields: `name`, `email`, `password`.

---

## UX-41 · P2 Medium — `AdminDataTable` Uses `role="rowheader"` on a `<span>` Inside `<td>`

**File:** `src/components/admin/AdminDataTable.tsx`

**Observed:**  
The first cell of each data row wraps its content in a `<span>` with `role="rowheader"`:

```tsx
{ci === 0 ? (
  <span role="rowheader">{renderCell(col, row)}</span>
) : (
  renderCell(col, row)
)}
```

**Problem:**  
`role="rowheader"` is a valid ARIA role, but applying it to a `<span>` inside a `<td>` creates a redundant element with ambiguous table structure. The semantically correct approach is to use `<th scope="row">` as the actual cell element for row headers. The current implementation nests a row-header role inside a data-cell, which may confuse AT rendering modes.

**Fix:**  
Conditionally render `<th scope="row">` instead of `<td>` for the first column:
```tsx
{ci === 0 ? (
  <th
    scope="row"
    className="px-(--space-3) py-2 text-foreground/80 font-normal"
  >
    {renderCell(col, row)}
  </th>
) : (
  <td className="px-(--space-3) py-2 text-foreground/80">
    {renderCell(col, row)}
  </td>
)}
```

---

## UX-42 · P2 Medium — Journal Admin Table `<th>` Elements Missing `scope="col"`

**File:** `src/app/admin/journal/page.tsx`

**Observed:**  
The journal admin list page defines its own raw `<table>` with column headers, but the `<th>` elements have no `scope` attribute:

```tsx
<thead>
  <tr className="border-b ...">
    <th className="px-...">Title</th>      {/* ← no scope="col" */}
    <th className="px-...">Slug</th>
    <th className="px-...">Section</th>
    <th className="px-...">Workflow</th>
    <th className="px-...">Updated</th>
    <th className="px-...">Actions</th>
  </tr>
</thead>
```

Without `scope="col"`, assistive technologies cannot definitively associate header cells with data cells, particularly for users navigating in "table reading mode."

**WCAG reference:** 1.3.1 Info and Relationships (Level A)

**Fix:** Add `scope="col"` to every `<th>` in the table header. Or migrate to `AdminDataTable` (UX-36) which already handles this.

---

## UX-43 · P2 Medium — Journal Table Action Links Provide No Row Context

**File:** `src/app/admin/journal/page.tsx`

**Observed:**  
Every row in the journal list renders two action links with no contextual text:

```tsx
<a href={post.previewHref} className="text-foreground underline ...">Preview</a>
<a href={post.detailHref} className="text-foreground underline ...">Manage</a>
```

A screen reader user navigating by links encounters a list of: "Preview, Preview, Preview…" and "Manage, Manage, Manage…" with no way to distinguish which post each link refers to.

**WCAG reference:** 2.4.4 Link Purpose (In Context) (Level A); 2.4.9 Link Purpose (Link Only) (Level AAA)

**Fix:** Either add visually-hidden text:
```tsx
<a href={post.previewHref}>
  Preview<span className="sr-only"> {post.title}</span>
</a>
<a href={post.detailHref}>
  Manage<span className="sr-only"> {post.title}</span>
</a>
```
Or use `aria-label`:
```tsx
<a href={post.previewHref} aria-label={`Preview: ${post.title}`}>Preview</a>
<a href={post.detailHref} aria-label={`Manage: ${post.title}`}>Manage</a>
```

---

## UX-44 · P2 Medium — `AdminDetailShell` Sidebar `<aside>` Has No Accessible Label

**File:** `src/components/admin/AdminDetailShell.tsx`

**Observed:**  
`AdminDetailShell` renders a two-column layout with an `<aside>` element for the sidebar:

```tsx
<aside className="grid ...">
  {sidebar}
</aside>
```

The `<aside>` has no `aria-label` or `aria-labelledby`. Screen readers announce it as "complementary" (the implicit label for `<aside>`), giving the user no clue what the sidebar contains ("Timeline", "Session info", "Stats", etc.).

**WCAG reference:** 4.1.2 Name, Role, Value (Level A) — landmark regions should have accessible names when multiple are present.

**Fix:**  
Either add a static label if the sidebar content is predictable:
```tsx
<aside aria-label="Record details" className="grid ...">
```
Or accept a `sidebarLabel` prop for callers to pass a contextual label:
```tsx
<aside aria-label={sidebarLabel ?? "Details"} className="grid ...">
```

---

## UX-45 · P2 Medium — Form Save/Error Notices Not Announced by Screen Readers

**Files:** `src/components/profile/ProfileSettingsPanel.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`

**Observed:**  
After a form submission, success and error messages are rendered into the DOM but have no live region announcing them:

```tsx
// ProfileSettingsPanel — save notice
{saveState.kind !== "idle" ? (
  <div className={getProfileNoticeClassName(saveState.kind)} data-profile-notice={saveState.kind}>
    {saveState.message}  {/* sighted user sees it; AT user does not hear it */}
  </div>
) : null}
```

The CSS class `profile-success-notice` and `alert-error` provide visual distinction, but without `role="status"` (for success) or `role="alert"` (for errors), screen readers receive no announcement when the submission result appears.

**WCAG reference:** 4.1.3 Status Messages (Level AA)

**Fix:**
```tsx
{saveState.kind !== "idle" ? (
  <div
    role={saveState.kind === "error" ? "alert" : "status"}
    aria-live={saveState.kind === "error" ? "assertive" : "polite"}
    className={getProfileNoticeClassName(saveState.kind)}
  >
    {saveState.message}
  </div>
) : null}
```
The same pattern applies to `pushState` notices in `ProfileSettingsPanel`.

---

## Accessibility Quick-Wins Summary

| Item | Fix complexity | WCAG level |
|------|---------------|------------|
| Skip link | 10 min | A |
| `id="main-content"` on `<main>` | 2 min | A |
| Table `aria-label` props | 15 min | A |
| `role="alert"` on login/register errors | 10 min | AA |
| `aria-describedby` on register field errors | 15 min | A |
| ARIA combobox on search | 60–90 min | A |
| Form label associations | 30 min | A |
| Form help text `aria-describedby` | 20 min | AA |
| Loading state on submit buttons | 45 min | — |
| Touch target sizing (after UX-17 fix) | 15 min | AA |
| Journal table `scope="col"` | 5 min | A |
| Journal action link context | 10 min | A |
| `AdminDetailShell` aside `aria-label` | 5 min | A |
| `AdminDataTable` `<th scope="row">` | 15 min | A |
| Profile save state `role="status"` | 10 min | AA |
