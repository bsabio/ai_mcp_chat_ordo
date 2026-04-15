# Spec 11: CSRF Hardening

**Priority:** Medium
**Risk if deferred:** Cross-site POST requests may be accepted in browsers that downgrade SameSite or in misconfigured proxy environments
**Files in scope:**
- `src/middleware.ts` (if it exists) or Next.js middleware location
- `src/proxy.ts` (has CSRF advisory comment)
- All state-mutating API routes (`POST`, `PUT`, `PATCH`, `DELETE`)

---

## Problem Statement

The codebase relies on `SameSite=Lax` (or `Strict`) cookie policy for CSRF protection rather than explicit CSRF tokens. This is documented as an accepted tradeoff. However:

1. `SameSite=Lax` still allows top-level navigations (GET) to carry cookies in cross-site contexts.
2. Some browsers or proxy configurations may not enforce `SameSite` consistently.
3. There is no Origin or Referer header validation on state-mutating requests.
4. The current stance is not explicitly documented as a security decision — it's implied by absence.

This spec does NOT add full CSRF token infrastructure. It adds **Origin checking** and **explicit documentation** of the security posture.

---

## Architectural Approach

### Step 1: Add Origin header validation for state-mutating requests

Create a middleware function that checks the `Origin` header on POST/PUT/PATCH/DELETE requests:

```typescript
// src/lib/security/origin-check.ts
import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function checkOrigin(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null; // skip safe methods

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // If no origin header (same-origin requests from older browsers, non-browser clients)
  // fall through — this is acceptable for API-first services
  if (!origin) return null;

  const allowedOrigins = getAllowedOrigins(host);

  if (!allowedOrigins.has(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 },
    );
  }

  return null; // origin is valid
}

function getAllowedOrigins(host: string | null): Set<string> {
  const origins = new Set<string>();
  if (host) {
    origins.add(`https://${host}`);
    origins.add(`http://${host}`); // for local dev
  }
  // Add any explicitly configured origins
  const extra = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim());
  if (extra) {
    for (const o of extra) origins.add(o);
  }
  return origins;
}
```

### Step 2: Wire into Next.js middleware

```typescript
// src/middleware.ts
import { checkOrigin } from "@/lib/security/origin-check";
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest): NextResponse | void {
  const originResult = checkOrigin(req);
  if (originResult) return originResult;

  // ... existing middleware logic
}

export const config = {
  matcher: ["/api/:path*"],
};
```

### Step 3: Document the security posture

Create `docs/operations/csrf-posture.md`:

```markdown
# CSRF Protection Posture

## Current stance
- **Primary defense:** SameSite cookie attribute (Lax or Strict).
- **Secondary defense:** Origin header validation on all state-mutating requests (POST/PUT/PATCH/DELETE).
- **Not implemented:** Explicit CSRF tokens (Double Submit Cookie or Synchronizer Token Pattern).

## Why no CSRF tokens
This is a primarily API-driven application where:
- The client is a first-party SPA served from the same origin.
- Session cookies use SameSite=Lax (minimum).
- Non-browser API consumers supply Bearer tokens, not cookies.

Full CSRF token infrastructure adds complexity without proportional security gain
for this architecture. The Origin check catches the most common CSRF vector
(cross-origin form POST).

## Accepted risks
- Requests without an Origin header are allowed (e.g., server-to-server, non-browser clients).
  This is by design for API compatibility.
- Clients that strip the Origin header (unusual proxies) bypass this check.

## If upgrading to full CSRF tokens
Use the Double Submit Cookie pattern:
1. Set a `csrf_token` cookie (HttpOnly=false, SameSite=Strict).
2. Require `X-CSRF-Token` header on state-mutating requests.
3. Compare cookie value to header value.
```

---

## Constraints — Do NOT Introduce

- **Do not** implement full CSRF token generation/validation in this spec. Origin checking is the defined scope.
- **Do not** block requests without an Origin header. Non-browser API clients legitimately omit it.
- **Do not** add the Origin check to GET/HEAD/OPTIONS requests.
- **Do not** hardcode allowed origins. Derive from `Host` header and allow override via `ALLOWED_ORIGINS` env var.
- **Do not** add CORS headers in this spec — that is a separate concern.

---

## Required Tests

### Unit Tests — `tests/csrf-origin-check.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `GET requests bypass origin check` | Create GET request with mismatched Origin, confirm `checkOrigin()` returns null. |
| 2 | `POST with matching origin passes` | Create POST with `Origin: https://example.com` and `Host: example.com`, confirm null (pass). |
| 3 | `POST with mismatched origin is rejected` | Create POST with `Origin: https://evil.com` and `Host: example.com`, confirm 403 response. |
| 4 | `POST without origin header passes` | Create POST with no Origin header, confirm null (pass for API compatibility). |
| 5 | `ALLOWED_ORIGINS env var adds extra allowed origins` | Set `ALLOWED_ORIGINS=https://cdn.example.com`, confirm POST from that origin passes. |
| 6 | `PUT, PATCH, DELETE are all checked` | Confirm each method triggers origin validation. |
| 7 | `Origin matching is exact (no substring match)` | `Origin: https://example.com.evil.com` with `Host: example.com` → rejected. |
| 8 | `HTTP origin allowed in non-production for local dev` | `Origin: http://localhost:3000` with `Host: localhost:3000` → passes. |

### Integration Test — `tests/csrf-middleware-integration.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `POST /api/chat/stream from cross-origin returns 403` | Use test client with mismatched Origin header, expect 403. |
| 2 | `POST /api/chat/stream from same origin returns non-403` | Use test client with matching Origin, expect normal response (200 or auth error, not 403). |

### Documentation Test — `tests/csrf-posture-docs.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `CSRF posture document exists` | Assert `docs/operations/csrf-posture.md` exists and contains "Accepted risks" section. |

---

## Acceptance Criteria

- [ ] Origin header validation runs on all POST/PUT/PATCH/DELETE requests to `/api/*`.
- [ ] Requests with matching origin pass; mismatched origins get 403.
- [ ] Requests without an Origin header pass (API compatibility).
- [ ] `ALLOWED_ORIGINS` env var supports additional origins.
- [ ] `docs/operations/csrf-posture.md` documents the security stance and accepted risks.
- [ ] All existing API tests pass (they should already send same-origin or no Origin header).
- [ ] New tests above pass.
