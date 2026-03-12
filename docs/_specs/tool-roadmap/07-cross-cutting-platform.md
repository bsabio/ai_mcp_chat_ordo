# Tool Spec 07 — Cross-Cutting Platform Concerns

> **Status:** Draft
> **Priority:** Medium — improves every tool through shared infrastructure
> **Scope:** Conversation awareness, tool chaining, usage analytics, rate
>   limiting, error recovery, caching enhancements
> **Dependencies:** Spec 01 (search vectors reused for context), all other
>   specs benefit from these cross-cutting features
> **Affects:** Middleware chain, ToolRegistry, ToolResultFormatter, all tools

---

## 1. Problem Statement

The current tool architecture has strong foundations (middleware chain, SRP
commands, formatter) but each tool operates in isolation:

- **No conversation awareness:** Tools don't know what the user asked earlier in
  the conversation. A `search_library` call can't be boosted by the fact that
  the user's been discussing design patterns for 5 minutes.
- **No tool chaining hints:** When `search_library` returns results, the LLM
  has to figure out on its own that `get_chapter` is the logical next step. Tool
  results could suggest follow-up actions.
- **No usage analytics:** `LoggingMiddleware` writes to console, then the data
  is lost. No aggregate metrics on which tools are used, how often they fail,
  or which queries are common.
- **Basic error messages:** When a tool fails, it returns a generic error. No
  structured error categories, no recovery suggestions.
- **No rate limiting:** All tools have unlimited invocation. Expensive tools like
  TTS or search could be abused.
- **Cache is per-request:** `CachedBookRepository` caches for the process
  lifetime, but there's no shared cache invalidation or TTL.

---

## 2. Conversation Awareness

### 2.1 Conversation Context Injection

Pass a lightweight summary of recent conversation topics to tools that benefit
from it:

```typescript
interface ConversationContext {
  recentTopics: string[];        // extracted from last 5 messages
  recentBookSlugs: string[];     // books mentioned or accessed
  recentPractitioners: string[]; // practitioners discussed
  currentPage: string;           // route the user is on
}
```

**Extraction:** The chat API route already has the full message history. Before
calling the tool, extract context from the last 5 user messages:

```typescript
function extractConversationContext(messages: Message[]): ConversationContext {
  const recent = messages.slice(-5);
  // Simple keyword extraction — find book/chapter slugs, practitioner names
  // This doesn't need NLP — just regex matching against known entity lists
  return {
    recentTopics: extractTopics(recent),
    recentBookSlugs: extractBookSlugs(recent),
    recentPractitioners: extractPractitionerNames(recent),
    currentPage: extractCurrentPage(recent),
  };
}
```

### 2.2 Context-Boosted Search

`search_library` uses conversation context to boost relevance:

```typescript
// In search scoring
if (context.recentBookSlugs.includes(result.bookSlug)) {
  score *= 1.2; // 20% boost for books in recent conversation
}
if (context.recentPractitioners.some(p => result.practitioners.includes(p))) {
  score *= 1.15; // 15% boost for relevant practitioners
}
```

### 2.3 Context-Aware Defaults

Tools use context to fill in missing parameters:

- `get_chapter` without `book_slug` → use the most recently discussed book
- `list_practitioners` without filters → prioritize practitioners from current
  conversation
- `navigate` without target → "What would you like to see about {current topic}?"

---

## 3. Tool Chaining Hints

### 3.1 Follow-Up Suggestions

Every tool result includes an optional `suggestions` array:

```typescript
interface ToolResultWithSuggestions {
  result: string;                // current formatted result
  suggestions?: ToolSuggestion[];
}

interface ToolSuggestion {
  tool: string;                  // suggested follow-up tool name
  description: string;           // human-readable description
  params?: Record<string, unknown>; // pre-filled parameters
}
```

### 3.2 Suggestion Rules

Built into each tool's result formatter:

| Tool | Condition | Suggested Follow-Up |
| --- | --- | --- |
| `search_library` | Results found | `get_chapter` for top result |
| `search_library` | Practitioner in results | `get_practitioner` for the practitioner |
| `get_chapter` | Chapter has practitioners | `get_practitioner` for mentioned names |
| `get_chapter` | Chapter has checklist | `get_checklists` for the checklist items |
| `get_chapter` | Has next section | `get_chapter` with next section index |
| `get_practitioner` | Has related practitioners | `explore_connections` |
| `list_books` | — | `search_library` or `get_chapter` |
| `calculate` | Unit conversion result | `calculate` with inverse conversion |
| `generate_chart` | Success | "Would you like to modify this chart?" |
| `generate_audio` | Chapter narration | `generate_audio` for next section |

### 3.3 Formatter Integration

Suggestions are appended to the tool result text so the LLM sees them:

```text
## Search Results
Found 5 results for "design patterns"...

---
**Available follow-ups:**
- `get_chapter({book_slug: "software-architecture", chapter_slug: "chapter-3"})` — Read the top result
- `get_practitioner({name: "Christopher Alexander"})` — Learn about this practitioner
```

The LLM naturally picks up on these hints and offers them to the user.

---

## 4. Usage Analytics

### 4.1 SQLite Storage

Aggregate tool usage data in a `tool_analytics` table:

```sql
CREATE TABLE tool_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  success INTEGER NOT NULL,         -- 1 or 0
  duration_ms INTEGER NOT NULL,
  error_type TEXT,                   -- null on success
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_analytics_tool ON tool_analytics(tool_name);
CREATE INDEX idx_analytics_created ON tool_analytics(created_at);

-- Popular search queries
CREATE TABLE search_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  top_book TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.2 Analytics Middleware

Replaces or extends `LoggingMiddleware`:

```typescript
class AnalyticsMiddleware implements ToolMiddleware {
  constructor(private db: DatabaseService) {}

  async execute(context: ToolContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
    const start = Date.now();
    try {
      const result = await next();
      this.record(context.toolName, context.userRole, true, Date.now() - start, null);
      return result;
    } catch (error) {
      this.record(context.toolName, context.userRole, false, Date.now() - start, error.name);
      throw error;
    }
  }

  private record(tool: string, role: string, success: boolean, duration: number, errorType: string | null) {
    this.db.run(
      `INSERT INTO tool_analytics (tool_name, user_role, success, duration_ms, error_type)
       VALUES (?, ?, ?, ?, ?)`,
      [tool, role, success ? 1 : 0, duration, errorType]
    );
  }
}
```

### 4.3 Analytics Dashboard (ADMIN Only)

New tool: `get_tool_analytics` (ADMIN role only):

```text
"Show me tool usage stats for this week"
→ get_tool_analytics({period: "week"})
→ Returns: invocation counts, success rates, avg latency, popular searches
```

---

## 5. Rate Limiting

### 5.1 Per-Tool Rate Limits

Middleware that enforces rate limits based on tool cost:

```typescript
const RATE_LIMITS: Record<string, { maxPerHour: number; costWeight: number }> = {
  search_library: { maxPerHour: 60, costWeight: 1 },
  get_chapter:    { maxPerHour: 120, costWeight: 1 },
  generate_audio: { maxPerHour: 10, costWeight: 5 },
  generate_chart: { maxPerHour: 30, costWeight: 2 },
  calculate:      { maxPerHour: 100, costWeight: 1 },
  navigate:       { maxPerHour: 60, costWeight: 1 },
};
```

### 5.2 Sliding Window

Track invocations per session in memory (no SQLite needed for this):

```typescript
class RateLimitMiddleware implements ToolMiddleware {
  private invocations: Map<string, number[]> = new Map(); // sessionId → timestamps

  async execute(context: ToolContext, next: () => Promise<ToolResult>) {
    const key = `${context.sessionId}:${context.toolName}`;
    const now = Date.now();
    const window = this.invocations.get(key)?.filter(t => now - t < 3600000) ?? [];

    const limit = RATE_LIMITS[context.toolName]?.maxPerHour ?? 60;
    if (window.length >= limit) {
      return {
        success: false,
        error: `Rate limit exceeded for ${context.toolName}. Limit: ${limit}/hour. Try again later.`,
      };
    }

    window.push(now);
    this.invocations.set(key, window);
    return next();
  }
}
```

### 5.3 Role-Based Multipliers

| Role | Multiplier | Effect |
| --- | --- | --- |
| ANONYMOUS | 0.5× | Half the base limit |
| AUTHENTICATED | 1.0× | Base limit |
| STAFF | 2.0× | Double the base limit |
| ADMIN | ∞ | No rate limiting |

---

## 6. Error Recovery

### 6.1 Structured Error Categories

Replace generic error strings with typed error objects:

```typescript
enum ToolErrorType {
  NOT_FOUND = "NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  RATE_LIMITED = "RATE_LIMITED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UPSTREAM_FAILURE = "UPSTREAM_FAILURE",    // TTS API down, etc.
  CONTENT_TOO_LARGE = "CONTENT_TOO_LARGE",
}

interface ToolError {
  type: ToolErrorType;
  message: string;
  recovery?: string;            // "Try a shorter query" / "Use get_chapter instead"
  retryable: boolean;
}
```

### 6.2 Recovery Suggestions

Each error type has a standard recovery path:

| Error Type | Recovery Suggestion |
| --- | --- |
| NOT_FOUND | "Book/chapter not found. Use `list_books` to see available books." |
| INVALID_INPUT | Specific message about what's wrong + correct format |
| RATE_LIMITED | "Rate limit reached. Try again in {minutes} minutes." |
| PERMISSION_DENIED | "This tool requires {role} access." |
| UPSTREAM_FAILURE | "Service temporarily unavailable. Falling back to {alternative}." |
| CONTENT_TOO_LARGE | "Text is {count} characters. Maximum is {limit}. Use section mode." |

### 6.3 Fallback Chain

For tools with external dependencies, define fallback strategies:

- `generate_audio`: TTS API fails → return text with browser TTS hint
- `generate_chart`: Mermaid validation fails → return raw code with warning
- `search_library`: Vector index unavailable → fall back to keyword search

---

## 7. Cache Enhancements

### 7.1 TTL-Based Cache

Replace the in-memory `Map<string, Book[]>` in `CachedBookRepository` with TTL:

```typescript
class TTLCache<T> {
  private cache: Map<string, { value: T; expires: number }> = new Map();

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }
}
```

### 7.2 Cache Tiers

| Cache | TTL | Scope | Content |
| --- | --- | --- | --- |
| Book list | 1 hour | Global | `getAllBooks()` result |
| Chapter content | 30 min | Global | Individual chapters |
| Search results | 5 min | Global | Query → results mapping |
| Vector embeddings | ∞ (build-time) | Global | Pre-computed at build |
| Audio files | 1 hour | Per-user | Generated audio |

---

## 8. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/entities/ConversationContext.ts` | Core | Type + extraction logic |
| `src/core/entities/ToolError.ts` | Core | Structured error types |
| `src/core/entities/ToolSuggestion.ts` | Core | Chaining hint types |
| `src/core/use-cases/middleware/AnalyticsMiddleware.ts` | Use Case | Records tool usage to SQLite |
| `src/core/use-cases/middleware/RateLimitMiddleware.ts` | Use Case | Sliding window rate limiter |
| `src/core/use-cases/tools/GetToolAnalyticsCommand.ts` | Use Case | Admin analytics tool |
| `src/core/use-cases/tools/get-tool-analytics.tool.ts` | Use Case | Tool definition |
| `src/adapters/TTLCache.ts` | Adapter | Generic TTL cache implementation |
| `db/migrations/003_tool_analytics.sql` | DB | Analytics + search_analytics tables |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/ToolRegistry.ts` | Add analytics + rate limit middleware to chain |
| `src/core/use-cases/ToolResultFormatter.ts` | Append suggestions to formatted output |
| `src/core/use-cases/middleware/LoggingMiddleware.ts` | Delegate to AnalyticsMiddleware |
| `src/adapters/CachedBookRepository.ts` | Use TTLCache instead of plain Map |
| `src/lib/chat/tool-composition-root.ts` | Wire new middleware and dependencies |
| `src/app/api/chat/route.ts` | Extract and pass ConversationContext |
| All tool commands | Return structured errors with recovery hints |

---

## 9. Middleware Chain (Updated)

Current chain:
```text
Logging → RBAC → Execute
```

New chain:
```text
RateLimit → Analytics → RBAC → Execute
```

`Analytics` replaces `Logging` (it still logs to console but also records to
SQLite). `RateLimit` comes first so rate-limited requests don't count against
analytics.

---

## 10. Requirement IDs

### Conversation Awareness

| ID | Requirement |
| --- | --- |
| PLAT-CTX-1 | ConversationContext is extracted from last 5 user messages |
| PLAT-CTX-2 | search_library boosts results matching recent book/practitioner context |
| PLAT-CTX-3 | Tools with missing optional params use context as defaults |

### Tool Chaining

| ID | Requirement |
| --- | --- |
| PLAT-CHAIN-1 | search_library results include get_chapter suggestions for top results |
| PLAT-CHAIN-2 | get_chapter results include practitioner/checklist follow-ups |
| PLAT-CHAIN-3 | Suggestions include pre-filled parameters |
| PLAT-CHAIN-4 | Suggestions are formatted as actionable text in tool output |

### Analytics

| ID | Requirement |
| --- | --- |
| PLAT-ANALYTICS-1 | Every tool invocation is recorded in tool_analytics table |
| PLAT-ANALYTICS-2 | Search queries are recorded in search_analytics table |
| PLAT-ANALYTICS-3 | get_tool_analytics returns aggregated stats for ADMIN users |
| PLAT-ANALYTICS-4 | Analytics include success rate, avg latency, invocation count |

### Rate Limiting

| ID | Requirement |
| --- | --- |
| PLAT-RATE-1 | Tools enforce per-session hourly rate limits |
| PLAT-RATE-2 | Rate limits vary by role (ANONYMOUS=0.5×, AUTH=1×, STAFF=2×, ADMIN=∞) |
| PLAT-RATE-3 | Rate-limited requests return clear error with retry timing |

### Error Recovery

| ID | Requirement |
| --- | --- |
| PLAT-ERR-1 | All tool errors use ToolError with type, message, recovery suggestion |
| PLAT-ERR-2 | NOT_FOUND errors suggest list/search alternatives |
| PLAT-ERR-3 | Tools with external deps have defined fallback behavior |

### Caching

| ID | Requirement |
| --- | --- |
| PLAT-CACHE-1 | CachedBookRepository uses TTL-based cache (1hr for books, 30min for chapters) |
| PLAT-CACHE-2 | Search result cache with 5-minute TTL |
| PLAT-CACHE-3 | Cache entries automatically expire and refresh |

---

## 11. Test Scenarios

```text
TEST-PLAT-01: ConversationContext extraction finds book slugs in recent messages
TEST-PLAT-02: ConversationContext extraction finds practitioner names
TEST-PLAT-03: search_library results boosted for books in conversation context
TEST-PLAT-04: get_chapter without book_slug uses context default

TEST-PLAT-05: search_library result includes get_chapter suggestion
TEST-PLAT-06: get_chapter result includes practitioner follow-up when applicable
TEST-PLAT-07: Suggestions include pre-filled parameters

TEST-PLAT-08: Tool invocation recorded in tool_analytics
TEST-PLAT-09: Failed invocation recorded with error_type
TEST-PLAT-10: get_tool_analytics returns weekly summary for ADMIN

TEST-PLAT-11: 61st search_library call in 1 hour returns rate limit error
TEST-PLAT-12: STAFF user gets 120 search calls per hour (2× multiplier)
TEST-PLAT-13: ADMIN user is never rate limited
TEST-PLAT-14: Rate limit error includes minutes until reset

TEST-PLAT-15: NOT_FOUND error includes recovery suggestion
TEST-PLAT-16: generate_audio falls back gracefully when TTS API fails
TEST-PLAT-17: All errors have retryable flag set correctly

TEST-PLAT-18: Cache entry expires after TTL
TEST-PLAT-19: Expired cache entry triggers fresh data load
TEST-PLAT-20: Search cache returns cached result within TTL
```

---

## 12. Open Questions

1. **Session ID for rate limiting:** The current architecture doesn't have
   explicit session IDs. Should we use the HTTP request's IP address, a cookie,
   or generate a session token? Cookie-based is most reliable.
2. **Analytics retention:** How long to keep analytics data? Suggest 90 days
   with automatic cleanup via a daily cron or on-request pruning.
3. **Context window size:** 5 messages is a reasonable default. Should this
   be configurable? For now, hard-code 5 and make it easy to change later.
4. **Suggestion count:** How many follow-up suggestions per tool result?
   Suggest max 3 to avoid overwhelming the LLM context.
5. **Admin dashboard UI:** Should `get_tool_analytics` remain a chat-only tool,
   or should there be a dedicated admin dashboard page? The tool is simpler
   and more consistent with the chat-first architecture.
