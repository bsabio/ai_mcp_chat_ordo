# Sprint 1 — Proxy Integration

> **Goal:** Wire the sliding-window rate-limit store into the proxy middleware
> with tier-based routing, IP extraction, 429 responses, and integration tests.
> **Spec Sections:** `ARL-010` through `ARL-016`
> **Prerequisite:** Sprint 0 accepted (rate-limit module and unit tests)

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/security/rate-limit.ts` | Sliding window store with `consume()`, tier constants, and reaper from Sprint 0 |
| `src/proxy.ts` | Proxy middleware applying security headers, CSRF checks, and session enforcement |
| `src/middleware.test.ts` | Existing proxy integration tests |

---

### 1. Add IP extraction utility

Add an `extractClientIp(request: NextRequest): string` function to
`src/lib/security/rate-limit.ts` that:

- Reads the first entry from `x-forwarded-for` header
- Falls back to `request.ip` or `"unknown"`
- Strips port suffixes and normalizes `::ffff:` IPv4-mapped IPv6 addresses

**Verify:**

- Unit tests for various `x-forwarded-for` formats

---

### 2. Integrate rate limiting into proxy

In `src/proxy.ts`, import the rate-limit store and tier constants. At the top
of the request handler, after security headers and before route matching:

- Skip rate limiting for exempt routes (`/api/health/*`, `/_next/*`,
  `/favicon.ico`, static assets)
- Determine the tier from the pathname:
  - `/api/auth/login` or `/api/auth/register` → auth tier
  - `/api/chat/stream` → chat tier
  - `/api/*` → general API tier
  - All other routes → no rate limit (page routes)
- Call `store.consume(ip, tier.maxRequests, tier.windowMs)`
- If not allowed, return `NextResponse.json({ error: "Too many requests" }, { status: 429 })` with `Retry-After` header (seconds)

Start the reaper once in module scope with a 60-second interval.

**Verify:**

- `npx vitest run src/middleware.test.ts`

---

### 3. Integration tests

Add rate-limit scenarios to `src/middleware.test.ts`:

- Auth endpoint returns 429 after exceeding 5 requests
- Chat endpoint returns 429 after exceeding 30 requests
- General API endpoint returns 429 after exceeding 120 requests
- 429 response includes `Retry-After` header
- Health endpoints are exempt from rate limiting
- Different IPs have isolated counters

**Verify:**

- `npx vitest run src/middleware.test.ts`
- `npm run build`

---

## Completion Checklist

- [ ] `extractClientIp()` handles `x-forwarded-for`, fallback, and normalization
- [ ] Proxy integrates rate limiting before route matching
- [ ] Auth tier enforced at 5/60s
- [ ] Chat tier enforced at 30/60s
- [ ] General API tier enforced at 120/60s
- [ ] 429 response with `Retry-After` header
- [ ] Health and static routes exempt
- [ ] Reaper started in module scope
- [ ] Integration tests pass
- [ ] `npm run build` passes

**Test Count:** Existing proxy tests + ~6 new rate-limit integration tests.

**Build Status:** Must be clean.

---

## QA Deviations

_Populated during implementation QA. Leave blank until QA pass._
