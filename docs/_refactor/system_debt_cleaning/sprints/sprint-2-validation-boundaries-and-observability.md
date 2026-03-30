# Sprint 2: Validation Boundaries & Observability

**Duration:** ~2 weeks
**Theme:** Establish the validation and logging patterns that the rest of the plan depends on. Harden the TTS route. Formalize the SQLite boundary.
**Entry Criteria:** Sprint 1 complete. `getToolComposition()` is the sole public API. Worker restart logic is active.
**Exit Criteria:** All 5 specs below pass their acceptance criteria; full test suite green.

---

## Specs

| Order | Spec | Priority | Effort | Depends On |
|-------|------|----------|--------|-----------|
| 2.1 | [07 — Request Validation Schemas](../07-request-validation-schemas/spec.md) | High | Medium-Large | None |
| 2.2 | [08 — Fallback Observability](../08-fallback-observability/spec.md) | High | Medium-Large | None |
| 2.3 | [06 — TTS Route Hardening](../06-tts-route-hardening/spec.md) | High | Small-Medium | Spec 07 (schema pattern) |
| 2.4 | [05 — SQLite Boundary Formalization](../05-sqlite-boundary-formalization/spec.md) | High | Medium | None |
| 2.5 | [13 — Env Centralization](../13-env-centralization/spec.md) | Medium | Medium | None (also uses Zod) |

---

## Execution Order & Rationale

### 2.1 — Request Validation Schemas (FIRST)

**Why first:** Introduces Zod as the schema library and defines the `ChatStreamRequestSchema`. Spec 06 (TTS) uses the same validation pattern, and Spec 10 (Stream Route Decomposition, Sprint 4) depends on validated request types being available.

**Sequence:**
1. Install Zod (`npm install zod`).
2. Create `src/app/api/chat/stream/schema.ts` with `ChatStreamRequestSchema`.
3. Replace manual `Array.isArray()` checks in the chat stream route with `.safeParse()`.
4. Add schemas for TTS, auth/switch, and any other POST routes identified.
5. Run route tests — confirm 400 errors are now schema-driven.

**Verify:**
- All POST routes validate via Zod schemas.
- Invalid requests return structured 400 errors.
- No `z.parse()` (throwing) calls — only `z.safeParse()`.

### 2.2 — Fallback Observability (PARALLEL with 2.1)

**Why here:** Introduces `logEvent()`, `logDegradation()`, `logFailure()`, and the `REASON_CODES` catalog. Spec 12 (Dev Role-Switch Guard) depends on `logEvent`. Spec 10 (Stream Route) benefits from structured logging already being in place when the pipeline is built.

**Sequence:**
1. Create `src/lib/observability/log-event.ts` (type), `reason-codes.ts` (catalog), `logger.ts` (functions).
2. Walk `src/app/` and `src/lib/` — classify every `catch` block (expected degradation vs unexpected failure vs bare catch).
3. Replace bare catches with `logDegradation()` or `logFailure()` calls.
4. Run the catch-block audit test.
5. Run integration test: confirm chat stream emits `ROUTING_ANALYSIS_FAILED` when analysis throws.

**Verify:**
- All catch blocks in `src/app/` and `src/lib/` use structured logging.
- No sensitive data (API keys, message content) in log events.
- JSON output is parseable by standard log aggregators.

### 2.3 — TTS Route Hardening (AFTER 2.1)

**Why after 2.1:** Uses the same Zod-based validation pattern for text length. Also benefits from Spec 08's logging for error handling, though not a hard dependency.

**Sequence:**
1. Replace `fs.readFileSync` with `readFile` from `node:fs/promises`.
2. Add `AbortController` with 30s timeout to OpenAI fetch.
3. Add Zod schema for TTS request body (text length ≤ 4096).
4. Add response buffer size cap (10MB).
5. Standardize error responses (400, 502, 504).
6. Run structural regression test: confirm no `readFileSync` in the module.

### 2.4 — SQLite Boundary Formalization (PARALLEL)

**Why here:** Completely independent. Adds the instance lock, WAL mode, and documentation. Can be developed in parallel with everything else in this sprint.

**Sequence:**
1. Create `src/lib/db/startup-check.ts` with `acquireInstanceLock()`.
2. Wire into `start-server.mjs` (acquire on start, release on shutdown).
3. Add WAL mode and busy_timeout pragmas to DB connection init.
4. Create `docs/operations/single-node-invariant.md`.
5. Add database engine info to health/diagnostics endpoint.

### 2.5 — Env Centralization (PARALLEL)

**Why here:** Also uses Zod (same dependency as Spec 07). Independent of all other specs. Produces `getEnvConfig()` which Spec 12 (Dev Role-Switch) references for the feature flag.

**Sequence:**
1. Create `src/lib/config/env-config.ts` with Zod schema for all env vars.
2. Replace direct `process.env` reads in `src/app/` and `src/lib/` with `getEnvConfig()`.
3. Exempt `NEXT_PUBLIC_*` and `scripts/`.
4. Add startup validation call in server init.
5. Run structural regression test: no direct `process.env` reads in app/lib.

---

## Dependencies

```
Sprint 2 produces:
  ├─ Zod schemas + .safeParse() pattern    → used by Spec 10 (stream decomposition)
  ├─ logEvent/logDegradation/logFailure    → used by Specs 10, 12
  ├─ REASON_CODES catalog                  → used by all future catch blocks
  ├─ getEnvConfig()                        → used by Spec 12 (ENABLE_DEV_ROLE_SWITCH)
  ├─ acquireInstanceLock()                 → used by start-server.mjs
  └─ TTS hardened route                    → self-contained
```

**Incoming dependencies:** Sprint 1 (Spec 01 for unified composition root — not directly used here, but the codebase should be in post-unification state).

---

## Parallelism Map

```
Week 1:
  [2.1 Request Validation] ──────────────────►
  [2.2 Fallback Observability] ──────────────►
  [2.4 SQLite Boundary] ────────────►
  [2.5 Env Centralization] ─────────►

Week 2:
                              [2.3 TTS Hardening] ────►
  [2.2 continued — catch block audit] ──────────────────►
  [Integration testing & full suite run] ───────────────►
```

Specs 2.1, 2.2, 2.4, and 2.5 can all start on day 1. Spec 2.3 starts once 2.1's schema pattern is available.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Zod adds bundle size | Server-side only — no client bundle impact for API route schemas. |
| Catch-block audit is tedious and wide-reaching | Classify before replacing: expected degradation vs unexpected failure. Use reason codes to track completeness. |
| SQLite lock file left behind after crash | Lock file contains PID; error message tells how to remove manually. Release is idempotent. |
| Env centralization breaks `NEXT_PUBLIC_*` vars | Explicitly exempt — they must remain as `process.env.NEXT_PUBLIC_*` for Next.js client injection. |
| TTS timeout too aggressive | 30s is generous for OpenAI TTS. Can tune later without structural change. |

---

## Definition of Done

- [x] All POST routes validate request bodies via Zod `.safeParse()`.
- [x] `ChatStreamRequestSchema` is defined and used in the chat stream route.
- [x] `logEvent()`, `logDegradation()`, `logFailure()` are available in `src/lib/observability/`.
- [x] All bare `catch` blocks in `src/app/` and `src/lib/` replaced with structured logging.
- [x] TTS route uses async file reads, 30s fetch timeout, text/size validation.
- [x] `acquireInstanceLock()` runs at server startup; WAL mode is set.
- [x] `docs/operations/single-node-invariant.md` exists.
- [x] `getEnvConfig()` is the sole env access method in `src/app/` and `src/lib/`.
- [x] No `process.env` direct reads remain in app code (except `NEXT_PUBLIC_*`).
- [x] All new tests from Specs 05, 06, 07, 08, 13 pass. *(45 tests)*
- [x] Full test suite passes.
