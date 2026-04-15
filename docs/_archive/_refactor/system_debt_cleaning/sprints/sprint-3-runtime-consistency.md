# Sprint 3: Runtime Consistency

**Duration:** ~2 weeks
**Theme:** Consolidate RBAC to a single enforcement point, make the embedder a singleton with true batching, harden the dev role-switch guard. All three depend on Sprint 1 or Sprint 2 outputs.
**Entry Criteria:** Sprint 2 complete. Zod schemas, structured logging, and `getEnvConfig()` are available.
**Exit Criteria:** All 3 specs below pass their acceptance criteria; full test suite green.

---

## Specs

| Order | Spec | Priority | Effort | Depends On |
|-------|------|----------|--------|-----------|
| 3.1 | [02 — RBAC Policy Consolidation](../02-rbac-policy-consolidation/spec.md) | High | Small | Spec 01 (Sprint 1) |
| 3.2 | [09 — Embedder Warm-Up & Batching](../09-embedder-warmup-batching/spec.md) | High | Medium | Spec 01 (Sprint 1) |
| 3.3 | [12 — Dev Role-Switch Guard](../12-dev-role-switch-guard/spec.md) | Medium | Small | Spec 08, 13 (Sprint 2) |

---

## Execution Order & Rationale

### 3.1 — RBAC Policy Consolidation (FIRST)

**Why first:** Small change (20-line middleware + ToolRegistry.execute() cleanup). Removes duplicated authorization logic and produces clean error types. Must be done before Spec 14 (Sprint 4) which decomposes the composition root — the RBAC contract needs to be settled first.

**Sequence:**
1. Remove `canExecute()` guard and role-check from `ToolRegistry.execute()` (lines 43–45).
2. Keep `canExecute()` as a public query method on the registry (used by UI filtering and introspection).
3. Standardize error types: `ToolNotFoundError` and `ToolAccessDeniedError` — ensure they carry `name` and `role` fields.
4. Optionally add a debug-only `console.assert` in `execute()` for belt-and-suspenders defense.
5. Run full RBAC test suite.
6. Run regression test: spy on `canExecute()`, confirm called exactly once per execution (from middleware only).

**Verify:**
- `ToolRegistry.execute()` no longer calls `canExecute()`.
- `RbacGuardMiddleware` is the sole enforcement point.
- Error types are distinct and serializable.

### 3.2 — Embedder Warm-Up & Batching (PARALLEL with 3.1)

**Why parallel:** Touches `src/adapters/LocalEmbedder.ts` and the composition root — different files than RBAC. Depends on Spec 01 (memoized composition root), which ensures `createToolRegistry()` only runs once and thus `new LocalEmbedder()` at line 140 only creates one instance.

**Sequence:**
1. Convert `LocalEmbedder` to export a singleton instance, not the class.
2. Add concurrent-load guard (`loading` promise in `getPipeline()`).
3. Add `warmUp()` method.
4. Replace `Promise.all(texts.map(t => this.embed(t)))` with true batch pipeline call.
5. Replace all `new LocalEmbedder()` calls in `src/` with the singleton import (3 sites: tool-composition-root.ts:140, embedding-module.ts:12, search-pipeline.ts:24).
6. Add warm-up call in server startup (non-blocking).
7. Run regression test: grep for `new LocalEmbedder` — confirm zero matches in `src/`.

**Verify:**
- `localEmbedder` is a singleton across all imports.
- `isReady()` reflects pipeline state.
- `embedBatch()` uses true batch input, not per-item Promise.all.
- Concurrent `getPipeline()` calls share a single loading promise.

### 3.3 — Dev Role-Switch Guard (AFTER 3.1 or 3.2)

**Why after Sprint 2:** Uses `logEvent()` from Spec 08 for audit logging and `getEnvConfig()` from Spec 13 for the `ENABLE_DEV_ROLE_SWITCH` feature flag. Both are available after Sprint 2.

**Sequence:**
1. Add `ENABLE_DEV_ROLE_SWITCH` feature flag as a second guard (in addition to `NODE_ENV === "development"`).
2. Validate target role against the known role enum.
3. Add `logEvent()` call on every successful role switch (`code: "ROLE_SWITCH"`).
4. Update `.env.local.example` with the flag (commented out).
5. Run unit tests: 9 test cases covering all permission combinations.
6. Run env discipline test: confirm the flag is not set in production env files.

---

## Dependencies

```
Sprint 3 consumes:
  ├─ getToolComposition() (Sprint 1, Spec 01)    → Specs 02, 09
  ├─ logEvent() (Sprint 2, Spec 08)              → Spec 12
  └─ getEnvConfig() (Sprint 2, Spec 13)          → Spec 12

Sprint 3 produces:
  ├─ Single RBAC enforcement point               → required by Spec 14 (Sprint 4)
  ├─ Singleton localEmbedder + warmUp()           → benefits Spec 14 (Sprint 4)
  ├─ ToolAccessDeniedError, ToolNotFoundError     → used by executor pipeline
  └─ Audit logging for role switches              → security compliance
```

---

## Parallelism Map

```
Week 1:
  [3.1 RBAC Consolidation] ──────►
  [3.2 Embedder Singleton + Batching] ──────────────────►

Week 2:
  [3.2 continued — warm-up integration + batch perf] ──►
  [3.3 Dev Role-Switch Guard] ────────────────►
  [Integration testing & full suite run] ──────────────►
```

Specs 3.1 and 3.2 can start on day 1. Spec 3.3 can start anytime (its Sprint 2 dependencies are already met) but is lowest-effort, so it slots into week 2.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Removing RBAC from `execute()` leaves a gap if middleware is bypassed | Debug-only `console.assert` in `execute()` catches this in dev/test. Middleware is always composed via `composeMiddleware()` — no code path bypasses it. |
| Singleton embedder means pipeline error crashes all embedding | `getPipeline()` already handles this by re-attempting on null. If the pipeline fails to load, `embed()` throws per-call — same behavior as before. |
| True batch embedding may not work for all pipeline models | Spec includes a fallback `embedBatchChunked()` with configurable chunk size. Test with the actual Xenova/all-MiniLM-L6-v2 model. |
| Dev role-switch flag forgotten in shared environments | Two guards required: `NODE_ENV === "development"` AND `ENABLE_DEV_ROLE_SWITCH === "true"`. Neither alone is sufficient. |

---

## Definition of Done

- [x] `ToolRegistry.execute()` no longer calls `canExecute()`.
- [x] `RbacGuardMiddleware` is the sole RBAC enforcement point.
- [x] `canExecute()` spy shows exactly 1 call per tool execution (from middleware).
- [x] `localEmbedder` is a module-level singleton — no `new LocalEmbedder()` in `src/`.
- [x] `embedBatch()` uses true batch pipeline input.
- [x] `warmUp()` is called at server startup.
- [x] Dev role-switch requires both `NODE_ENV=development` AND `ENABLE_DEV_ROLE_SWITCH=true`.
- [x] Every role switch emits a structured audit log event.
- [x] All new tests from Specs 02, 09, 12 pass. *(24 tests)*
- [x] Full test suite passes.
