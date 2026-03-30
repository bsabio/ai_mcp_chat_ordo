# Spec 07: Request Validation Schemas

**Priority:** High
**Risk if deferred:** Malformed or adversarial input passes through to business logic, causing undefined behavior or security issues
**Files in scope:**
- `src/app/api/chat/stream/route.ts` (primary — request body parsing)
- All API routes under `src/app/api/` that accept POST/PUT/PATCH bodies
- `src/lib/chat/http-facade.ts` (route wrapper — no schema validation currently)

---

## Problem Statement

The chat stream route casts request JSON into a typed shape and then partially validates it with manual checks (`Array.isArray()`, property existence). This "trust then normalize" pattern:

1. Allows unexpected fields to pass through silently.
2. Does not produce machine-readable validation errors.
3. Puts the burden on each route handler to remember all the checks.
4. Makes it impossible to generate API documentation from the validation layer.

The `http-facade.ts` route wrapper handles error logging and metrics but performs no schema validation, meaning validation is entirely ad-hoc per route.

---

## Architectural Approach

### Step 1: Choose Zod as the schema library

Zod is already a common choice in Next.js ecosystems, provides TypeScript type inference, and has minimal bundle impact for server-side routes. If the project already uses a schema library, use that instead.

```bash
npm install zod
```

### Step 2: Define route-level schemas adjacent to their routes

Each API route that accepts a body gets a co-located schema file:

```
src/app/api/chat/stream/
  route.ts
  schema.ts       ← NEW
```

```typescript
// src/app/api/chat/stream/schema.ts
import { z } from "zod";

export const ChatStreamRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(100_000),
    })
  ).min(1),
  conversationId: z.string().uuid().optional(),
  attachments: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      mimeType: z.string(),
    })
  ).optional().default([]),
});

export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;
```

### Step 3: Validate at the route boundary

Replace manual validation with schema parsing at the top of the route handler:

```typescript
// route.ts — before
const body = await req.json();
const messages = body.messages;
if (!Array.isArray(messages)) { ... }

// after
const raw = await req.json();
const result = ChatStreamRequestSchema.safeParse(raw);
if (!result.success) {
  return NextResponse.json(
    { error: "Invalid request", details: result.error.flatten() },
    { status: 400 },
  );
}
const { messages, conversationId, attachments } = result.data;
```

### Step 4: Apply the same pattern to other POST routes

Prioritize routes by risk:

| Route | Risk Level | Reason |
|-------|-----------|--------|
| `/api/chat/stream` | Critical | Accepts user content, feeds to LLM |
| `/api/tts` | High | Feeds text to external API |
| `/api/auth/switch` | High | Changes user role |
| `/api/jobs/[id]` | Medium | Status queries with user-supplied ID |
| `/api/push/subscribe` | Medium | Accepts push subscription object |

### Step 5: Add a validation helper for the http-facade (optional)

If multiple routes use the same validation pattern, add it to the facade:

```typescript
// http-facade.ts
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const raw = await req.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 },
      );
    }
    return handler(result.data, req);
  };
}
```

---

## Constraints — Do NOT Introduce

- **Do not** validate GET request query parameters with Zod in this spec. Focus on POST/PUT/PATCH bodies. Query param validation can follow later.
- **Do not** add schemas that are stricter than current behavior without confirming the client code sends within the new constraints. Match existing implicit types first, then tighten.
- **Do not** expose Zod error internals directly to clients in production. Use `.flatten()` which produces a safe summary.
- **Do not** create a centralized `schemas/` directory. Keep schemas co-located with their routes.
- **Do not** use `.parse()` (which throws). Use `.safeParse()` for controlled error handling.

---

## Required Tests

### Unit Tests — `tests/request-validation-schemas.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `ChatStreamRequestSchema accepts valid minimal request` | `{ messages: [{ role: "user", content: "hi" }] }` → success. |
| 2 | `ChatStreamRequestSchema rejects empty messages array` | `{ messages: [] }` → failure with path `["messages"]`. |
| 3 | `ChatStreamRequestSchema rejects missing messages` | `{}` → failure. |
| 4 | `ChatStreamRequestSchema rejects message with empty content` | `{ messages: [{ role: "user", content: "" }] }` → failure. |
| 5 | `ChatStreamRequestSchema rejects invalid role` | `{ messages: [{ role: "system", content: "hi" }] }` → failure. |
| 6 | `ChatStreamRequestSchema defaults attachments to empty array` | `{ messages: [...] }` (no attachments key) → `result.data.attachments` is `[]`. |
| 7 | `ChatStreamRequestSchema rejects content exceeding max length` | Message with 100,001 character content → failure. |
| 8 | `ChatStreamRequestSchema accepts optional conversationId as UUID` | Valid UUID → success. Non-UUID string → failure. |

### Integration Tests — `tests/request-validation-integration.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `POST /api/chat/stream with invalid body returns 400 with error details` | Send malformed JSON, expect 400 + structured error response. |
| 2 | `POST /api/chat/stream with valid body proceeds to handler` | Send valid body (with mocked auth), expect 200 or streaming response (not 400). |
| 3 | `POST /api/tts with text exceeding limit returns 400` | Covered by TTS spec but confirmed here as schema-based. |
| 4 | `Validation errors do not leak internal schema structure in production` | If `NODE_ENV=production`, confirm error details are present but do not contain Zod-internal paths. |

---

## Acceptance Criteria

- [ ] All POST routes that accept JSON bodies validate via Zod schemas.
- [ ] Schemas are co-located with their route files.
- [ ] Invalid requests return 400 with a structured error response.
- [ ] `ChatStreamRequestSchema` is defined and used in the chat stream route.
- [ ] Manual `Array.isArray()` / property-existence checks are replaced by schema validation.
- [ ] All existing route tests pass.
- [ ] New tests above pass.
- [ ] No `z.parse()` (throwing) calls — only `z.safeParse()`.
