# Conversation Memory — System Spec

> **Status:** Draft v2.1
> **Date:** 2026-03-15
> **Scope:** Transparent, server-side conversation continuity for all
> users. One active conversation per user, auto-resumed on page load,
> periodically summarized, and searchable via the existing hybrid
> search engine. Anonymous users get a stable cookie-based session so
> their conversation persists across refreshes. Anonymous-to-authenticated
> conversion tracking. Database-backed system prompt management with
> versioning and per-role control via MCP tools. Admin conversation
> analytics for engagement analysis and conversion optimization.
> Kernel generalization to decouple domain-specific naming and
> configuration from the reusable application core.
> **Dependencies:** RBAC (complete), Vector Search (complete), Tool
> Architecture (complete), Conversation persistence (complete),
> MCP Embedding Server (complete)
> **Affects:** `src/hooks/useGlobalChat.tsx`, `src/app/api/conversations/`,
> `src/app/api/chat/stream/route.ts`, `src/core/use-cases/ConversationInteractor.ts`,
> `src/core/use-cases/ChatPolicyInteractor.ts`, `src/lib/chat/policy.ts`,
> `src/core/search/EmbeddingPipelineFactory.ts`, `mcp/embedding-server.ts`,
> new `ConversationChunker`, new `search_my_conversations` tool,
> new `/api/conversations/active` route, new `system_prompts` table,
> new `conversation_events` table, new `SystemPromptRepository` port,
> new MCP tools: `prompt_list`, `prompt_get`, `prompt_set`,
> `prompt_rollback`, `conversation_analytics`, `conversation_inspect`
>
> **Metaphor:** The library has bookshelves (corpus) and a reading desk
> (conversation). The desk always has your open notebook — you don't
> lose your place when you step away. Over time, the advisor writes a
> concise summary in the margin so earlier pages don't slow you down.
> And if you want to recall something from an old conversation, you can
> search your own notebooks just like you search the library shelves.
> **Requirement IDs:** Each traceable requirement is tagged `CONVO-XXX`.
> Sprint tasks reference these IDs for traceability.
> **Implementation update (2026-03-15):** The active conversation restore
> flow, anonymous persistence path, anonymous-to-authenticated migration
> wiring, conversation-index ownership repair, summary-context prompt
> assembly, system-prompt management, and conversation analytics MCP tools
> have all been implemented. This spec now reflects those concrete
> behaviors while preserving the remaining roadmap items.

---

## 1. Problem Statement

### 1.1 Historical Gaps And Remaining Gaps

1. **Resolved: page refresh restore is now server-authoritative** —
   `ChatProvider` now calls `GET /api/conversations/active` on mount,
   hydrates the active conversation on `200`, keeps the hero state on
   `404`, and logs unexpected `401` responses. Active conversation lookup
   is now a first-class server route rather than an incidental byproduct of
   the multi-conversation list flow. `[CONVO-010]`

2. **Resolved: anonymous users now persist via cookie-backed identity** —
   conversation writes and active-conversation restore/archive routes use
   `resolveUserId()` with `lms_anon_session`, producing stable
   `anon_{uuid}` ownership. Middleware explicitly allows
   `/api/conversations/active` and `/api/conversations/active/archive`
   without a real session token while leaving account-scoped conversation
   routes authenticated. `[CONVO-020]`

3. **Resolved: long conversations are summarized and replayed as
  server-owned context** — `SummarizationInteractor` now writes summary
  messages with `role = "system"` and `parts: [{ type: "summary", ... }]`,
  the hard cap has been raised to `MAX_MESSAGES_PER_CONVERSATION = 200`, and
  `buildContextWindow()` now returns `summaryText` separately so the route can
  append it to a clearly delimited server-controlled block in
  `systemPrompt`. Older turns are compressed without turning the summary into
  fake user or assistant dialogue. `[CONVO-030]`

4. **Resolved: archived authenticated conversations are embedded and
  searchable** — `ConversationChunker` now exists, the embedding pipeline can
  build a real conversation pipeline, archive-time embedding writes
  owner-prefixed `source_id`s, and `search_my_conversations` is registered for
  authenticated roles. Search remains strict to the current owner prefix, and
  migrated anonymous conversations are repaired to the canonical owner during
  registration or via the repair script. `[CONVO-040]`

5. **Resolved: the UX now uses a single active-conversation model** — the UI no
  longer depends on list/switch/delete conversation management for the main
  chat experience. `ChatProvider` restores one active conversation on mount,
  `archiveConversation()` closes the current session, and the floating chat UI
  exposes a "New Chat" action that archives and resets instead of switching
  among many concurrent threads. `[CONVO-050]`

6. **Resolved: system prompts are now database-backed and versioned** — the
  current runtime path uses `SystemPromptDataMapper` plus
  `DefaultingSystemPromptRepository`, with `system_prompts` rows seeded from
  the prior hardcoded defaults. Prompt versions can now be listed, fetched,
  created, activated, diffed, and rolled back through MCP prompt tools, while
  hardcoded strings remain only as fallbacks and seeds. `[CONVO-060]`

7. **Resolved: conversation analytics now exist as admin MCP tools** —
  `conversation_analytics`, `conversation_inspect`, and
  `conversation_cohort` are now implemented in `mcp/analytics-tool.ts`
  and registered in `mcp/embedding-server.ts`. They query the
  `conversation_events`, `conversations`, and `messages` tables to
  expose overview, funnel, engagement, tool-usage, drop-off, and
  cohort-comparison views without adding a dedicated dashboard UI.
  `[CONVO-070]`

8. **Resolved: anonymous → authenticated conversion now preserves search
   ownership** — registration migrates conversations from `anon_{uuid}` to
   the new user, records `converted` events, and repairs conversation
   embeddings from the stale anonymous `source_id` prefix to the canonical
   authenticated owner prefix. A repair script exists for any previously
   migrated rows that predate the fix. `[CONVO-080]`

9. **Addressed in Sprint 5: the core layer is now corpus-first** — the
  runtime now uses canonical `Document`/`Section`/`CorpusRepository`
  concepts, `DocumentChunkMetadata`, config-driven tool descriptions,
  prompt seeds from `buildCorpusBasePrompt()`, and the generic
  `document_chunk` source type. Legacy book/chapter names remain as
  compatibility aliases so the reference-product shell and older tests
  keep working while the public kernel surface stays domain-agnostic.
  `[CONVO-090]`

### 1.2 Core Insight

This isn't ChatGPT. Users aren't having 50 different conversations about
50 different topics. They're having **one ongoing dialogue** about
product development — the site's single subject domain. The conversation
is more like a **journal** than a chat thread. It should:

- Always be there when they return
- Get smarter over time (summaries preserve context)
- Be searchable like the library itself
- Require zero conversation management from the user

But conversations are also the system's **primary feedback signal**.
Every anonymous session that ends without registration is a data point.
Every tool call that precedes a sign-up is a signal. The system should
capture these signals, make them visible to administrators, and let
admins tune the experience — especially the system prompts — without
code changes. The closed loop is:

```text
Anonymous visits → Conversations captured → Analytics surface patterns
  → Admin tunes prompts via MCP → Better conversion → Repeat
```

---

## 2. Current Architecture Inventory

### 2.1 Entities (`src/core/entities/`)

**`conversation.ts`:**

```typescript
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  convertedFrom: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastToolUsed: string | null;
  sessionSource: string;
  promptVersion: number | null;
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
  role: "user" | "assistant" | "system";
  content: string;
  parts: MessagePart[];
  createdAt: string;
  tokenEstimate: number;
}

export interface NewMessage {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts: MessagePart[];
}
```

**`message-parts.ts`:**

```typescript
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "summary"; text: string; coversUpToMessageId: string };
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
  create(conv: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    sessionSource?: string;
  }): Promise<Conversation>;
  listByUser(userId: string): Promise<ConversationSummary[]>;
  findById(id: string): Promise<Conversation | null>;
  findActiveByUser(userId: string): Promise<Conversation | null>;
  archiveByUser(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  touch(id: string): Promise<void>;
  incrementMessageCount(id: string): Promise<void>;
  setFirstMessageAt(id: string, timestamp: string): Promise<void>;
  setLastToolUsed(id: string, toolName: string): Promise<void>;
  setConvertedFrom(id: string, anonUserId: string): Promise<void>;
  transferOwnership(fromUserId: string, toUserId: string): Promise<string[]>;
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
const MAX_MESSAGES_PER_CONVERSATION = 200;
const AUTO_TITLE_MAX_LENGTH = 80;

export class ConversationInteractor {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async create(
    userId: string,
    title: string = "",
    options?: { sessionSource?: string },
  ): Promise<Conversation>;
  async get(
    conversationId: string,
    userId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }>;
  async getActiveForUser(
    userId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] } | null>;
  async list(userId: string): Promise<ConversationSummary[]>;
  async delete(conversationId: string, userId: string): Promise<void>;
  async archiveActive(userId: string): Promise<Conversation | null>;
  async appendMessage(msg: NewMessage, userId: string): Promise<Message>;
  async recordToolUsed(
    conversationId: string,
    toolName: string,
    role: string,
  ): Promise<void>;
  async migrateAnonymousConversations(
    anonUserId: string,
    newUserId: string,
  ): Promise<string[]>;
}

export class NotFoundError extends Error {
  name = "NotFoundError";
}
export class MessageLimitError extends Error {
  name = "MessageLimitError";
}
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

The current mapper includes `status`, `converted_from`, `message_count`,
`first_message_at`, `last_tool_used`, `session_source`, and `prompt_version`.

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

`role` persists `"user"`, `"assistant"`, and `"system"` messages. Summary
messages are stored via the `summary` message-part variant rather than a
dedicated table.

### 2.5 Composition Root — `conversation-root.ts`

**File:** `src/lib/chat/conversation-root.ts`

```typescript
export function getConversationInteractor(): ConversationInteractor {
  const db = getDb();
  const conversationRepo = new ConversationDataMapper(db);
  const messageRepo = new MessageDataMapper(db);
  const eventRepo = new ConversationEventDataMapper(db);
  const eventRecorder = new ConversationEventRecorder(eventRepo);
  return new ConversationInteractor(
    conversationRepo,
    messageRepo,
    eventRecorder,
  );
}
```

### 2.6 Stream Route — Persistence Flow

**File:** `src/app/api/chat/stream/route.ts`

1. `getSessionUser()` resolves role for prompt/tool policy.
2. `resolveUserId()` resolves persistence ownership (`user.id` or `anon_{uuid}`).
3. If no `conversationId`, `interactor.create(userId, title)` creates a new active conversation.
4. User messages persist for all users through `appendMessage(..., userId)`.
5. `buildContextWindow()` returns recent real turns plus `summaryText`.
6. If `summaryText` exists, the stream route appends it to `systemPrompt` in a
   server-controlled block.
7. SSE emits `conversation_id` first, then deltas/tool events.
8. After stream completion, the assistant message is persisted and summarization
   is triggered asynchronously.

### 2.7 Client State — `useGlobalChat.tsx`

**File:** `src/hooks/useGlobalChat.tsx`

State shape:

- `messages: ChatMessage[]` — via `useReducer`
- `conversationId: string | null` — via `useState`
- `input`, `isSending`, `isLoadingMessages`

Key methods in `ChatContextType`:

```typescript
sendMessage: (eventOrMessage?: { preventDefault: () => void } | string) => Promise<void>;
newConversation: () => void;
archiveConversation: () => Promise<void>;
```

Current mount behavior:

```typescript
useEffect(() => {
  const loadActive = async () => {
    const res = await fetch("/api/conversations/active");
    if (res.status === 404) return;
    if (res.status === 401) {
      console.warn(
        "Active conversation restore unexpectedly required authentication.",
      );
      return;
    }
    if (!res.ok) return;
    // hydrate current conversation
  };
  loadActive();
}, []);
```

This uses `GET /api/conversations/active` directly and works for both
authenticated users and anonymous cookie-backed users.

### 2.8 Existing API Routes

| Route                               | Method | Auth     | Purpose                                                                         |
| ----------------------------------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `/api/conversations`                | GET    | Required | List account-owned conversations                                                |
| `/api/conversations`                | POST   | Required | Create account-owned conversation                                               |
| `/api/conversations/[id]`           | GET    | Required | Get conversation + messages                                                     |
| `/api/conversations/[id]`           | DELETE | Required | Delete conversation                                                             |
| `/api/conversations/active`         | GET    | Optional | Restore the current active conversation via authenticated or anonymous identity |
| `/api/conversations/active/archive` | POST   | Optional | Archive the current active conversation via authenticated or anonymous identity |
| `/api/chat/stream`                  | POST   | Optional | Stream chat, persist for all users                                              |

Account-scoped conversation CRUD routes require `lms_session_token`.
The active restore/archive routes intentionally use `resolveUserId()` and
remain accessible to anonymous cookie-backed users.

### 2.9 Search Infrastructure (Relevant Subsystems)

**Embedding pipeline:**

```typescript
// EmbeddingPipelineFactory (src/core/search/EmbeddingPipelineFactory.ts)
constructor(
  private embedder: Embedder,
  private vectorStore: VectorStore,
  private modelVersion: string,
)
createForSource(sourceType: string): EmbeddingPipeline
// "conversation" case: uses ConversationChunker

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
export class ChatPolicyInteractor implements UseCase<
  { role: RoleName },
  string
> {
  constructor(private readonly basePrompt: string) {}
  async execute({ role }: { role: RoleName }): Promise<string>;
}
```

**`ROLE_DIRECTIVES`** includes per-role context. Currently no
conversation-search directive for AUTHENTICATED+.

**Composition root** (`src/lib/chat/tool-composition-root.ts`):

```typescript
export function createToolRegistry(
  bookRepo: BookRepository,
  handler?: SearchHandler,
): ToolRegistry;
export function getToolRegistry(): ToolRegistry;
export function getToolExecutor(): ToolExecuteFn;
export function getEmbeddingPipelineFactory(): EmbeddingPipelineFactory;
export function getSearchHandler(): SearchHandler;
```

Tools are registered in order; `search_my_conversations` is now part of
this composition root for `AUTHENTICATED`, `STAFF`, and `ADMIN` roles.

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
   result can link to the relevant chapter. `[CONVO-045]`

7. **Runtime prompt management** — system prompts (base prompt and per-role
   directives) are stored in the database, versioned, and editable via MCP
   tools. Admins can tune the anonymous experience, adjust role directives,
   and roll back changes — all without code deploys. `[CONVO-060]`

8. **Conversion tracking** — when an anonymous user registers, their
   conversation history migrates to their new authenticated identity.
   The conversion event is recorded, enabling funnel analysis from first
   anonymous message through registration. `[CONVO-080]`

9. **Conversation analytics** — administrators can query aggregate
   engagement metrics, inspect individual conversations, compare cohorts
   (anonymous vs. authenticated vs. converted), and identify drop-off
   patterns — all via MCP tools in the embedding server. `[CONVO-070]`

10. **Event instrumentation** — key conversation lifecycle events
    (started, tool_used, summarized, archived, converted,
    prompt_version_changed) are recorded in a `conversation_events`
    table, providing the foundation for all analytics. `[CONVO-070]`

11. **Kernel generalization** — the domain layer (`src/core/`) uses
    generic, content-agnostic names. Entities, repository ports, search
    types, and tool descriptors reference "documents" and "corpus" —
    not books, chapters, or any specific domain. Configuration (source
    types, corpus metadata, tool descriptions) is externalized so the
    system can be re-deployed for a different domain by swapping content
    and config, not code. `[CONVO-090]`

---

## 4. Architecture Overview

```text
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

┌─────────────────────────────────────────────────────────────────────┐
│               MCP Tool Servers (stdio, admin)                       │
│                                                                     │
│  embedding-server.ts                                                │
│    → Corpus tools: corpus_list, corpus_search, ...                  │
│    → Embedding tools: embed_source, reindex, ...                    │
│    → Prompt tools: prompt_list, prompt_set, prompt_rollback (S3)    │
│    → Analytics tools: conversation_analytics, inspect, cohort (S4)  │
│    → Each server: own better-sqlite3 connection via getDb()         │
│                                                                     │
│  calculator-mcp-server.ts (standalone, 1 tool)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision                    | Choice                                                                            | Rationale                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Anonymous identity          | `lms_anon_session` httpOnly cookie with UUID                                      | Stable per-device ID without auth; scopes conversations; no PII                               |
| Conversation model          | One active per user; others archived                                              | Matches advisory domain — not ChatGPT multi-thread; reduces UX complexity                     |
| Resume mechanism            | `GET /api/conversations/active` on mount                                          | Server-authoritative; survives hard refresh; no localStorage needed                           |
| `status` column             | `"active"` or `"archived"` on `conversations` table                               | Simple state machine; at most one active per user; index enables fast lookup                  |
| Summarization strategy      | LLM-generated summary stored as system message                                    | Leverages existing Claude API; summaries are semantic, not mechanical                         |
| Summary trigger             | Threshold (40 msgs) + window (20 preserved)                                       | Avoids premature summarization; keeps recent context raw for quality                          |
| Conversation chunking       | Turn-pair grouping (user+assistant → passage)                                     | Natural semantic units; reuses `Chunker` interface for `EmbeddingPipeline`                    |
| Embedding timing            | On archive (not per-message)                                                      | Batching avoids per-turn embedding cost; archives are stable (no further edits)               |
| Conversation search         | New tool + `VectorQuery.sourceType = "conversation"` filter                       | Reuses existing `HybridSearchEngine`; filter by source_id prefix for user scoping             |
| Result type                 | New `ConversationSearchResult` (not extending book-specific `HybridSearchResult`) | `HybridSearchResult` fields are all book-specific; conversation results need different fields |
| Anonymous search            | Not supported (anonymous conversations not embedded)                              | Anonymous conversations are transient; embedding cost not justified                           |
| Prompt storage              | Database-backed `system_prompts` table with versioning                            | Enables runtime editing without deploys; audit trail of changes                               |
| Prompt management           | MCP tools on embedding server (not in-app chat tools)                             | Admins use Claude Desktop / MCP client for system config; keeps chat tools user-facing        |
| Event instrumentation       | `conversation_events` table with typed events                                     | Lightweight append-only log; powers all analytics without mining messages                     |
| Conversion tracking         | `converted_from` column on conversations + migration on register                  | Traces the full anonymous→authenticated funnel; preserves conversation continuity             |
| Analytics delivery          | MCP tools (not dashboard UI)                                                      | Consistent with librarian/embedding admin pattern; no frontend needed                         |
| Conversation metadata       | Denormalized `message_count`, `first_message_at`, `last_tool_used`                | Avoids expensive JOINs for analytics queries; updated on each message append                  |
| Core entity naming          | `Document`/`Corpus` over `Book`/`Chapter`                                         | Domain-agnostic core enables re-deployment for any knowledge domain                           |
| Source type registry        | Externalized `source_type` config, no hardcoded `"book_chunk"`                    | New domains register their source type without touching search infrastructure                 |
| Tool description generation | Auto-generated from registry + corpus metadata                                    | Tool descriptions stay accurate as corpus changes; no manual prompt editing                   |
| Corpus metadata             | Externalized to config file or DB, not hardcoded in tool factories                | Corpus size, structure, and description become deployment config                              |

---

## 5. Anonymous User Identity `[CONVO-020]`

### 5.1 Problem

This path is now implemented. `getSessionUser()` still returns the
role-level `ANONYMOUS_USER`, but persistence ownership is resolved
separately through `resolveUserId()` and the `lms_anon_session` cookie.

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

**Chosen implementation:** `resolveUserId()` eagerly creates a lightweight
anonymous user row in `users` plus a `role_anonymous` entry in
`user_roles`. This preserves referential integrity for the conversation
FK without relaxing the schema.

### 5.4 Stream Route Change

All users now persist. For anonymous users, the persistence owner is the
`anon_{uuid}` returned by `resolveUserId()`, not the display identity from
`ANONYMOUS_USER`.

### 5.5 Privacy & Cleanup

- Anonymous conversation data is tied to a random UUID, not PII
- No email, name, or account information is stored
- Garbage collection: conversations where `user_id LIKE 'anon_%' AND
updated_at < datetime('now', '-30 days')` can be periodically pruned
- Anonymous conversations are **not embedded** (no search indexing)

**Expired session UX (_Krug_):** When an anonymous user returns after
their session has been pruned (no active conversation found), the UI
shows the default hero message. No error state, no alarming language.
This is indistinguishable from a first visit — which is the correct
behavior. Anonymous users have no expectation of permanent storage.
If future analytics show returning-anonymous drop-off is significant,
consider a soft message: "Welcome back! Start a new conversation below."

### 5.6 Anonymous → Authenticated Migration `[CONVO-080]`

When a user registers after chatting anonymously, migrate their
conversation history to preserve continuity and enable conversion
tracking.

**Trigger:** Registration endpoint (`/api/auth/register`) — after
creating the new user, check for an `lms_anon_session` cookie.

**Migration logic:**

```typescript
async function migrateAnonymousConversations(
  anonUserId: string, // "anon_{uuid}" from cookie
  newUserId: string, // the newly created user ID
): Promise<string[]> {
  // 1. Transfer ownership of all conversations
  // 2. Record a converted event per migrated conversation
  // 3. Return migrated conversation IDs to the caller
}
```

**Schema support:** Add `converted_from TEXT DEFAULT NULL` to the
`conversations` table. This column records the original `anon_{uuid}`
when a conversation was migrated, enabling funnel analysis.

**User experience:** After registration, the user's next page load
calls `GET /api/conversations/active` with their new authenticated
session. Their conversation appears exactly as they left it — zero
disruption.

**Index repair:** After ownership transfer, the registration route calls
`repairConversationOwnershipIndex(conversationId, newUserId, anonUserId)`
for each migrated conversation. This removes stale anonymous
`source_id = "anon_{uuid}/{conversationId}"` embeddings and reindexes the
conversation under the canonical authenticated owner prefix.

**Operational repair path:** `npm run repair:conversation-indexes` repairs
any previously migrated rows whose vector ownership predates this fix.

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

| State      | Meaning                                                       | Query                                       |
| ---------- | ------------------------------------------------------------- | ------------------------------------------- |
| `active`   | The one conversation the user sees                            | `WHERE user_id = ? AND status = 'active'`   |
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

**Migration rollback strategy (_Booch_):** All schema migrations in this
spec use `ALTER TABLE ... ADD COLUMN` (additive) or `CREATE TABLE`
(new). These are forward-only — SQLite does not support `DROP COLUMN`
prior to 3.35.0. Rollback approach:

- New columns with defaults are harmless to old code (ignored)
- New tables are harmless to old code (not queried)
- If a sprint must be reverted, deploy the previous code version; the
  extra columns/tables remain but are inert
- Destructive rollback (dropping columns/tables) is never required for
  any sprint in this spec
- Data-only rollback: `conversation_events` is append-only; deleting
  events doesn't affect core conversation functionality

### 7.3 "New Conversation" Flow

1. Client shows a brief inline confirmation: **"Start fresh? Your
   current conversation will be saved and searchable."** with
   **[Start fresh]** / **[Cancel]** actions. This prevents accidental
   loss of long conversations. (_Krug_: users need a safety net for
   irreversible actions, but a modal dialog is overkill — an inline
   prompt beneath the button is sufficient.)
2. On confirm → client calls `POST /api/conversations/active/archive`
3. Server: `interactor.archiveActive(userId)`:
   - Sets current active conversation's status to `"archived"`
   - If the conversation has unembedded turns → enqueue for embedding (Sprint 2)
4. Response: `200` (or `404` if no active conversation)
5. Client: `setConversationId(null)`, `dispatch({ type: "REPLACE_ALL", messages: [] })`
6. Next user message → stream route auto-creates a new active conversation

### 7.4 Constants Adjustment

| Constant                        | Current | New          | Rationale                                                        |
| ------------------------------- | ------- | ------------ | ---------------------------------------------------------------- |
| `MAX_CONVERSATIONS_PER_USER`    | 50      | Remove limit | Archives accumulate for search; no user-facing cap needed        |
| `MAX_MESSAGES_PER_CONVERSATION` | 100     | 200          | Summarization compresses context; higher limit for long sessions |

---

## 8. Rolling Summaries `[CONVO-030]`

### 8.1 Why Summarize

The LLM context window is finite. Sending 200 raw messages as history
wastes tokens, increases latency, and eventually hits limits. Summaries
compress older context while preserving the essential threads.

### 8.2 Summary Trigger

After persisting an assistant response in the stream route, check:

```text
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
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async summarizeIfNeeded(conversationId: string): Promise<void>;
}
```

> **Note:** `userId` is not needed — the interactor operates within a
> single conversation identified by `conversationId`. The optional
> `eventRecorder` emits the `summarized` event (§12.3).

**New port:** `LlmSummarizer`

```typescript
// src/core/use-cases/LlmSummarizer.ts
export interface LlmSummarizer {
  summarize(messages: Message[]): Promise<string>;
}
```

**Adapter:** `AnthropicSummarizer` implements `LlmSummarizer`, calls
the Anthropic API with a dedicated summarization prompt:

```text
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
role: "user" | "assistant";

// New:
role: "user" | "assistant" | "system";
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

```text
[system prompt — separate parameter, not in messages array]
[server summary block appended to system prompt, if any]
  → "[Server summary of earlier conversation]\n{summary text}"
[all non-system messages created after the summary]
```

> **Why attach the summary to the system prompt?** The summary is
> server-owned context, not user-authored dialogue. Keeping it in the
> `system` channel preserves the instruction boundary and avoids synthetic
> user/assistant turns that can be mistaken for real conversation history.

This keeps the context window bounded. The raw messages remain in the
database for full-fidelity search indexing.

`buildContextWindow()` returns `{ contextMessages, hasSummary, summaryText }`.
`contextMessages` contains only real user/assistant turns after the most recent
summary. If `summaryText` exists, the stream route appends it to the
`systemPrompt` inside a clearly delimited server block.

### 8.6 Constants

| Constant              | Value | Purpose                                   |
| --------------------- | ----- | ----------------------------------------- |
| `SUMMARIZE_THRESHOLD` | 40    | Don't summarize short conversations       |
| `SUMMARIZE_WINDOW`    | 20    | Always keep last 20 messages unsummarized |
| `SUMMARY_MAX_TOKENS`  | 800   | Cap summary response length               |

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
  ): Chunk[];
}
```

**Chunking strategy:**

- Input `content` is a serialized conversation (all messages as text)
- Group consecutive user+assistant turns into **turn pairs**
- Each turn pair becomes one `"passage"` level chunk
- The chunk's `embeddingInput` is prefixed with a context marker:

  ```text
  Conversation:
  User: {user_message}
  Assistant: {assistant_message}
  ```

  > **Note:** The prefix uses a generic `"Conversation:"` marker rather than
  > injecting the auto-generated title, which is typically too generic
  > (e.g., "New Conversation") to add meaningful semantic signal.
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

**Embedding model version tracking (_Hinton_):** Each embedding record
already stores `model_version` (Section 2.11). When the embedding model
is changed (e.g., from `all-MiniLM-L6-v2@1.0` to a new version), old
conversation embeddings become incomparable with new query embeddings.
Re-indexing strategy:

- The existing `ChangeDetector` compares `model_version` on stored
  embeddings against the current model. Mismatches trigger re-embedding.
- For conversations: a batch re-index job (already available via MCP
  `reindex` tool) processes all `source_type = 'conversation'` records
  with stale `model_version`.
- This is the same strategy used for corpus content — no special
  conversation-specific logic needed.

**Source ID:** `"{userId}/{conversationId}"` — the `source_id` prefix
enables user-scoped search queries.

### 9.4 Search Result Type

Since `HybridSearchResult` is book-specific, define a separate type:

```typescript
// src/core/search/types.ts
export interface ConversationSearchResult {
  conversationId: string;
  conversationTitle: string;
  conversationDate: string; // updated_at of the conversation
  matchPassage: string; // the matching turn-pair text
  matchHighlight: string; // highlighted query terms
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
      description:
        "Search your own conversation history to recall past discussions.",
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

1. Query `VectorStore.getAll({ sourceType: "conversation", chunkLevel: "passage" })`
2. Post-filter: `record.sourceId.startsWith(userId + "/")` — ensures
   user can only search their own conversations
3. Embed the query, L2-normalize, and rank by dot similarity
4. Map top-N `EmbeddingRecord` results to `ConversationSearchResult`
5. Return formatted text for Claude to include in response

> **Note:** Conversation search uses vector-only similarity rather than
> `HybridSearchEngine` (which fuses vector + BM25 via RRF). Conversations
> are not indexed in `BM25IndexStore` because short turn-pair text benefits
> more from semantic similarity than keyword matching, and this avoids
> coupling to the book-oriented BM25 infrastructure.

### 9.6 Library Cross-Reference `[CONVO-045]`

When a conversation passage mentions content from the library (detected
by overlapping terms with book chunk headings), the search result can
include related chapter references. This is a quality-of-life enhancement
deferred to the sprint doc for Sprint 2 — it may be as simple as running
a secondary search on the matching passage against `sourceType = "document_chunk"`.

---

## 10. System Prompt Integration

### 10.1 Summary in Context

When the conversation has a summary, the system prompt prefix includes:

```text
[Server summary of earlier conversation]
{summary text}

[Recent conversation continues below]
```

The LLM sees compressed history naturally — no special parsing needed.

### 10.2 ChatPolicyInteractor Updates

Add to `ROLE_DIRECTIVES` in `src/core/use-cases/ChatPolicyInteractor.ts`:

**AUTHENTICATED / STAFF / ADMIN** — append:

```text
You have access to `search_my_conversations` to recall past discussion
topics. Use it when the user references something discussed previously
or asks "what did we talk about."
```

**ANONYMOUS** — no change (conversations not embedded; no search tool).

**Discoverability (_Krug_):** The role directive tells Claude the tool
exists, but users need a nudge too. In the hero message (shown when no
active conversation exists or after archiving), include a brief hint:
_"Tip: You can ask me to recall past discussions — try 'What did we
talk about regarding [topic]?'"_ This appears once and teaches the
capability without adding persistent UI. Also: the first time Claude
returns a `search_my_conversations` result, the response should
naturally reference the source: _"From our conversation on [date]..."_
to establish the pattern.

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
- On registration: `anon_{uuid}` → real user ID migration
  (see Section 5.6 — implemented in Sprint 0, CONVO-080)

### 11.4 Summary Content

Summaries inherit the same content policies as the chat LLM. Stored as
messages within the conversation — same ownership-based access controls.

---

## 12. Conversation Events `[CONVO-070]`

### 12.1 Purpose

Every conversation lifecycle event is recorded in an append-only events
table. This provides the foundation for all analytics queries without
requiring expensive message-table mining.

### 12.2 Schema

```sql
CREATE TABLE IF NOT EXISTS conversation_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_events_conv ON conversation_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_events_type ON conversation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conv_events_created ON conversation_events(created_at);
```

### 12.3 Event Types

| Event Type               | When Emitted                        | Metadata                                                                          |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------- |
| `started`                | First message in a new conversation | `{ session_source: "anonymous_cookie" \| "authenticated" }`                       |
| `message_sent`           | User sends a message                | `{ role: "user", token_estimate: number }`                                        |
| `tool_used`              | LLM calls a tool                    | `{ tool_name: string, role: RoleName }`                                           |
| `summarized`             | Summarization completes             | `{ messages_covered: number, summary_tokens: number }`                            |
| `archived`               | Conversation archived               | `{ message_count: number, duration_hours: number }`                               |
| `converted`              | Anonymous → authenticated migration | `{ from: "anon_{uuid}", to: "usr_{id}" }`                                         |
| `prompt_version_changed` | Admin changes active prompt         | `{ role: string, prompt_type: string, old_version: number, new_version: number }` |

### 12.4 Emitter

A lightweight `ConversationEventRecorder` utility — a synchronous
append-only writer, not a pub/sub event bus. Used inline at the point
of action:

```typescript
// src/core/use-cases/ConversationEventRecorder.ts
export interface ConversationEventRepository {
  record(event: {
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export class ConversationEventRecorder {
  constructor(private readonly repo: ConversationEventRepository) {}

  async record(
    conversationId: string,
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repo.record({ conversationId, eventType, metadata });
  }
}
```

**Adapter:** `ConversationEventDataMapper` implements the repository
with a simple INSERT into `conversation_events`.

> **Naming note (_Booch_):** This is a recorder, not an emitter. There
> are no subscribers, no event bus, no decoupled listeners — just a
> synchronous write to an append-only table. The name
> `ConversationEventRecorder` reflects the actual pattern.

### 12.5 Extended Conversation Metadata

To support fast analytics queries without expensive JOINs, add
denormalized columns to the `conversations` table:

```sql
ALTER TABLE conversations ADD COLUMN converted_from TEXT DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN first_message_at TEXT DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN last_tool_used TEXT DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN session_source TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE conversations ADD COLUMN prompt_version INTEGER DEFAULT NULL;
```

| Column             | Purpose                                         | Updated By                   |
| ------------------ | ----------------------------------------------- | ---------------------------- |
| `converted_from`   | Original `anon_{uuid}` after migration          | Registration flow            |
| `message_count`    | Denormalized message count                      | `appendMessage()`            |
| `first_message_at` | Timestamp of first message                      | `appendMessage()` (if null)  |
| `last_tool_used`   | Name of most recent tool call                   | Stream route on `onToolCall` |
| `session_source`   | `"anonymous_cookie"` or `"authenticated"`       | `create()`                   |
| `prompt_version`   | Active prompt version when conversation started | `create()`                   |

### 12.6 Token Estimation

Add a `token_estimate` column to the `messages` table:

```sql
ALTER TABLE messages ADD COLUMN token_estimate INTEGER NOT NULL DEFAULT 0;
```

Estimated as `Math.ceil(content.length / 4)` — a simple chars÷4
heuristic. No `tiktoken` dependency needed. Accurate enough for
analytics and context-window budgeting.

### 12.7 Summarization Quality Gate `[CONVO-030]`

LLM summaries can hallucinate or drop critical details. To mitigate:

1. **Mechanical verification** — after generating a summary, verify that
   it preserves: (a) the count of user messages covered (±1), (b) any
   tool names referenced in the original messages. If the summary
   mentions a tool not present in the source messages, or omits a tool
   that was used, log a warning. This is a heuristic, not a hard gate.

2. **Original messages retained** — summaries never delete the source
   messages. They remain in the database for search indexing and for
   auditing the summary against the original content.

3. **`coversUpToMessageId`** — the summary part records which message
   it covers through, enabling verification of coverage.

> **Note (_Hinton_):** The summary is a lossy compression. The quality
> gate is intentionally lightweight — a full semantic equivalence check
> would require a second LLM call and isn't worth the cost. The key
> safety net is that originals are never deleted.

---

## 13. System Prompt Management `[CONVO-060]`

### 13.1 Historical Problem

System prompts were originally hardcoded:

- `BASE_PROMPT` in `src/lib/chat/policy.ts` (48 lines)
- `ROLE_DIRECTIVES` in `src/core/use-cases/ChatPolicyInteractor.ts`
  (per-role strings)

Changing the anonymous experience required a code change → commit →
rebuild → deploy. There was no versioning, no rollback capability, and
no audit trail.

That limitation is now addressed by the `system_prompts` table,
`SystemPromptRepository`, and MCP prompt-management tools described in this
section. The hardcoded prompt content remains only as seed and fallback data.

### 13.2 Schema

```sql
CREATE TABLE IF NOT EXISTS system_prompts (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT DEFAULT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_active
  ON system_prompts(role, prompt_type) WHERE is_active = 1;
```

| Column        | Purpose                                                           |
| ------------- | ----------------------------------------------------------------- |
| `role`        | `"ALL"` for the base prompt, or a `RoleName` for a role directive |
| `prompt_type` | `"base"` or `"role_directive"`                                    |
| `content`     | The full prompt text                                              |
| `version`     | Auto-incrementing per `(role, prompt_type)` pair                  |
| `is_active`   | `1` for the currently active version; `0` for historical          |
| `created_by`  | User ID of the admin who created this version                     |
| `notes`       | Free-text explanation of why this change was made                 |

**Seed:** On first run, insert the current hardcoded prompts as
version 1 with `is_active = 1`. The hardcoded constants become
fallbacks only — used if the database has no active prompt (defensive).

### 13.3 Port — `SystemPromptRepository`

```typescript
// src/core/use-cases/SystemPromptRepository.ts
export interface SystemPrompt {
  id: string;
  role: string;
  promptType: "base" | "role_directive";
  content: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  notes: string;
}

export interface SystemPromptRepository {
  getActive(role: string, promptType: string): Promise<SystemPrompt | null>;
  listVersions(role: string, promptType: string): Promise<SystemPrompt[]>;
  getByVersion(
    role: string,
    promptType: string,
    version: number,
  ): Promise<SystemPrompt | null>;
  createVersion(params: {
    role: string;
    promptType: string;
    content: string;
    createdBy: string;
    notes: string;
  }): Promise<SystemPrompt>;
  activate(role: string, promptType: string, version: number): Promise<void>;
}
```

### 13.4 Adapter — `SystemPromptDataMapper`

Implements `SystemPromptRepository` via `better-sqlite3`.

`createVersion()`:

1. Compute next version: `SELECT MAX(version) FROM system_prompts WHERE role = ? AND prompt_type = ?` + 1
2. INSERT new row with `is_active = 0`
3. Return the new record

`activate()`:

1. In a transaction:
   - `UPDATE system_prompts SET is_active = 0 WHERE role = ? AND prompt_type = ? AND is_active = 1`
   - `UPDATE system_prompts SET is_active = 1 WHERE role = ? AND prompt_type = ? AND version = ?`

### 13.5 ChatPolicyInteractor Refactor

Current:

```typescript
export class ChatPolicyInteractor {
  constructor(private readonly basePrompt: string) {}
  async execute({ role }) {
    return this.basePrompt + ROLE_DIRECTIVES[role];
  }
}
```

New (uses Null Object pattern via `DefaultingSystemPromptRepository`):

```typescript
// Decorator that returns fallback content when the DB has no active prompt
export class DefaultingSystemPromptRepository implements SystemPromptRepository {
  constructor(
    private readonly inner: SystemPromptRepository,
    private readonly fallbackBase: string,
    private readonly fallbackDirectives: Record<RoleName, string>,
  ) {}

  async getActive(role: string, promptType: string): Promise<SystemPrompt> {
    const result = await this.inner.getActive(role, promptType);
    if (result) return result;
    // Return a Null Object with fallback content
    const content =
      promptType === "base"
        ? this.fallbackBase
        : (this.fallbackDirectives[role as RoleName] ?? "");
    return {
      id: "fallback",
      role,
      promptType: promptType as "base" | "role_directive",
      content,
      version: 0,
      isActive: true,
      createdAt: "",
      createdBy: null,
      notes: "hardcoded fallback",
    };
  }
  // delegate all other methods to this.inner
}

export class ChatPolicyInteractor {
  constructor(private readonly promptRepo: SystemPromptRepository) {}

  async execute({ role }: { role: RoleName }): Promise<string> {
    const base = await this.promptRepo.getActive("ALL", "base");
    const directive = await this.promptRepo.getActive(role, "role_directive");
    return base!.content + directive!.content;
  }
}
```

> **Pattern note (_GoF_):** Fallback logic lives in a Decorator
> (`DefaultingSystemPromptRepository`), not in the interactor. The
> interactor has a single responsibility: assemble base + directive.
> The Null Object guarantee means `getActive()` never returns null,
> so the interactor contains zero null-check logic.

The hardcoded prompts become fallback defaults — the system works even
if the database is empty. Once the seed migration runs, all prompts are
served from the database.

### 13.6 Composition Root Update

`buildSystemPrompt()` in `src/lib/chat/policy.ts`:

```typescript
export async function buildSystemPrompt(role: RoleName): Promise<string> {
  const db = getDb();
  const innerRepo = new SystemPromptDataMapper(db);
  const promptRepo = new DefaultingSystemPromptRepository(
    innerRepo,
    BASE_PROMPT,
    ROLE_DIRECTIVES,
  );
  const interactor = new LoggingDecorator(
    new ChatPolicyInteractor(promptRepo),
    "ChatPolicy",
  );
  return interactor.execute({ role });
}
```

### 13.7 MCP Tools — Prompt Management

Added to the MCP embedding server (`mcp/embedding-server.ts`), alongside
the existing librarian tools.

**`prompt_list`**

```text
Input:  { role?: string, prompt_type?: string }
Output: Array of { role, prompt_type, version, is_active, created_at, created_by, notes, content_preview }
```

Lists all prompt versions, optionally filtered. Shows which version is
active for each `(role, prompt_type)` pair. `content_preview` is the
first 200 characters.

**`prompt_get`**

```text
Input:  { role: string, prompt_type: string, version?: number }
Output: { role, prompt_type, version, content, is_active, created_at, created_by, notes }
```

Returns the active version by default, or a specific version if
`version` is provided. Full content included.

**`prompt_set`**

```text
Input:  { role: string, prompt_type: string, content: string, notes: string }
Output: { version: number, activated: true }
```

Creates a new version and immediately activates it. The previous active
version is deactivated but retained. Records a
`prompt_version_changed` event on all active conversations for the
affected role.

**`prompt_rollback`**

```text
Input:  { role: string, prompt_type: string, version: number }
Output: { activated_version: number, deactivated_version: number }
```

Reactivates a previous version. Same event recording as `prompt_set`.

**`prompt_diff`**

```text
Input:  { role: string, prompt_type: string, version_a: number, version_b: number }
Output: { diff: string }
```

Returns a line-by-line diff between two versions. Uses a simple
longest-common-subsequence diff algorithm — no external dependency.

### 13.8 Security

- All prompt MCP tools require admin access (enforced by the MCP
  server's tool handler, consistent with librarian tools)
- `created_by` records which admin made each change
- Prompt content is treated as trusted (admin-authored), not user input
- The `notes` field provides an audit trail for each change

---

## 14. Conversation Analytics `[CONVO-070]`

### 14.1 Purpose

Administrators need visibility into how conversations perform as a
product — especially the anonymous-to-authenticated conversion funnel.
Analytics are delivered via MCP tools in the embedding server, consistent
with the existing admin tooling pattern (librarian, embeddings).

### 14.2 MCP Tools — Analytics

**`conversation_analytics`**

```sql
Input: {
  metric: "overview" | "funnel" | "engagement" | "tool_usage" | "drop_off",
  time_range?: "24h" | "7d" | "30d" | "all"
}
```

Returns aggregate metrics:

| Metric       | Returns                                                                                                                                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overview`   | Total conversations, anonymous vs authenticated count, avg message count, avg session duration, conversion rate (anonymous→registered)                                                                                                                                                                            |
| `funnel`     | Stage counts: anonymous sessions → first message → 5+ messages → registration → continued authenticated usage. Drop-off rate per stage.                                                                                                                                                                           |
| `engagement` | Message count distribution (histogram buckets), return rate (sessions with conversations updated on >1 distinct day), top conversation titles                                                                                                                                                                     |
| `tool_usage` | Tool call counts by name, tool calls by role, tools that precede registration events (correlation), tools that precede session abandonment                                                                                                                                                                        |
| `drop_off`   | Conversations inactive for >2× the user's median inter-session gap (or >7 days if <3 sessions), last message content preview (first 100 chars), tool usage pattern before drop-off, grouped by anonymous vs authenticated. For anonymous users with a single session, uses absolute 48-hour inactivity threshold. |

**SQL examples:**

Overview:

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN user_id LIKE 'anon_%' THEN 1 ELSE 0 END) as anonymous,
  SUM(CASE WHEN user_id NOT LIKE 'anon_%' THEN 1 ELSE 0 END) as authenticated,
  AVG(message_count) as avg_messages,
  SUM(CASE WHEN converted_from IS NOT NULL THEN 1 ELSE 0 END) as converted
FROM conversations
WHERE created_at > datetime('now', ?)
```

Funnel:

```sql
-- Stage 1: Anonymous sessions started
SELECT COUNT(DISTINCT conversation_id) FROM conversation_events
  WHERE event_type = 'started' AND json_extract(metadata, '$.session_source') = 'anonymous_cookie'
  AND created_at > datetime('now', ?);

-- Stage 2: Had at least one message
SELECT COUNT(*) FROM conversations
  WHERE user_id LIKE 'anon_%' AND message_count >= 1 AND created_at > ?;

-- Stage 3: Engaged (5+ messages)
SELECT COUNT(*) FROM conversations
  WHERE user_id LIKE 'anon_%' AND message_count >= 5 AND created_at > ?;

-- Stage 4: Converted
SELECT COUNT(*) FROM conversations
  WHERE converted_from IS NOT NULL AND created_at > ?;

-- Stage 5: Continued after conversion (messages exist after conversion event)
-- Uses rowid for ordering (monotonic in SQLite) instead of datetime
-- to avoid second-granularity collisions
SELECT COUNT(DISTINCT c.id) FROM conversations c
  JOIN conversation_events ce ON ce.conversation_id = c.id
  WHERE ce.event_type = 'converted'
  AND EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id
    AND m.rowid > (
      SELECT MAX(m2.rowid) FROM messages m2
      WHERE m2.conversation_id = c.id
      AND m2.created_at <= ce.created_at
    )
  )
  AND c.created_at > ?;
```

**`conversation_inspect`**

```text
Input: { conversation_id?: string, user_id?: string, limit?: number }
```

Returns conversation details for quality review:

- Conversation metadata (title, status, message_count, session_source,
  converted_from, created_at, updated_at)
- Messages (role, content preview — first 200 chars, tool calls, timestamp)
- Events timeline

If `user_id` is provided instead of `conversation_id`, returns the
most recent conversations for that user (up to `limit`, default 5).

**`conversation_cohort`**

```text
Input: {
  cohort_a: "anonymous" | "authenticated" | "converted",
  cohort_b: "anonymous" | "authenticated" | "converted",
  metric: "message_count" | "tool_usage" | "session_duration" | "return_rate"
}
```

Compares behavior across user groups:

| Cohort          | Filter                                                 |
| --------------- | ------------------------------------------------------ |
| `anonymous`     | `user_id LIKE 'anon_%' AND converted_from IS NULL`     |
| `authenticated` | `user_id NOT LIKE 'anon_%' AND converted_from IS NULL` |
| `converted`     | `converted_from IS NOT NULL`                           |

Returns side-by-side statistics for the two cohorts on the requested
metric. Each cohort result includes: `count` (sample size), `mean`,
`median`, `stddev`, and `p95`. When the smaller cohort has fewer than
30 samples, the result includes a `low_sample_warning: true` flag so
admins know the comparison lacks statistical power.

Key question this answers: "Do users who convert use different
tools or engage differently than those who don't?"

> **Note (_Hinton_):** Without sample sizes and variance measures,
> aggregate comparisons are misleading. An admin seeing "converted
> users average 12 messages vs 8 for anonymous" needs to know if
> that's N=500 or N=5. The `low_sample_warning` flag prevents
> premature optimization decisions based on insufficient data.

### 14.3 Implementation Location

All analytics tools are implemented in `mcp/analytics-tool.ts` and
registered in `mcp/embedding-server.ts` alongside the librarian and
embedding tools. They use the same `getDb()` singleton for database
access.

### 14.4 Security

- All analytics MCP tools are admin-only (consistent with librarian)
- `conversation_inspect` never returns full message content — previews
  only (first 200 chars) to limit exposure
- No PII is surfaced for anonymous users (only `anon_{uuid}` identifiers)
- Cohort queries use aggregate counts, never individual records

---

## 15. Testing Strategy

### 15.1 Unit Tests

| Area                            | Tests | Description                                                                                                     |
| ------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| `resolveUserId()`               | 3     | Auth user → real ID; anon with cookie → anon_uuid; anon first visit → new cookie + ID                           |
| `findActiveByUser()`            | 3     | Returns active; returns null when none; ignores archived                                                        |
| Archive flow                    | 3     | Sets status to archived; only one active at a time; 404 when no active                                          |
| `SummarizationInteractor`       | 3     | Below threshold → skip; at threshold → summarize; respects window                                               |
| Context window builder          | 2     | With summary: [summary + recent]; without: [all messages]                                                       |
| `ConversationChunker`           | 4     | Turn pairing; context prefix; summary as document chunk; empty conversation                                     |
| `SearchMyConversationsCommand`  | 2     | User-scoped results; no cross-user leakage                                                                      |
| `MessagePart` summary type      | 1     | Round-trip serialize/deserialize of summary part                                                                |
| `ConversationEventRecorder`     | 3     | Records event; stores metadata as JSON; handles missing conversation gracefully                                 |
| `migrateAnonymousConversations` | 3     | Updates user_id; sets converted_from; records conversion event                                                  |
| `SystemPromptRepository`        | 5     | getActive returns active; createVersion increments; activate swaps; listVersions ordered; getByVersion specific |
| `ChatPolicyInteractor` (DB)     | 3     | Uses DB prompt when available; falls back to hardcoded; combines base + directive                               |
| Prompt MCP tools                | 5     | prompt_list filters; prompt_get active; prompt_set creates+activates; prompt_rollback; prompt_diff              |
| Analytics MCP tools             | 5     | overview aggregates; funnel stages; engagement metrics; tool_usage counts; cohort comparison                    |

### 15.2 Integration Tests

| Area                  | Tests | Description                                                                      |
| --------------------- | ----- | -------------------------------------------------------------------------------- |
| Anonymous persistence | 1     | POST stream as anon → cookie set → GET active → conversation loaded              |
| Resume across refresh | 1     | Create conversation → GET active → correct messages returned                     |
| Archive + new cycle   | 1     | Archive → POST stream → new active created, old archived                         |
| Anon → auth migration | 1     | Register while having anon conversation → conversation migrated, events recorded |
| Prompt round-trip     | 1     | Set prompt via MCP → chat uses new prompt → rollback → chat uses old prompt      |
| Analytics queries     | 1     | Create conversations + events → analytics tool returns correct aggregates        |

Estimated total: ~48 new tests across 5 sprints.

---

## 16. Sprint Plan

Individual sprint plans are maintained in the [`sprints/`](sprints/) directory:

- [Sprint 0 — Anonymous Sessions + Active Conversation Resume + Instrumentation](sprints/sprint-0.md)
- [Sprint 1 — Rolling Summaries](sprints/sprint-1.md)
- [Sprint 2 — Conversation Embedding + Search](sprints/sprint-2.md)
- [Sprint 3 — System Prompt Management](sprints/sprint-3.md)
- [Sprint 4 — Conversation Analytics](sprints/sprint-4.md)
- [Sprint 5 — Kernel Generalization](sprints/sprint-5.md)

---

## 17. Future Considerations

These items are explicitly out of scope for Sprints 0–5.

### 17.1 Multi-Conversation (Phase 2)

The `status` column and archive flow already support browsing past
conversations. If demand emerges:

- Archived conversations become visible in a sidebar or search results
- Each conversation retains its auto-generated title
- The single-conversation invariant relaxes to allow switching

### 17.2 Cross-Source Search

A "search everything" tool could query both `document_chunk` and
`conversation` source types in a single `HybridSearchEngine.search()`
call. After Sprint 5, `HybridSearchResult` uses generic metadata fields,
so a discriminated union by `sourceType` is straightforward. The
`VectorQuery.sourceType` filter already supports this pattern.

### 17.3 Proactive Recall

Instead of waiting for the user to search, run a background similarity
check on each user message against conversation embeddings. If a strong
match is found, inject "Relevant prior discussion: ..." into the system
prompt. This makes the advisor "remember" without explicit user action.

### 17.4 Prompt A/B Testing

Extend the prompt management system with experiment support:

- Define variant prompts for the same role and split traffic by
  percentage or cohort
- Record which prompt version was active for each conversation
  (`prompt_version` column already in place)
- Analytics cohort tool extended to compare prompt version groups
- Requires a traffic-splitting layer in `buildSystemPrompt()`

### 17.5 Real-Time Analytics Dashboard

Move analytics from MCP-tool-only access to a web dashboard:

- Server-Sent Events endpoint for live conversation metrics
- Admin page with charts (conversion funnel, engagement over time)
- Requires a charting library and SSE infrastructure
