# V1 Sprint 4 — QR Code and Referral Tracking

> **Parent spec:** [Platform V1](spec.md) §8 Phase B, Sprint 4
> **Requirement IDs:** PLAT-004 (QR codes are the distribution engine), PLAT-020 (opaque referral codes), PLAT-021 (QR endpoint rate-limited), PLAT-027 (affiliate admin-gated)
> **Sprint 3 Baseline:** 1267 tests, 163 suites, build clean
> **Goal:** Build the complete referral tracking infrastructure: database schema (referrals table, user columns including credential, conversation column), APPRENTICE role, cryptographically random referral code generation, `?ref=` proxy handling with cookie persistence, conversation attribution, QR image endpoint, admin affiliate toggle, and greeting interpolation wiring. Sprint 3 built the rendering path; Sprint 4 wires the data flow.

---

## §1 Current State

### §1.1 What exists from Sprint 3

Sprint 3 created the rendering path for referral-aware greetings. The interpolation utility, config types, and template fields are all in place:

| Capability | File | Status |
| --- | --- | --- |
| `interpolateGreeting()` function | `src/lib/chat/greeting-interpolator.ts` | **Working** — handles `{{referrer.name}}`, `{{referrer.credential}}`, `{{brand.name}}` with fallbacks |
| `firstMessage.withReferral` type field | `src/lib/config/defaults.ts` L33 | **Declared** in `InstancePrompts` type but no default value populated |
| Config context with `useInstancePrompts()` | `src/lib/config/InstanceConfigContext.tsx` | **Working** — exposes prompts to all client components |
| `createInitialChatMessages(role, prompts?)` | `src/hooks/chat/chatState.ts` | **Working** — overrides ANONYMOUS greeting when prompts provided |
| BrandHeader config-driven heading/subheading | `src/frameworks/ui/MessageList.tsx` | **Working** — reads from `useInstancePrompts()` |

### §1.2 What does NOT exist yet

| Capability | V1 spec ref | Impact |
| --- | --- | --- |
| `referrals` database table | §3.3 | No referral tracking possible |
| `users.affiliate_enabled` column | §3.3 | No admin control over who can generate QR codes |
| `users.referral_code` column | §3.3 | No persistent referral code per user |
| `users.credential` column | §3.3 | No professional title for greeting interpolation |
| `conversations.referral_source` column | §3.3 | No attribution on conversations |
| `APPRENTICE` role | §3.8 | Role type only has 4 values; no mid-tier role for students |
| `?ref=` proxy handling | §3.3 step 3 | QR scans go nowhere |
| Referral code generation utility | §3.3 step 2 | No code generation mechanism |
| Referral domain entity + data mapper | §4.1 | No persistence layer for referrals |
| QR image endpoint (`/api/qr/[code]`) | §4.1 | No QR code output |
| Admin affiliate toggle API | §6.2 PLAT-027 | No way to enable affiliates |
| `withReferral` default value in prompts | §3.2 | Template field exists but is empty |
| `referralSuggestions` | §3.2 | Alternate suggestion chips for referred visitors |
| QR library dependency | Package.json | No QR generation capability in Node.js |

### §1.3 Architecture reference

The V1 spec §3.3 defines the referral flow as a 6-step sequence:

```text
1. Admin enables affiliate for a user → affiliate_enabled = 1, generates referral_code
2. User requests QR code → system generates QR encoding https://{domain}/?ref={referral_code}
3. Visitor scans QR → proxy reads ?ref= param, stores in cookie
4. Conversation created → referral_source set, row inserted into referrals table
5. First message personalized with referrer's name and credential
6. Referral tracked through to deal outcome
```

Sprint 4 implements steps 1–5. Step 6 (deal-level tracking) is a future concern when deal lifecycle tools are added (Sprint 10).

---

## §2 Design Decisions

### §2.1 Referral codes are opaque and cryptographically random

Per PLAT-020: codes must not encode user IDs or be sequential. The implementation uses `crypto.getRandomValues()` to generate 16 random bytes, then base62-encodes them. This produces a 22-character string that is URL-safe, unguessable, and collision-resistant (62^22 ≈ 2^131 possible values).

**Base62 alphabet:** `0-9A-Za-z` (no special characters, URL-safe without encoding).

### §2.2 Proxy handles page routes, not API routes

The `?ref=` parameter appears on page URLs (e.g., `https://studioordo.com/?ref=abc123`). The proxy currently only inspects `/api/*` routes. Sprint 4 extends the proxy to also intercept page routes when `?ref=` is present, set a referral cookie, and forward the request. The proxy does NOT redirect — the URL retains the `?ref=` parameter for analytics tools to capture.

**Cookie details:**
- Name: `lms_referral_code`
- Value: the raw referral code from the `?ref=` parameter
- Max-age: 30 days (2,592,000 seconds)
- HttpOnly: false (client-side greeting interpolation needs to read it)
- SameSite: Lax
- Secure: production only
- Path: `/`

### §2.3 Conversation attribution is server-side

When a conversation is created via `ConversationInteractor.ensureActive()`, the chat stream route reads the `lms_referral_code` cookie, validates it against the database, and passes it as `referralSource` to the interactor. The interactor stores it on the conversation and creates a referral record. This happens exactly once per conversation — the first `ensureActive` call.

### §2.4 QR endpoint generates PNG on-the-fly

The `/api/qr/[code]/route.ts` endpoint validates that the referral code exists in the database, then generates a QR image encoding `https://{domain}/?ref={code}`. The image is returned as `image/png` with cache headers (`Cache-Control: public, max-age=86400`). No QR images are stored in the database — they are generated on demand.

### §2.5 APPRENTICE is a role, not a permission flag

The `APPRENTICE` role is added to the `RoleName` union type and seeded in the roles table. It sits between AUTHENTICATED and STAFF in the hierarchy. Sprint 4 adds the role definition; Sprint 11 adds the role-specific MCP tools (`generate_qr`, `my_referrals`, `my_assignments`). In Sprint 4, the role exists and can be assigned, but has no additional tool capabilities beyond AUTHENTICATED.

### §2.6 Affiliate toggle is admin-only and generates code on enable

When an admin enables affiliate for a user, the system generates a referral code if one doesn't exist. When disabling, the existing code is preserved (not deleted) — this allows re-enabling without breaking existing QR codes in circulation.

### §2.7 Greeting wiring connects Sprint 3 rendering to Sprint 4 data

The `createInitialChatMessages` function gains awareness of referral context. When a referral cookie is present, the client reads it, and the `GreetingContext` is populated with the referrer's data. The `withReferral` template is used instead of the default greeting. If the referrer lookup fails (deleted user, invalid code), the system falls back to the default greeting.

### §2.8 referralSuggestions provide referral-specific chips

When a visitor arrives via referral, the suggestion chips change from the default set to referral-specific suggestions (e.g., "{{referrer.name}} mentioned you could help", "I'm interested in AI for my business"). These are defined in `prompts.json` alongside `defaultSuggestions`.

---

## §3 Implementation Plan

### Phase 1: Schema migration

**Files modified:**
- `src/lib/db/schema.ts` — Add `referrals` table with columns: `id`, `referrer_user_id`, `conversation_id`, `referral_code`, `scanned_at`, `converted_at`, `outcome`, `created_at`. Add indexes on `referral_code`, `referrer_user_id`, `conversation_id`. Add `affiliate_enabled` (INTEGER DEFAULT 0), `referral_code` (TEXT UNIQUE), and `credential` (TEXT DEFAULT NULL) columns to `users` via idempotent ALTER. Add `referral_source` (TEXT) column to `conversations` via idempotent ALTER.
- `src/core/entities/user.ts` — Add `"APPRENTICE"` to `RoleName` union type.
- `src/lib/db/schema.ts` — Add `APPRENTICE` to role seed: `('role_apprentice', 'APPRENTICE', 'Student with referral and assignment capabilities')`.

**Schema SQL (referrals table):**
```sql
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  conversation_id TEXT,
  referral_code TEXT NOT NULL,
  scanned_at TEXT,
  converted_at TEXT,
  outcome TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_user_id) REFERENCES users(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_conversation ON referrals(conversation_id);
```

**User column migrations:**
```typescript
try { db.exec(`ALTER TABLE users ADD COLUMN affiliate_enabled INTEGER NOT NULL DEFAULT 0`); } catch { /* exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE DEFAULT NULL`); } catch { /* exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN credential TEXT DEFAULT NULL`); } catch { /* exists */ }
```

**Conversation column migration:**
```typescript
try { db.exec(`ALTER TABLE conversations ADD COLUMN referral_source TEXT DEFAULT NULL`); } catch { /* exists */ }
```

### Phase 2: Referral code generation utility

**New file:**
- `src/lib/referral/generate-code.ts` — Pure function: `generateReferralCode(): string`. Uses `crypto.getRandomValues(new Uint8Array(16))` and base62-encodes the result. Returns a 22-character string.

**Implementation:**
```typescript
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let result = "";
  for (const byte of bytes) {
    result += BASE62[byte % 62];
  }
  return result;
}
```

### Phase 3: Referral domain entity and data mapper

**New files:**
- `src/core/entities/Referral.ts` — Domain entity interface:
  ```typescript
  export interface Referral {
    id: string;
    referrerUserId: string;
    conversationId: string | null;
    referralCode: string;
    scannedAt: string | null;
    convertedAt: string | null;
    outcome: string | null;
    createdAt: string;
  }
  ```
- `src/adapters/ReferralDataMapper.ts` — SQL ↔ domain mapping with methods:
  - `create(referral: Omit<Referral, "createdAt">): Referral`
  - `findByCode(code: string): Referral | null`
  - `findByReferrer(userId: string): Referral[]`
  - `findByConversation(conversationId: string): Referral | null`
  - `setConversation(id: string, conversationId: string): void`
  - `setConverted(id: string, outcome: string): void`
  - `getReferrerUser(code: string): { id: string; name: string; email: string; credential: string | null } | null` — joins referrals → users to get referrer info for greeting interpolation. The `credential` column is a human-readable professional title (e.g., "Enterprise AI practitioner") set by the admin alongside affiliate enablement.

### Phase 4: Proxy `?ref=` handling

**Files modified:**
- `src/proxy.ts` — Extend the `proxy()` function to detect `?ref=` on non-API routes. When found, set the `lms_referral_code` cookie on the response. The proxy continues to `NextResponse.next()` — no redirect.

**Logic change:**
```typescript
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Referral code capture: set cookie on any page route with ?ref= param
  if (!pathname.startsWith("/api/")) {
    const refCode = searchParams.get("ref");
    if (refCode && refCode.length > 0 && refCode.length <= 30) {
      const response = NextResponse.next();
      response.cookies.set("lms_referral_code", refCode, {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }
    return NextResponse.next();
  }

  // ... existing API route protection logic ...
}
```

**Config change:**
- `src/proxy.ts` — Update matcher to include page routes: `matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]`

### Phase 5: Conversation attribution

**Files modified:**
- `src/core/use-cases/ConversationRepository.ts` — Add `referralSource?` to the `create` method parameter. Add `setReferralSource(id: string, referralSource: string): Promise<void>` method.
- `src/core/use-cases/ConversationInteractor.ts` — `ensureActive()` gains optional `referralSource` in options. When creating a new conversation, passes `referralSource` to `create()`. After creation, if `referralSource` is present, creates a referral record via the data mapper.
- `src/adapters/ConversationDataMapper.ts` — Implement `referralSource` write in `create()` and `setReferralSource()`.
- `src/app/api/chat/stream/route.ts` — Read `lms_referral_code` cookie, pass to `interactor.ensureActive(userId, { referralSource })`.

**ConversationInteractor change:**
```typescript
async ensureActive(
  userId: string,
  options?: { sessionSource?: string; referralSource?: string },
): Promise<Conversation> {
  const existing = await this.conversationRepo.findActiveByUser(userId);
  if (existing) return existing;
  return this.create(userId, "", options);
}
```

### Phase 6: QR code image endpoint

**New dependency:**
- Install `qrcode` package: `npm install qrcode` and `npm install -D @types/qrcode`

**New file:**
- `src/app/api/qr/[code]/route.ts` — GET handler that:
  1. Extracts `code` from params
  2. Validates code exists in the database (looks up user with matching `referral_code` where `affiliate_enabled = 1`)
  3. If not found, returns 404
  4. Generates QR code PNG encoding `https://{domain}/?ref={code}` (domain from instance config)
  5. Returns the image with `Content-Type: image/png`, `Cache-Control: public, max-age=86400`

**Rate limiting:**
- Per PLAT-021: 60 requests/minute per IP. Simple in-memory Map with sliding window. The rate limiter is a standalone utility (`src/lib/rate-limit.ts`) so it can be reused by other endpoints.

**New file:**
- `src/lib/rate-limit.ts` — In-memory rate limiter:
  ```typescript
  export function createRateLimiter(windowMs: number, maxRequests: number): (key: string) => boolean
  ```
  Returns `true` if the request is allowed, `false` if rate-limited. Uses a Map of `key → { count, resetAt }` with periodic cleanup.

### Phase 7: Admin affiliate toggle

**New file:**
- `src/app/api/admin/affiliates/[userId]/route.ts` — PATCH handler:
  1. Validates caller is ADMIN role
  2. Reads body: `{ affiliate_enabled: boolean, credential?: string }`
  3. If enabling: sets `affiliate_enabled = 1`, generates `referral_code` if null
  4. If disabling: sets `affiliate_enabled = 0`, preserves existing `referral_code`
  5. Accepts optional `credential` string to set the user's professional title
  6. Returns updated user affiliate status

### Phase 8: Greeting wiring and prompts population

**Files modified:**
- `config/prompts.json` — Add `withReferral` template and `referralSuggestions`:
  ```json
  {
    "firstMessage": {
      "default": "Describe the workflow problem, orchestration gap, or training goal.",
      "withReferral": "Welcome — I see you were introduced by {{referrer.name}}, a {{referrer.credential}} in the Enterprise AI program. How can {{brand.name}} help you today?"
    },
    "referralSuggestions": [
      "Tell me what {{referrer.name}} does",
      "I'm interested in AI for my business",
      "I want to learn AI orchestration",
      "How does the referral program work?"
    ]
  }
  ```
- `src/lib/config/defaults.ts` — Add `referralSuggestions` to `InstancePrompts` type. Add `withReferral` default value to `DEFAULT_PROMPTS`.
- `src/lib/config/instance.schema.ts` — Add validation for `referralSuggestions` (max 6 items × 100 chars) and `withReferral` (max 1000 chars).
- `src/hooks/chat/chatState.ts` — When `prompts.firstMessage.withReferral` exists AND a referral context is provided, use the referral template with `interpolateGreeting()` and `referralSuggestions` instead of default message and suggestions.
- `src/hooks/useGlobalChat.tsx` — Read referral cookie from client, look up referrer info via API, pass greeting context to `createInitialChatMessages`.

**New API route for referrer lookup:**
- `src/app/api/referral/[code]/route.ts` — GET handler that returns `{ referrer: { name, credential } }` for a valid referral code. Used by the client to populate `GreetingContext`. Returns 404 for invalid codes. No auth required (anonymous visitors use this).

---

## §4 Security Considerations

| Constraint | V1 spec ref | Implementation |
| --- | --- | --- |
| Referral codes are opaque | PLAT-020 | `crypto.getRandomValues` + base62 encoding. No user ID or sequence embedded. |
| QR endpoint rate-limited | PLAT-021 | In-memory rate limiter: 60 req/min/IP. Returns 429 when exceeded. |
| Affiliate status admin-gated | PLAT-027 | PATCH `/api/admin/affiliates/[userId]` requires ADMIN role check before execution. |
| Referral code length validation | Defense in depth | Proxy validates `?ref=` param length (1–30 chars) before setting cookie. |
| Referrer lookup is public but minimal | Privacy | `/api/referral/[code]` returns only `name` (first name + last initial) and `credential`, not email or ID. `credential` is admin-set (nullable, defaults to greeting-interpolator fallback). |
| Cookie not HttpOnly | Intentional | Client needs to read the referral code for greeting interpolation. The cookie contains only the referral code (non-sensitive). |

---

## §5 Test Specification

### §5.1 Positive tests (happy paths work)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `APPRENTICE is a valid RoleName` | Static analysis: `src/core/entities/user.ts` source contains `"APPRENTICE"` in the `RoleName` union type. |
| P2 | `APPRENTICE role seeded in schema` | After `ensureSchema(db)`, query `roles` table — row with `name = 'APPRENTICE'` exists. |
| P3 | `referrals table created with correct columns` | After `ensureSchema(db)`, `PRAGMA table_info(referrals)` returns columns: id, referrer_user_id, conversation_id, referral_code, scanned_at, converted_at, outcome, created_at. |
| P4 | `users table has affiliate_enabled column defaulting to 0` | After `ensureSchema(db)`, insert a user, read back — `affiliate_enabled` is `0`. |
| P5 | `users table has referral_code column` | After `ensureSchema(db)`, `PRAGMA table_info(users)` includes `referral_code`. |
| P6 | `conversations table has referral_source column` | After `ensureSchema(db)`, `PRAGMA table_info(conversations)` includes `referral_source`. |
| P7 | `generateReferralCode returns 22-character base62 string` | Call `generateReferralCode()`. Result is 22 chars, all characters in `[0-9A-Za-z]`. |
| P8 | `generateReferralCode produces different codes on each call` | Call 10 times. All 10 results are unique (Set size = 10). |
| P9 | `ReferralDataMapper.create persists a referral record` | Create a referral via data mapper, then query the database directly — row exists with correct fields. |
| P10 | `ReferralDataMapper.findByCode returns matching referral` | Create a referral, then `findByCode(code)` — returns the correct referral object. |
| P11 | `ReferralDataMapper.findByReferrer returns all referrals for a user` | Create 3 referrals for one user, `findByReferrer(userId)` — returns array of length 3. |
| P12 | `ReferralDataMapper.getReferrerUser returns referrer info including credential` | Create user + referral with `credential = 'Enterprise AI practitioner'`, `getReferrerUser(code)` — returns `{ id, name, email, credential }`. |
| P13 | `proxy sets lms_referral_code cookie when ?ref= present on page route` | Call `proxy(makeRequest("/?ref=abc123"))`. Response has `Set-Cookie` header with `lms_referral_code=abc123`. |
| P14 | `proxy forwards page request normally after setting referral cookie` | Response status is 200 (NextResponse.next()), not a redirect. |
| P15 | `ConversationInteractor stores referral_source when option provided` | Call `ensureActive(userId, { referralSource: "abc123" })`. Created conversation has `referralSource = "abc123"`. |
| P16 | `QR endpoint returns PNG for valid referral code` | Create user with `affiliate_enabled = 1` and `referral_code = "testcode"`. GET `/api/qr/testcode` returns 200 with `Content-Type: image/png`. |
| P17 | `Admin affiliate toggle enables affiliate and generates code` | PATCH with `{ affiliate_enabled: true }` as ADMIN. User's `affiliate_enabled` becomes 1 and `referral_code` is a 22-char string. |
| P18 | `withReferral template populated in prompts.json` | Read `config/prompts.json`, parse — `firstMessage.withReferral` is a non-empty string containing `{{referrer.name}}`. |
| P19 | `referralSuggestions populated in prompts.json` | Read `config/prompts.json`, parse — `referralSuggestions` is an array with at least 2 items. |
| P20 | `rate limiter allows requests within limit` | Create limiter(60000, 5). Call 5 times with same key — all return `true`. |
| P21 | `GET /api/referral/{code} returns referrer info for valid code` | Create user with affiliate enabled and credential set. GET `/api/referral/{code}` — returns 200 with `{ referrer: { name, credential } }`. |

### §5.2 Negative tests (boundaries enforced)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `proxy ignores ?ref= with empty value` | `proxy(makeRequest("/?ref="))` — no `Set-Cookie` header for `lms_referral_code`. |
| N2 | `proxy ignores ?ref= on API routes` | `proxy(makeRequest("/api/chat/stream?ref=abc"))` — no referral cookie set; normal API handling continues. |
| N3 | `proxy ignores ?ref= exceeding 30 characters` | `proxy(makeRequest("/?ref=" + "x".repeat(31)))` — no `lms_referral_code` cookie set. |
| N4 | `QR endpoint returns 404 for non-existent referral code` | GET `/api/qr/nonexistent` — returns 404 JSON error. |
| N5 | `QR endpoint returns 404 for user with affiliate_enabled = 0` | Create user with `referral_code` but `affiliate_enabled = 0`. GET `/api/qr/{code}` — returns 404. |
| N6 | `rate limiter rejects requests over limit` | Create limiter(60000, 3). Call 4 times with same key — 4th call returns `false`. |
| N7 | `Admin affiliate toggle rejects non-ADMIN caller` | Call affiliate toggle route without ADMIN role — returns 403. |
| N8 | `referral_code UNIQUE constraint enforced` | Insert two users with the same `referral_code` — second insert throws UNIQUE constraint error. |
| N9 | `ConversationInteractor ignores referralSource when conversation already exists` | Create conversation first with no referral. Call `ensureActive(userId, { referralSource: "abc" })` — existing conversation returned, `referral_source` unchanged (NULL). |
| N10 | `ReferralDataMapper.findByCode returns null for non-existent code` | `findByCode("nonexistent")` — returns `null`. |
| N11 | `GET /api/referral/{code} returns 404 for invalid code` | GET `/api/referral/nonexistent` — returns 404 JSON error. |
| N12 | `Admin affiliate toggle returns 404 for non-existent user` | PATCH `/api/admin/affiliates/nonexistent` as ADMIN — returns 404. |

### §5.3 Edge tests (boundary conditions and integration scenarios)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `generateReferralCode produces no collisions in 1000 iterations` | Generate 1000 codes, add to Set — Set size is 1000. |
| E2 | `proxy preserves existing cookies when adding referral cookie` | Request with existing `lms_session_token` cookie + `?ref=abc`. Response has BOTH the session passthrough and the new referral cookie. |
| E3 | `referral attribution preserved when anonymous conversation migrates to authenticated` | Create anonymous conversation with `referral_source`. Call `migrateAnonymousConversations`. The conversation retains its `referral_source` after ownership transfer. |
| E4 | `QR code URL uses domain from instance config` | Generate QR for code "test123". The encoded URL starts with `https://{configured_domain}/?ref=`. |
| E5 | `withReferral template falls back to default when referral context missing` | Call `createInitialChatMessages("ANONYMOUS", prompts)` with prompts containing `withReferral` but no referral context — uses default greeting, not the referral template. |
| E6 | `referral cookie with invalid code handled gracefully in conversation creation` | Set referral cookie to "invalid_code_xyz". `ensureActive` with this referralSource creates conversation normally — `referral_source` is set but no referral record created (code not found in DB). |
| E7 | `admin re-enabling affiliate preserves existing referral_code` | Enable affiliate → generates code "XYZ". Disable affiliate. Re-enable affiliate. Code is still "XYZ", not regenerated. |
| E8 | `rate limiter resets after window expires` | Create limiter(100, 2). Exhaust limit. Wait 101ms. Call again — returns `true` (window reset). |
| E9 | `referralSuggestions validated: max 6 items, 100 chars each` | `validatePrompts({ referralSuggestions: Array(7).fill("x") })` — returns validation error. `validatePrompts({ referralSuggestions: ["x".repeat(101)] })` — returns validation error. |
| E10 | `schema migration is idempotent` | Call `ensureSchema(db)` twice. No errors on second call. All tables and columns intact. |
| E11 | `credential column defaults to NULL for existing users` | After migration, existing user rows have `credential = NULL`. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P21) | 21 |
| Negative (N1–N12) | 12 |
| Edge (E1–E11) | 11 |
| **Total new tests** | **44** |
| Deleted tests | 0 |
| **Net change** | **+44** |

Note: The V1 spec §8 originally estimated +18 tests for Sprint 4. This spec adds 44 tests because the referral system spans multiple layers (schema, domain, data mapper, proxy, conversation interactor, QR endpoint, admin API, referral lookup API, config, greeting wiring) and each layer needs positive, negative, and edge coverage. The extra tests prevent integration gaps between the proxy cookie, the conversation attribution, the QR endpoint, the referral lookup route, and the greeting interpolation — all of which must work together for the referral flow to succeed.

---

## §6 Test Implementation Patterns

### §6.1 Schema tests (P2–P6, E10)

```typescript
import Database from "better-sqlite3";
import { ensureSchema } from "@/lib/db/schema";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  ensureSchema(db);
  return db;
}

it("P2: APPRENTICE role seeded in schema", () => {
  const db = createTestDb();
  const row = db.prepare("SELECT * FROM roles WHERE name = 'APPRENTICE'").get();
  expect(row).toBeDefined();
  expect(row.id).toBe("role_apprentice");
});

it("P3: referrals table created with correct columns", () => {
  const db = createTestDb();
  const columns = db.prepare("PRAGMA table_info(referrals)").all();
  const colNames = columns.map((c: any) => c.name);
  expect(colNames).toEqual(
    expect.arrayContaining([
      "id", "referrer_user_id", "conversation_id", "referral_code",
      "scanned_at", "converted_at", "outcome", "created_at",
    ])
  );
});

it("P4: users.affiliate_enabled defaults to 0", () => {
  const db = createTestDb();
  db.prepare("INSERT INTO users (id, email, name) VALUES ('u1', 'u1@test.com', 'User 1')").run();
  const row = db.prepare("SELECT affiliate_enabled FROM users WHERE id = 'u1'").get();
  expect(row.affiliate_enabled).toBe(0);
});

it("E10: schema migration is idempotent", () => {
  const db = new Database(":memory:");
  ensureSchema(db);
  expect(() => ensureSchema(db)).not.toThrow();
});
```

### §6.2 Referral code generation tests (P7, P8, E1)

```typescript
import { generateReferralCode } from "@/lib/referral/generate-code";

it("P7: generateReferralCode returns 22-character base62 string", () => {
  const code = generateReferralCode();
  expect(code).toHaveLength(22);
  expect(code).toMatch(/^[0-9A-Za-z]+$/);
});

it("P8: generateReferralCode produces different codes on each call", () => {
  const codes = new Set(Array.from({ length: 10 }, () => generateReferralCode()));
  expect(codes.size).toBe(10);
});

it("E1: generateReferralCode produces no collisions in 1000 iterations", () => {
  const codes = new Set(Array.from({ length: 1000 }, () => generateReferralCode()));
  expect(codes.size).toBe(1000);
});
```

### §6.3 Proxy tests (P13, P14, N1–N3, E2)

```typescript
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function makeRequest(path: string, cookie?: string): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(url, { headers });
}

it("P13: proxy sets lms_referral_code cookie when ?ref= present", () => {
  const res = proxy(makeRequest("/?ref=abc123"));
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).toContain("lms_referral_code=abc123");
});

it("P14: proxy forwards page request normally after setting referral cookie", () => {
  const res = proxy(makeRequest("/?ref=abc123"));
  expect(res.status).toBe(200);
});

it("N1: proxy ignores ?ref= with empty value", () => {
  const res = proxy(makeRequest("/?ref="));
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).not.toContain("lms_referral_code");
});

it("N2: proxy ignores ?ref= on API routes", () => {
  const res = proxy(makeRequest("/api/chat/stream?ref=abc"));
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).not.toContain("lms_referral_code");
});

it("E2: proxy preserves existing cookies when adding referral cookie", () => {
  const res = proxy(makeRequest("/?ref=abc123", "lms_session_token=tok123"));
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).toContain("lms_referral_code=abc123");
});
```

### §6.4 Rate limiter tests (P20, N6, E8)

```typescript
import { createRateLimiter } from "@/lib/rate-limit";

it("P20: rate limiter allows requests within limit", () => {
  const limiter = createRateLimiter(60_000, 5);
  for (let i = 0; i < 5; i++) {
    expect(limiter("ip_1")).toBe(true);
  }
});

it("N6: rate limiter rejects requests over limit", () => {
  const limiter = createRateLimiter(60_000, 3);
  limiter("ip_1"); limiter("ip_1"); limiter("ip_1");
  expect(limiter("ip_1")).toBe(false);
});

it("E8: rate limiter resets after window expires", async () => {
  const limiter = createRateLimiter(100, 2);
  limiter("ip_1"); limiter("ip_1");
  expect(limiter("ip_1")).toBe(false);
  await new Promise((r) => setTimeout(r, 110));
  expect(limiter("ip_1")).toBe(true);
});
```

### §6.5 Static analysis tests (P1, P18, P19)

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

it("P1: APPRENTICE is a valid RoleName", () => {
  const src = readSource("src/core/entities/user.ts");
  expect(src).toContain('"APPRENTICE"');
});

it("P18: withReferral template populated in prompts.json", () => {
  const raw = readSource("config/prompts.json");
  const config = JSON.parse(raw);
  expect(config.firstMessage?.withReferral).toBeDefined();
  expect(config.firstMessage.withReferral).toContain("{{referrer.name}}");
});

it("P19: referralSuggestions populated in prompts.json", () => {
  const raw = readSource("config/prompts.json");
  const config = JSON.parse(raw);
  expect(config.referralSuggestions).toBeInstanceOf(Array);
  expect(config.referralSuggestions.length).toBeGreaterThanOrEqual(2);
});
```

---

## §7 File Change Summary

### §7.1 New files

| File | Purpose |
| --- | --- |
| `src/lib/referral/generate-code.ts` | Cryptographically random referral code generation (base62, 16 bytes) |
| `src/core/entities/Referral.ts` | Referral domain entity interface |
| `src/adapters/ReferralDataMapper.ts` | Referral SQL ↔ domain mapping (CRUD + referrer lookup) |
| `src/lib/rate-limit.ts` | In-memory sliding-window rate limiter (reusable) |
| `src/app/api/qr/[code]/route.ts` | QR code PNG generation endpoint |
| `src/app/api/admin/affiliates/[userId]/route.ts` | Admin affiliate enable/disable toggle |
| `src/app/api/referral/[code]/route.ts` | Public referrer info lookup for greeting personalization |
| `tests/sprint-4-referral-tracking.test.ts` | Sprint 4 verification tests (44 tests) |

### §7.2 Modified files

| File | Change |
| --- | --- |
| `src/lib/db/schema.ts` | Add `referrals` table. Add `affiliate_enabled`, `referral_code`, `credential` to users. Add `referral_source` to conversations. Seed APPRENTICE role. |
| `src/core/entities/user.ts` | Add `"APPRENTICE"` to `RoleName` union type. |
| `src/proxy.ts` | Parse `?ref=` on page routes, set `lms_referral_code` cookie. Update matcher to include page routes. |
| `src/core/use-cases/ConversationRepository.ts` | Add `referralSource?` to `create` params. Add `setReferralSource` method. |
| `src/core/use-cases/ConversationInteractor.ts` | Accept `referralSource` option in `ensureActive`. Pass to `create`. |
| `src/adapters/ConversationDataMapper.ts` | Implement `referralSource` write in `create()` and `setReferralSource()`. |
| `src/app/api/chat/stream/route.ts` | Read `lms_referral_code` cookie, pass `referralSource` to `interactor.ensureActive()`. |
| `src/lib/config/defaults.ts` | Add `referralSuggestions` to `InstancePrompts` type. Populate `withReferral` default in `DEFAULT_PROMPTS`. |
| `src/lib/config/instance.schema.ts` | Add validation for `referralSuggestions` and `withReferral`. |
| `config/prompts.json` | Add `withReferral` template and `referralSuggestions` array. |
| `src/hooks/chat/chatState.ts` | Accept referral context. Use `withReferral` template + `referralSuggestions` when referral is present. |
| `src/hooks/useGlobalChat.tsx` | Read referral cookie, fetch referrer info, pass greeting context to chat state. |
| `package.json` | Add `qrcode` dependency. Add `@types/qrcode` dev dependency. |

### §7.3 Existing tests requiring updates

| Test file | Hardcoded reference | Impact |
| --- | --- | --- |
| `src/middleware.test.ts` | Tests proxy behavior for API routes | **Must add new tests** for `?ref=` handling on page routes. Existing tests for API route behavior remain unchanged. |
| `src/proxy.test.ts` | Same proxy tests (duplicate file) | Same as above. |
| `tests/core-policy.test.ts` | May reference `RoleName` type | **Verify** APPRENTICE doesn't break existing role assertions. Should pass if tests use `includes()` checks rather than exhaustive matching. |
| `tests/chat-route.test.ts` | Tests conversation creation | **Verify** `ensureActive` signature change doesn't break (new param is optional). |
| `tests/sprint-3-first-message.test.tsx` | Sprint 3 tests for greeting | **Should pass unchanged** — Sprint 3 tests verify ANONYMOUS greeting with config. Sprint 4's referral context is an additive flow. |

---

## §8 Acceptance Criteria

1. A visitor scanning a QR code with `?ref={code}` lands on the homepage with a `lms_referral_code` cookie set.
2. The first conversation created after a QR scan has `referral_source` = the referral code.
3. A referral record is created in the `referrals` table linking the referrer, the code, and the conversation.
4. The ANONYMOUS greeting is personalized with the referrer's name when a valid referral cookie is present.
5. When no referral cookie exists, the greeting remains the default (Sprint 3 behavior preserved).
6. `generateReferralCode()` produces 22-character base62 strings that are cryptographically random and non-sequential.
7. `GET /api/qr/{code}` returns a PNG QR image for valid, affiliate-enabled referral codes.
8. `GET /api/qr/{code}` returns 404 for invalid codes or non-affiliate users.
9. `GET /api/qr/{code}` returns 429 when the rate limit (60 req/min/IP) is exceeded.
10. An admin can enable/disable affiliate status for any user via the admin API.
11. The APPRENTICE role exists in the `RoleName` type and is seeded in the database.
12. `config/prompts.json` contains a `withReferral` template with `{{referrer.name}}` and `{{referrer.credential}}` placeholders.
13. `config/prompts.json` contains `referralSuggestions` array with referral-specific suggestion chips.
14. Schema migration is idempotent — `ensureSchema()` can be called multiple times without error.
15. All 44 new tests pass. Total suite: 1267 + 44 = **1311** tests.
16. All pre-existing tests pass (1267 baseline).
17. Build clean. Lint clean (no new issues).

---

## §9 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `qrcode` library adds significant bundle weight | Low | The library is only imported in the server-side API route (`/api/qr/[code]`). It is not bundled into the client JavaScript. |
| Proxy matcher expansion causes unexpected behavior | Medium | The new matcher `/((?!_next/static|_next/image|favicon.ico).*)` excludes Next.js internal routes. Test coverage for both page and API routes validates correct behavior. |
| ConversationInteractor signature change breaks existing callers | Low | `referralSource` is added as an optional field in the existing `options` parameter. All existing callers omit it and get `undefined` (current behavior). |
| Rate limiter memory leak from accumulated IP entries | Low | Rate limiter includes periodic cleanup (entries older than 2× window duration are evicted). Production deployments behind reverse proxies can also use proxy-level rate limiting. |
| Referral cookie readable by client JavaScript (not HttpOnly) | Accepted | The cookie contains only the referral code (public, opaque string). It is needed by client-side greeting interpolation. No sensitive data exposed. |
| RBAC tests break when APPRENTICE added to RoleName | Low | APPRENTICE is added to the union type. Existing tests that iterate all roles use `["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"]` arrays, not the type itself. New role doesn't affect them. However, any exhaustive switch/case on RoleName will need a case for APPRENTICE. |
| referralSuggestions contain interpolation placeholders | Accepted | Suggestion chips like "Tell me what {{referrer.name}} does" contain placeholders that must be interpolated before display. The greeting interpolator handles this. |

---

## §10 Definition of Done

Sprint 4 is complete when:

1. A visitor can scan a QR code, land on the homepage, see a personalized greeting mentioning the referrer's name, and have their conversation attributed to the referrer in the database.
2. An admin can enable affiliate status for a user, and that user's referral code generates a working QR image at `/api/qr/{code}`.
3. The referral flow degrades gracefully: invalid codes, expired cookies, and disabled affiliates all result in the default greeting — never an error.
4. The APPRENTICE role exists in the type system and database, ready for Sprint 11 to add role-specific tools.
5. 44 new tests pass. Total suite: 1267 + 44 = **1311** tests.
6. Build clean. Lint clean.

### §10.1 V1 spec update

After Sprint 4 is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1311 tests, running total append: → 1311 (S4, +44)

### §10.2 Sprint 3 handoff verification

These Sprint 3 deliverables are consumed by Sprint 4:

| Sprint 3 artifact | How Sprint 4 uses it |
| --- | --- |
| `interpolateGreeting()` | Wired into referral greeting flow — populates `GreetingContext` with real referrer data |
| `InstancePrompts.firstMessage.withReferral` type | Populated with default template in `DEFAULT_PROMPTS` and `config/prompts.json` |
| `useInstancePrompts()` hook | Used by `useGlobalChat.tsx` to access `withReferral` and `referralSuggestions` |
| `createInitialChatMessages(role, prompts)` | Extended to accept referral context and select referral variant |
