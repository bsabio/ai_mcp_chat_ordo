# API Rate Limiting — Refactor Spec

> **Status:** Planned
> **Date:** 2026-04-07
> **Scope:** Add in-memory per-IP rate limiting to the proxy middleware layer
> so authentication endpoints, chat streaming, and general API routes are
> protected against brute-force attacks and abuse before any external
> infrastructure or WAF is in place.
> **Affects:** `src/proxy.ts`, `src/middleware.test.ts`, new rate-limit module
> under `src/lib/security/`, Docker health-check configuration
> **Motivation:** The platform has CSRF, security headers, timing-safe auth,
> and a hardened Docker container, but no mechanism to throttle repeated
> requests from a single source. A brute-force login attack or chat-stream
> abuse would succeed without resistance today.
> **Requirement IDs:** `ARL-001` through `ARL-099`

---

## 1. Problem Statement

### 1.1 Current state

The proxy layer in `src/proxy.ts` touches every inbound request. It enforces
security headers, CSRF origin checks, and session cookie presence for protected
routes. No request counting, throttling, or IP tracking exists anywhere in the
middleware chain.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No login rate limit** | `/api/auth/login` accepts unlimited POST requests per IP | Brute-force credential attacks are unthrottled `[ARL-001]` |
| 2 | **No registration rate limit** | `/api/auth/register` accepts unlimited POST requests per IP | Automated account creation is unrestricted `[ARL-002]` |
| 3 | **No chat stream rate limit** | `/api/chat/stream` accepts unlimited requests per IP | LLM cost abuse from rapid-fire streaming `[ARL-003]` |
| 4 | **No general API rate limit** | All `/api/*` routes are unbounded | Denial-of-service via high-volume API calls `[ARL-004]` |

### 1.3 Root cause

Rate limiting was not part of the initial build. The production stack runs a
single Docker container with no external reverse proxy or WAF providing
throttling.

### 1.4 Why it matters

Authentication endpoints are the highest-risk surface. Without rate limiting, a
determined attacker can enumerate passwords at network speed. Chat streaming is
the highest-cost surface — each request invokes an Anthropic API call. General
API abuse can degrade the SQLite database under sustained load.

---

## 2. Design Goals

1. Protect auth endpoints with a strict per-IP sliding window (5 requests per
   60 seconds for login/register). `[ARL-010]`
2. Protect chat streaming with a moderate per-IP limit (30 requests per 60
   seconds). `[ARL-011]`
3. Apply a general per-IP limit to all other API routes (120 requests per 60
   seconds). `[ARL-012]`
4. Return `429 Too Many Requests` with `Retry-After` header when limits are
   exceeded. `[ARL-013]`
5. Use an in-memory sliding window store that requires no external
   dependencies (no Redis, no database writes). `[ARL-014]`
6. Implement automatic eviction of stale window entries to prevent memory
   growth. `[ARL-015]`
7. Ensure health-check and static asset routes are exempt from rate
   limiting. `[ARL-016]`
8. Make limits configurable via environment variables with sensible
   defaults. `[ARL-017]`
9. Maintain full test coverage for the rate-limit module and proxy
   integration. `[ARL-018]`

---

## 3. Architecture

### 3.1 System boundaries

Rate limiting belongs in the proxy middleware layer (`src/proxy.ts`). It must
execute before route handlers and after security headers. The rate-limit state
is process-local — this is acceptable for a single-container deployment.

### 3.2 Recommended component inventory

| Component | Location | Purpose |
| --- | --- | --- |
| Sliding window store | `src/lib/security/rate-limit.ts` | In-memory `Map` tracking request counts per IP per window |
| Rate-limit middleware | `src/proxy.ts` | Integrates the store into the request chain with tier-based limits |
| Stale entry reaper | `src/lib/security/rate-limit.ts` | Periodic sweep removing expired window entries |
| Configuration | `src/lib/security/rate-limit.ts` | Environment-variable driven limits with compile-time defaults |

### 3.3 Rate-limit tiers

```text
Tier 1 — Auth endpoints
  Routes:   /api/auth/login, /api/auth/register
  Limit:    5 requests per 60-second window
  Behavior: 429 + Retry-After header

Tier 2 — Chat streaming
  Routes:   /api/chat/stream
  Limit:    30 requests per 60-second window
  Behavior: 429 + Retry-After header

Tier 3 — General API
  Routes:   /api/* (all others)
  Limit:    120 requests per 60-second window
  Behavior: 429 + Retry-After header

Exempt:
  /api/health/live, /api/health/ready, /_next/*, /favicon.ico, static assets
```

### 3.4 IP extraction

Use `x-forwarded-for` (first entry) when present, falling back to
`request.ip`. Strip port suffixes. Normalize IPv6-mapped IPv4 addresses.

---

## 4. Security

- Rate-limit headers must not leak internal IP resolution logic.
- The `Retry-After` value must be the number of seconds until the window
  resets, not an absolute timestamp.
- The reaper interval must not block the event loop.
- Rate-limit state must be isolated per tier to prevent auth-tier exhaustion
  from blocking general API access.

---

## 5. Testing Strategy

- Unit tests for the sliding window store: increment, expiry, eviction, tier
  isolation.
- Integration tests for the proxy: verify 429 responses, `Retry-After`
  header, exempt routes pass through, IP extraction from `x-forwarded-for`.
- Load test script (optional) for manual verification under sustained
  request volume.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Sliding window store, rate-limit module, unit tests |
| Sprint 1 | Proxy integration, tier routing, 429 responses, integration tests |

---

## 7. Future Considerations

- If the platform moves to multi-container deployment, replace the in-memory
  store with a shared Redis backend behind the same interface.
- Per-user rate limiting (in addition to per-IP) for authenticated endpoints
  could be added after the session model exposes user IDs to middleware.
- Adaptive rate limiting based on response latency or error rate is out of
  scope for this refactor.
