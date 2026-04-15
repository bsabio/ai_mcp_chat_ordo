# Sprint 13 — Auth Forms & Accessibility Hardening

> Wire `AdminFormField` into auth and profile forms. Add `role="alert"` to
> all dynamic error containers. Fix `aria-describedby` linkage for field-
> level validation in register and profile. Add `role="status"` to save
> confirmation notices. Upgrade `AdminSearchBar` to support `/`-prefixed
> command navigation, closing the command palette gap.

---

## Why This Sprint Exists

This is the final hardening sprint closing the remaining WCAG 2.1 AA gaps
that are not covered by shared-component upgrades (Sprints 9–12).

Four forms — login, register, `ProfileSettingsPanel`, and the admin detail
edit forms — currently render dynamic errors or status messages without
ARIA live-region attributes. Screen readers never announce these messages
because the DOM changes happen silently. `role="alert"` forces an
immediate announcement for errors. `role="status"` provides a polite
announcement for non-urgent save confirmations.

The `AdminSearchBar` currently does entity-text search only. A `/` prefix
should switch it into command navigation mode (`/users` → navigate to
`/admin/users`), delivering the command palette UX without a separate
component.

---

## Deliverables

### D13.1 — Login page error `role="alert"`

**File:** `src/app/login/page.tsx`
**Defects closed:** UX-39

Change the error container from a plain `<div>` to a live-region:

```tsx
// Before
<div className="alert-error">{error}</div>

// After
<div role="alert" className="alert-error">{error}</div>
```

When the error is cleared (empty string / null), the element should still
be rendered but empty so the DOM node is stable and the browser does not
re-announce on content clear:

```tsx
<div role="alert" aria-live="assertive" className="alert-error">
  {error ?? ""}
</div>
```

### D13.2 — Register page error `role="alert"` + field `aria-describedby`

**File:** `src/app/register/page.tsx`
**Defects closed:** UX-40, UX-21

a. Apply the same `role="alert"` fix as D13.1 to the form-level error
   container.

b. For each field with a visible validation error, add:
   - `aria-invalid="true"` on the `<input>` element
   - `aria-describedby="{fieldId}-error"` on the `<input>` element
   - `id="{fieldId}-error"` on the error `<p>` element

c. Update the password field placeholder / help text to show the actual
   constraint: `"8–72 characters"` (the codebase validates both a minimum
   of 8 and a maximum of 72 — only the 8-char minimum is currently surfaced
   to the user).

### D13.3 — `ProfileSettingsPanel` `aria-describedby` + save notice

**File:** `src/components/profile/ProfileSettingsPanel.tsx`
**Defects closed:** UX-38 (wiring), UX-45

a. Link credential field help text to the input via `aria-describedby`.
   The help text `<p>` element must have an `id` that matches the
   `aria-describedby` value on the input:

   ```tsx
   <input aria-describedby="credential-description" ... />
   <p id="credential-description" className="text-xs text-muted">
     Your API key or password for this credential.
   </p>
   ```

b. Save state confirmation text (e.g., "Saved!") must use `role="status"`:

   ```tsx
   <p role="status" aria-live="polite" className="text-sm text-success">
     {saveStatus === "saved" ? "Settings saved." : ""}
   </p>
   ```

   The element should remain in the DOM even when empty to keep the live
   region stable.

### D13.4 — `AdminSearchBar` command navigation mode

**File:** `src/components/admin/AdminSearchBar.tsx`
**Defects closed:** UX-09 (partial — command mode), UX-24

When the user types a `/` as the first character of the search input,
switch the search bar into "command navigation" mode:

- The placeholder changes to `"Type a command... e.g. /users /leads"`
- The results dropdown switches from entity search results to a filtered
  list of admin navigation commands sourced from `admin-navigation.ts`
- Each command item shows the route label + keyboard hint (e.g., `U` for
  users)
- Selecting a command item (click or Enter) navigates to that route
  via `router.push()`
- Backspacing past the `/` to an empty input resets to entity search mode
- Commands are filtered by the text after `/` (e.g. `/us` → shows "Users")

The entity search mode and command navigation mode are mutually exclusive
based solely on whether the first character is `/`.

### D13.5 — `AdminDetailShell` edit form field `aria-describedby`

**File:** `src/components/admin/AdminDetailShell.tsx` (or affected detail pages)
**Defects closed:** UX-19 (wiring in detail forms)

For each detail-page edit form that uses inline inputs (not yet using
`AdminFormField`), wire `AdminFormField` (Sprint 8) as the wrapper. At
minimum, the following must be migrated:

- Users detail page edit form
- Leads detail page edit form

Each field must have: `label`, associated `id`, and `aria-describedby`
pointing to a description or error paragraph when present.

---

## File Inventory

### Modified Files

| File | Change |
|------|--------|
| `src/app/login/page.tsx` | Add `role="alert"` + `aria-live="assertive"` to error container (D13.1) |
| `src/app/register/page.tsx` | Add `role="alert"` to form error, add `aria-invalid` + `aria-describedby` to field errors, update password help text (D13.2) |
| `src/components/profile/ProfileSettingsPanel.tsx` | Wire `aria-describedby` for credential field, add `role="status"` to save notice (D13.3) |
| `src/components/admin/AdminSearchBar.tsx` | Add `/` command navigation mode (D13.4) |
| `src/app/admin/users/[id]/page.tsx` | Wrap edit form fields in `AdminFormField` (D13.5) |
| `src/app/admin/leads/[id]/page.tsx` | Wrap edit form fields in `AdminFormField` (D13.5) |

---

## Acceptance Criteria

- [ ] Login page error container has `role="alert"`
- [ ] Login page error container is always in DOM (empty string when no error)
- [ ] Register page form-level error has `role="alert"`
- [ ] Register page field errors have `aria-invalid="true"` on their inputs
- [ ] Register page field errors have `aria-describedby` linking to error paragraph
- [ ] Register password help text mentions both 8-char minimum AND 72-char maximum
- [ ] `ProfileSettingsPanel` credential input has `aria-describedby` pointing to help text `<p>`
- [ ] `ProfileSettingsPanel` save notice has `role="status"` + `aria-live="polite"`
- [ ] `AdminSearchBar` — typing `/` switches to command navigation mode
- [ ] `AdminSearchBar` — command mode shows admin nav items, not entity search results
- [ ] `AdminSearchBar` — selecting a command navigates to the corresponding route
- [ ] `AdminSearchBar` — clearing the `/` prefix returns to entity search mode
- [ ] Users and leads detail form fields wrapped in `AdminFormField`
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D13.1 Login role="alert" | 2 | 1 | 2 | 5 |
| D13.2 Register aria-invalid + describedby | 4 | 2 | 2 | 8 |
| D13.3 ProfileSettingsPanel aria-describedby + status | 3 | 1 | 2 | 6 |
| D13.4 AdminSearchBar command mode | 5 | 2 | 4 | 11 |
| D13.5 Detail form fields AdminFormField | 3 | 1 | 2 | 6 |
| **Total** | **17** | **7** | **12** | **36** |

---

## Dependencies

- Sprint 8 complete: `AdminFormField` must exist for D13.5
- `AdminSearchBar` (Sprint 7) must exist; this sprint upgrades it
- `admin-navigation.ts` must have `showInCommands: true` entries (Sprint 8 ensures this)
