# Sprint 1: Foundation & Critical Safety

**Duration:** ~2 weeks
**Theme:** Establish the unified composition root, eliminate production-crash risk, centralize the tool-round constant.
**Entry Criteria:** All 16 specs reviewed and approved.
**Exit Criteria:** All 3 specs below pass their acceptance criteria; full test suite green.

---

## Specs

| Order | Spec | Priority | Effort | Risk |
|-------|------|----------|--------|------|
| 1.1 | [01 — Registry/Executor Unification](../01-registry-executor-unification/spec.md) | Critical | Medium-Large | High — 4 specs depend on this (02, 09, 14, 16) |
| 1.2 | [03 — Tool-Round Config Unification](../03-tool-round-config-unification/spec.md) | High | Small | Low — isolated constant extraction |
| 1.3 | [04 — Worker/Server Decoupling](../04-worker-server-decoupling/spec.md) | Critical | Medium | Medium — process management changes |

---

## Execution Order & Rationale

### 1.1 — Registry/Executor Unification (FIRST)

**Why first:** This is the single most-blocking spec in the entire plan. Specs 02 (RBAC), 09 (Embedder), 14 (Composition Root), and 16 (Compatibility Sunset) all depend on the unified `getToolComposition()` API. Nothing else should merge until this is stable.

**Sequence:**
1. Implement `getToolComposition()` with memoization and `Object.freeze`.
2. Implement `_resetToolComposition()` test hook.
3. Migrate all 5 non-test call sites (route.ts, tools.ts, live-runtime.ts, live-runner.ts, deferred-job-notifications.ts).
4. Add `@deprecated` JSDoc to `getToolRegistry()` and `getToolExecutor()`.
5. Run full test suite — confirm zero breakage.
6. Run new unit + integration tests from the spec.

**Verify before moving on:**
- `getToolComposition()` returns frozen, memoized result.
- Both registry and executor share the same instance.
- No file in `src/` calls `getToolRegistry()` or `getToolExecutor()` directly (grep check).

### 1.2 — Tool-Round Config Unification (PARALLEL-SAFE)

**Why here:** Small, isolated, no dependencies. Can be developed in parallel with Spec 01 since it touches `orchestrator.ts` and `chat-config.ts` — files that don't overlap with the composition root.

**Sequence:**
1. Create `src/lib/chat/chat-config.ts` with `CHAT_CONFIG.maxToolRounds`.
2. Replace hardcoded `6` in `orchestrator.ts`.
3. Add optional `maxRounds` parameter to the orchestrator function signature (falls back to `CHAT_CONFIG.maxToolRounds`).
4. Confirm `anthropic-stream.ts` uses the same constant (or has none to replace).
5. Run orchestrator tests (including the per-request override test from the spec).
6. Run structural regression test (no magic numbers remain).

### 1.3 — Worker/Server Decoupling (PARALLEL-SAFE)

**Why here:** This is a Critical production safety issue — a worker crash takes down the entire site. It is completely independent of Specs 01 and 03 (it modifies `scripts/start-server.mjs`, not `src/`).

**Sequence:**
1. Extract restart logic into a testable function.
2. Replace the immediate `shutdown()` call with bounded restart-with-backoff.
3. Add `workerHealthy` flag.
4. Prefix worker stdout/stderr.
5. Run unit tests for restart logic (time-window tests, graceful shutdown).
6. Manual smoke test: kill worker process, confirm server stays up and restarts it.

---

## Dependencies

```
Sprint 1 produces:
  ├─ getToolComposition()     → used by Specs 02, 09, 14, 16
  ├─ CHAT_CONFIG              → used by orchestrator, future streaming paths
  └─ Worker restart logic     → used by health endpoint (Spec 04 self-contained)
```

**No incoming dependencies.** This sprint can start immediately.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Spec 01 migration breaks existing tests | Migrate one call site at a time; run test suite after each. |
| Worker restart logic masks real crashes | Cap restarts at 3 within 60s; log every restart with structured output. |
| Memoized registry caches stale state in tests | `_resetToolComposition()` in `beforeEach`. Vitest parallel isolation confirmed. |

---

## Definition of Done

- [x] `getToolComposition()` is the sole public API for registry + executor.
- [x] `getToolRegistry()` and `getToolExecutor()` carry `@deprecated` JSDoc. *(Removed entirely in Sprint 5 Spec 16.)*
- [x] All 5 non-test call sites migrated.
- [x] No hardcoded tool-round limits remain in orchestrator files.
- [x] Worker crash no longer kills the server (restart-with-backoff active).
- [x] `workerHealthy` flag is available for health endpoints.
- [x] All new tests from Specs 01, 03, 04 pass. *(21 tests)*
- [x] Full existing test suite passes.
