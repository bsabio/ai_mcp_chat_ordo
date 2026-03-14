# Conversation Memory — System Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-12
> **Scope:** Transparent, server-side conversation continuity for all
>   users. One active conversation per user, auto-resumed on page load,
>   periodically summarized, and searchable via the existing hybrid
>   search engine. Anonymous users get a stable cookie-based session so
>   their conversation persists across refreshes.
> **Dependencies:** RBAC (complete), Vector Search (complete), Tool
>   Architecture (complete), Conversation persistence (complete)
> **Affects:** `src/hooks/useGlobalChat.tsx`, `src/app/api/conversations/`,
>   `src/app/api/chat/stream/route.ts`, `src/core/use-cases/ConversationInteractor.ts`,
>   `src/core/search/EmbeddingPipelineFactory.ts`, new `ConversationChunker`,
>   new `search_my_conversations` tool, new `/api/conversations/active` route
>
> **Metaphor:** The library has bookshelves (corpus) and a reading desk
>   (conversation). The desk always has your open notebook — you don't
>   lose your place when you step away. Over time, the advisor writes a
>   concise summary in the margin so earlier pages don't slow you down.
>   And if you want to recall something from an old conversation, you can
>   search your own notebooks just like you search the library shelves.
>
> **Requirement IDs:** Each traceable requirement is tagged `CONVO-XXX`.
> Sprint tasks reference these IDs for traceability.

---

## 1. Problem Statement

### 1.1 What's Broken Today

1. **Page refresh kills the conversation** — `conversationId` lives in
   React `useState` inside `ChatProvider` (`src/hooks/useGlobalChat.tsx`).
   A hard refresh remounts the provider with `conversationId = null`, the
   reducer resets to `[]`, and the UI shows the hero message. The
   conversation exists in SQLite (`conversations` + `messages` tables) but
   the client has no mechanism to discover which one was active.
   `[CONVO-010]`

2. **Anonymous users get zero persistence** — in
   `src/app/api/chat/stream/route.ts`, persistence is gated:
   ```typescript
   const shouldPersist = role !== "ANONYMOUS";
   ```
   When `getSessionUser()` (`src/lib/auth.ts`) finds no `lms_session_token`
   cookie and no `lms_mock_session_role` cookie, it returns the hardcoded
   `ANONYMOUS_USER`:
   ```typescript
   const ANONYMOUS_USER: SessionUser = {
     id: "usr_anonymous",
     email: "anonymous@example.com",
     name: "Anonymous User",
     roles: ["ANONYMOUS"],
   };
   ```
   All anonymous traffic shares this single ID. Even if persistence were
   enabled, every anonymous user would collide on the same `user_id`.
   `[CONVO-020]`

3. **No conversation summarization** — `ConversationInteractor.appendMessage()`
   enforces a hard cap of `MAX_MESSAGES_PER_CONVERSATION = 100`. When hit,
   it throws `MessageLimitError`. There is no context compression — the full
   raw message list is sent to the LLM every time, wasting tokens and
   eventually hitting the limit wall. `[CONVO-030]`

4. **Conversations are opaque to search** — messages are stored but never
   indexed. The `ConversationMetadata` type exists in
   `src/core/search/ports/Chunker.ts`:
   ```typescript
   export interface ConversationMetadata {
     sourceType: "conversation";
     conversationId: string;
     userId: string;
     role: "user" | "assistant";
     turnIndex: number;
   }
   ```
   The `ChunkMetadata` discriminated union includes it:
   ```typescript
   export type ChunkMetadata = BookChunkMetadata | ConversationMetadata;
   ```
   And `EmbeddingPipelineFactory.createForSource("conversation")` exists but
   throws:
   ```typescript
   throw new Error("ConversationChunker not yet implemented");
   ```
   Users cannot search their own conversation history. `[CONVO-040]`

5. **Multi-conversation overhead** — the UI provides a conversation list
   sidebar, manual switching via `loadConversation(id: string)`, and
   per-conversation delete. `MAX_CONVERSATIONS_PER_USER = 50`. This
   ChatGPT-style multi-conversation model doesn't fit the site's
   single-topic advisory domain where users have one ongoing dialogue
   about product development. `[CONVO-050]`

### 1.2 Core Insight

This isn't ChatGPT. Users aren't having 50 different conversations about
50 different topics. They're having **one ongoing dialogue** about
product development — the site's single subject domain. The conversation
is more like a **journal** than a chat thread. It should:
- Always be there when they return
- Get smarter over time (summaries preserve context)
- Be searchable like the library itself
- Require zero conversation management from the user

---

## 2. Current Architecture Inventory

### 2.1 Entities (`src/core/entities/`)

**`conversation.ts`:**

```typescript
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  parts: MessagePart[];
  createdAt: string;
}

export interface NewMessage {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  parts: MessagePart[];
}
```

**`message-parts.ts`:**

```typescript
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown };
```

**`chat-message.ts`:**

```typescript
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  parts?: MessagePart[];
}
```

**`user.ts`:**

```typescript
export type RoleName = "ANONYMOUS" | "AUTHENTICATED" | "STAFF" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
}
```

### 2.2 Ports (Core Interfaces)

**`ConversationRepository`** (`src/core/use-cases/ConversationRepository.ts`):

```typescript
export interface ConversationRepository {
  create(conv: { id: string; userId: string; title: string }): Promise<Conversation>;
  listByUser(userId: string): Promise<ConversationSummary[]>;
  findById(id: string): Promise<Conversation | null>;
  delete(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  touch(id: string): Promise<void>;
}
```

**`MessageRepository`** (`src/core/use-cases/MessageRepository.ts`):

```typescript
export interface MessageRepository {
  create(msg: NewMessage): Promise<Message>;
  listByConversation(conversationId: string): Promise<Message[]>;
  countByConversation(conversationId: string): Promise<number>;
}
```

### 2.3 Use Case — `ConversationInteractor`

**File:** `src/core/use-cases/ConversationInteractor.ts`

```typescript
const MAX_MESSAGES_PER_CONVERSATION = 100;
const MAX_CONVERSATIONS_PER_USER = 50;
const AUTO_TITLE_MAX_LENGTH = 80;

export class ConversationInteractor {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async create(userId: string, title: string = ""): Promise<Conversation>
  async get(conversationId: string, userId: string): Promise<{ conversation: Conversation; messages: Message[] }>
  async list(userId: string): Promise<ConversationSummary[]>
  async delete(conversationId: string, userId: string): Promise<void>
  async appendMessage(msg: NewMessage, userId: string): Promise<Message>
}

export class NotFoundError extends Error { name = "NotFoundError"; }
export class MessageLimitError extends Error { name = "MessageLimitError"; }
```

`get()` enforces ownership (conversation's `userId` must match the
caller's). `appendMessage()` checks message count against
`MAX_MESSAGES_PER_CONVERSATION` and auto-titles from the first user
message.

### 2.4 Adapters

**`ConversationDataMapper`** (`src/adapters/ConversationDataMapper.ts`):
Implements `ConversationRepository` via `better-sqlite3`. SQL schema:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
```

Note: No `status` column — all conversations are implicitly "active."

**`MessageDataMapper`** (`src/adapters/MessageDataMapper.ts`):
Implements `MessageRepository`. SQL schema:

```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  parts TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);
```

Note: No `summarized` flag. `role` accepts any string (not constrained
to the `Message` type's `"user" | "assistant"`); a `"system"` role for
summary messages would work at the SQL layer.

### 2.5 Composition Root — `conversation-root.ts`

**File:** `src/lib/chat/conversation-root.ts`

```typescript
export function getConversationInteractor(): ConversationInteractor {
  const db = getDb();
  const conversationRepo = new ConversationDataMapper(db);
  const messageRepo = new MessageDataMapper(db);
  return new ConversationInteractor(conversationRepo, messageRepo);
}
```

### 2.6 Stream Route — Persistence Flow

**File:** `src/app/api/chat/stream/route.ts`

1. `getSessionUser()` → resolves user (may be `ANONYMOUS_USER`)
2. `shouldPersist = role !== "ANONYMOUS"` — **gates all persistence**
3. If `shouldPersist && !conversationId`:
   - `interactor.create(user.id, title)` → new conversation
   - `conversationId = conv.id`
4. If `shouldPersist`:
   - `interactor.appendMessage({ conversationId, role: "user", content, parts }, user.id)`
5. SSE: `sseChunk({ conversation_id: conversationId })` as first event
6. After stream completes, if `shouldPersist && conversationId`:
   - `interactor.appendMessage({ conversationId, role: "assistant", content, parts }, user.id)`

### 2.7 Client State — `useGlobalChat.tsx`

**File:** `src/hooks/useGlobalChat.tsx`

State shape:
- `messages: ChatMessage[]` — via `useReducer`
- `conversationId: string | null` — via `useState`
- `conversations: ConversationSummary[]` — via `useState`
- `input`, `isSending`, `isLoadingConversations`, `isLoadingMessages`

Key methods in `ChatContextType`:
```typescript
sendMessage: (eventOrMessage?: { preventDefault: () => void } | string) => Promise<void>;
loadConversation: (id: string) => Promise<void>;
newConversation: () => void;
deleteConversation: (id: string) => Promise<void>;
refreshConversations: () => Promise<ConversationSummary[]>;
```

Current mount behavior:
```typescript
useEffect(() => {
  refreshConversations().then((convos) => {
    if (convos && convos.length > 0) {
      loadConversation(convos[0].id);
    }
  });
}, []);
```

This fetches `GET /api/conversations`, takes the first result (sorted by
`updated_at DESC`), and loads it. Works for authenticated users but
returns `401` → empty array for anonymous (no session token).

### 2.8 Existing API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/conversations` | GET | Required | List user's conversations |
| `/api/conversations` | POST | Required | Create conversation |
| `/api/conversations/[id]` | GET | Required | Get conversation + messages |
| `/api/conversations/[id]` | DELETE | Required | Delete conversation |
| `/api/chat/stream` | POST | Optional | Stream chat, persist if authenticated |

All conversation CRUD routes require `lms_session_token`. Anonymous
users get `401` on every conversation endpoint.

### 2.9 Search Infrastructure (Relevant Subsystems)

**Embedding pipeline:**
```typescript
// EmbeddingPipelineFactory (src/core/search/EmbeddingPipelineFactory.ts)
constructor(
  private embedder: Embedder,
  private vectorStore: VectorStore,
  private modelVersion: string,
)
createForSource(sourceType: "book_chunk" | "conversation"): EmbeddingPipeline
// "conversation" case: throw new Error("ConversationChunker not yet implemented")

// EmbeddingPipeline (src/core/search/EmbeddingPipeline.ts)
constructor(
  private chunker: Chunker,
  private embedder: Embedder,
  private vectorStore: VectorStore,
  private changeDetector: ChangeDetector,
  private modelVersion: string,
)
async indexDocument(params: {
  sourceType: string;
  sourceId: string;
  content: string;
  contentHash: string;
  metadata: ChunkMetadata;
}): Promise<IndexResult>
```

**Chunker port:**
```typescript
export interface Chunker {
  chunk(
    sourceId: string,
    content: string,
    metadata: ChunkMetadata,
    options?: ChunkerOptions,
  ): Chunk[];
}
```

**Hybrid search engine:**
```typescript
// HybridSearchEngine (src/core/search/HybridSearchEngine.ts)
constructor(
  private readonly embedder: Embedder,
  private readonly vectorStore: VectorStore,
  private readonly bm25Scorer: BM25Scorer,
  private readonly bm25IndexStore: BM25IndexStore,
  private readonly vectorQueryProcessor: QueryProcessor,
  private readonly bm25QueryProcessor: QueryProcessor,
  private readonly options: HybridSearchOptions,
)
async search(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]>
```

The `filters` parameter accepts `VectorQuery`:
```typescript
export interface VectorQuery {
  sourceType?: string;
  chunkLevel?: "document" | "section" | "passage";
  limit?: number;
}
```

**Critical:** `HybridSearchResult` is **entirely book-specific**:
```typescript
export interface HybridSearchResult {
  bookTitle: string;
  bookNumber: string;
  bookSlug: string;
  chapterTitle: string;
  chapterSlug: string;
  rrfScore: number;
  vectorRank: number | null;
  bm25Rank: number | null;
  relevance: "high" | "medium" | "low";
  matchPassage: string;
  matchSection: string | null;
  matchHighlight: string;
  passageOffset: { start: number; end: number };
}
```

This type cannot accommodate conversation search results. The search
engine will need either a generic result type or a parallel
conversation-specific search path. This is an architectural decision
for Sprint 2.

### 2.10 Tool System

**`ToolDescriptor`** (`src/core/tool-registry/ToolDescriptor.ts`):
```typescript
export type ToolCategory = "content" | "ui" | "math" | "system";

export interface ToolDescriptor<TInput = unknown, TOutput = unknown> {
  name: string;
  schema: AnthropicToolSchema;
  command: ToolCommand<TInput, TOutput>;
  roles: RoleName[] | "ALL";
  category: ToolCategory;
}
```

**`ChatPolicyInteractor`** (`src/core/use-cases/ChatPolicyInteractor.ts`):
```typescript
export class ChatPolicyInteractor implements UseCase<{ role: RoleName }, string> {
  constructor(private readonly basePrompt: string) {}
  async execute({ role }: { role: RoleName }): Promise<string>
}
```

**`ROLE_DIRECTIVES`** includes per-role context. Currently no
conversation-search directive for AUTHENTICATED+.

**Composition root** (`src/lib/chat/tool-composition-root.ts`):
```typescript
export function createToolRegistry(bookRepo: BookRepository, handler?: SearchHandler): ToolRegistry
export function getToolRegistry(): ToolRegistry
export function getToolExecutor(): ToolExecuteFn
export function getEmbeddingPipelineFactory(): EmbeddingPipelineFactory
export function getSearchHandler(): SearchHandler
```

Tools are registered in order; `search_my_conversations` will be added
to this composition root.

### 2.11 Embeddings Table Schema

```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_level TEXT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  embedding_input TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  embedding BLOB NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emb_source_type ON embeddings(source_type);
CREATE INDEX IF NOT EXISTS idx_emb_source_id ON embeddings(source_id);
```

Conversation embeddings will use `source_type = "conversation"` and
`source_id = "{userId}/{conversationId}"`. The existing indexes support
filtering by both fields.

---

## 3. Design Goals

1. **Transparent continuity** — when any user (including anonymous) loads
   the page, their conversation is already there. No sidebar selection, no
   "load conversation" button. It just works. `[CONVO-010]`

2. **Anonymous persistence** — anonymous users get a stable, cookie-based
   anonymous ID that persists across refreshes. Their conversation is saved
   server-side and resumed automatically. `[CONVO-020]`

3. **Rolling summaries** — when a conversation grows past a threshold,
   older messages are summarized into a compact context block. The summary
   replaces the raw messages in the LLM's context window while the
   originals remain in the database for search. `[CONVO-030]`

4. **Conversation search** — authenticated users can search their own
   conversation history via the existing hybrid search engine. Conversation
   turns are chunked, embedded, and indexed alongside library content.
   `[CONVO-040]`

5. **Single-conversation model** — each user has exactly one active
   conversation. The UI has no conversation list sidebar. A "New
   conversation" action archives the current one and starts fresh.
   Multi-conversation support is a future extension. `[CONVO-050]`

6. **Library integration** — conversation search results connect back to
   the library. When a user discussed a topic from the corpus, the search
   result can link to the relevant chapter. `[CONVO-060]`

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (React)                             │
│                                                                     │
│  ChatProvider mounts → GET /api/conversations/active                │
│    → 200 + messages: restore conversation in reducer                │
│    → 404 (no active): show hero message, next send creates new      │
│                                                                     │
│  User sends message → POST /api/chat/stream { conversationId }     │
│    → server persists, streams response, returns conversation_id     │
│                                                                     │
│  "New Conversation" → POST /api/conversations/active/archive        │
│    → server archives current, client resets to hero                 │
│                                                                     │
│  "What did we discuss about UX?" → Claude calls                     │
│    search_my_conversations tool → hybrid search scoped to user      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       Server                                        │
│                                                                     │
│  /api/conversations/active (GET)                                    │
│    → resolveUserId() — auth session or anon cookie                  │
│    → find active conversation (status = 'active') for user          │
│    → return conversation + messages (200) or empty (404)            │
│                                                                     │
│  /api/chat/stream (POST)                                            │
│    → ALL users persist (anonymous via anon cookie ID)               │
│    → after assistant response: check summarization threshold        │
│    → if met: async summarization (non-blocking)                     │
│                                                                     │
│  Summarization (async, post-response)                               │
│    → LLM condenses older messages into summary block                │
│    → summary stored as a system message with summary part type      │
│    → original messages retained in DB for search indexing            │
│    → next LLM call context: [summary] + [recent messages]          │
│                                                                     │
│  Conversation Embedding (async, on archive)                         │
│    → ConversationChunker implements Chunker interface                │
│    → EmbeddingPipeline.indexDocument() reused from vector search     │
│    → source_type: "conversation", source_id: "{userId}/{convId}"    │
│    → searchable via HybridSearchEngine with VectorQuery filter      │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Anonymous identity | `lms_anon_session` httpOnly cookie with UUID | Stable per-device ID without auth; scopes conversations; no PII |
| Conversation model | One active per user; others archived | Matches advisory domain — not ChatGPT multi-thread; reduces UX complexity |
| Resume mechanism | `GET /api/conversations/active` on mount | Server-authoritative; survives hard refresh; no localStorage needed |
| `status` column | `"active"` or `"archived"` on `conversations` table | Simple state machine; at most one active per user; index enables fast lookup |
| Summarization strategy | LLM-generated summary stored as system message | Leverages existing Claude API; summaries are semantic, not mechanical |
| Summary trigger | Threshold (40 msgs) + window (20 preserved) | Avoids premature summarization; keeps recent context raw for quality |
| Conversation chunking | Turn-pair grouping (user+assistant → passage) | Natural semantic units; reuses `Chunker` interface for `EmbeddingPipeline` |
| Embedding timing | On archive (not per-message) | Batching avoids per-turn embedding cost; archives are stable (no further edits) |
| Conversation search | New tool + `VectorQuery.sourceType = "conversation"` filter | Reuses existing `HybridSearchEngine`; filter by source_id prefix for user scoping |
| Result type | New `ConversationSearchResult` (not extending book-specific `HybridSearchResult`) | `HybridSearchResult` fields are all book-specific; conversation results need different fields |
| Anonymous search | Not supported (anonymous conversations not embedded) | Anonymous conversations are transient; embedding cost not justified |

---

## 5. Anonymous User Identity `[CONVO-020]`

### 5.1 Problem

`getSessionUser()` in `src/lib/auth.ts` falls through to:
```typescript
return ANONYMOUS_USER; // { id: "usr_anonymous", roles: ["ANONYMOUS"] }
```

All anonymous traffic shares this single ID. The stream route gates on
`shouldPersist = role !== "ANONYMOUS"`, so zero persistence occurs.

### 5.2 Solution: Anonymous Session Cookie

Create a helper `resolveUserId()` used by all conversation endpoints:

1. If `getSessionUser()` returns a non-ANONYMOUS user → use `user.id`
2. If ANONYMOUS → check for existing `lms_anon_session` cookie
3. If cookie exists → use `anon_{cookie_value}` as user ID
4. If no cookie → generate `crypto.randomUUID()`, set cookie, use
   `anon_{uuid}` as user ID

Cookie properties:
- Name: `lms_anon_session`
- Value: UUID v4
- `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production
- `maxAge: 30 * 24 * 60 * 60` (30 days)
- `path: "/"`

### 5.3 FK Constraint Consideration

The `conversations.user_id` column has `FOREIGN KEY (user_id) REFERENCES
users(id)`. Anonymous user IDs (`anon_{uuid}`) don't exist in the `users`
table.

**Option A:** Insert a row into `users` for each anonymous ID. Cons:
pollutes the users table with ephemeral entries.

**Option B:** Remove or relax the FK constraint. Cons: loses referential
integrity for authenticated users.

**Option C (chosen):** Create a lightweight `anonymous_sessions` table
that the FK doesn't touch. Store anonymous conversations with
`user_id = 'anon_{uuid}'` and relax the FK to not reference `users` — or
change to `ON DELETE SET NULL`. The conversations table was not created
with `FOREIGN KEY ... ON DELETE CASCADE`, so anonymous conversation data
can exist independently.

**Simplest approach:** SQLite foreign keys are only enforced when
`PRAGMA foreign_keys = ON`. The current codebase does not enable this
pragma (verified in `src/lib/db/index.ts`). So `anon_{uuid}` values in
`user_id` will work without schema changes. We add a
`PRAGMA foreign_keys` check to the sprint doc's verify steps.

### 5.4 Stream Route Change

Replace:
```typescript
const shouldPersist = role !== "ANONYMOUS";
```

With:
```typescript
const shouldPersist = true; // All users persist
```

For anonymous users, the `userId` is resolved via `resolveUserId()`
(the anon cookie helper), not from `user.id` on the ANONYMOUS_USER
constant.

### 5.5 Privacy & Cleanup

- Anonymous conversation data is tied to a random UUID, not PII
- No email, name, or account information is stored
- Garbage collection: conversations where `user_id LIKE 'anon_%' AND
  updated_at < datetime('now', '-30 days')` can be periodically pruned
- Anonymous conversations are **not embedded** (no search indexing)

---

## 6. Active Conversation Resume `[CONVO-010]`

### 6.1 New API Route: `GET /api/conversations/active`

Returns the user's single active conversation with all messages.

```typescript
// 200 OK:
{ conversation: Conversation; messages: Message[] }

// 404 Not Found:
{} // No active conversation for this user
```

Logic:
1. `resolveUserId()` — auth session or anon cookie
2. Query: `SELECT * FROM conversations WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1`
3. If found → `interactor.get(conv.id, userId)` → return conversation + messages
4. If not found → 404

### 6.2 Repository Changes

Add to `ConversationRepository`:
```typescript
findActiveByUser(userId: string): Promise<Conversation | null>;
archiveByUser(userId: string): Promise<void>;
```

Add to `ConversationDataMapper`:
```typescript
async findActiveByUser(userId: string): Promise<Conversation | null> {
  const row = this.db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1"
  ).get(userId);
  return row ? this.toEntity(row) : null;
}

async archiveByUser(userId: string): Promise<void> {
  this.db.prepare(
    "UPDATE conversations SET status = 'archived' WHERE user_id = ? AND status = 'active'"
  ).run(userId);
}
```

### 6.3 Client-Side Mount Flow

Replace the current `useEffect` in `ChatProvider`:

```typescript
useEffect(() => {
  const loadActive = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch("/api/conversations/active");
      if (res.ok) {
        const { conversation, messages } = await res.json();
        setConversationId(conversation.id);
        dispatch({ type: "REPLACE_ALL", messages: /* map to ChatMessage[] */ });
      }
      // 404 → no active → default hero message (already the initial state)
    } catch {
      // network error → default hero message
    } finally {
      setIsLoadingMessages(false);
    }
  };
  loadActive();
}, []);
```

### 6.4 Remove Multi-Conversation UI

The following become unused and are removed:
- `conversations` state and `setConversations`
- `isLoadingConversations` state
- `refreshConversations()` callback
- `loadConversation(id)` callback
- `deleteConversation(id)` callback
- Sidebar component rendering the conversations list
- `ChatContextType` properties: `conversations`, `isLoadingConversations`,
  `loadConversation`, `deleteConversation`, `refreshConversations`

Replaced with:
- `archiveConversation()` — archives current + resets state
- `GET /api/conversations/active` on mount (single fetch)

---

## 7. Single-Conversation Model `[CONVO-050]`

### 7.1 One Active, Many Archived

| State | Meaning | Query |
|-------|---------|-------|
| `active` | The one conversation the user sees | `WHERE user_id = ? AND status = 'active'` |
| `archived` | Previous conversations. Not shown in UI. Retained for search. | `WHERE user_id = ? AND status = 'archived'` |

Invariant: at most one `active` conversation per `user_id` at any time.
`ConversationInteractor.create()` must archive any existing active before
creating a new one.

### 7.2 Schema Addition

```sql
-- Migration: add status column
ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_conv_user_status ON conversations(user_id, status);
```

All existing conversations get `status = 'active'` (the DEFAULT). Users
with multiple existing conversations will have multiple "active" ones
initially — the `GET /api/conversations/active` route uses `LIMIT 1` so
this is safe. The first archive action normalizes the state.

### 7.3 "New Conversation" Flow

1. Client calls `POST /api/conversations/active/archive`
2. Server: `interactor.archiveActive(userId)`:
   - Sets current active conversation's status to `"archived"`
   - If the conversation has unembedded turns → enqueue for embedding (Sprint 2)
3. Response: `200` (or `404` if no active conversation)
4. Client: `setConversationId(null)`, `dispatch({ type: "REPLACE_ALL", messages: [] })`
5. Next user message → stream route auto-creates a new active conversation

### 7.4 Constants Adjustment

| Constant | Current | New | Rationale |
|----------|---------|-----|-----------|
| `MAX_CONVERSATIONS_PER_USER` | 50 | Remove limit | Archives accumulate for search; no user-facing cap needed |
| `MAX_MESSAGES_PER_CONVERSATION` | 100 | 200 | Summarization compresses context; higher limit for long sessions |

---

## 8. Rolling Summaries `[CONVO-030]`

### 8.1 Why Summarize

The LLM context window is finite. Sending 200 raw messages as history
wastes tokens, increases latency, and eventually hits limits. Summaries
compress older context while preserving the essential threads.

### 8.2 Summary Trigger

After persisting an assistant response in the stream route, check:

```
messageCount > SUMMARIZE_THRESHOLD (40)
AND messagesSinceLastSummary > SUMMARIZE_WINDOW (20)
```

`messagesSinceLastSummary` = count of messages with
`created_at > lastSummaryMessage.created_at` (or total count if no
summary exists).

If both conditions are met, run summarization asynchronously (after
the SSE stream has closed).

### 8.3 Summary Generation

**New use case:** `SummarizationInteractor`

```typescript
// src/core/use-cases/SummarizationInteractor.ts
export class SummarizationInteractor {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly llmSummarizer: LlmSummarizer, // new port
  ) {}

  async summarizeIfNeeded(conversationId: string, userId: string): Promise<void>
}
```

**New port:** `LlmSummarizer`

```typescript
// src/core/use-cases/LlmSummarizer.ts
export interface LlmSummarizer {
  summarize(messages: Message[]): Promise<string>;
}
```

**Adapter:** `AnthropicSummarizer` implements `LlmSummarizer`, calls
the Anthropic API with a dedicated summarization prompt:

```
Summarize the following conversation concisely. Preserve:
- Key topics discussed and conclusions reached
- Any book chapters, practitioners, or concepts referenced
- User preferences or decisions stated
- Action items or follow-ups mentioned
Format as a structured summary with topic headings.
```

**Storage:** Summary is stored as a message with:
- `role: "system"` (new value for the `Message.role` field)
- `content`: the summary text
- `parts: [{ type: "summary", text: "...", coversUpToMessageId: "..." }]`

### 8.4 Entity Changes

Expand `Message.role`:
```typescript
// Current:
role: "user" | "assistant"

// New:
role: "user" | "assistant" | "system"
```

Expand `MessagePart` union:
```typescript
// New variant added:
| { type: "summary"; text: string; coversUpToMessageId: string }
```

`coversUpToMessageId` records the last message ID that was summarized.
This enables the trigger to compute `messagesSinceLastSummary`.

### 8.5 Context Window Construction

When building the message history for an LLM call in the stream route:

```
[system prompt]
[most recent summary message, if any (as a system message)]
[all messages created after the summary]
[current user message]
```

This keeps the context window bounded. The raw messages remain in the
database for full-fidelity search indexing.

**Implementation location:** The stream route currently passes the full
`messages` array to `runClaudeAgentLoopStream()`. The context window
builder will be a new function that filters messages based on the most
recent summary.

### 8.6 Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `SUMMARIZE_THRESHOLD` | 40 | Don't summarize short conversations |
| `SUMMARIZE_WINDOW` | 20 | Always keep last 20 messages unsummarized |
| `SUMMARY_MAX_TOKENS` | 800 | Cap summary response length |

---

## 9. Conversation Search `[CONVO-040]`

### 9.1 Overview

Authenticated users can search their own conversation history. This
reuses the embedding pipeline (`EmbeddingPipeline`, `VectorStore`,
`BM25IndexStore`) and adds a new `ConversationChunker` to fill the
existing stub.

### 9.2 ConversationChunker

**File:** `src/core/search/ConversationChunker.ts`

Implements the `Chunker` interface:

```typescript
export class ConversationChunker implements Chunker {
  chunk(
    sourceId: string,
    content: string,
    metadata: ChunkMetadata,
    options?: ChunkerOptions,
  ): Chunk[]
}
```

**Chunking strategy:**
- Input `content` is a serialized conversation (all messages as text)
- Group consecutive user+assistant turns into **turn pairs**
- Each turn pair becomes one `"passage"` level chunk
- The chunk's `embeddingInput` is prefixed with context:
  ```
  Conversation about: {title}
  User: {user_message}
  Assistant: {assistant_message}
  ```
- Summary messages become `"document"` level chunks (higher weight)
- `metadata` is `ConversationMetadata` (from the discriminated union)

### 9.3 Embedding Pipeline Integration

Replace the throw in `EmbeddingPipelineFactory.createForSource()`:

```typescript
if (sourceType === "conversation") {
  const chunker = new ConversationChunker();
  const changeDetector = new ChangeDetector(this.vectorStore);
  return new EmbeddingPipeline(
    chunker,
    this.embedder,
    this.vectorStore,
    changeDetector,
    this.modelVersion,
  );
}
```

**When to embed:**
- **On archive** — when a conversation is archived via
  `POST /api/conversations/active/archive`, embed all its turns
- **Not on every message** — too expensive; archives are stable

**Source ID:** `"{userId}/{conversationId}"` — the `source_id` prefix
enables user-scoped search queries.

### 9.4 Search Result Type

Since `HybridSearchResult` is book-specific, define a separate type:

```typescript
// src/core/search/types.ts
export interface ConversationSearchResult {
  conversationId: string;
  conversationTitle: string;
  conversationDate: string;    // updated_at of the conversation
  matchPassage: string;        // the matching turn-pair text
  matchHighlight: string;      // highlighted query terms
  turnIndex: number;
  rrfScore: number;
  relevance: "high" | "medium" | "low";
}
```

### 9.5 Search Tool: `search_my_conversations`

**File:** `src/core/use-cases/tools/search-my-conversations.tool.ts`

```typescript
export function createSearchMyConversationsTool(/* deps */): ToolDescriptor {
  return {
    name: "search_my_conversations",
    schema: {
      description: "Search your own conversation history to recall past discussions.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          max_results: { type: "number", description: "Max results (1-10)." },
        },
        required: ["query"],
      },
    },
    command: new SearchMyConversationsCommand(/* deps */),
    roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
    category: "content",
  };
}
```

**Implementation:**
1. Use `HybridSearchEngine.search(query, { sourceType: "conversation" })`
2. Post-filter: `embedding.source_id.startsWith(userId + "/")` — ensures
   user can only search their own conversations
3. Map `EmbeddingRecord` results to `ConversationSearchResult`
4. Return formatted text for Claude to include in response

### 9.6 Library Cross-Reference `[CONVO-060]`

When a conversation passage mentions content from the library (detected
by overlapping terms with book chunk headings), the search result can
include related chapter references. This is a quality-of-life enhancement
deferred to the sprint doc for Sprint 2 — it may be as simple as running
a secondary search on the matching passage against `sourceType = "book_chunk"`.

---

## 10. System Prompt Integration

### 10.1 Summary in Context

When the conversation has a summary, the system prompt prefix includes:

```
[Previous conversation summary]
{summary text}

[Recent conversation continues below]
```

The LLM sees compressed history naturally — no special parsing needed.

### 10.2 ChatPolicyInteractor Updates

Add to `ROLE_DIRECTIVES` in `src/core/use-cases/ChatPolicyInteractor.ts`:

**AUTHENTICATED / STAFF / ADMIN** — append:
```
You have access to `search_my_conversations` to recall past discussion
topics. Use it when the user references something discussed previously
or asks "what did we talk about."
```

**ANONYMOUS** — no change (conversations not embedded; no search tool).

---

## 11. Security & Privacy

### 11.1 Conversation Scoping

All conversation operations are scoped by user ID:
- Active conversation: `WHERE user_id = ? AND status = 'active'`
- Conversation CRUD: `ConversationInteractor` enforces
  `conversation.userId === callerUserId` in `get()`, `delete()`, and
  `appendMessage()`
- Search: `source_id LIKE '{userId}/%'` filter prevents cross-user
  leakage

### 11.2 Anonymous Cookie Security

- `httpOnly: true` — not accessible to JavaScript
- `sameSite: "lax"` — no cross-site request attachment
- `secure: true` in production — HTTPS only
- Value is a `crypto.randomUUID()` — unpredictable, no PII

### 11.3 Anonymous Data Lifecycle

- Not embedded or searchable (too transient, not authenticated)
- Garbage-collectible: `WHERE user_id LIKE 'anon_%' AND updated_at < ?`
- On registration: future enhancement to migrate `anon_{uuid}` → real
  user ID

### 11.4 Summary Content

Summaries inherit the same content policies as the chat LLM. Stored as
messages within the conversation — same ownership-based access controls.

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Area | Tests | Description |
|------|-------|-------------|
| `resolveUserId()` | 3 | Auth user → real ID; anon with cookie → anon_uuid; anon first visit → new cookie + ID |
| `findActiveByUser()` | 3 | Returns active; returns null when none; ignores archived |
| Archive flow | 3 | Sets status to archived; only one active at a time; 404 when no active |
| `SummarizationInteractor` | 3 | Below threshold → skip; at threshold → summarize; respects window |
| Context window builder | 2 | With summary: [summary + recent]; without: [all messages] |
| `ConversationChunker` | 4 | Turn pairing; context prefix; summary as document chunk; empty conversation |
| `SearchMyConversationsCommand` | 2 | User-scoped results; no cross-user leakage |
| `MessagePart` summary type | 1 | Round-trip serialize/deserialize of summary part |

### 12.2 Integration Tests

| Area | Tests | Description |
|------|-------|-------------|
| Anonymous persistence | 1 | POST stream as anon → cookie set → GET active → conversation loaded |
| Resume across refresh | 1 | Create conversation → GET active → correct messages returned |
| Archive + new cycle | 1 | Archive → POST stream → new active created, old archived |

**Estimated total: ~24 new tests across 3 sprints**

---

## 13. Sprint Plan

### Sprint 0 — Anonymous Sessions + Active Conversation Resume

**Goal:** All users (including anonymous) get server-side conversation
persistence that survives page refreshes. Single-conversation model.

| Task | Description | Req |
|------|-------------|-----|
| 0.1 | Schema migration: add `status TEXT DEFAULT 'active'` + index | CONVO-050 |
| 0.2 | Add `findActiveByUser()` and `archiveByUser()` to `ConversationRepository` port | CONVO-010, CONVO-050 |
| 0.3 | Implement in `ConversationDataMapper` | CONVO-010, CONVO-050 |
| 0.4 | Implement `resolveUserId()` helper with `lms_anon_session` cookie | CONVO-020 |
| 0.5 | Remove `shouldPersist` gate in stream route; use `resolveUserId()` | CONVO-020 |
| 0.6 | Create `GET /api/conversations/active` route | CONVO-010 |
| 0.7 | Create `POST /api/conversations/active/archive` route | CONVO-050 |
| 0.8 | Update `ConversationInteractor`: `archiveActive()`, adjust `create()` | CONVO-050 |
| 0.9 | Update `ChatProvider` mount — single `GET /api/conversations/active` | CONVO-010 |
| 0.10 | Remove multi-conversation UI (sidebar, list, delete, load) | CONVO-050 |
| 0.11 | Add "New conversation" button that archives + resets | CONVO-050 |
| 0.12 | Unit + integration tests (~12 new) | |
| 0.13 | Full suite green, build clean | |

**Deliverable: 376 existing + ~12 new = ~388 tests, conversations survive
refresh for all users.**

### Sprint 1 — Rolling Summaries

**Goal:** Long conversations are automatically summarized. The LLM context
window stays bounded. Users never hit the message limit wall.

| Task | Description | Req |
|------|-------------|-----|
| 1.1 | Add `summary` variant to `MessagePart` union | CONVO-030 |
| 1.2 | Expand `Message.role` to include `"system"` | CONVO-030 |
| 1.3 | Define `LlmSummarizer` port | CONVO-030 |
| 1.4 | Implement `AnthropicSummarizer` adapter | CONVO-030 |
| 1.5 | Implement `SummarizationInteractor` | CONVO-030 |
| 1.6 | Build context window function (summary + recent messages) | CONVO-030 |
| 1.7 | Wire trigger into stream route (post-response async) | CONVO-030 |
| 1.8 | Raise `MAX_MESSAGES_PER_CONVERSATION` to 200 | CONVO-030 |
| 1.9 | Unit + integration tests (~6 new) | |
| 1.10 | Full suite green, build clean | |

**Deliverable: ~388 existing + ~6 new = ~394 tests, long conversations
auto-summarize.**

### Sprint 2 — Conversation Embedding + Search

**Goal:** Archived conversations are embedded and searchable. Authenticated
users can recall past discussions via `search_my_conversations`.

| Task | Description | Req |
|------|-------------|-----|
| 2.1 | Implement `ConversationChunker` (turn-pair chunking) | CONVO-040 |
| 2.2 | Wire into `EmbeddingPipelineFactory.createForSource("conversation")` | CONVO-040 |
| 2.3 | Trigger embedding on archive | CONVO-040 |
| 2.4 | Define `ConversationSearchResult` type | CONVO-040 |
| 2.5 | Create `search_my_conversations` tool descriptor + command | CONVO-040 |
| 2.6 | Register in tool composition root | CONVO-040 |
| 2.7 | Update `ChatPolicyInteractor` ROLE_DIRECTIVES | CONVO-040 |
| 2.8 | Unit + integration tests (~7 new) | |
| 2.9 | Full suite green, build clean | |

**Deliverable: ~394 existing + ~7 new = ~401 tests, conversation search
working.**

---

## 14. Future Considerations

These items are explicitly out of scope for Sprints 0–2.

### 14.1 Multi-Conversation (Phase 2)

The `status` column and archive flow already support browsing past
conversations. If demand emerges:
- Archived conversations become visible in a sidebar or search results
- Each conversation retains its auto-generated title
- The single-conversation invariant relaxes to allow switching

### 14.2 Anonymous → Authenticated Migration

On registration, migrate `anon_{uuid}` conversations to the new user ID:
```sql
UPDATE conversations SET user_id = ? WHERE user_id = ?
UPDATE embeddings SET source_id = REPLACE(source_id, ?, ?) WHERE source_id LIKE ?
```

### 14.3 Conversation Analytics

Anonymous session cookies enable basic analytics:
- Session frequency, return rate, engagement depth
- Topic clustering via conversation embeddings
- Conversion analysis (anonymous → registered)

### 14.4 Cross-Source Search

A "search everything" tool could query both `book_chunk` and
`conversation` source types in a single `HybridSearchEngine.search()`
call. Requires generalizing `HybridSearchResult` into a discriminated
union. The `VectorQuery.sourceType` filter already supports this pattern.

### 14.5 Proactive Recall

Instead of waiting for the user to search, run a background similarity
check on each user message against conversation embeddings. If a strong
match is found, inject "Relevant prior discussion: ..." into the system
prompt. This makes the advisor "remember" without explicit user action.
