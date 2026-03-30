# Sprint 4 — System Prompts & Conversations

> Build admin BREAD surfaces for the two AI-core entities: System Prompts
> (versioned prompt management with activation control) and Conversations
> (read-only Browse + thread viewer with lane analytics).

---

## Why This Sprint Exists

The system prompt infrastructure is fully built — `SystemPromptDataMapper`
already supports `createVersion`, `listVersions`, `activate`, and the
`idx_prompt_active` partial index enforces single-active-per-slot. The MCP
prompt-tool exposes set/get/list/rollback/diff. But there is no visual
admin surface.

Conversations contain 18 columns of routing intelligence (lane, lane
confidence, detected need, recommended next step) plus full message history.
The MCP analytics-tool provides aggregate queries but no Browse/Read UI
exists. The admin needs to inspect individual threads and review routing
decisions.

---

## Deliverables

### D4.1 — System Prompt admin loaders

**File:** `src/lib/admin/prompts/admin-prompts.ts`

```typescript
export interface AdminPromptSlot {
  role: string;             // ALL, ANONYMOUS, AUTHENTICATED, STAFF, ADMIN
  promptType: string;       // base, role_directive
  activeVersion: number | null;
  totalVersions: number;
  lastUpdated: string;
  updatedBy: string | null;
}

export interface AdminPromptVersionEntry {
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  notes: string;
  contentPreview: string;   // First 200 chars
}

export interface AdminPromptDetailViewModel {
  slot: AdminPromptSlot;
  versions: AdminPromptVersionEntry[];
  activeContent: string;    // Full content of active version
}

export async function loadAdminPromptSlots(): Promise<AdminPromptSlot[]>;
export async function loadAdminPromptDetail(
  role: string, promptType: string,
): Promise<AdminPromptDetailViewModel>;
```

The list loader groups by (role, promptType) slot. Each slot shows the
active version number, total version count, and last update timestamp.

### D4.2 — System Prompt admin route helpers

**File:** `src/lib/admin/prompts/admin-prompts-routes.ts`

```typescript
export function getAdminPromptsPath(): string;
export function getAdminPromptDetailPath(role: string, promptType: string): string;
// URL: /admin/prompts/[role]/[promptType]
```

### D4.3 — System Prompt admin actions

**File:** `src/lib/admin/prompts/admin-prompts-actions.ts`

Server actions using the shared `withAdminAction()` wrapper:

```typescript
export async function createPromptVersion(formData: FormData): Promise<void>;
// Parses: content (required), notes (optional)
// Calls: SystemPromptDataMapper.createVersion()
// Revalidates: /admin/prompts and detail path

export async function activatePromptVersion(formData: FormData): Promise<void>;
// Parses: role, promptType, version
// Calls: SystemPromptDataMapper.activate() (transaction-backed)
// Revalidates: /admin/prompts and detail path
```

### D4.4 — System Prompts Browse page

**File:** `src/app/admin/prompts/page.tsx`

Displays a grid of prompt slots. Each slot card shows:
- Role badge (color-coded)
- Prompt type label
- Active version number or "No active version" warning
- Total versions count
- Last updated timestamp
- Click → detail page

No filters needed — the matrix is small (5 roles × 2 types = 10 max slots).

### D4.5 — System Prompt Detail page

**File:** `src/app/admin/prompts/[role]/[promptType]/page.tsx`

**Layout:**
1. Header: role + prompt type + active version badge
2. Main panel: Active content displayed in a `<pre>` block (monospace,
   full readable text)
3. Sidebar: Version history timeline
   - Each version: version number, created date, author, notes preview
   - Active version highlighted
   - "Activate" button on non-active versions
4. Bottom: "Create New Version" form
   - Textarea for content (prefilled with current active content)
   - Text input for change notes
   - Submit creates a new version (does NOT auto-activate)

This design mirrors the `DefaultingSystemPromptRepository` Null Object
pattern — if no active version exists, the UI shows the hardcoded default
from seeds with an "Import as Version 1" action.

### D4.6 — Conversation admin loaders

**File:** `src/lib/admin/conversations/admin-conversations.ts`

```typescript
export interface AdminConversationListEntry {
  id: string;
  userId: string;
  userName: string;          // Joined from users table
  title: string;
  status: string;            // active, archived
  lane: string;
  laneConfidence: number | null;
  messageCount: number;
  lastToolUsed: string | null;
  sessionSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationDetailViewModel {
  conversation: AdminConversationListEntry & {
    detectedNeedSummary: string | null;
    recommendedNextStep: string | null;
    promptVersion: number | null;
    referralSource: string | null;
    convertedFrom: string | null;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    parts: unknown[];
    tokenEstimate: number;
    createdAt: string;
  }>;
  totalTokens: number;
}
```

The list loader requires new DataMapper methods (see D4.7).

**Filters:** status, lane, session source, date range
**Sort:** most recent activity (updated_at DESC) by default

### D4.7 — Extend ConversationDataMapper for admin

The existing `ConversationDataMapper` has no admin-level list/filter/count
methods. Add:

```typescript
async listForAdmin(filters: {
  status?: string;
  lane?: string;
  sessionSource?: string;
  afterDate?: string;
  beforeDate?: string;
  limit?: number;
  offset?: number;
}): Promise<ConversationAdminRow[]>;

async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByStatus(): Promise<Record<string, number>>;
async countByLane(): Promise<Record<string, number>>;
```

These methods join `conversations` with `users` to include user display
names in the results.

### D4.8 — Conversation admin route helpers

**File:** `src/lib/admin/conversations/admin-conversations-routes.ts`

```typescript
export const conversationRoutes = createAdminEntityRoutes("conversations");
```

### D4.9 — Conversations Browse page

**File:** `src/app/admin/conversations/page.tsx`

**Layout:**
1. `AdminSection` header with count
2. Status count cards (active, archived)
3. Lane count cards (one per lane value in the data)
4. Filter bar: status dropdown, lane dropdown, session source, date range
5. Data table: user, title, lane (with confidence badge), messages,
   last tool, source, date

Conversations are **read-only** from the admin UI for message content. No
message editing or deletion. The purpose is inspection and analytics.

**Bulk archive:** `AdminDataTable` with `selectable` prop. The
`AdminBulkActionBar` offers an "Archive" action for stale conversations.

### D4.10 — Conversation Detail page (thread viewer)

**File:** `src/app/admin/conversations/[id]/page.tsx`

**Layout:**
1. Header: title + user name + lane badge
2. Sidebar: Routing intelligence panel
   - Lane + confidence meter
   - Detected need summary
   - Recommended next step
   - Prompt version used
   - Session source + referral source
   - Message count + total tokens
3. Main panel: Message thread
   - Alternating user/assistant bubbles
   - Tool invocations shown as collapsed cards
   - Token estimate per message (subtle)
   - Timestamps

Read-only for message content. No message editing. This is an inspection tool.

### D4.11 — Conversation takeover

**File:** `src/lib/admin/conversations/admin-conversations-actions.ts`

Add a `conversation_mode` column to the `conversations` table (values:
`ai`, `human`, default `ai`) via migration.

**Takeover action:**
```typescript
export async function takeOverConversation(formData: FormData): Promise<void>;
// Sets conversation_mode = "human"
// Posts system message: "The founder has joined the conversation."
// Revalidates conversation detail path
```

**Hand-back action:**
```typescript
export async function handBackConversation(formData: FormData): Promise<void>;
// Sets conversation_mode = "ai"
// Posts system message: "The founder has left — the AI assistant will continue."
// Revalidates conversation detail path
```

Both use `withAdminAction()`. The conversation detail page (D4.10) shows:
- "Take Over" button when mode is `ai`
- "Return to AI" button when mode is `human`
- A status banner: "You are actively managing this conversation"

The Browse page (D4.9) shows a "Human" badge on conversations where
`conversation_mode = "human"` so the operator remembers active threads.

### D4.12 — Bulk archive conversations

**File:** `src/lib/admin/conversations/admin-conversations-actions.ts`

```typescript
export async function bulkArchiveConversations(formData: FormData): Promise<void>;
// Parses comma-separated IDs, sets status = "archived" for each
```

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/lib/admin/prompts/admin-prompts.ts` | Loaders |
| `src/lib/admin/prompts/admin-prompts-actions.ts` | Actions |
| `src/lib/admin/prompts/admin-prompts-routes.ts` | Routes |
| `src/app/admin/prompts/page.tsx` | Browse |
| `src/app/admin/prompts/[role]/[promptType]/page.tsx` | Detail |
| `src/lib/admin/conversations/admin-conversations.ts` | Loaders |
| `src/lib/admin/conversations/admin-conversations-routes.ts` | Routes |
| `src/app/admin/conversations/page.tsx` | Browse |
| `src/app/admin/conversations/[id]/page.tsx` | Detail |

### Modified files

| File | Change |
|------|--------|
| `src/adapters/ConversationDataMapper.ts` | Add admin list/count methods, conversation_mode support |

---

## Acceptance Criteria

### System Prompts
- [ ] Browse shows all prompt slots with active version + total count
- [ ] Detail shows full active content in readable format
- [ ] Version history timeline lists all versions with notes
- [ ] "Activate" on a non-active version swaps the active flag (transaction)
- [ ] "Create New Version" form prefills with current active content
- [ ] Creating a version does NOT auto-activate
- [ ] If no active version exists, hardcoded default shown with import action
- [ ] Role badges color-coded

### Conversations
- [ ] Browse lists all conversations with user name, lane, message count
- [ ] Filter by status, lane, session source
- [ ] Status count cards and lane count cards
- [ ] Detail shows full message thread with user/assistant distinction
- [ ] Routing intelligence panel shows lane confidence, need summary, next step
- [ ] Tool invocations shown as collapsed cards
- [ ] "Take Over" button on AI-mode conversations flips to human mode
- [ ] "Return to AI" button on human-mode conversations hands back
- [ ] System messages posted on takeover and hand-back
- [ ] Human-mode conversations show "Human" badge on Browse page
- [ ] Bulk archive works for selected conversations
- [ ] Read-only for message content — no edit/delete actions
- [ ] All existing tests pass

---

## Estimated Tests

| Area | Count |
|------|-------|
| Prompt slot loader | 2 |
| Prompt detail loader | 2 |
| Create version action | 2 |
| Activate version action | 2 |
| Prompt Browse page | 2 |
| Prompt Detail page | 2 |
| Conversation admin list/count methods | 3 |
| Conversation list loader | 2 |
| Conversation detail loader | 2 |
| Conversations Browse page | 2 |
| Conversation Detail page | 2 |
| Conversation takeover action | 2 |
| Conversation hand-back action | 1 |
| Bulk archive conversations | 2 |
| **Total** | **~28** |

---

## Dependencies

- Sprint 1 (shared BREAD infrastructure, `withAdminAction`, route factory)
- Sprint 2 (validates the pattern — Conversations reuses same layout)
