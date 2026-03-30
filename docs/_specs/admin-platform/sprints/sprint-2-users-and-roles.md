# Sprint 2 — Users & Roles

> First entity to use the BREAD framework. Build the Users admin surface
> with Browse + Read + Edit. Role management, affiliate toggle, referral
> history, and signup event emission.

---

## Why This Sprint Exists

The spec's core premise is "People over dashboards." The Users page is
currently a static placeholder card. The `users` table has 10 columns
(with migrations adding `password_hash`, `created_at`, `affiliate_enabled`,
`referral_code`, `credential`), plus linked `user_roles`, `user_preferences`,
and `referrals` tables — all invisible to the admin.

This is the simplest entity to build first because:
- The data layer mostly exists (`UserDataMapper`, `UserRepository`)
- No workflow state machine (roles are direct assignment, not transitions)
- It validates the BREAD framework from Sprint 1 on a real entity

---

## Deliverables

### D2.1 — Extend user data layer

**File:** `src/adapters/UserDataMapper.ts` (extend existing)

Add admin-specific query methods to the existing `UserDataMapper`:

```typescript
interface UserAdminQueries {
  listForAdmin(filters: UserAdminFilters): Promise<UserAdminRecord[]>;
  countForAdmin(filters: UserAdminFilters): Promise<number>;
  countByRole(filters: Omit<UserAdminFilters, 'role'>): Promise<Record<RoleName, number>>;
  findByIdForAdmin(userId: string): Promise<UserAdminDetailRecord | null>;
}
```

Where `UserAdminRecord` includes pre-joined role names, referral code,
created_at, and conversation count (via subquery).

Where `UserAdminDetailRecord` adds user_preferences, referral history,
and affiliate status.

### D2.2 — User admin interactor

**File:** `src/core/use-cases/UserAdminInteractor.ts`

```typescript
class UserAdminInteractor implements UseCase<UserAdminRequest, UserAdminResponse> {
  constructor(
    private userRepo: UserRepository,
    private eventRecorder: ConversationEventRecorder,
  ) {}

  async updateRole(userId: string, roleId: string, adminUserId: string): Promise<void>;
  async toggleAffiliate(userId: string, enabled: boolean): Promise<void>;
}
```

Role changes validated against known role IDs. Emits an event via
`eventRecorder` for audit trail.

### D2.3 — User admin route helpers

**File:** `src/lib/admin/users/admin-users-routes.ts`

Using the shared `createAdminEntityRoutes("users")` factory:

```typescript
export const userRoutes = createAdminEntityRoutes("users");
// userRoutes.list()   → "/admin/users"
// userRoutes.detail(id) → "/admin/users/{id}"
```

### D2.4 — User admin loaders

**File:** `src/lib/admin/users/admin-users.ts`

Following the Journal loader pattern:

```typescript
export async function loadAdminUserList(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminUserListViewModel>;

export async function loadAdminUserDetail(
  userId: string,
): Promise<AdminUserDetailViewModel>;
```

**List view model:**
- `filters`: parsed search/role filter state
- `counts`: per-role breakdown (admin, staff, apprentice, authenticated, anonymous)
- `users[]`: pre-computed entries with roleLabel, createdLabel, detailHref

**Detail view model:**
- `user`: full profile with roles, preferences, affiliate status
- `referrals[]`: referral history with conversion status
- `conversationCount`: number
- `recentConversations[]`: last 5 conversations (id, title, lane, updatedAt)

### D2.5 — User admin actions

**File:** `src/lib/admin/users/admin-users-actions.ts`

```typescript
export function createUserAdminInteractor(): UserAdminInteractor;
export function parseRoleForm(formData: FormData): { roleId: string };
export function parseAffiliateForm(formData: FormData): { enabled: boolean };
export function parseBulkRoleForm(formData: FormData): { ids: string[]; roleId: string };
```

### D2.6 — Users Browse page

**File:** `src/app/admin/users/page.tsx`

Replaces the current stub. Standard BREAD Browse pattern:

1. `requireAdminPageAccess()`
2. Parse searchParams → role filter + search query
3. `loadAdminUserList(searchParams)`
4. Render: `AdminSection` → search/role filter form (GET) → role count cards → user table

**Table columns:** Name, Email, Role (badge), Signed up, Referral code
**Selectable:** `AdminDataTable` with `selectable` prop enabled
**Bulk actions:** Change role (via `AdminBulkActionBar`)
**Mobile:** Cards instead of table rows (responsive via `AdminDataTable`)
**Empty state:** "No users yet — share your referral link to get started."

### D2.7 — User detail page

**File:** `src/app/admin/users/[id]/page.tsx`

Standard BREAD detail pattern:

1. `requireAdminPageAccess()`
2. `loadAdminUserDetail(params.id)` — 404 if missing
3. Render: `AdminDetailShell` with main + sidebar

**Main panel:**
- Profile card: name, email, created date
- Role management: current role badge + dropdown to change (inline server action)
- Affiliate toggle: switch with referral code display

**Sidebar panel:**
- Conversation summary: count + last 5 with links
- Referral history: list with scanned_at, converted_at, outcome
- User preferences: key-value list (read-only)

**Inline server actions:**
- `updateRoleAction(formData)` → change role + revalidate
- `toggleAffiliateAction(formData)` → toggle + revalidate

### D2.8 — Signup event emission

**File:** `src/core/use-cases/RegisterUserInteractor.ts` (modify)

After successful registration, emit a `user_signup` event:

```typescript
await this.eventRecorder.recordEvent("user_signup", {
  userId: newUser.id,
  email: newUser.email,
  name: newUser.name,
});
```

This event will be consumed by the notification system (Sprint 6).

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/core/use-cases/UserAdminInteractor.ts` | Use case |
| `src/lib/admin/users/admin-users.ts` | Loaders |
| `src/lib/admin/users/admin-users-actions.ts` | Action helpers |
| `src/lib/admin/users/admin-users-routes.ts` | Route helpers |
| `src/app/admin/users/[id]/page.tsx` | Detail page |

### Modified files

| File | Change |
|------|--------|
| `src/adapters/UserDataMapper.ts` | Add admin query methods |
| `src/app/admin/users/page.tsx` | Replace stub with Browse |
| `src/core/use-cases/RegisterUserInteractor.ts` | Emit signup event |

---

## Acceptance Criteria

- [ ] Users Browse page shows real user data with role badges
- [ ] Role filter works (URL-driven GET filter)
- [ ] Search by name/email works
- [ ] Role count cards show per-role breakdown
- [ ] User detail page shows full profile
- [ ] Role can be changed via inline form
- [ ] Affiliate can be toggled
- [ ] Referral history displays on detail page
- [ ] User preferences display on detail page (read-only)
- [ ] Signup events emitted on new registration
- [ ] Mobile layout: cards instead of table
- [ ] Bulk role change works (select multiple → change role)
- [ ] Empty state shown when no users match filters
- [ ] All loaders return view models (no raw entities in pages)
- [ ] All existing tests pass

---

## Estimated Tests

| Area | Count |
|------|-------|
| UserDataMapper admin queries | 4 |
| UserAdminInteractor (role change, affiliate) | 3 |
| User list loader (filters, counts, mapping) | 4 |
| User detail loader | 2 |
| Users Browse page rendering | 3 |
| User detail page rendering | 3 |
| Bulk role change action | 2 |
| Signup event emission | 2 |
| **Total** | **~23** |

---

## Dependencies

- Sprint 1 (BREAD framework, shared modules, shell fixes)
