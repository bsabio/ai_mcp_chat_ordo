# Sprint 0 — Sliding Window Store

> **Goal:** Implement the in-memory sliding-window rate-limit module with tier
> configuration, stale entry eviction, and full unit test coverage.
> **Spec Sections:** `ARL-010` through `ARL-018`
> **Prerequisite:** None

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/security/origin-check.ts` | Existing security module in the same directory where the rate-limit module will live |
| `src/proxy.ts` | Current proxy middleware; Sprint 1 will integrate the module here |

---

### 1. Create the rate-limit module

Create `src/lib/security/rate-limit.ts` with:

- A `SlidingWindowStore` class backed by `Map<string, { count: number; windowStart: number }>`.
- A `consume(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number }` method.
- The window resets when `Date.now() - windowStart >= windowMs`.
- A `evictStale(maxAgeMs: number): number` method that removes all entries older than `maxAgeMs` and returns the count removed.
- Export named tier constants with environment-variable overrides:

```typescript
export const AUTH_RATE_LIMIT = {
  maxRequests: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60_000,
};

export const CHAT_RATE_LIMIT = {
  maxRequests: Number(process.env.RATE_LIMIT_CHAT_MAX) || 30,
  windowMs: Number(process.env.RATE_LIMIT_CHAT_WINDOW_MS) || 60_000,
};

export const API_RATE_LIMIT = {
  maxRequests: Number(process.env.RATE_LIMIT_API_MAX) || 120,
  windowMs: Number(process.env.RATE_LIMIT_API_WINDOW_MS) || 60_000,
};
```

**Verify:**

- `npx vitest run src/lib/security/rate-limit.test.ts`

---

### 2. Implement stale entry reaper

Add a `startReaper(intervalMs: number)` method on `SlidingWindowStore` that
calls `evictStale()` on an interval and returns a cleanup function. Default
interval: 60 seconds. The reaper must not throw if the store is empty.

**Verify:**

- Unit test using `vi.useFakeTimers` to advance time and confirm eviction

---

### 3. Unit tests

Create `src/lib/security/rate-limit.test.ts` covering:

- Requests within limit are allowed
- Request exceeding limit returns `allowed: false` with correct `retryAfterMs`
- Window resets after expiry
- Separate keys (different IPs) are isolated
- Stale entries are evicted by the reaper
- Tier constants have correct defaults
- Environment variable overrides are respected

**Verify:**

- `npx vitest run src/lib/security/rate-limit.test.ts`
- All tests pass

---

## Completion Checklist

- [ ] `src/lib/security/rate-limit.ts` created with `SlidingWindowStore`
- [ ] `consume()` method enforces sliding window correctly
- [ ] `evictStale()` removes expired entries
- [ ] `startReaper()` runs periodic eviction
- [ ] Tier constants exported with env-var overrides
- [ ] Unit tests cover all edge cases
- [ ] `npm run build` passes

**Test Count:** 0 existing + ~8 new = ~8 total tests.

**Build Status:** Must be clean.

---

## QA Deviations

_Populated during implementation QA. Leave blank until QA pass._
