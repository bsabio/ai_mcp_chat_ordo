# Conversation Memory — System Spec

> **Status:** Draft v2.0
> **Date:** 2026-03-14
> **Scope:** Transparent, server-side conversation continuity for all
>   users. One active conversation per user, auto-resumed on page load,
>   periodically summarized, and searchable via the existing hybrid
>   search engine. Anonymous users get a stable cookie-based session so
>   their conversation persists across refreshes. Anonymous-to-authenticated
>   conversion tracking. Database-backed system prompt management with
>   versioning and per-role control via MCP tools. Admin conversation
>   analytics for engagement analysis and conversion optimization.
>   Kernel generalization to decouple domain-specific naming and
>   configuration from the reusable application core.
> **Dependencies:** RBAC (complete), Vector Search (complete), Tool
>   Architecture (complete), Conversation persistence (complete),
>   MCP Embedding Server (complete)
> **Affects:** `src/hooks/useGlobalChat.tsx`, `src/app/api/conversations/`,
>   `src/app/api/chat/stream/route.ts`, `src/core/use-cases/ConversationInteractor.ts`,
>   `src/core/use-cases/ChatPolicyInteractor.ts`, `src/lib/chat/policy.ts`,
>   `src/core/search/EmbeddingPipelineFactory.ts`, `mcp/embedding-server.ts`,
>   new `ConversationChunker`, new `search_my_conversations` tool,
>   new `/api/conversations/active` route, new `system_prompts` table,
>   new `conversation_events` table, new `SystemPromptRepository` port,
>   new MCP tools: `prompt_list`, `prompt_get`, `prompt_set`,
>   `prompt_rollback`, `conversation_analytics`, `conversation_inspect`
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

6. **System prompts are hardcoded and immutable at runtime** — the
   `BASE_PROMPT` lives in `src/lib/chat/policy.ts` as a template literal
   and `ROLE_DIRECTIVES` is a `Record<RoleName, string>` in
   `src/core/use-cases/ChatPolicyInteractor.ts`. Changing the anonymous
   user's experience — even a single sentence — requires a code change,
   commit, rebuild, and deploy. There is no versioning, no A/B testing,
   and no audit trail of prompt changes. `[CONVO-060]`

7. **Zero conversation analytics** — the system emits structured logs to
   stdout (`src/lib/observability/`) but stores no persistent metrics.
   `getMetricsSnapshot()` returns `{ mode: "externalized" }`. There are
   no queries for: how many anonymous sessions occur, how long they last,
   which tools drive engagement, what the anonymous-to-authenticated
   conversion rate is, or where users drop off. Admins are blind to how
   the system performs as a conversion funnel. `[CONVO-070]`

8. **Anonymous → authenticated conversion is invisible** — when a user
   registers after chatting anonymously, the anonymous conversation is
   abandoned. There is no mechanism to migrate `anon_{uuid}` conversations
   to the new user ID. The user loses their history, and the admin loses
   the ability to trace the conversion path. `[CONVO-080]`

9. **Domain-specific naming saturates the core layer** — the architecture
   follows Clean Architecture correctly (`src/core/` never imports from
   `src/lib/` or `src/app/`), but entity names, repository interfaces,
   and search types are coupled to the current book-library domain:
   `BookChunkMetadata`, `BookRepository`, `BookQuery`, `ChapterQuery`,
   `Book`, `Chapter`, `Checklist`, `Practitioner` all live in
   `src/core/`. The `HybridSearchEngine` defaults to `"book_chunk"`
   source type. Tool descriptions hardcode "10 books (104 chapters)".
   The `BASE_PROMPT` embeds corpus-specific context. This means
   re-deploying the system for a different domain (legal, healthcare,
   education) requires renaming ~40% of the core layer rather than just
   swapping configuration and content. `[CONVO-090]`

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

```
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
| Prompt storage | Database-backed `system_prompts` table with versioning | Enables runtime editing without deploys; audit trail of changes |
| Prompt management | MCP tools on embedding server (not in-app chat tools) | Admins use Claude Desktop / MCP client for system config; keeps chat tools user-facing |
| Event instrumentation | `conversation_events` table with typed events | Lightweight append-only log; powers all analytics without mining messages |
| Conversion tracking | `converted_from` column on conversations + migration on register | Traces the full anonymous→authenticated funnel; preserves conversation continuity |
| Analytics delivery | MCP tools (not dashboard UI) | Consistent with librarian/embedding admin pattern; no frontend needed |
| Conversation metadata | Denormalized `message_count`, `first_message_at`, `last_tool_used` | Avoids expensive JOINs for analytics queries; updated on each message append |
| Core entity naming | `Document`/`Corpus` over `Book`/`Chapter` | Domain-agnostic core enables re-deployment for any knowledge domain |
| Source type registry | Externalized `source_type` config, no hardcoded `"book_chunk"` | New domains register their source type without touching search infrastructure |
| Tool description generation | Auto-generated from registry + corpus metadata | Tool descriptions stay accurate as corpus changes; no manual prompt editing |
| Corpus metadata | Externalized to config file or DB, not hardcoded in tool factories | Corpus size, structure, and description become deployment config |

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
  anonUserId: string,    // "anon_{uuid}" from cookie
  newUserId: string,     // the newly created user ID
): Promise<void> {
  // 1. Transfer ownership of all conversations
  db.prepare(
    "UPDATE conversations SET user_id = ?, converted_from = ? WHERE user_id = ?"
  ).run(newUserId, anonUserId, anonUserId);

  // 2. Record conversion event
  db.prepare(
    "INSERT INTO conversation_events (id, conversation_id, event_type, metadata, created_at) " +
    "SELECT hex(randomblob(16)), id, 'converted', json_object('from', ?, 'to', ?), datetime('now') " +
    "FROM conversations WHERE user_id = ? AND converted_from = ?"
  ).run(anonUserId, newUserId, newUserId, anonUserId);

  // 3. Clear the anonymous cookie (caller responsibility)
}
```

**Schema support:** Add `converted_from TEXT DEFAULT NULL` to the
`conversations` table. This column records the original `anon_{uuid}`
when a conversation was migrated, enabling funnel analysis.

**User experience:** After registration, the user's next page load
calls `GET /api/conversations/active` with their new authenticated
session. Their conversation appears exactly as they left it — zero
disruption.

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

**Trust signal (_Krug_):** When the context window includes a summary,
the system prompt appends a brief note: `"[I have context from our
earlier discussion.]"` This gives the user a signal that the advisor
remembered without requiring any user action or UI chrome. The note
is part of the system prompt, not a visible UI element — it surfaces
only when Claude naturally references prior context.

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

**Discoverability (_Krug_):** The role directive tells Claude the tool
exists, but users need a nudge too. In the hero message (shown when no
active conversation exists or after archiving), include a brief hint:
*"Tip: You can ask me to recall past discussions — try 'What did we
talk about regarding [topic]?'"* This appears once and teaches the
capability without adding persistent UI. Also: the first time Claude
returns a `search_my_conversations` result, the response should
naturally reference the source: *"From our conversation on [date]..."*
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
- On registration: future enhancement to migrate `anon_{uuid}` → real
  user ID

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

| Event Type | When Emitted | Metadata |
|------------|-------------|----------|
| `started` | First message in a new conversation | `{ session_source: "anonymous_cookie" \| "authenticated" }` |
| `message_sent` | User sends a message | `{ role: "user", token_estimate: number }` |
| `tool_used` | LLM calls a tool | `{ tool_name: string, role: RoleName }` |
| `summarized` | Summarization completes | `{ messages_covered: number, summary_tokens: number }` |
| `archived` | Conversation archived | `{ message_count: number, duration_hours: number }` |
| `converted` | Anonymous → authenticated migration | `{ from: "anon_{uuid}", to: "usr_{id}" }` |
| `prompt_version_changed` | Admin changes active prompt | `{ role: string, prompt_type: string, old_version: number, new_version: number }` |

### 12.4 Emitter

A lightweight `ConversationEventRecorder` utility — a synchronous
append-only writer, not a pub/sub event bus. Used inline at the point
of action:

```typescript
// src/core/use-cases/ConversationEventEmitter.ts
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

| Column | Purpose | Updated By |
|--------|---------|------------|
| `converted_from` | Original `anon_{uuid}` after migration | Registration flow |
| `message_count` | Denormalized message count | `appendMessage()` |
| `first_message_at` | Timestamp of first message | `appendMessage()` (if null) |
| `last_tool_used` | Name of most recent tool call | Stream route on `onToolCall` |
| `session_source` | `"anonymous_cookie"` or `"authenticated"` | `create()` |
| `prompt_version` | Active prompt version when conversation started | `create()` |

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

### 13.1 Problem

System prompts are hardcoded:
- `BASE_PROMPT` in `src/lib/chat/policy.ts` (48 lines)
- `ROLE_DIRECTIVES` in `src/core/use-cases/ChatPolicyInteractor.ts`
  (per-role strings)

Changing the anonymous experience requires a code change → commit →
rebuild → deploy. There is no versioning, no rollback capability, and
no audit trail.

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

| Column | Purpose |
|--------|---------|
| `role` | `"ALL"` for the base prompt, or a `RoleName` for a role directive |
| `prompt_type` | `"base"` or `"role_directive"` |
| `content` | The full prompt text |
| `version` | Auto-incrementing per `(role, prompt_type)` pair |
| `is_active` | `1` for the currently active version; `0` for historical |
| `created_by` | User ID of the admin who created this version |
| `notes` | Free-text explanation of why this change was made |

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
  getByVersion(role: string, promptType: string, version: number): Promise<SystemPrompt | null>;
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
    const content = promptType === "base"
      ? this.fallbackBase
      : this.fallbackDirectives[role as RoleName] ?? "";
    return {
      id: "fallback", role, promptType: promptType as "base" | "role_directive",
      content, version: 0, isActive: true, createdAt: "", createdBy: null, notes: "hardcoded fallback",
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
    innerRepo, BASE_PROMPT, ROLE_DIRECTIVES,
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

```
Input:  { role?: string, prompt_type?: string }
Output: Array of { role, prompt_type, version, is_active, created_at, created_by, notes, content_preview }
```

Lists all prompt versions, optionally filtered. Shows which version is
active for each `(role, prompt_type)` pair. `content_preview` is the
first 200 characters.

**`prompt_get`**

```
Input:  { role: string, prompt_type: string, version?: number }
Output: { role, prompt_type, version, content, is_active, created_at, created_by, notes }
```

Returns the active version by default, or a specific version if
`version` is provided. Full content included.

**`prompt_set`**

```
Input:  { role: string, prompt_type: string, content: string, notes: string }
Output: { version: number, activated: true }
```

Creates a new version and immediately activates it. The previous active
version is deactivated but retained. Records a
`prompt_version_changed` event on all active conversations for the
affected role.

**`prompt_rollback`**

```
Input:  { role: string, prompt_type: string, version: number }
Output: { activated_version: number, deactivated_version: number }
```

Reactivates a previous version. Same event recording as `prompt_set`.

**`prompt_diff`**

```
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

```
Input: {
  metric: "overview" | "funnel" | "engagement" | "tool_usage" | "drop_off",
  time_range?: "24h" | "7d" | "30d" | "all"
}
```

Returns aggregate metrics:

| Metric | Returns |
|--------|---------|
| `overview` | Total conversations, anonymous vs authenticated count, avg message count, avg session duration, conversion rate (anonymous→registered) |
| `funnel` | Stage counts: anonymous sessions → first message → 5+ messages → registration → continued authenticated usage. Drop-off rate per stage. |
| `engagement` | Message count distribution (histogram buckets), return rate (sessions with conversations updated on >1 distinct day), top conversation titles |
| `tool_usage` | Tool call counts by name, tool calls by role, tools that precede registration events (correlation), tools that precede session abandonment |
| `drop_off` | Conversations inactive for >2× the user's median inter-session gap (or >7 days if <3 sessions), last message content preview (first 100 chars), tool usage pattern before drop-off, grouped by anonymous vs authenticated. For anonymous users with a single session, uses absolute 48-hour inactivity threshold. |

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

```
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

```
Input: {
  cohort_a: "anonymous" | "authenticated" | "converted",
  cohort_b: "anonymous" | "authenticated" | "converted",
  metric: "message_count" | "tool_usage" | "session_duration" | "return_rate"
}
```

Compares behavior across user groups:

| Cohort | Filter |
|--------|--------|
| `anonymous` | `user_id LIKE 'anon_%' AND converted_from IS NULL` |
| `authenticated` | `user_id NOT LIKE 'anon_%' AND converted_from IS NULL` |
| `converted` | `converted_from IS NOT NULL` |

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
| `ConversationEventRecorder` | 3 | Records event; stores metadata as JSON; handles missing conversation gracefully |
| `migrateAnonymousConversations` | 3 | Updates user_id; sets converted_from; records conversion event |
| `SystemPromptRepository` | 5 | getActive returns active; createVersion increments; activate swaps; listVersions ordered; getByVersion specific |
| `ChatPolicyInteractor` (DB) | 3 | Uses DB prompt when available; falls back to hardcoded; combines base + directive |
| Prompt MCP tools | 5 | prompt_list filters; prompt_get active; prompt_set creates+activates; prompt_rollback; prompt_diff |
| Analytics MCP tools | 5 | overview aggregates; funnel stages; engagement metrics; tool_usage counts; cohort comparison |

### 15.2 Integration Tests

| Area | Tests | Description |
|------|-------|-------------|
| Anonymous persistence | 1 | POST stream as anon → cookie set → GET active → conversation loaded |
| Resume across refresh | 1 | Create conversation → GET active → correct messages returned |
| Archive + new cycle | 1 | Archive → POST stream → new active created, old archived |
| Anon → auth migration | 1 | Register while having anon conversation → conversation migrated, events recorded |
| Prompt round-trip | 1 | Set prompt via MCP → chat uses new prompt → rollback → chat uses old prompt |
| Analytics queries | 1 | Create conversations + events → analytics tool returns correct aggregates |

**Estimated total: ~48 new tests across 5 sprints**

---

## 16. Sprint Plan

### Sprint 0 — Anonymous Sessions + Active Conversation Resume + Instrumentation

**Goal:** All users (including anonymous) get server-side conversation
persistence that survives page refreshes. Single-conversation model.
Conversation events table and metadata columns provide the instrumentation
foundation for all later sprints. Anonymous → authenticated migration
ensures no data is lost on registration.

| Task | Description | Req |
|------|-------------|-----|
| 0.1 | Schema migration: add `status TEXT DEFAULT 'active'` + index | CONVO-050 |
| 0.2 | Schema migration: `conversation_events` table + indexes | CONVO-070 |
| 0.3 | Schema migration: metadata columns on `conversations` (`converted_from`, `message_count`, `first_message_at`, `last_tool_used`, `session_source`, `prompt_version`) | CONVO-070 |
| 0.4 | Schema migration: `token_estimate` column on `messages` | CONVO-070 |
| 0.5 | Add `findActiveByUser()` and `archiveByUser()` to `ConversationRepository` port | CONVO-010, CONVO-050 |
| 0.6 | Implement in `ConversationDataMapper` | CONVO-010, CONVO-050 |
| 0.7 | Implement `ConversationEventRecorder` use-case + `ConversationEventDataMapper` adapter | CONVO-070 |
| 0.8 | Implement `resolveUserId()` helper with `lms_anon_session` cookie | CONVO-020 |
| 0.9 | Implement `migrateAnonymousConversations()` in `ConversationInteractor` | CONVO-080 |
| 0.10 | Wire migration into registration flow (NextAuth callback or register route) | CONVO-080 |
| 0.11 | Remove `shouldPersist` gate in stream route; use `resolveUserId()` | CONVO-020 |
| 0.12 | Wire event emission: `started` on create, `message_sent` on append, `tool_used` on tool call | CONVO-070 |
| 0.13 | Update `appendMessage()` to increment `message_count`, set `first_message_at`, compute `token_estimate` | CONVO-070 |
| 0.14 | Create `GET /api/conversations/active` route | CONVO-010 |
| 0.15 | Create `POST /api/conversations/active/archive` route (emits `archived` event) | CONVO-050 |
| 0.16 | Update `ConversationInteractor`: `archiveActive()`, adjust `create()` | CONVO-050 |
| 0.17 | Update `ChatProvider` mount — single `GET /api/conversations/active` | CONVO-010 |
| 0.18 | Remove multi-conversation UI (sidebar, list, delete, load) | CONVO-050 |
| 0.19 | Add "New conversation" button that archives + resets | CONVO-050 |
| 0.20 | Unit + integration tests (~18 new) | |
| 0.21 | Full suite green, build clean | |

**Deliverable: 376 existing + ~18 new = ~394 tests, conversations survive
refresh for all users, event instrumentation live, anon→auth migration
working.**

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
| 1.7 | Wire trigger into stream route (post-response async, emits `summarized` event) | CONVO-030 |
| 1.8 | Raise `MAX_MESSAGES_PER_CONVERSATION` to 200 | CONVO-030 |
| 1.9 | Unit + integration tests (~6 new) | |
| 1.10 | Full suite green, build clean | |

**Deliverable: ~394 existing + ~6 new = ~400 tests, long conversations
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

**Deliverable: ~400 existing + ~7 new = ~407 tests, conversation search
working.**

### Sprint 3 — System Prompt Management

**Goal:** Administrators can view, edit, version, and roll back system
prompts for any role via MCP tools. No code deployment required to tune
the anonymous user experience.

| Task | Description | Req |
|------|-------------|-----|
| 3.1 | Schema migration: `system_prompts` table + unique partial index | CONVO-060 |
| 3.2 | Seed migration: insert current hardcoded `BASE_PROMPT` as version 1 (`role = 'ALL'`, `prompt_type = 'base'`) | CONVO-060 |
| 3.3 | Seed migration: insert each `ROLE_DIRECTIVES[role]` as version 1 (`prompt_type = 'role_directive'`) | CONVO-060 |
| 3.4 | Define `SystemPromptRepository` port | CONVO-060 |
| 3.5 | Implement `SystemPromptDataMapper` adapter | CONVO-060 |
| 3.6 | Create `DefaultingSystemPromptRepository` decorator (Null Object pattern for fallbacks) | CONVO-060 |
| 3.6a | Refactor `ChatPolicyInteractor`: constructor takes `SystemPromptRepository` only (no fallback args) | CONVO-060 |
| 3.7 | Update `buildSystemPrompt()` in `policy.ts` to wire `SystemPromptDataMapper` | CONVO-060 |
| 3.8 | Implement `prompt_list` MCP tool in `mcp/embedding-server.ts` | CONVO-060 |
| 3.9 | Implement `prompt_get` MCP tool | CONVO-060 |
| 3.10 | Implement `prompt_set` MCP tool (create version + activate + emit event) | CONVO-060 |
| 3.11 | Implement `prompt_rollback` MCP tool | CONVO-060 |
| 3.12 | Implement `prompt_diff` MCP tool (LCS-based line diff, no external deps) | CONVO-060 |
| 3.13 | Unit + integration tests (~10 new) | |
| 3.14 | Full suite green, build clean | |

**Deliverable: ~407 existing + ~10 new = ~417 tests, system prompts fully
manageable via MCP.**

### Sprint 4 — Conversation Analytics

**Goal:** Administrators have full visibility into conversation patterns,
conversion funnels, and engagement metrics via MCP tools. Data-driven
optimization of the anonymous→authenticated conversion path.

| Task | Description | Req |
|------|-------------|-----|
| 4.1 | Implement `conversation_analytics` MCP tool (overview, funnel, engagement, tool_usage, drop_off) | CONVO-070 |
| 4.2 | Implement `conversation_inspect` MCP tool (single conversation deep-dive) | CONVO-070 |
| 4.3 | Implement `conversation_cohort` MCP tool (compare anonymous/authenticated/converted) | CONVO-070 |
| 4.4 | Create `mcp/analytics-tool.ts` module for analytics query logic | CONVO-070 |
| 4.5 | Register analytics tools in `mcp/embedding-server.ts` | CONVO-070 |
| 4.6 | Verify event emission coverage: ensure all event types are emitted from Sprint 0 wiring | CONVO-070 |
| 4.7 | Unit + integration tests (~7 new) | |
| 4.8 | Full suite green, build clean | |

**Deliverable: ~417 existing + ~7 new = ~424 tests, full analytics
dashboard via MCP tools.**

### Sprint 5 — Kernel Generalization

**Goal:** Decouple all domain-specific naming, configuration, and content
references from the reusable application core. After this sprint, spinning
up the system for a new domain (legal, healthcare, education) requires
only: (1) new corpus content, (2) prompt changes via MCP tools, (3)
optional domain-specific MCP tool servers. Zero changes to `src/core/`.

#### 5.1 Core Entity Renaming

| Current | New | Files Affected |
|---------|-----|----------------|
| `Book` | `Document` | `src/core/entities/library.ts` → `src/core/entities/corpus.ts` |
| `Chapter` | `Section` | `src/core/entities/library.ts` → `src/core/entities/corpus.ts` |
| `Checklist` | _(remove or generalize to `Supplement`)_ | `src/core/entities/library.ts` |
| `Practitioner` | _(remove or generalize to `Contributor`)_ | `src/core/entities/library.ts` |
| `BookChunkMetadata` | `DocumentChunkMetadata` | `src/core/search/ports/Chunker.ts` |
| `BookRepository` | `CorpusRepository` | `src/core/use-cases/BookRepository.ts` → `CorpusRepository.ts` |
| `BookQuery` | `CorpusQuery` | same file |
| `ChapterQuery` | `SectionQuery` | same file |
| `BookSummaryInteractor` | `CorpusSummaryInteractor` | `src/core/use-cases/BookSummaryInteractor.ts` |
| `LibrarySearchResult` | `CorpusSearchResult` | `src/core/entities/library.ts` |

All adapters (`src/adapters/`, `src/lib/`) update their imports to match.
Tests update accordingly. No behavioral changes — pure rename refactor.

#### 5.2 Search Infrastructure Generalization

| Change | Details |
|--------|---------|
| Remove `"book_chunk"` default in `HybridSearchEngine` | Require explicit `sourceType` on every `VectorQuery`; no fallback |
| Create `SourceTypeRegistry` | A simple config object mapping source types to display names and metadata schemas: `{ "document_chunk": { label: "Document", metadataShape: ... } }` |
| Generalize `HybridSearchResult` metadata | Replace `bookTitle`, `bookNumber`, `bookSlug` with generic `documentTitle`, `documentId`, `documentSlug` |
| Update `MarkdownChunker` | Remove hardcoded `sourceType === "book_chunk"` check; use registry |
| Update `SearchHandlerChain` | Remove hardcoded `"book_chunk"` index lookups; use configured source type |

#### 5.3 Tool Description Externalization

| Change | Details |
|--------|---------|
| Create `corpus-config.ts` or `corpus-config.json` | Externalize: corpus name, document count, section count, corpus description, source type string |
| Auto-generate tool descriptions | `search-books.tool.ts` → `search-corpus.tool.ts`; description reads from config: `"Search across all ${config.documentCount} documents (${config.sectionCount} sections)"` |
| Auto-generate `get-book-summary.tool.ts` | → `get-corpus-summary.tool.ts`; summary comes from config, not hardcoded |
| Rename tool identifiers | `search_books` → `search_corpus`, `get_book_summary` → `get_corpus_summary`, `get_chapter` → `get_section` |
| Update `BASE_PROMPT` seed | Sprint 3's seed migration already has the prompt in the DB; update the fallback constant to use config-derived text |

#### 5.4 Adapter + Route Renaming

| Current | New |
|---------|-----|
| `src/adapters/FileSystemBookRepository.ts` | `FileSystemCorpusRepository.ts` |
| `src/lib/book-library.ts` | `src/lib/corpus-library.ts` |
| `src/lib/book-actions.ts` | `src/lib/corpus-actions.ts` |
| `src/app/books/page.tsx` | `src/app/corpus/page.tsx` (or keep `books/` as a domain-specific route redirecting to generic) |
| `mcp/embedding-tool.ts` references to `BookChunkMetadata` | Use `DocumentChunkMetadata` |

#### 5.5 MCP Librarian Tool Generalization

| Current Tool | New Tool | Change |
|-------------|----------|--------|
| `librarian_list` | `corpus_list` | Returns documents instead of books |
| `librarian_get` | `corpus_get` | Returns document details instead of book details |
| `librarian_add_book` | `corpus_add_document` | Ingests a document, not specifically a book |
| `librarian_remove_book` | `corpus_remove_document` | Removes a document |
| `librarian_update_book` | `corpus_update_document` | Updates a document |
| `librarian_search` | `corpus_search` | Searches the corpus |

The MCP server file `mcp/embedding-server.ts` registers tools using the
new generic names. Tool handler logic is unchanged — only names and
descriptions change.

#### 5.6 Sprint Tasks

| Task | Description | Req |
|------|-------------|-----|
| 5.1 | Create `src/core/entities/corpus.ts` with generic entity interfaces (`Document`, `Section`, `Supplement`, `Contributor`) | CONVO-090 |
| 5.2 | Rename `BookRepository` port → `CorpusRepository` with `CorpusQuery` / `SectionQuery` | CONVO-090 |
| 5.3 | Rename `BookSummaryInteractor` → `CorpusSummaryInteractor` | CONVO-090 |
| 5.4 | Rename `BookChunkMetadata` → `DocumentChunkMetadata` in `src/core/search/` | CONVO-090 |
| 5.5 | Remove `"book_chunk"` default in `HybridSearchEngine`; require explicit source type | CONVO-090 |
| 5.6 | Generalize `HybridSearchResult` metadata fields (`bookTitle` → `documentTitle`, etc.) | CONVO-090 |
| 5.7 | Update `MarkdownChunker` and `SearchHandlerChain` to use generic source type | CONVO-090 |
| 5.8 | Create `corpus-config.ts` with externalized corpus metadata (name, counts, description, source type) | CONVO-090 |
| 5.9 | Rename tool files and identifiers: `search_books` → `search_corpus`, `get_book_summary` → `get_corpus_summary`, `get_chapter` → `get_section` | CONVO-090 |
| 5.10 | Auto-generate tool descriptions from corpus config | CONVO-090 |
| 5.11 | Rename adapter: `FileSystemBookRepository` → `FileSystemCorpusRepository` | CONVO-090 |
| 5.12 | Rename `src/lib/book-library.ts` → `corpus-library.ts`, `book-actions.ts` → `corpus-actions.ts` | CONVO-090 |
| 5.13 | Rename MCP librarian tools: `librarian_*` → `corpus_*` | CONVO-090 |
| 5.14 | Update `mcp/embedding-tool.ts` to use `DocumentChunkMetadata` and generic source type | CONVO-090 |
| 5.15 | Update `BASE_PROMPT` fallback constant to use corpus config instead of hardcoded book references | CONVO-090 |
| 5.16 | Update all route files: `src/app/books/` → `src/app/corpus/` (with redirect from old path) | CONVO-090 |
| 5.17 | Update all tests to use new names (pure rename — no logic changes) | CONVO-090 |
| 5.18 | Full suite green, build clean | |

**Deliverable: ~424 existing tests (renamed, not new) + build clean.
The `src/core/` layer is fully domain-agnostic. Re-deploying for a new
domain requires only: new corpus files, prompt edits via MCP, and
optionally new domain-specific MCP tool servers.**

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
