# Sprint 6 — Notifications & Polish

> Add the notification dispatch system, wire admin signal evaluation,
> and polish every BREAD surface for production density, empty states,
> accessibility, and mobile edge cases.

---

## Why This Sprint Exists

By Sprint 5 all admin entities have BREAD surfaces. This sprint adds the
missing operational layer (notifications) and hardens everything for
production:

1. **Notifications** — The `NotificationDispatcher` concept exists in the
   spec but has no implementation. Admin signals should trigger alerts
   (in-chat and web push) based on evaluator rules.

2. **Polish** — Every new surface needs empty state treatment, density
   audit, keyboard navigation, responsive edge cases, and accessibility
   review.

---

## Deliverables

### D6.1 — NotificationChannel interface

**File:** `src/core/entities/NotificationChannel.ts`

```typescript
export interface NotificationChannel {
  send(notification: AdminNotification): Promise<void>;
}

export interface AdminNotification {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  actionUrl?: string;
  signalId?: string;
}
```

### D6.2 — ChatNotificationChannel

**File:** `src/adapters/ChatNotificationChannel.ts`

Sends a notification as a system message into the admin's active
conversation via the existing `MessageDataMapper.create()`. If no active
conversation exists, the notification is silently dropped (chat is
optional).

### D6.3 — PushNotificationChannel

**File:** `src/adapters/PushNotificationChannel.ts`

Sends a web push notification using the existing VAPID infrastructure.
The `push-worker.js` service worker is already in `public/`. This
channel:
- Looks up the admin user's push subscription
- Sends via `web-push` library
- Gracefully handles expired subscriptions

### D6.4 — NotificationDispatcher

**File:** `src/lib/admin/notifications/notification-dispatcher.ts`

Composites multiple channels:

```typescript
export class NotificationDispatcher {
  constructor(private readonly channels: NotificationChannel[]) {}

  async dispatch(notification: AdminNotification): Promise<void> {
    await Promise.allSettled(
      this.channels.map(ch => ch.send(notification)),
    );
  }
}
```

### D6.5 — AdminSignalEvaluator

**File:** `src/lib/admin/notifications/admin-signal-evaluator.ts`

Evaluates operator signal blocks against threshold rules and dispatches
notifications when conditions are met:

```typescript
export interface SignalRule {
  signalId: string;
  condition: (data: OperatorSignalPayload<unknown>) => boolean;
  notification: Omit<AdminNotification, "signalId">;
}

export class AdminSignalEvaluator {
  constructor(
    private readonly rules: SignalRule[],
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async evaluate(signals: OperatorSignalPayload<unknown>[]): Promise<void>;
}
```

**Default rules:**
- Lead queue > 5 uncontacted → warning
- Failed jobs > 3 in last hour → critical
- Consultation pending > 48 hours → warning
- Health status degraded → critical
- Follow-up overdue > 24 hours → warning
- Follow-up overdue > 72 hours → critical

### D6.6 — Volume control

**File:** `src/lib/admin/notifications/notification-preferences.ts`

Prevents notification fatigue:

```typescript
export interface NotificationPreferences {
  pushEnabled: boolean;
  chatEnabled: boolean;
  quietHoursStart?: string;  // HH:MM
  quietHoursEnd?: string;
  cooldownMinutes: number;   // Min gap between same-signal alerts
}
```

Preferences stored in the `user_preferences` table (already exists).
The dispatcher checks preferences before sending.

### D6.7 — Empty states for all BREAD surfaces

Every Browse page must handle the zero-results case gracefully. Add
contextual empty state messages:

| Surface | Empty Message |
|---------|---------------|
| Users | "No registered users yet" |
| Leads | "No leads yet — the AI concierge captures them during conversations" |
| Consultations | "No consultation requests submitted" |
| Deals | "No deals created — deals are generated from qualified leads" |
| Training | "No training paths assessed" |
| Journal | (already has empty state) |
| Prompts | "System prompts seeded on first run — edit versions above" |
| Conversations | "No conversations recorded" |
| Jobs | "No deferred jobs — jobs are created when the AI runs background tasks" |

Use the shared `AdminEmptyState` component from Sprint 1.

### D6.8 — Density audit

Verify all admin surfaces respect the density control system:

- `[data-density="compact"]` — Tighter spacing, smaller text
- `[data-density="normal"]` — Default
- `[data-density="relaxed"]` — More padding

Check that:
- All spacing uses semantic tokens (`--space-stack-*`, `--space-inset-*`)
- No hardcoded pixel values in new components
- Table rows, cards, and form fields respond to density changes
- The density toggle in user preferences actually affects all new pages

### D6.9 — Mobile responsive audit

Test and fix all new BREAD surfaces at mobile breakpoints:

- [ ] Tables collapse to card view below `640px`
- [ ] Filter bars stack vertically on mobile
- [ ] AdminDrawer (hamburger) works on all pages
- [ ] Detail page sidebar stacks below main on mobile
- [ ] Pipeline tab bar scrolls horizontally if needed
- [ ] Form inputs are full-width on mobile
- [ ] Touch targets ≥ 44px

### D6.10 — Accessibility audit

- [ ] All interactive elements have visible focus indicators (`focus-ring`)
- [ ] Form labels associated with inputs
- [ ] Status badges have `aria-label` for screen readers
- [ ] Data tables use `<th scope="col">` and `<th scope="row">`
- [ ] Tab navigation works through all filter/table/action sequences
- [ ] Color is not the only indicator of status (icons + text + color)
- [ ] AdminDrawer traps focus when open
- [ ] Escape key closes drawers and modals

### D6.11 — Error boundary integration

Each admin entity route segment should have its own `error.tsx`:

**Files:**
- `src/app/admin/users/error.tsx`
- `src/app/admin/leads/error.tsx`
- `src/app/admin/prompts/error.tsx`
- `src/app/admin/conversations/error.tsx`
- `src/app/admin/jobs/error.tsx`
- `src/app/admin/system/error.tsx`

All share the same implementation (extracted to a shared helper):

Shows a friendly error message with:
- "Something went wrong" heading
- Retry button (calls `reset()`)
- Link to dashboard

This prevents a loader failure on one page from crashing the entire
admin shell.

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/core/entities/NotificationChannel.ts` | Entity interface |
| `src/adapters/ChatNotificationChannel.ts` | Chat channel |
| `src/adapters/PushNotificationChannel.ts` | Push channel |
| `src/lib/admin/notifications/notification-dispatcher.ts` | Dispatcher |
| `src/lib/admin/notifications/admin-signal-evaluator.ts` | Rules engine |
| `src/lib/admin/notifications/notification-preferences.ts` | Volume control |
| `src/app/admin/users/error.tsx` | Error boundary |
| `src/app/admin/leads/error.tsx` | Error boundary |
| `src/app/admin/prompts/error.tsx` | Error boundary |
| `src/app/admin/conversations/error.tsx` | Error boundary |
| `src/app/admin/jobs/error.tsx` | Error boundary |
| `src/app/admin/system/error.tsx` | Error boundary |
| `src/components/admin/AdminErrorFallback.tsx` | Shared error UI |

### Modified files

| File | Change |
|------|--------|
| Each BREAD Browse page | Add empty state rendering |
| All new components | Density token audit |
| All new pages | Mobile + accessibility fixes |

---

## Acceptance Criteria

### Notifications
- [ ] `NotificationDispatcher` sends to chat + push channels
- [ ] `AdminSignalEvaluator` fires alerts on threshold conditions
- [ ] Volume control prevents repeated alerts for same signal
- [ ] Quiet hours suppresses push notifications
- [ ] Channel failures don't cascade (`Promise.allSettled`)

### Empty States
- [ ] Every BREAD surface shows contextual empty message when no data
- [ ] Empty states use `AdminEmptyState` shared component
- [ ] Messages are helpful (explain where the data comes from)

### Density
- [ ] All new components use semantic spacing tokens
- [ ] Density toggle affects all new surfaces
- [ ] No hardcoded pixel spacing in new code

### Mobile
- [ ] Tables → cards below 640px
- [ ] Filters stack vertically
- [ ] Touch targets ≥ 44px
- [ ] Detail sidebars stack below main content

### Accessibility
- [ ] Focus indicators on all interactive elements
- [ ] Labels on all form inputs
- [ ] Tables use proper `<th>` semantics
- [ ] Keyboard navigation through all workflows
- [ ] Status conveyed by more than color alone

### Error Handling
- [ ] Error boundaries prevent page crashes
- [ ] Retry button resets the error boundary
- [ ] Dashboard link provides escape route

### Final Validation
- [ ] `vitest run` — 0 failures
- [ ] `tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — success
- [ ] All 8 admin nav items link to live, functional pages
- [ ] Manual mobile walkthrough of all admin pages passes

---

## Estimated Tests

| Area | Count |
|------|-------|
| ChatNotificationChannel | 2 |
| PushNotificationChannel | 2 |
| NotificationDispatcher | 2 |
| AdminSignalEvaluator (threshold rules) | 3 |
| Follow-up overdue rules | 2 |
| Volume control (cooldown, quiet hours) | 2 |
| Empty states rendering | 3 |
| Error boundary behavior | 2 |
| **Total** | **~18** |

---

## Dependencies

- All previous sprints (this is the capstone polish sprint)
