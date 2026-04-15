# TD-C2 — Technical Debt: Code Quality Hardening

> **Parent spec:** [Platform V1](spec.md) §9.4
> **Scope:** Address every code quality issue identified in the post-Sprint-7 quality assessment: God functions, bare catch blocks, adapter→lib coupling, env bypass, stream route decomposition, and test hygiene.
> **Depends On:** TD-C (SOLID audit — completed)
> **Baseline:** 1422 tests, 169 suites (168 pass, 1 pre-existing Playwright parse failure), build clean, lint clean (pre-existing: 1 error in `conversations/route.ts`, 2 warnings)

---

## §1 Current State

### §1.1 Post-TD-C baseline

| Metric | Value |
| --- | --- |
| Tests | 1422 |
| Suites | 169 (168 pass, 1 Playwright parse failure — pre-existing) |
| Build | Clean (zero errors) |
| Lint | Clean (no new warnings; pre-existing: 1 error in `conversations/route.ts`, 2 warnings) |

### §1.2 Quality assessment summary

A broad quality survey across 9 dimensions rated the codebase. Two areas scored **Adequate** (the lowest tier), indicating accumulated tech debt:

| Area | Rating | Key Issue |
| --- | --- | --- |
| Code Smells | Adequate | 777-line God function, 373-line route handler, 657-line MCP tool |
| Error Handling | Adequate | 63 bare `catch {}` blocks across production code |

Six additional targeted issues were identified:

| # | Issue | Severity |
| --- | --- | --- |
| 1 | `schema.ts` 777-line `ensureSchema()` — no migration system, ~30 duplicate try/catch ALTER TABLE blocks | High |
| 2 | `stream/route.ts` 373-line POST handler — 9+ responsibilities in one function | High |
| 3 | 63 bare `catch {}` blocks in production code — 30 in schema.ts, 8 in librarian-tool.ts, 25 elsewhere | High |
| 4 | `mcp/librarian-tool.ts` 657 lines with 8 bare catches and 6+ functional sections | Medium |
| 5 | Adapter→lib coupling — `AnthropicSummarizer` imports `getModelFallbacks` from `@/lib/config/env` | Medium |
| 6 | `tts/route.ts` reads `process.env.OPENAI_API_KEY` directly — bypasses centralized env module | Medium |
| 7 | Client-side bare catches in `login/page.tsx` and `register/page.tsx` | Low (already handled — see §3 F7) |
| 8 | `tests/chat-route.test.ts` mutates `process.env` directly | Low |
| 9 | No CSRF token protection (relies on SameSite=Lax only) | Low (documented exception — see §3 F9) |

---

## §2 Audit Methodology

Each issue is evaluated for blast radius, reversibility, and effort. Findings are classified by severity:

| Severity | Meaning |
| --- | --- |
| **High** | Architectural coupling, large maintenance burden, or error-masking. Must be fixed in this sprint. |
| **Medium** | Principle violation with limited blast radius. Should be fixed in this sprint. |
| **Low** | Minor concern or already acceptably handled. Fix if the file is already being modified; otherwise document and defer. |

### §2.1 Bare catch classification

Not all bare catches are equal. The 63 bare `catch {}` blocks fall into four categories:

| Category | Count | Treatment |
| --- | --- | --- |
| **A — Idempotent DDL** (schema.ts ALTER TABLE) | 30 | Replace with `addColumnIfNotExists()` helper |
| **B — Intentional fallback** (JSON parse, file existence, best-effort cleanup) | 20 | Add inline comment documenting intent; no structural change needed |
| **C — Error-masking** (librarian-tool.ts, chatConversationApi.ts) | 10 | Add error logging or user feedback |
| **D — Reviewed acceptable** (login/register network catch, AudioPlayer autoplay, disposability) | 3 | Already provide user feedback or are browser API constraints — no change needed |

**Category B inventory (intentional fallback — comment-and-keep):**

| File | Line | Context |
| --- | --- | --- |
| `src/adapters/ChatPresenter.ts` | L81 | Malformed `__actions__` JSON → empty array |
| `src/adapters/FileSystemCorpusRepository.ts` | L57 | Corpus dir missing → empty array |
| `src/adapters/FileSystemCorpusRepository.ts` | L92 | Invalid book.json → skip directory |
| `src/adapters/FileSystemCorpusRepository.ts` | L152 | Sections read failure → throw ResourceNotFoundError |
| `src/adapters/FileSystemCorpusRepository.ts` | L182 | Section file read failure → throw ResourceNotFoundError |
| `src/adapters/MessageDataMapper.ts` | L64 | Invalid `parts` JSON → empty array |
| `src/adapters/ChatStreamAdapter.ts` | L76 | Invalid SSE JSON → console.warn (already logged) |
| `src/lib/auth.ts` | L96 | Read-only cookie context → ignore delete failure |
| `src/lib/auth.ts` | L134 | Invalid session → clear cookies, return ANONYMOUS |
| `src/lib/chat/anthropic-stream.ts` | L185 | Non-JSON tool result → leave as-is |
| `src/lib/chat/disposability.ts` | L20 | Best-effort stream cleanup |
| `src/lib/chat/sse-parser.ts` | L35 | Invalid SSE payload → empty string |
| `src/lib/config/instance.ts` | L56 | Invalid JSON → throw ConfigValidationError (already rethrows) |
| `src/lib/evals/staging-canary.ts` | L92 | Invalid URL → throw descriptive error (already rethrows) |
| `src/components/MermaidRenderer.tsx` | L43 | Mermaid render failure → fallback text |
| `src/components/ContentModal.tsx` | L27 | Content load failure → "Failed to load" message |
| `src/components/ThemeProvider.tsx` | L121 | Invalid stored theme JSON → ignore |
| `src/components/WebSearchResultCard.tsx` | L311 | Invalid URL → use raw string |
| `src/app/library/[document]/[section]/page.tsx` | L39 | Metadata generation failure → empty object |
| `mcp/analytics-tool.ts` | L137 | Invalid metadata JSON → empty object |

**Category D inventory (acceptable — no change needed):**

| File | Line | Context |
| --- | --- | --- |
| `src/app/login/page.tsx` | L35 | Network error → `setError("Network error. Please try again.")` |
| `src/app/register/page.tsx` | L73 | Network error → `setGeneralError("Network error. Please try again.")` |
| `src/components/AudioPlayer.tsx` | L177 | Autoplay blocked by browser → dispatch PAUSE |

---

## §3 Audit Findings

### Finding F1 — `schema.ts` is a 777-line God function (SRP)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP |
| **Severity** | High |
| **File** | `src/lib/db/schema.ts` (777 lines) |

**Description:** The single exported `ensureSchema(db)` function owns every database concern:

| # | Responsibility | Lines |
| --- | --- | --- |
| 1 | Session cleanup (DELETE expired) | L7–L11 |
| 2 | Core table creation (roles, users, user_roles) | L13–L50 |
| 3 | Schema migrations (30 idempotent ALTER TABLE try/catches) | L37–L377 |
| 4 | Table creation (sessions, conversations, messages, lead_records, consultation_requests, deal_records, training_path_records, embeddings, bm25_stats, user_files, referrals, user_preferences, system_prompts, blog_posts) | L52–L650 |
| 5 | Seed data (roles, users, user_roles, system prompts) | L430–L700 |
| 6 | QA fixture seeding (gated by `shouldSeedDashboardQaFixtures`) | L700–L777 |

Each responsibility has a distinct reason to change: adding a column (3), adding a table (4), changing default users (5), or updating test fixtures (6). The 30 ALTER TABLE try/catch blocks are the most fragile pattern — identical boilerplate repeated with no migration versioning.

**Remediation:** Decompose into focused modules:

1. **`src/lib/db/migrations.ts`** — `addColumnIfNotExists(db, table, column, definition)` helper that queries `PRAGMA table_info` instead of try/catch. All ALTER TABLE calls consolidated here with a `runMigrations(db)` entry point.
2. **`src/lib/db/tables.ts`** — All `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements, organized by domain (core, conversations, search, user-files, referrals, content).
3. **`src/lib/db/seeds.ts`** — Role/user/system-prompt seeding. Exports `runSeeds(db)`.
4. **`src/lib/db/fixtures.ts`** — QA fixture seeding (dashboard test data). Exports `seedDashboardQaFixtures(db)` and `shouldSeedDashboardQaFixtures()`.
5. **`src/lib/db/schema.ts`** — Becomes a slim orchestrator (~30 lines):

```typescript
export function ensureSchema(db: Database.Database): void {
  pruneExpiredSessions(db);
  createTables(db);
  runMigrations(db);
  runSeeds(db);
  if (shouldSeedDashboardQaFixtures()) {
    seedDashboardQaFixtures(db);
  }
}
```

The `SYSTEM_PROMPT_SEEDS` export moves to `seeds.ts` and is re-exported from `schema.ts` for backward compatibility.

### Finding F2 — `stream/route.ts` POST handler has 9 responsibilities (SRP)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP |
| **Severity** | High |
| **File** | `src/app/api/chat/stream/route.ts` (373 lines) |

**Description:** The POST handler inside `runRouteTemplate` performs:

| # | Responsibility | Lines |
| --- | --- | --- |
| 1 | Auth + role resolution | L80–L83 |
| 2 | System prompt builder construction + user preferences injection | L84–L92 |
| 3 | Tool registry + executor setup | L93–L101 |
| 4 | Request body parsing + validation | L103–L133 |
| 5 | Conversation lifecycle (ensure active, read referral cookie) | L140–L153 |
| 6 | Attachment upload validation + assignment | L155–L167 |
| 7 | User message persistence | L170–L183 |
| 8 | Context window building + routing analysis | L186–L238 |
| 9 | Math detection + delegation to /api/chat | L240–L273 |
| 10 | SSE stream construction + assistant persistence + summarization | L275–L370 |

**Remediation:** Extract into a pipeline of named functions within the same file (no new files needed — the functions are route-internal):

```typescript
// Extracted helpers (private to this module)
async function resolveRequestContext(request, context) → { apiKey, user, role, userId, builder, tools, toolExecutor }
async function parseAndValidateBody(request, context) → { incomingMessages, taskOriginHandoff, incomingAttachments, latestUserText, latestUserContent }
async function ensureConversation(request, interactor, userId) → { conv, conversationId }
async function validateAndAssignAttachments(attachments, conversationId, userId, ufs, context) → void
async function persistUserMessage(interactor, conversationId, latestUserText, incomingAttachments, userId, context) → void
async function buildContext(interactor, routingAnalyzer, conversationId, userId, incomingMessages, latestUserText, latestUserContent, builder, taskOriginHandoff) → { contextMessages, routingSnapshot }
async function handleMathDetection(latestUserText, request, incomingMessages, interactor, conversationId, userId, context) → Response | null
function createSseStream(apiKey, contextMessages, systemPrompt, tools, toolExecutor, conversationId, interactor, userId, role, context) → Response
```

The POST handler becomes a ~40-line orchestrator that calls these functions in sequence. Each function is independently testable and has a single reason to change.

### Finding F3 — `schema.ts` bare `catch {}` blocks mask errors (Error Handling)

| Attribute | Value |
| --- | --- |
| **Principle** | Error Handling |
| **Severity** | High |
| **File** | `src/lib/db/schema.ts` — 30 bare catch blocks |

**Description:** All 30 bare catches follow the same pattern:

```typescript
try { db.exec(`ALTER TABLE t ADD COLUMN c TYPE DEFAULT ...`); } catch { /* exists */ }
```

This silently swallows *all* errors, including SQL syntax errors, disk I/O errors, and permission errors — not just "column already exists." SQLite does not have a native `ADD COLUMN IF NOT EXISTS`, but the column existence can be checked via `PRAGMA table_info`.

**Remediation:** Create a helper function in `src/lib/db/migrations.ts`:

```typescript
function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
```

All 30 ALTER TABLE try/catch blocks are replaced with:

```typescript
addColumnIfNotExists(db, "conversations", "converted_from", "TEXT DEFAULT NULL");
addColumnIfNotExists(db, "conversations", "message_count", "INTEGER NOT NULL DEFAULT 0");
// ... etc.
```

Real errors (syntax, I/O, permissions) now propagate instead of being silently swallowed. The `PRAGMA table_info` approach is the standard SQLite idiom for this.

### Finding F4 — `librarian-tool.ts` 657-line file with 8 bare catches (SRP + Error Handling)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP, Error Handling |
| **Severity** | Medium |
| **File** | `mcp/librarian-tool.ts` (657 lines) |

**Description:** This file contains 6 functional sections (security helpers, zip validation, addDocumentFromZip, corpusList, corpusGetDocument, corpusRemoveDocument, corpusAddSection) and 8 bare catch blocks.

The bare catches fall into two sub-categories:

| Line | Context | Category |
| --- | --- | --- |
| L53 | `pathExists()` — `fs.access` failure → return false | B (intentional fallback) |
| L89 | `validateZipSafety` — non-UTF-8 filename check | B (rethrows with message) |
| L244 | `addDocumentFromZip` temp dir cleanup on failure | B (best-effort cleanup) |
| L270 | `corpusList` — corpus dir missing → empty array | B (intentional fallback) |
| L308 | `corpusList` — chapter dir missing → empty array | B (intentional fallback) |
| L327 | `corpusList` — invalid book.json manifest → skip | C (error-masking) |
| L406 | `corpusGetDocument` — chapters dir missing → empty array | B (intentional fallback) |
| L585 | `corpusRemoveDocument` — chapters dir missing → empty array | B (intentional fallback) |

**Remediation (two-part):**

**Part A — Error handling (all 8 catches):** Add inline `// reason:` comments to each Category B catch documenting the intended fallback. For L327 (Category C), capture the error and log it:

```typescript
// Before (L327):
} catch {
  // invalid manifest — skip
}

// After:
} catch (err) {
  console.warn(`[librarian] Skipping ${dir.name}: invalid manifest`, err);
}
```

**Part B — SRP decomposition:** The file is long but cohesive (all functions operate on the corpus directory). Extract into two files:

1. **`mcp/librarian-safety.ts`** — `assertSafePath`, `assertValidSlug`, `VALID_DOMAINS`, `pathExists`, `validateZipSafety`, and all safety constants (~120 lines).
2. **`mcp/librarian-tool.ts`** — Retains `addDocumentFromZip`, `corpusList`, `corpusGetDocument`, `corpusAddSection`, `corpusRemoveDocument`, and the type exports. Imports safety helpers from `librarian-safety.ts`. Shrinks to ~540 lines.

### Finding F5 — `AnthropicSummarizer` imports `getModelFallbacks` from `@/lib/config/env` (DIP)

| Attribute | Value |
| --- | --- |
| **Principle** | DIP |
| **Severity** | Medium |
| **File** | `src/adapters/AnthropicSummarizer.ts` (L4) |

**Description:** The adapter directly imports `getModelFallbacks` from `@/lib/config/env` to determine the model name. This creates an adapter→lib coupling where the adapter decides its own configuration instead of receiving it via injection.

The `ChatPresenter.ts` import of `getAttachmentParts` from `@/lib/chat/message-attachments` is a separate case — it imports a pure utility function (data transformation), not a configuration reader. This is acceptable adapter→lib coupling (utility, not config).

The `ConfigIdentitySource.ts` imports from `@/lib/config/instance` and `@/lib/config/defaults` are also acceptable — `ConfigIdentitySource` is an adapter whose explicit purpose is to bridge config files to the core `IdentitySource` port.

**Remediation:** Pass the model name directly to `AnthropicSummarizer`:

```typescript
// Before:
export class AnthropicSummarizer implements LlmSummarizer {
  constructor(private readonly apiKey: string) {}
  async summarize(messages: Message[]): Promise<string> {
    const models = getModelFallbacks();
    const model = models[0];
    // ...
  }
}

// After:
export class AnthropicSummarizer implements LlmSummarizer {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}
  async summarize(messages: Message[]): Promise<string> {
    if (!this.model) {
      throw new Error("No valid Anthropic model configured.");
    }
    // ... use this.model instead of models[0]
  }
}
```

The caller (composition root or wherever `AnthropicSummarizer` is instantiated) passes `getModelFallbacks()[0]`. Remove the `@/lib/config/env` import from the adapter.

### Finding F6 — `tts/route.ts` reads `process.env.OPENAI_API_KEY` directly (Configuration)

| Attribute | Value |
| --- | --- |
| **Principle** | Configuration Centralization |
| **Severity** | Medium |
| **File** | `src/app/api/tts/route.ts` (L51) |

**Description:** The TTS route reads `process.env.OPENAI_API_KEY` directly at L51 inside the handler body. All other API keys in the application are managed through the centralized `src/lib/config/env.ts` module, which provides validation, caching, and consistent error handling. The TTS route bypasses this pattern.

Additionally, L9–L10 contain commented-out `process.env.ELEVENLABS_*` references that should be removed (dead code).

**Remediation:**

1. Add `getOpenaiApiKey()` to `src/lib/config/env.ts` (or an equivalent module) following the existing `getAnthropicApiKey()` pattern.
2. Replace the direct `process.env.OPENAI_API_KEY` read in `tts/route.ts` with the centralized getter.
3. Remove the commented-out ElevenLabs env references (L9–L10).

### Finding F7 — Client-side bare catches already provide user feedback (Error Handling)

| Attribute | Value |
| --- | --- |
| **Principle** | Error Handling |
| **Severity** | Low — No action needed |
| **Files** | `src/app/login/page.tsx` (L35), `src/app/register/page.tsx` (L73) |

**Description:** Initial assessment flagged these as bare catches, but detailed review shows both already provide appropriate user feedback:

```typescript
// login/page.tsx L35:
} catch {
  setError("Network error. Please try again.");
}

// register/page.tsx L73:
} catch {
  setGeneralError("Network error. Please try again.");
}
```

These are **Category D** catches — the error variable is unused because the only possible failure is a network error (the `fetch` call is the only throwing expression in the try block), and a generic user-facing message is the correct UX for network failures.

**Remediation:** None required. These are correctly handled.

### Finding F8 — `tests/chat-route.test.ts` mutates `process.env` directly (Test Hygiene)

| Attribute | Value |
| --- | --- |
| **Principle** | Test Isolation |
| **Severity** | Low |
| **File** | `tests/chat-route.test.ts` (L18, L30) |

**Description:** Two `beforeEach` blocks set `process.env.ANTHROPIC_API_KEY = "test-key"` directly. This works because Vitest runs tests in isolated workers, but it sets a poor precedent and can cause flaky failures if tests ever run in parallel within the same worker.

The project's established pattern uses `vi.stubEnv()` in other test files.

**Remediation:** Replace direct assignment with Vitest's `vi.stubEnv`:

```typescript
// Before:
process.env.ANTHROPIC_API_KEY = "test-key";

// After:
vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
```

`vi.stubEnv` automatically restores the original value in `afterEach`, preventing cross-test contamination.

### Finding F9 — No CSRF token protection (Security)

| Attribute | Value |
| --- | --- |
| **Principle** | Security |
| **Severity** | Low — Documented exception |
| **Files** | Application-wide |

**Description:** The application relies on `SameSite=Lax` cookies for CSRF protection without explicit CSRF tokens. This is a known trade-off:

- **SameSite=Lax** blocks cross-origin POST requests from third-party sites in all modern browsers.
- **All state-changing endpoints** use POST/PUT/DELETE (not GET), which SameSite=Lax protects.
- **The Anthropic API key** is server-side only and never exposed to the client.
- **No browser supports disabling SameSite** — it has been enforced by default since Chrome 80 (Feb 2020).

The only scenario where SameSite=Lax is insufficient is a subdomain attack (if `evil.example.com` could set cookies for `example.com`). This application runs on a single domain.

**Remediation:** Document as an accepted security trade-off. Add a comment in `src/middleware.ts`:

```typescript
// SECURITY: CSRF protection via SameSite=Lax cookies.
// All state-changing endpoints use POST/PUT/DELETE. SameSite=Lax blocks
// cross-origin POST from third-party sites. No explicit CSRF tokens needed
// for single-domain deployment. Re-evaluate if subdomain hosting is added.
```

No code change beyond the comment.

---

## §4 Remediation Plan

### §4.1 Phase 1 — Schema decomposition (F1, F3)

**Create `src/lib/db/migrations.ts`:**

```typescript
import type Database from "better-sqlite3";

export function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function runMigrations(db: Database.Database): void {
  // Users table extensions
  addColumnIfNotExists(db, "users", "password_hash", "TEXT");
  addColumnIfNotExists(db, "users", "created_at", "TEXT NOT NULL DEFAULT (datetime('now'))");

  // Conversations metadata columns
  addColumnIfNotExists(db, "conversations", "status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfNotExists(db, "conversations", "converted_from", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "message_count", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfNotExists(db, "conversations", "first_message_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "last_tool_used", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "session_source", "TEXT NOT NULL DEFAULT 'unknown'");
  addColumnIfNotExists(db, "conversations", "prompt_version", "INTEGER DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "lane", "TEXT NOT NULL DEFAULT 'uncertain'");
  addColumnIfNotExists(db, "conversations", "lane_confidence", "REAL DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "recommended_next_step", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "detected_need_summary", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "lane_last_analyzed_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "routing_snapshot", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "referral_source", "TEXT DEFAULT NULL");

  // Messages extensions
  addColumnIfNotExists(db, "messages", "token_estimate", "INTEGER DEFAULT NULL");

  // Lead records extensions
  addColumnIfNotExists(db, "lead_records", "converted_from", "TEXT DEFAULT NULL");
  // ... (all remaining lead_records ALTER TABLE columns from schema.ts L164–L204)

  // Users affiliate extensions
  addColumnIfNotExists(db, "users", "affiliate_enabled", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfNotExists(db, "users", "referral_code", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "users", "credential", "TEXT DEFAULT NULL");
}
```

**Create `src/lib/db/tables.ts`:**

Move all `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements from `schema.ts`. Export a single `createTables(db)` function organized by domain.

**Create `src/lib/db/seeds.ts`:**

Move `seedSystemPrompts(db)`, seed roles/users/user_roles logic, and the `SYSTEM_PROMPT_SEEDS` array. Export `runSeeds(db)` and `SYSTEM_PROMPT_SEEDS`.

**Create `src/lib/db/fixtures.ts`:**

Move `shouldSeedDashboardQaFixtures()` and `seedDashboardQaFixtures(db)`.

**Modify `src/lib/db/schema.ts`:**

Becomes a ~30-line orchestrator:

```typescript
import type Database from "better-sqlite3";
import { createTables } from "./tables";
import { runMigrations } from "./migrations";
import { runSeeds, SYSTEM_PROMPT_SEEDS } from "./seeds";
import { shouldSeedDashboardQaFixtures, seedDashboardQaFixtures } from "./fixtures";

export { SYSTEM_PROMPT_SEEDS };

export function ensureSchema(db: Database.Database): void {
  // Prune expired sessions on cold boot
  try {
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  } catch {
    // Table may not exist yet on first boot — safe to ignore
  }

  createTables(db);
  runMigrations(db);
  runSeeds(db);

  if (shouldSeedDashboardQaFixtures()) {
    seedDashboardQaFixtures(db);
  }
}
```

### §4.2 Phase 2 — Stream route decomposition (F2)

**Modify `src/app/api/chat/stream/route.ts`:**

Extract the handler's responsibilities into module-private helper functions. The POST handler becomes:

```typescript
export const POST = runRouteTemplate({
  operationId: "chat-stream",
  async handler(request, context) {
    const reqCtx = await resolveRequestContext(request);
    const body = await parseAndValidateBody(request, context);
    const { conversationId } = await ensureConversation(request, reqCtx);

    await validateAndAssignAttachments(body.incomingAttachments, conversationId, reqCtx, context);
    await persistUserMessage(conversationId, body, reqCtx, context);

    const ctxWindow = await buildContext(conversationId, body, reqCtx);

    const mathResponse = await handleMathDetection(body, request, conversationId, reqCtx, context);
    if (mathResponse) return mathResponse;

    return createSseStream(reqCtx, body, ctxWindow, conversationId, context);
  },
});
```

All extracted functions remain in the same file. No new modules needed. Each function takes explicit parameters and returns explicit results — no shared mutable state.

### §4.3 Phase 3 — Librarian tool cleanup (F4)

**Create `mcp/librarian-safety.ts`:**

Move from `mcp/librarian-tool.ts`:

- `assertSafePath()`, `assertValidSlug()`, `VALID_DOMAINS`, `pathExists()`
- `MAX_UNCOMPRESSED_SIZE`, `MAX_FILE_COUNT`, `MAX_COMPRESSION_RATIO`, `validateZipSafety()`
- Type exports: `CorpusToolDeps`, `LibrarianToolDeps`

**Modify `mcp/librarian-tool.ts`:**

- Import safety helpers from `./librarian-safety`.
- Add `// reason:` comments to all Category B bare catches.
- Fix L327 (Category C) to log the error:

```typescript
} catch (err) {
  console.warn(`[librarian] Skipping ${dir.name}: invalid manifest`, err);
}
```

### §4.4 Phase 4 — AnthropicSummarizer DIP fix (F5)

**Modify `src/adapters/AnthropicSummarizer.ts`:**

```typescript
// Before:
import { getModelFallbacks } from "@/lib/config/env";

export class AnthropicSummarizer implements LlmSummarizer {
  constructor(private readonly apiKey: string) {}
  async summarize(messages: Message[]): Promise<string> {
    const models = getModelFallbacks();
    const model = models[0];
    // ...

// After:
export class AnthropicSummarizer implements LlmSummarizer {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}
  async summarize(messages: Message[]): Promise<string> {
    if (!this.model) {
      throw new Error("No valid Anthropic model configured.");
    }
    // ... use this.model
```

Remove the `@/lib/config/env` import. Update callers to pass `getModelFallbacks()[0]` when constructing.

### §4.5 Phase 5 — TTS env centralization (F6)

**Modify `src/lib/config/env.ts`:**

Add:

```typescript
export function getOpenaiApiKey(): string {
  const key = process.env.OPENAI_API_KEY ?? "";
  return key;
}
```

**Modify `src/app/api/tts/route.ts`:**

```typescript
// Before (L51):
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// After:
import { getOpenaiApiKey } from "@/lib/config/env";
// ...
const OPENAI_API_KEY = getOpenaiApiKey();
```

Remove commented-out ElevenLabs env references (L9–L10).

### §4.6 Phase 6 — Test hygiene and documentation (F7, F8, F9)

**Modify `tests/chat-route.test.ts`:**

```typescript
// Before (L18):
process.env.ANTHROPIC_API_KEY = "test-key";

// After:
vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
```

Apply same change at L30.

**Modify `src/middleware.ts`:**

Add CSRF documentation comment at the top of the file (after imports):

```typescript
// SECURITY: CSRF protection via SameSite=Lax cookies.
// All state-changing endpoints use POST/PUT/DELETE. SameSite=Lax blocks
// cross-origin POST from third-party sites. No explicit CSRF tokens needed
// for single-domain deployment. Re-evaluate if subdomain hosting is added.
```

### §4.7 Phase 7 — Category B bare catch documentation sweep

Add inline `// reason:` comments to all Category B bare catches that don't already have comments explaining the intent. This is a documentation-only pass — no logic changes.

Files to annotate:

- `src/adapters/ChatPresenter.ts` L81
- `src/adapters/FileSystemCorpusRepository.ts` L57, L92, L152, L182
- `src/adapters/MessageDataMapper.ts` L64
- `src/components/ThemeProvider.tsx` L121
- `src/core/use-cases/tools/UiTools.ts` L34
- `src/hooks/chat/chatConversationApi.ts` L60, L84

Files already adequately commented (no change needed):

- `src/adapters/ChatStreamAdapter.ts` L76 — has `console.warn` logging
- `src/lib/auth.ts` L96, L134 — have explanatory comments
- `src/lib/chat/anthropic-stream.ts` L185 — has comment
- `src/lib/chat/disposability.ts` L20 — has comment
- `src/lib/chat/sse-parser.ts` L35 — fallback is self-evident from context
- `src/lib/config/instance.ts` L56 — rethrows with descriptive error
- `src/lib/evals/staging-canary.ts` L92 — rethrows with descriptive error
- `src/components/MermaidRenderer.tsx` L43 — fallback semantics clear
- `src/components/ContentModal.tsx` L27 — sets error message
- `src/components/WebSearchResultCard.tsx` L311 — domain parse fallback clear
- `src/app/library/[document]/[section]/page.tsx` L39 — metadata fallback clear
- `mcp/analytics-tool.ts` L137 — JSON parse fallback clear

---

## §5 Test Specification

### §5.1 Positive tests (refactors work correctly)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `migrations.ts exports addColumnIfNotExists` | Module `src/lib/db/migrations.ts` exists and exports `addColumnIfNotExists`. |
| P2 | `migrations.ts exports runMigrations` | Module exports `runMigrations`. |
| P3 | `tables.ts exports createTables` | Module `src/lib/db/tables.ts` exists and exports `createTables`. |
| P4 | `seeds.ts exports runSeeds and SYSTEM_PROMPT_SEEDS` | Module `src/lib/db/seeds.ts` exists and exports both. |
| P5 | `fixtures.ts exports seedDashboardQaFixtures` | Module `src/lib/db/fixtures.ts` exists and exports `seedDashboardQaFixtures` and `shouldSeedDashboardQaFixtures`. |
| P6 | `schema.ts is an orchestrator under 60 lines` | Source of `schema.ts` is under 60 lines (excluding blank lines and comments). |
| P7 | `stream/route.ts extracts resolveRequestContext helper` | Source contains `function resolveRequestContext`. |
| P8 | `stream/route.ts extracts parseAndValidateBody helper` | Source contains `function parseAndValidateBody`. |
| P9 | `stream/route.ts extracts createSseStream helper` | Source contains `function createSseStream`. |
| P10 | `librarian-safety.ts exports assertSafePath` | Module `mcp/librarian-safety.ts` exists and exports `assertSafePath`. |
| P11 | `librarian-safety.ts exports validateZipSafety` | Module exports `validateZipSafety`. |
| P12 | `AnthropicSummarizer accepts model as constructor parameter` | Source of `AnthropicSummarizer.ts` contains constructor accepting `model: string`. |
| P13 | `tts/route.ts uses centralized env getter` | Source of `tts/route.ts` contains `getOpenaiApiKey`. |
| P14 | `env.ts exports getOpenaiApiKey` | Source of `src/lib/config/env.ts` contains `export function getOpenaiApiKey`. |
| P15 | `middleware.ts documents CSRF strategy` | Source of `middleware.ts` contains `CSRF protection via SameSite`. |

### §5.2 Negative tests (old patterns forbidden)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `no ALTER TABLE try/catch in schema.ts` | Source of `schema.ts` does not contain `ALTER TABLE`. |
| N2 | `no CREATE TABLE in schema.ts` | Source of `schema.ts` does not contain `CREATE TABLE`. |
| N3 | `no seed data in schema.ts` | Source of `schema.ts` does not contain `INSERT OR IGNORE INTO roles`. |
| N4 | `schema.ts has zero bare catches (except session prune)` | Source of `schema.ts` has at most 1 `catch {` (the session prune at boot). |
| N5 | `no getModelFallbacks import in AnthropicSummarizer` | Source does not contain `import.*getModelFallbacks`. |
| N6 | `no process.env.OPENAI_API_KEY in tts/route.ts` | Source does not contain `process.env.OPENAI_API_KEY`. |
| N7 | `no commented-out ElevenLabs env in tts/route.ts` | Source does not contain `ELEVENLABS_API_KEY`. |
| N8 | `no process.env direct assignment in chat-route.test.ts` | Source does not contain `process.env.ANTHROPIC_API_KEY =`. |
| N9 | `no security helpers in librarian-tool.ts` | Source of `mcp/librarian-tool.ts` does not contain `function assertSafePath`. |

### §5.3 Edge tests (behavioral preservation)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `addColumnIfNotExists is idempotent` | Call `addColumnIfNotExists` twice for the same column — no error thrown, column exists once. |
| E2 | `addColumnIfNotExists propagates real errors` | Call `addColumnIfNotExists` on a non-existent table — error thrown (not swallowed). |
| E3 | `ensureSchema still produces working database` | Call `ensureSchema(db)` on fresh in-memory DB — verify core tables exist via `PRAGMA table_info`. |
| E4 | `SYSTEM_PROMPT_SEEDS is re-exported from schema.ts` | Import `SYSTEM_PROMPT_SEEDS` from `@/lib/db/schema` — verify it's a non-empty array. |
| E5 | `AnthropicSummarizer rejects empty model` | Construct with empty model, call `summarize()` → throws "No valid Anthropic model configured." |
| E6 | `librarian-safety.ts assertSafePath blocks traversal` | Call `assertSafePath("/corpus", "../etc/passwd")` → throws "Path traversal detected". |
| E7 | `librarian-safety.ts assertValidSlug rejects bad slugs` | Call `assertValidSlug("../bad")` → throws. Call `assertValidSlug("good-slug")` → no throw. |
| E8 | `getOpenaiApiKey returns env value` | With `OPENAI_API_KEY` set, `getOpenaiApiKey()` returns the value. |
| E9 | `runMigrations is idempotent` | Call `runMigrations(db)` twice on the same database — no error. Columns exist. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P15) | 15 |
| Negative (N1–N9) | 9 |
| Edge (E1–E9) | 9 |
| **Total new tests** | **33** |
| Deleted tests | 0 |
| **Net change** | **+33** |

---

## §6 Test Implementation Patterns

### §6.1 Static analysis tests (source file assertions)

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("TD-C2 — Schema decomposition (F1, F3)", () => {
  it("P1: migrations.ts exports addColumnIfNotExists", () => {
    const path = join(process.cwd(), "src/lib/db/migrations.ts");
    expect(existsSync(path)).toBe(true);
    const src = readSource("src/lib/db/migrations.ts");
    expect(src).toMatch(/export\s+function\s+addColumnIfNotExists/);
  });

  it("P2: migrations.ts exports runMigrations", () => {
    const src = readSource("src/lib/db/migrations.ts");
    expect(src).toMatch(/export\s+function\s+runMigrations/);
  });

  it("P3: tables.ts exports createTables", () => {
    expect(existsSync(join(process.cwd(), "src/lib/db/tables.ts"))).toBe(true);
    const src = readSource("src/lib/db/tables.ts");
    expect(src).toMatch(/export\s+function\s+createTables/);
  });

  it("P4: seeds.ts exports runSeeds and SYSTEM_PROMPT_SEEDS", () => {
    expect(existsSync(join(process.cwd(), "src/lib/db/seeds.ts"))).toBe(true);
    const src = readSource("src/lib/db/seeds.ts");
    expect(src).toMatch(/export\s+function\s+runSeeds/);
    expect(src).toMatch(/export\s+(const|function)\s+SYSTEM_PROMPT_SEEDS/);
  });

  it("P5: fixtures.ts exports seedDashboardQaFixtures", () => {
    expect(existsSync(join(process.cwd(), "src/lib/db/fixtures.ts"))).toBe(true);
    const src = readSource("src/lib/db/fixtures.ts");
    expect(src).toMatch(/export\s+function\s+seedDashboardQaFixtures/);
    expect(src).toMatch(/export\s+function\s+shouldSeedDashboardQaFixtures/);
  });

  it("P6: schema.ts is an orchestrator under 60 lines", () => {
    const src = readSource("src/lib/db/schema.ts");
    const lines = src.split("\n").filter((l) => l.trim() !== "" && !l.trim().startsWith("//"));
    expect(lines.length).toBeLessThan(60);
  });

  it("N1: no ALTER TABLE try/catch in schema.ts", () => {
    const src = readSource("src/lib/db/schema.ts");
    expect(src).not.toContain("ALTER TABLE");
  });

  it("N2: no CREATE TABLE in schema.ts", () => {
    const src = readSource("src/lib/db/schema.ts");
    expect(src).not.toContain("CREATE TABLE");
  });

  it("N3: no seed data in schema.ts", () => {
    const src = readSource("src/lib/db/schema.ts");
    expect(src).not.toContain("INSERT OR IGNORE INTO roles");
  });

  it("N4: schema.ts has at most 1 bare catch", () => {
    const src = readSource("src/lib/db/schema.ts");
    const catches = (src.match(/catch\s*\{/g) || []).length;
    expect(catches).toBeLessThanOrEqual(1);
  });
});
```

### §6.2 Stream route tests (F2)

```typescript
describe("TD-C2 — Stream route decomposition (F2)", () => {
  it("P7: stream/route.ts extracts resolveRequestContext helper", () => {
    const src = readSource("src/app/api/chat/stream/route.ts");
    expect(src).toMatch(/function\s+resolveRequestContext/);
  });

  it("P8: stream/route.ts extracts parseAndValidateBody helper", () => {
    const src = readSource("src/app/api/chat/stream/route.ts");
    expect(src).toMatch(/function\s+parseAndValidateBody/);
  });

  it("P9: stream/route.ts extracts createSseStream helper", () => {
    const src = readSource("src/app/api/chat/stream/route.ts");
    expect(src).toMatch(/function\s+createSseStream/);
  });
});
```

### §6.3 Behavioral preservation tests (E1–E4)

```typescript
import Database from "better-sqlite3";
import { ensureSchema, SYSTEM_PROMPT_SEEDS } from "@/lib/db/schema";
import { addColumnIfNotExists, runMigrations } from "@/lib/db/migrations";

describe("TD-C2 — Schema behavioral preservation", () => {
  it("E1: addColumnIfNotExists is idempotent", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE test_table (id TEXT PRIMARY KEY)");
    addColumnIfNotExists(db, "test_table", "new_col", "TEXT DEFAULT NULL");
    addColumnIfNotExists(db, "test_table", "new_col", "TEXT DEFAULT NULL");
    const cols = db.pragma("table_info(test_table)") as Array<{ name: string }>;
    expect(cols.filter((c) => c.name === "new_col")).toHaveLength(1);
  });

  it("E2: addColumnIfNotExists propagates real errors", () => {
    const db = new Database(":memory:");
    expect(() =>
      addColumnIfNotExists(db, "nonexistent_table", "col", "TEXT"),
    ).toThrow();
  });

  it("E3: ensureSchema still produces working database", () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ).all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain("users");
    expect(names).toContain("conversations");
    expect(names).toContain("messages");
    expect(names).toContain("roles");
  });

  it("E4: SYSTEM_PROMPT_SEEDS is re-exported from schema.ts", () => {
    expect(Array.isArray(SYSTEM_PROMPT_SEEDS)).toBe(true);
    expect(SYSTEM_PROMPT_SEEDS.length).toBeGreaterThan(0);
  });

  it("E9: runMigrations is idempotent", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT)");
    db.exec("CREATE TABLE conversations (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, created_at TEXT, updated_at TEXT)");
    db.exec("CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT, role TEXT, content TEXT, parts TEXT, created_at TEXT)");
    runMigrations(db);
    runMigrations(db);
    // No error thrown — idempotent
    const cols = db.pragma("table_info(conversations)") as Array<{ name: string }>;
    expect(cols.some((c) => c.name === "status")).toBe(true);
  });
});
```

### §6.4 Librarian safety tests (E6, E7)

```typescript
import { assertSafePath, assertValidSlug } from "../../mcp/librarian-safety";

describe("TD-C2 — Librarian safety extraction (F4)", () => {
  it("P10: librarian-safety.ts exports assertSafePath", () => {
    expect(existsSync(join(process.cwd(), "mcp/librarian-safety.ts"))).toBe(true);
    const src = readSource("mcp/librarian-safety.ts");
    expect(src).toMatch(/export\s+function\s+assertSafePath/);
  });

  it("P11: librarian-safety.ts exports validateZipSafety", () => {
    const src = readSource("mcp/librarian-safety.ts");
    expect(src).toMatch(/export\s+function\s+validateZipSafety/);
  });

  it("N9: no security helpers in librarian-tool.ts", () => {
    const src = readSource("mcp/librarian-tool.ts");
    expect(src).not.toMatch(/function\s+assertSafePath/);
  });

  it("E6: assertSafePath blocks traversal", () => {
    expect(() => assertSafePath("/corpus", "../etc/passwd")).toThrow("Path traversal");
  });

  it("E7: assertValidSlug rejects bad slugs", () => {
    expect(() => assertValidSlug("../bad")).toThrow();
    expect(() => assertValidSlug("good-slug")).not.toThrow();
  });
});
```

---

## §7 Acceptance Criteria

All criteria must pass before TD-C2 is considered complete:

| # | Criterion |
| --- | --- |
| AC-1 | `src/lib/db/schema.ts` is under 60 non-blank, non-comment lines. |
| AC-2 | Zero `ALTER TABLE` statements in `schema.ts` — all migrations live in `migrations.ts`. |
| AC-3 | `addColumnIfNotExists` uses `PRAGMA table_info` — no try/catch for column existence. |
| AC-4 | `stream/route.ts` POST handler body is under 50 lines (orchestrator only). |
| AC-5 | `mcp/librarian-safety.ts` exists with all security helpers extracted from `librarian-tool.ts`. |
| AC-6 | `AnthropicSummarizer` constructor accepts `model: string` — no `@/lib/config/env` import. |
| AC-7 | `tts/route.ts` uses `getOpenaiApiKey()` — no `process.env.OPENAI_API_KEY`. |
| AC-8 | `tests/chat-route.test.ts` uses `vi.stubEnv` — no `process.env.ANTHROPIC_API_KEY =`. |
| AC-9 | `middleware.ts` contains CSRF strategy documentation comment. |
| AC-10 | All 33 new tests pass. |
| AC-11 | All 1422 existing tests continue to pass. |
| AC-12 | `npm run build` succeeds with zero errors. |
| AC-13 | `npm run lint` produces no new warnings or errors. |
| AC-14 | All Category B bare catches have inline reason comments. |

---

## §8 Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Schema decomposition breaks `ensureSchema` call ordering | Tables referenced before creation → SQLite foreign key errors | E3 test verifies full schema creation on fresh DB. Run existing test suite as integration gate. |
| `SYSTEM_PROMPT_SEEDS` re-export breaks `DefaultingSystemPromptRepository` | Import path `@/lib/db/schema` must still export the array | E4 test verifies re-export. Backward-compatible re-export in `schema.ts`. |
| `addColumnIfNotExists` has different error semantics than try/catch | Real errors now propagate — may surface latent issues | This is intentional. Latent errors should be visible. E2 test verifies real errors propagate. |
| `AnthropicSummarizer` callers must pass model — may miss a call site | Compile error if constructor signature changes | TypeScript compiler enforces the new required parameter. `npm run build` gate catches misses. |
| Stream route decomposition changes variable scoping | Extracted functions must pass all needed state explicitly | No shared mutable state between functions. Each function returns explicit results. Existing chat integration tests verify end-to-end behavior. |
| Librarian safety extraction breaks MCP server | Import paths must be updated correctly | P10, P11, N9, E6, E7 tests verify extraction. Existing `calculator-mcp-contract.test.ts` pattern can be extended for librarian MCP tests. |

---

## §9 Phase Execution Order

| Phase | Finding | Files Modified | Files Created | Risk |
| --- | --- | --- | --- | --- |
| 1 | F1, F3 | `src/lib/db/schema.ts` | `migrations.ts`, `tables.ts`, `seeds.ts`, `fixtures.ts` | Medium |
| 2 | F2 | `src/app/api/chat/stream/route.ts` | — | Medium |
| 3 | F4 | `mcp/librarian-tool.ts` | `mcp/librarian-safety.ts` | Low |
| 4 | F5 | `src/adapters/AnthropicSummarizer.ts`, callers | — | Low |
| 5 | F6 | `src/app/api/tts/route.ts`, `src/lib/config/env.ts` | — | Low |
| 6 | F7, F8, F9 | `tests/chat-route.test.ts`, `src/middleware.ts` | — | Low |
| 7 | — | 10+ files (comment-only) | — | None |

Phases 1–3 are the high-value structural changes. Phases 4–7 are lower-risk targeted fixes. Each phase should be validated independently (`npm run build && npm run lint && npx vitest --run`) before proceeding to the next.
