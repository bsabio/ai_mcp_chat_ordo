# UX / UI Audit 05 — Form Fields & Controls

**Severity:** P1 High (missing labels, accessibility) · P2 Medium (help text, control type)  
**Scope:** All form controls in admin detail pages, filter forms, and public-facing forms

---

## UX-15 · P1 High — Multiple Forms Have No Visible `<label>` for Their Controls

**Files:** Several admin detail pages

### User detail — role `<select>` has no label

**File:** `src/app/admin/users/[id]/page.tsx`

```tsx
<form action={updateRoleAction} className="flex items-center gap-(--space-2)">
  <input type="hidden" name="userId" value={detail.user.id} />
  <select
    name="roleId"
    defaultValue={...}
    className="h-8 rounded-lg border ..."
  >
    {ROLE_OPTIONS.map((r) => <option...>)}
  </select>
  <button type="submit">Update role</button>
</form>
```

The `<select>` has no `<label>` element. A screen reader announces this as "Combo box, [current value]" with no context about what role means or what the select is for. The visual context ("Role" section heading) is an `<h2>`, not programmatically associated.

**Fix:**
```tsx
<label htmlFor="role-select" className="sr-only">Change user role</label>
<select id="role-select" name="roleId" ...>
```

### Lead detail — textarea for founder note has only a placeholder

**File:** `src/app/admin/leads/[id]/page.tsx`

```tsx
<textarea
  name="founderNote"
  defaultValue={r.founderNote ?? ""}
  placeholder="Add a founder note…"
/>
```

Placeholder text disappears when the user starts typing, and it is not equivalent to a label for accessibility purposes (WCAG 1.3.1, 2.4.6).

**Fix:**
```tsx
<label htmlFor="founder-note" className="text-xs font-medium text-foreground/60">
  Founder note
</label>
<textarea id="founder-note" name="founderNote" aria-describedby="founder-note-help" ... />
<p id="founder-note-help" className="text-xs text-foreground/40">
  Private notes visible only to admins. Not shown to the lead.
</p>
```

### Lead detail — follow-up date input has no label

```tsx
<input type="date" name="followUpDate" defaultValue={...} className="..." />
```

No visible label, no `aria-label`, no `htmlFor` association.

---

## UX-16 · P1 High — `AdminBrowseFilters` Has No Help Text Support

**File:** `src/components/admin/AdminBrowseFilters.tsx`

**Observed:**  
`FilterFieldConfig` interface currently:
```typescript
interface FilterFieldConfig {
  name: string;
  label: string;
  type: "search" | "select" | "toggle";
  options?: { value: string; label: string }[];
  placeholder?: string;
}
```

No `description` or `helpText` field. Every filter in the system (status, role, source, lane, toolName) has only a label — no explanation of what the field does, what values are valid, or what the filter effects are.

**Drupal-style pattern** (what the user requested): every form field should be a three-part unit:
```
[Label]
[Control]
[Help text — optional, muted, smaller]
```

**Recommendation:**  
Add `description?: string` to `FilterFieldConfig` and render it below the control:

```tsx
<label className="...">
  {field.label}
  <select ...>{...}</select>
  {field.description && (
    <span className="text-xs text-foreground/40">{field.description}</span>
  )}
</label>
```

Example help texts:
- Status filter: "Filter by current workflow state"
- Role filter: "Only show users with this permission level"
- Lane filter: "Only conversations routed to this intent lane"
- Tool filter: "Only jobs dispatched by this tool"

---

## UX-17 · P2 Medium — `AdminStatusCounts` Cards Are Not Interactive; Users Expect Them to Filter

**File:** `src/components/admin/AdminStatusCounts.tsx`

**Second-pass correction:**  
The original description of this defect was wrong. Source inspection shows that `AdminStatusCounts` renders plain `<div>` cards — they have **no click handler, no `<a>` tag, and no URL interaction**. They are purely display elements showing aggregate counts. They do not compete with the `<select>` filter because they are not filters at all.

**Actual problem:**  
The visual design of the count pills (e.g. "Active 12", "Archived 4") uses the same styling as pill-shaped interactive controls. In Gmail, Jira, Zendesk, and every comparable admin product, count badges of this style act as single-click filter shortcuts. Users will inevitably try to click them and receive no feedback.

**Observed:**
```tsx
// AdminStatusCounts renders:
<div className="rounded-full ...">
  <span>{count.label}</span>
  <span>{count.value}</span>
</div>
// No `<a>`, no `role`, no `onClick` — purely display
```

**Recommendation:**  
Convert the count cards to `<a>` links that apply the corresponding filter param:
```tsx
<a
  href={`?status=${count.value}`}
  className="rounded-full border px-3 py-1.5 text-xs ... hover:bg-foreground/5"
  aria-current={activeFilter === count.value ? "true" : undefined}
>
  {count.label} <span className="font-semibold">{count.count}</span>
</a>
```
This also ensures adequate touch targets (add `min-h-[44px]`) and gives screen readers a meaningful label per UX-29 / UX-42.

---

## UX-18 · P2 Medium — Attribution Date Range Form Is Bare HTML Without Consistent Styling

**File:** `src/app/admin/journal/attribution/page.tsx`

**Observed:**
```tsx
<form method="get" className="flex flex-wrap items-end gap-(--space-cluster-default)">
  <label className="grid gap-(--space-1) text-sm text-foreground/66">
    <span className="font-medium text-foreground/72">After</span>
    <input type="date" name="after" defaultValue={afterDate} className="rounded-2xl border ..." />
  </label>
  ...
  <button type="submit">Filter</button>
</form>
```

This form uses raw `<label>` + `<input>` markup that duplicates what `AdminBrowseFilters` already does. It should be migrated to use `AdminBrowseFilters` with `type: "date"` support, so all filter forms in the admin shell are visually and semantically consistent.

**Gap in `AdminBrowseFilters`:** The component does not support `type: "date"` input fields. Add this to the `FilterFieldConfig` union.

---

## UX-19 · P2 Medium — Prompt Version Auth Textarea Has No Label or Help Text

**File:** `src/app/admin/prompts/[role]/[promptType]/page.tsx`

**Observed:**  
The "Create New Version" form contains a large `<textarea>` for the prompt content. It has no `<label>`, no visible field title, and no guidance on what format the prompt should take.

**Recommendation:**  
- Add `<label htmlFor="prompt-content">Prompt content</label>` 
- Add help text: "Use Markdown. Supports template variables: {{userName}}, {{lane}}, {{context}}."
- Consider adding a character/token count display (LLM prompts have token budgets).

---

## UX-20 · P2 Medium — Toggle Controls Are Visual Only; Not Radio/Checkbox Semantically

**File:** `src/components/admin/AdminBrowseFilters.tsx` (toggle type)

**Observed:**
```tsx
// Toggle renders as visually styled labels with hidden checkboxes
<label className={`flex cursor-pointer items-center rounded-full border px-3 py-1 ...`}>
  <input type="radio" name={field.name} value={opt.value} className="sr-only" />
  {opt.label}
</label>
```

The toggle field renders correctly as radio inputs (visually hidden, programmatically present). This is actually acceptable from an accessibility standpoint. However, the `<fieldset>` / `<legend>` wrapper makes the group semantics correct.

**Minor issue:** The auto-submit behavior (if any) on radio change is not implemented — user still has to find and click the "Submit" / "Filter" button. Adding `onChange={() => form.requestSubmit()}` on each radio would make the filter pills behave as immediate filters (matching the behavior of `AdminStatusCounts` links).

---

## UX-21 · P3 Low — Follow-Up Date Picker Has No Min/Max Constraints

**File:** `src/app/admin/leads/[id]/page.tsx`

```tsx
<input type="date" name="followUpDate" defaultValue={...} />
```

No `min` attribute. The operator can accidentally set a follow-up date in 1970. A reasonable minimum would be today's date. Max is optional.

**Recommendation:**
```tsx
<input
  type="date"
  name="followUpDate"
  defaultValue={...}
  min={new Date().toISOString().slice(0, 10)}
/>
```

---

## Consistent Form Field Pattern (Proposed Standard)

Every form field across the admin platform should follow this three-part structure (Drupal-style):

```tsx
// Proposed shared AdminFormField component
function AdminFormField({
  label,
  name,
  description,
  error,
  children,
}: {
  label: string;
  name: string;       // for htmlFor
  description?: string;
  error?: string;
  children: React.ReactNode;  // the actual <input>, <select>, <textarea>
}) {
  return (
    <div className="grid gap-(--space-1)">
      <label
        htmlFor={name}
        className="text-xs font-medium text-foreground/70"
      >
        {label}
      </label>
      {children}
      {description && (
        <p id={`${name}-desc`} className="text-xs text-foreground/40">
          {description}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

This component enforces: label → control → description → error — the same order Drupal, Salesforce, and every mature form framework uses.

---

## UX-37 · P3 Low — Register Page Does Not Communicate Password Maximum Length

**File:** `src/app/register/page.tsx`

**Observed:**  
The registration form validates that `password.length <= 72` but shows only:
```tsx
<input
  type="password"
  placeholder="8+ characters"
  ...
/>
```
The placeholder says "8+ characters" and does not mention the 72-character upper limit. A user with a password manager that auto-generates long passphrases (e.g. 128 chars) will receive a validation error ("Password must be at most 72 characters") with no prior warning.

**Note:** The 72-char limit is a known bcrypt limitation (bcrypt silently truncates inputs longer than 72 bytes). This constraint should be surfaced rather than hidden.

**Recommendation:**  
Change placeholder to "8–72 characters" and add help text below the field:
```tsx
<p className="field-hint text-xs text-foreground/40">
  Between 8 and 72 characters.
</p>
```

---

## UX-38 · P2 Medium — ProfileSettingsPanel Help Text Not Programmatically Linked to Input

**File:** `src/components/profile/ProfileSettingsPanel.tsx`

**Observed:**  
The Credential field has visible help text below the input, but it is not associated with the input via `aria-describedby`:

```tsx
<label htmlFor="profile-credential" className="form-label">Credential</label>
<input
  id="profile-credential"
  value={credential}
  onChange={...}
  className="input-field"
  placeholder="Enterprise AI practitioner"
/>
<p className="text-xs leading-5 text-foreground/45">
  This appears in referral-aware greetings when your referral code is enabled.
</p>
```

A screen reader announces "Credential, text input" with no description. The help paragraph is invisible to assistive technology.

**Fix:**
```tsx
<input
  id="profile-credential"
  aria-describedby="profile-credential-desc"
  ...
/>
<p id="profile-credential-desc" className="text-xs leading-5 text-foreground/45">
  This appears in referral-aware greetings when your referral code is enabled.
</p>
```

The same `aria-describedby` pattern should be applied wherever the proposed `AdminFormField` standard (above) is used, ensuring all help text is programmatically associated with its control.
