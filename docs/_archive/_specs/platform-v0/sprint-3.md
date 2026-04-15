# Sprint 3 — Single Continuous Conversation

> **Parent spec:** [Platform V0](spec.md) §7 Sprint 3
> **Requirement IDs:** FND-005, FND-006, FND-007, FND-010, FND-024, FND-025, FND-026
> **Depends on:** Sprint 1 (SystemPromptBuilder for summary/meta-summary injection), Sprint 2 (User preferences — persisted per-user, carry forward in the single conversation)
> **Goal:** Remove "New Chat." One conversation per user, forever. Compaction handles unbounded history. Migration is seamless.

---

## §1 Current State (What We're Replacing)

### §1.1 Conversation creation — `src/core/use-cases/ConversationInteractor.ts`

```typescript
async create(userId: string, title: string = "", options?: { sessionSource?: string }): Promise<Conversation> {
  // Archive any existing active conversation before creating a new one
  await this.conversationRepo.archiveByUser(userId);
  const id = `conv_${crypto.randomUUID()}`;
  // ...creates new conversation...
}
```

Every `create()` call archives the current conversation and starts fresh. Users lose conversational continuity.

### §1.2 Client-side "New Chat" — `src/frameworks/ui/ConversationSidebar.tsx`

```typescript
<button onClick={() => {
  if (window.confirm("Archive this thread and start fresh?")) {
    archiveConversation();
  }
}}>New Chat</button>
```

### §1.3 Client session management — `src/hooks/chat/useChatConversationSession.ts`

Exposes `newConversation()` and `archiveConversation()` — both of which break the continuous thread.

### §1.4 Global chat context — `src/hooks/useGlobalChat.tsx`

```typescript
// Exposes to all consumers:
newConversation, archiveConversation
```

### §1.5 Summarization — `src/core/use-cases/SummarizationInteractor.ts`

Single-tier compaction: threshold=40 messages, window=20 messages. Produces `type: "summary"` parts. No meta-compaction for long-lived conversations.

### §1.6 Context window — `src/lib/chat/context-window.ts`

Scans backwards for the most recent `type: "summary"` message. Returns messages after it. Does not handle `type: "meta_summary"`.

### §1.7 Problems this creates

1. "New Chat" creates artificial breaks in what should be a continuous business relationship.
2. Archived conversations lose their context — the AI starts cold each time.
3. Single-tier summarization doesn't scale to conversations spanning months.
4. `search_my_conversations` can find old topics, but context is fragmented across conversations.

---

## §2 Target Architecture

### §2.1 Behavioral changes

| Current behavior | New behavior |
| --- | --- |
| `create()` archives first, then creates new | `ensureActive()` returns existing or creates one |
| "New Chat" button in sidebar | Deleted — no way for user to start a new conversation |
| `archiveConversation()` in client | Deleted from client — server-only for admin/compaction |
| `newConversation()` in client | Deleted — `ensureActive()` covers first-visit |
| Single-tier summarization | Two tiers: turn summaries + meta-summaries |
| Context window finds `type: "summary"` | Context window finds `type: "summary"` OR `type: "meta_summary"` |

### §2.2 Modified files

| File | Change |
| --- | --- |
| `src/core/use-cases/ConversationInteractor.ts` | `create()` → `ensureActive()`; keep `create()` as private |
| `src/core/use-cases/SummarizationInteractor.ts` | Add meta-compaction tier |
| `src/core/entities/message-parts.ts` | Add `type: "meta_summary"` to MessagePart union |
| `src/lib/chat/context-window.ts` | Recognize `type: "meta_summary"` as compaction anchor |
| `src/hooks/chat/useChatConversationSession.ts` | Remove archive/new-chat paths, simplify to restore-only |
| `src/hooks/useGlobalChat.tsx` | Remove `archiveConversation`, `newConversation` from context |
| `src/app/api/chat/stream/route.ts` | Use `ensureActive()` instead of `create()` |
| `src/components/FloatingChatShell.tsx` | Remove `ConversationSidebar` import and `conversationActions` prop |

### §2.3 Deleted files

| File | Reason |
| --- | --- |
| `src/frameworks/ui/ConversationSidebar.tsx` | "New Chat" removed — no sidebar needed |

### §2.4 New files

| File | Purpose |
| --- | --- |
| `tests/single-conversation.test.ts` | Dedicated test file for new behavior |

---

## §3 Implementation Details

### §3.1 `ConversationInteractor.ensureActive()`

```typescript
async ensureActive(
  userId: string,
  options?: { sessionSource?: string },
): Promise<Conversation> {
  const existing = await this.conversationRepo.findActiveByUser(userId);
  if (existing) return existing;

  // No active conversation — create one (first visit, or all were admin-archived)
  const id = `conv_${crypto.randomUUID()}`;
  const sessionSource = options?.sessionSource ?? (userId.startsWith("anon_") ? "anonymous_cookie" : "authenticated");
  const conversation = await this.conversationRepo.create({
    id,
    userId,
    title: "",
    status: "active",
    sessionSource,
  });

  await this.eventRecorder?.record(id, "started", { session_source: sessionSource });
  return conversation;
}
```

**Key difference from current `create()`:** No `archiveByUser()` call. If an active conversation exists, return it. Only creates when none exists.

**What happens to `create()`:** It becomes private or is removed from the public API. The streaming route no longer calls it — it calls `ensureActive()`.

### §3.2 `migrateAnonymousConversations()` update

The existing method already handles anon→auth migration. It returns `Promise<string[]>` (array of migrated conversation IDs). Under the single-conversation model, the migrated conversation becomes the user's permanent conversation:

```typescript
async migrateAnonymousConversations(
  anonUserId: string,
  newUserId: string,
): Promise<string[]> {
  // Archive any existing active conversation for the authenticated user
  // so the transferred anonymous conversation (with fresh session context) becomes the active one.
  await this.conversationRepo.archiveByUser(newUserId);

  const migratedIds = await this.conversationRepo.transferOwnership(anonUserId, newUserId);

  for (const convId of migratedIds) {
    await this.eventRecorder?.record(convId, "converted", {
      from: anonUserId,
      to: newUserId,
    });
  }

  return migratedIds;
}
```

**Simplification:** Archive the auth user's active conversation first, then transfer. The anonymous conversation (which has the current session context) becomes the user's active conversation. Previous auth conversations remain archived and searchable via `search_my_conversations`. On the next request, `ensureActive()` returns the transferred conversation.

### §3.3 Streaming route update — `src/app/api/chat/stream/route.ts`

```typescript
// BEFORE:
let conversationId = body.conversationId || null;
if (!conversationId) {
  const title = (latestUserText || ... ).slice(0, 80);
  const conv = await interactor.create(userId, title);
  conversationId = conv.id;
}

// AFTER:
const conv = await interactor.ensureActive(userId);
const conversationId = conv.id;
// Client-provided conversationId is ignored — server always uses the active conversation
```

The client no longer decides whether to create or reuse. The server always uses the active conversation.

### §3.4 Message part type — `src/core/entities/message-parts.ts`

Add `meta_summary` to the union:

```typescript
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "attachment"; assetId: string; fileName: string; mimeType: string; fileSize: number }
  | { type: "summary"; text: string; coversUpToMessageId: string }
  | { type: "meta_summary"; text: string; coversUpToSummaryId: string; summariesCompacted: number };
```

### §3.5 Meta-compaction — `src/core/use-cases/SummarizationInteractor.ts`

```typescript
const META_SUMMARY_THRESHOLD = 5; // Trigger meta-compaction when 5+ summaries exist

async summarizeIfNeeded(conversationId: string): Promise<void> {
  // ... existing turn-level summarization ...

  // After turn summarization, check if meta-compaction is needed
  await this.metaCompactIfNeeded(conversationId);
}

private async metaCompactIfNeeded(conversationId: string): Promise<void> {
  const messages = await this.messageRepo.listByConversation(conversationId);

  // Find the most recent meta_summary — only count summaries AFTER it
  // to avoid re-triggering on summaries already compacted.
  let metaCutoff = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "system" && messages[i].parts.some((p) => p.type === "meta_summary")) {
      metaCutoff = i;
      break;
    }
  }

  const summaries = messages
    .slice(metaCutoff + 1)
    .filter((m) => m.role === "system" && m.parts.some((p) => p.type === "summary"));

  if (summaries.length < META_SUMMARY_THRESHOLD) return;

  // Keep the most recent summary intact; compact the rest
  const summariesToCompact = summaries.slice(0, -1);
  const lastSummary = summaries[summaries.length - 1];

  const metaSummaryText = await this.llmSummarizer.summarize(
    summariesToCompact.map((m) => ({
      ...m,
      content: m.parts.find((p) => p.type === "summary")?.text ?? m.content,
      role: "assistant" as const, // Present summaries as content for the summarizer
    })),
  );

  const tokenEstimate = Math.ceil(metaSummaryText.length / 4);
  await this.messageRepo.create({
    conversationId,
    role: "system",
    content: metaSummaryText,
    parts: [{
      type: "meta_summary",
      text: metaSummaryText,
      coversUpToSummaryId: lastSummary.id,
      summariesCompacted: summariesToCompact.length,
    }],
    tokenEstimate,
  });

  await this.eventRecorder?.record(conversationId, "meta_summarized", {
    summaries_compacted: summariesToCompact.length,
    meta_summary_tokens: tokenEstimate,
  });
}
```

**Key behavior:**
- Triggers when 5+ `type: "summary"` messages exist **after the most recent meta_summary** (or from the start if no meta_summary exists yet).
- Compacts all qualifying summaries except the most recent into one `type: "meta_summary"` message.
- The most recent summary + meta-summary together form the full conversation context.
- After meta-compaction, old summary messages remain in the DB (non-destructive) but are not selected by `buildContextWindow`.
- Subsequent calls will not re-trigger on already-compacted summaries because the count starts from beyond the latest meta_summary.

### §3.6 Updated `buildContextWindow()` — `src/lib/chat/context-window.ts`

```typescript
export function buildContextWindow(messages: Message[]): {
  contextMessages: Array<{ role: "user" | "assistant"; content: string }>;
  hasSummary: boolean;
  summaryText: string | null;
} {
  // Find the most recent summary OR meta-summary message
  let lastSummaryIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (
      msg.role === "system" &&
      msg.parts.some((p) => p.type === "summary" || p.type === "meta_summary")
    ) {
      lastSummaryIndex = i;
      break;
    }
  }

  // ... rest unchanged — returns messages after the summary anchor
}
```

The only change: the scan condition adds `|| p.type === "meta_summary"`. Everything else stays the same.

### §3.7 Client simplification — `src/hooks/chat/useChatConversationSession.ts`

Remove `newConversation()` and `archiveConversation()`. Keep `refreshConversation()` for session restore:

```typescript
// REMOVED:
// - newConversation() function
// - archiveConversation() function

// KEPT:
// - refreshConversation(id?) — restores from server
// - conversationId state
// - currentConversation state
// - isLoadingMessages state
```

### §3.8 Global chat context — `src/hooks/useGlobalChat.tsx`

Remove from context and provider:

```typescript
// REMOVED from ChatContext:
// - newConversation
// - archiveConversation

// KEPT:
// - messages, isSending, conversationId, currentConversation
// - isLoadingMessages, routingSnapshot
// - sendMessage, setConversationId, refreshConversation
```

### §3.9 Delete `ConversationSidebar.tsx`

Delete `src/frameworks/ui/ConversationSidebar.tsx` entirely. Remove imports from any parent component that renders it.

### §3.10 Migration strategy for existing users

On first load under the new model (handled by the streaming route calling `ensureActive()`):

1. **User has an active conversation:** `ensureActive()` returns it. No change needed.
2. **User has no active conversation (all archived):** `ensureActive()` creates a new one. Archived conversations remain searchable via `search_my_conversations`.
3. **User has never had a conversation:** `ensureActive()` creates their first one.

No data is deleted. No migration script needed. The behavioral change is entirely in `ensureActive()` vs `create()`.

---

## §4 Task Breakdown

| # | Task | Files touched | Est. |
| --- | --- | --- | --- |
| 3.1 | Add `meta_summary` to MessagePart union | `src/core/entities/message-parts.ts` | S |
| 3.2 | Implement `ensureActive()` on ConversationInteractor | `src/core/use-cases/ConversationInteractor.ts` | M |
| 3.3 | Add meta-compaction to SummarizationInteractor | `src/core/use-cases/SummarizationInteractor.ts` | L |
| 3.4 | Update `buildContextWindow()` to recognize `meta_summary` | `src/lib/chat/context-window.ts` | S |
| 3.5 | Update streaming route to use `ensureActive()` | `src/app/api/chat/stream/route.ts` | M |
| 3.6 | Remove `newConversation` and `archiveConversation` from client hooks | `src/hooks/chat/useChatConversationSession.ts`, `src/hooks/useGlobalChat.tsx` | M |
| 3.7 | Delete `ConversationSidebar.tsx`, remove import from `FloatingChatShell.tsx`, set `conversationActions={null}` | `src/frameworks/ui/ConversationSidebar.tsx`, `src/components/FloatingChatShell.tsx` | S |
| 3.8 | Update `migrateAnonymousConversations()` for single-conversation model | `src/core/use-cases/ConversationInteractor.ts` | M |
| 3.9 | Write all tests | `tests/single-conversation.test.ts` | L |
| 3.10 | Adapt existing tests to new model | See §5.5 for deletions. Adapt: `src/core/use-cases/ConversationInteractor.test.ts` (`create()` → `ensureActive()`), `tests/chat-stream-route.test.ts` (`createMock` → `ensureActiveMock`), `src/components/FloatingChatShell.test.tsx` (remove reset/archive tests), `src/hooks/useGlobalChat.test.tsx` (remove archive/newConversation tests). Remove `ConversationSidebar` mock stubs from: `tests/browser-motion.test.tsx`, `tests/homepage-shell-ownership.test.tsx`, `tests/homepage-shell-layout.test.tsx`, `tests/homepage-shell-evals.test.tsx` | M |

**Execute order:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10

---

## §5 Test Specification

### §5.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `ensureActive returns existing active conversation` | User with active conv → `ensureActive()` returns same conv ID |
| P2 | `ensureActive creates conversation when none exists` | User with no conversations → `ensureActive()` creates one, returns it |
| P3 | `ensureActive creates conversation when all are archived` | User with only archived convs → `ensureActive()` creates new active |
| P4 | `ensureActive is idempotent` | Call `ensureActive()` twice → returns same conversation both times |
| P5 | `ensureActive does not archive existing active` | User with active conv → `ensureActive()` → active conv status unchanged |
| P6 | `ensureActive records "started" event on create` | New conversation → event recorder called with "started" |
| P7 | `meta-compaction triggers at 5 summaries` | Insert 5 summary messages → `metaCompactIfNeeded()` creates a meta_summary |
| P8 | `meta-compaction preserves most recent summary` | After meta-compaction, the most recent summary is not included in the meta |
| P9 | `meta-compaction creates correct meta_summary part` | Meta-summary message has `type: "meta_summary"` with `summariesCompacted` count |
| P10 | `meta-compaction records event` | After compaction → event recorder called with "meta_summarized" |
| P11 | `buildContextWindow finds meta_summary as anchor` | Messages with a meta_summary → context starts after it |
| P12 | `buildContextWindow finds most recent of summary or meta_summary` | Both exist → uses whichever is more recent |
| P13 | `message limit still enforced with single conversation` | 200-message conversation → `appendMessage()` still throws `MessageLimitError` |

### §5.2 Negative tests (invalid operations)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `no client path to archive conversation` | `useGlobalChat` context no longer exposes `archiveConversation` |
| N2 | `no client path to create new conversation` | `useGlobalChat` context no longer exposes `newConversation` |
| N3 | `meta-compaction does not trigger below threshold` | 4 summaries → no meta_summary created |
| N4 | `meta-compaction does not run concurrently` | Already-running summarization for same conversation → second call is no-op |
| N5 | `ensureActive does not create for empty userId` | Edge: empty string userId → appropriate error |

### §5.3 Edge tests (boundary conditions)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `exactly 5 summaries triggers meta-compaction` | Boundary: 5th summary → meta-compaction fires |
| E2 | `meta-compaction with all identical summaries` | 5 identical summary texts → meta-summary still created |
| E3 | `buildContextWindow with only meta_summary (no recent summary)` | Single meta_summary → used as anchor, messages after it returned |
| E4 | `buildContextWindow with meta_summary followed by summary` | Meta at index 5, regular summary at index 10 → uses index 10 (most recent) |
| E5 | `conversation spanning 500+ messages with layered compaction` | Multiple rounds of summarization + meta-compaction → context window stays bounded |
| E6 | `anonymous user ensureActive behavior` | Anonymous user ID → `ensureActive()` creates with `session_source: "anonymous_cookie"` |
| E7 | `migrateAnonymousConversations under single-conversation model` | Anonymous conv migrated → becomes authenticated user's active conversation |
| E8 | `migrateAnonymousConversations when auth user already has active` | Conflict: both have active → most recently updated wins |
| E9 | `meta_summary message has correct token estimate` | Token estimate = `ceil(content.length / 4)` |
| E10 | `summarization + meta-compaction in same call` | Turn summarization triggers, then meta-compaction triggers in same `summarizeIfNeeded()` |

### §5.4 Integration tests

| # | Test name | What it verifies |
| --- | --- | --- |
| I1 | `long conversation lifecycle: create → 50 messages → summary → 50 more → summary → meta-compact` | Full lifecycle: single conversation accumulates messages, gets summarized, gets meta-compacted |
| I2 | `context window stays bounded after meta-compaction` | After compaction, context window contains only: recent messages + last summary/meta-summary reference |
| I3 | `search_my_conversations finds topics after meta-compaction` | Original messages still in DB → vector search still works |

### §5.5 Deleted tests

| # | What's deleted | Source file | Reason |
| --- | --- | --- | --- |
| D1 | `moves the reset action into the leading header region…` | `FloatingChatShell.test.tsx` | ConversationSidebar deleted |
| D2 | `keeps the reset confirmation … and archives when start fresh is confirmed` | `FloatingChatShell.test.tsx` | ConversationSidebar deleted |
| D3 | `archives the active conversation and resets to the hero state` | `useGlobalChat.test.tsx` | `archiveConversation` removed from context |
| D4 | `starts fresh cleanly after restoring a selected conversation` | `useGlobalChat.test.tsx` | `newConversation` removed from context |
| D5 | `does not archive an unrelated active thread when viewing an archived selected conversation` | `useGlobalChat.test.tsx` | Archive behavior removed |
| D6 | `archives existing active conversation before creating new` | `ConversationInteractor.test.ts` | Behavior replaced by `ensureActive()` |

**Total: 31 new tests + 6 deleted = net +25**

---

## §6 Test Implementation Patterns

### §6.1 ensureActive tests — in-memory with mock repos

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationInteractor } from "@/core/use-cases/ConversationInteractor";

function createMockRepos() {
  return {
    conversationRepo: {
      findActiveByUser: vi.fn(),
      create: vi.fn(),
      archiveByUser: vi.fn(),
      // ... other methods
    },
    messageRepo: {
      listByConversation: vi.fn().mockResolvedValue([]),
      countByConversation: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    },
    eventRecorder: {
      record: vi.fn(),
    },
  };
}

describe("ConversationInteractor.ensureActive", () => {
  it("P1: returns existing active conversation", async () => {
    const { conversationRepo, messageRepo, eventRecorder } = createMockRepos();
    const existing = { id: "conv_existing", userId: "usr_1", status: "active" };
    conversationRepo.findActiveByUser.mockResolvedValue(existing);

    const interactor = new ConversationInteractor(conversationRepo, messageRepo, eventRecorder);
    const result = await interactor.ensureActive("usr_1");

    expect(result.id).toBe("conv_existing");
    expect(conversationRepo.create).not.toHaveBeenCalled();
    expect(conversationRepo.archiveByUser).not.toHaveBeenCalled();
  });

  it("P2: creates when none exists", async () => {
    const { conversationRepo, messageRepo, eventRecorder } = createMockRepos();
    conversationRepo.findActiveByUser.mockResolvedValue(null);
    conversationRepo.create.mockImplementation((params) => Promise.resolve(params));

    const interactor = new ConversationInteractor(conversationRepo, messageRepo, eventRecorder);
    const result = await interactor.ensureActive("usr_1");

    expect(result.id).toMatch(/^conv_/);
    expect(conversationRepo.create).toHaveBeenCalledTimes(1);
    expect(eventRecorder.record).toHaveBeenCalledWith(expect.any(String), "started", expect.any(Object));
  });

  it("P4: idempotent — returns same conversation on repeat calls", async () => {
    const { conversationRepo, messageRepo, eventRecorder } = createMockRepos();
    const existing = { id: "conv_fixed", userId: "usr_1", status: "active" };
    conversationRepo.findActiveByUser.mockResolvedValue(existing);

    const interactor = new ConversationInteractor(conversationRepo, messageRepo, eventRecorder);
    const first = await interactor.ensureActive("usr_1");
    const second = await interactor.ensureActive("usr_1");

    expect(first.id).toBe(second.id);
    expect(conversationRepo.create).not.toHaveBeenCalled();
  });
});
```

### §6.2 Meta-compaction tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummarizationInteractor } from "@/core/use-cases/SummarizationInteractor";

function makeMessages(count: number, summaryCount: number): Message[] {
  const messages: Message[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_${i}`,
      conversationId: "conv_1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      parts: [{ type: "text", text: `Message ${i}` }],
      createdAt: new Date(2025, 0, 1, 0, i).toISOString(),
      tokenEstimate: 10,
    });
  }
  // Add summary messages
  for (let i = 0; i < summaryCount; i++) {
    messages.push({
      id: `summary_${i}`,
      conversationId: "conv_1",
      role: "system",
      content: `Summary ${i}`,
      parts: [{ type: "summary", text: `Summary ${i}`, coversUpToMessageId: `msg_${i * 10}` }],
      createdAt: new Date(2025, 0, 2, 0, i).toISOString(),
      tokenEstimate: 50,
    });
  }
  return messages;
}

describe("SummarizationInteractor meta-compaction", () => {
  it("P7: triggers at 5 summaries", async () => {
    const messageRepo = {
      listByConversation: vi.fn().mockResolvedValue(makeMessages(100, 5)),
      create: vi.fn().mockResolvedValue({ id: "meta_1" }),
      countByConversation: vi.fn().mockResolvedValue(105),
    };
    const llmSummarizer = {
      summarize: vi.fn().mockResolvedValue("Meta-summary of all earlier context."),
    };
    const eventRecorder = { record: vi.fn() };

    const interactor = new SummarizationInteractor(messageRepo, llmSummarizer, eventRecorder);
    // metaCompactIfNeeded is private, but triggers via summarizeIfNeeded
    // For testing, we verify the create call includes meta_summary type
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = messageRepo.create.mock.calls;
    const metaCall = createCalls.find(
      (call) => call[0].parts?.some((p: { type: string }) => p.type === "meta_summary"),
    );
    expect(metaCall).toBeDefined();
  });

  it("N3: does not trigger below threshold", async () => {
    const messageRepo = {
      listByConversation: vi.fn().mockResolvedValue(makeMessages(80, 4)),
      create: vi.fn().mockResolvedValue({ id: "msg_new" }),
      countByConversation: vi.fn().mockResolvedValue(84),
    };
    const llmSummarizer = { summarize: vi.fn() };

    const interactor = new SummarizationInteractor(messageRepo, llmSummarizer);
    await interactor.summarizeIfNeeded("conv_1");

    const metaCalls = messageRepo.create.mock.calls.filter(
      (call) => call[0].parts?.some((p: { type: string }) => p.type === "meta_summary"),
    );
    expect(metaCalls).toHaveLength(0);
  });
});
```

### §6.3 Context window with meta_summary

```typescript
import { describe, it, expect } from "vitest";
import { buildContextWindow } from "@/lib/chat/context-window";

describe("buildContextWindow with meta_summary", () => {
  it("E3: uses meta_summary as anchor", () => {
    const messages = [
      { id: "meta_1", role: "system", content: "Meta summary", parts: [{ type: "meta_summary", text: "Meta", coversUpToSummaryId: "s3", summariesCompacted: 3 }], createdAt: "2025-01-01T00:00:00Z", tokenEstimate: 50 },
      { id: "msg_1", role: "user", content: "Hello", parts: [{ type: "text", text: "Hello" }], createdAt: "2025-01-01T01:00:00Z", tokenEstimate: 5 },
      { id: "msg_2", role: "assistant", content: "Hi!", parts: [{ type: "text", text: "Hi!" }], createdAt: "2025-01-01T01:01:00Z", tokenEstimate: 5 },
    ];

    const result = buildContextWindow(messages);
    expect(result.hasSummary).toBe(true);
    expect(result.contextMessages).toHaveLength(2);
    expect(result.contextMessages[0].content).toBe("Hello");
  });

  it("E4: prefers most recent anchor", () => {
    const messages = [
      { id: "meta_1", role: "system", content: "Meta", parts: [{ type: "meta_summary", text: "Meta", coversUpToSummaryId: "s3", summariesCompacted: 3 }], createdAt: "2025-01-01T00:00:00Z", tokenEstimate: 50 },
      { id: "msg_1", role: "user", content: "Older", parts: [{ type: "text", text: "Older" }], createdAt: "2025-01-01T01:00:00Z", tokenEstimate: 5 },
      { id: "s_4", role: "system", content: "Recent summary", parts: [{ type: "summary", text: "Recent", coversUpToMessageId: "msg_1" }], createdAt: "2025-01-01T02:00:00Z", tokenEstimate: 30 },
      { id: "msg_2", role: "user", content: "Newer", parts: [{ type: "text", text: "Newer" }], createdAt: "2025-01-01T03:00:00Z", tokenEstimate: 5 },
    ];

    const result = buildContextWindow(messages);
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].content).toBe("Newer");
  });
});
```

---

## §7 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Users want to "start fresh" — removing New Chat frustrates them | Medium | The AI acknowledges topic pivots naturally. "Let's talk about something else" works within the same conversation. Summaries note topic changes. |
| Meta-compaction degrades search quality | Low | Non-destructive: original messages remain in DB. Vector search indexes original message embeddings, not summaries. |
| Meta-compaction LLM call fails | Medium | `try/finally` block ensures `activeSummaries` lock is released. Meta-compaction failure is logged but doesn't crash. Next call retries. |
| Message limit (200) reached faster with single conversation | Medium | Summarization compacts old messages. After compaction, old messages are still counted but the effective context window is bounded. V1 can increase the limit or implement message pruning. |
| Existing tests that call `create()` break | High | Adapt existing tests: replace `create()` calls with `ensureActive()`. For tests that expect archive-on-create behavior, update to test the new behavior. |

---

## §8 What Users Lose vs. Gain

### Lose

- Ability to start a truly fresh conversation (AI always has context from history)
- "New Chat" button
- Archived conversation list in sidebar

### Gain

- AI remembers their history automatically
- "Last time we discussed your pricing — did you decide on the full-day rate?"
- Preferences persist across sessions (Sprint 2)
- No context fragmentation across multiple threads
- Simpler UI with fewer buttons and dialogs

---

## §9 Definition of Done

1. `ensureActive()` exists and is the only public creation path for conversations.
2. "New Chat" button does not exist in the UI.
3. `archiveConversation` and `newConversation` are removed from client-side hooks.
4. `ConversationSidebar.tsx` is deleted.
5. Meta-compaction triggers at 5+ summaries, creates `type: "meta_summary"` messages.
6. `buildContextWindow()` recognizes both `summary` and `meta_summary` as compaction anchors.
7. Streaming route uses `ensureActive()` — client-provided `conversationId` is validated but server always ensures an active conversation exists.
8. Anonymous → authenticated migration works correctly under single-conversation model.
9. All 31 new tests pass. 6 obsolete tests are removed.
10. All remaining existing tests pass (no regressions beyond intentional removals).
11. TypeScript compiles clean. Build succeeds. Lint passes.
