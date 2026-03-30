# Sprint 4: Architecture Decomposition

**Duration:** ~2–3 weeks
**Theme:** Break apart the two densest modules in the system (stream route + composition root), harden CSRF, and enforce dev role-switch audit. This is the heaviest sprint — it reshapes the structural core.
**Entry Criteria:** Sprints 1–3 complete. Unified registry API, Zod schemas, structured logging, and RBAC consolidation are all in place.
**Exit Criteria:** All 3 specs below pass their acceptance criteria; route.ts is decomposed into focused modules; composition root uses domain bundles; full test suite green.

---

## Specs

| Order | Spec | Priority | Effort | Depends On |
|-------|------|----------|--------|-----------|
| 4.1 | [10 — Stream Route Decomposition](../10-stream-route-decomposition/spec.md) | High | Large | Spec 07 (Sprint 2) |
| 4.2 | [14 — Composition Root Decomposition](../14-composition-root-decomposition/spec.md) | Medium | Medium | Specs 01, 02 (Sprints 1, 3) |
| 4.3 | [11 — CSRF Hardening](../11-csrf-hardening/spec.md) | Medium | Small–Medium | Independent (middleware patterns established) |

---

## Execution Order & Rationale

### 4.1 — Stream Route Decomposition (FIRST, largest)

**Why first:** This is the single highest-complexity spec. The 600+ line `route.ts` is the densest module in the application. It must be broken apart before further features are layered on. The Zod request schemas from Spec 07 (Sprint 2) provide the typed boundaries that make decomposition safe.

**Sequence:**
1. **Define `ChatStreamPipeline` class** in `src/lib/chat/stream-pipeline.ts` with injected dependencies (session resolver, conversation repo, message repo, attachment service, routing analyzer, tool composition, prompt builder, stream factory).
2. **Extract each route concern into a pipeline method:** `resolveSession()`, `validateAndParse()`, `ensureConversation()`, `assignAttachments()`, `persistUserMessage()`, `analyzeRouting()`, `checkMathShortCircuit()`, `buildStreamContext()`, `createStreamResponse()`.
3. **Validated request parsing** uses Zod `ChatStreamRequestSchema` from Spec 07.
4. **Slim `route.ts` to orchestration only:** The POST handler instantiates the pipeline and calls methods sequentially — a ~50-line function.
5. **Move pipeline class to `src/lib/chat/stream-pipeline.ts`** with its own test file.
6. Run full end-to-end chat flow test against the decomposed route.

**Verify:**
- `route.ts` is under 80 lines (POST function under 50 lines) — pure orchestration.
- `ChatStreamPipeline` class exists in `src/lib/chat/stream-pipeline.ts`.
- Each pipeline method has dedicated unit tests via injected dependencies.
- No behavioral change — same SSE output for identical inputs.
- TypeScript strict mode passes with no `any` casts in the new modules.

### 4.2 — Composition Root Decomposition (PARALLEL with 4.1, different files)

**Why parallel:** Touches `src/lib/chat/tool-composition-root.ts` — completely different from the route files. Depends on Spec 01 (memoized registry) and Spec 02 (RBAC consolidation) to ensure the registration API and middleware chain are stable.

**Sequence:**
1. **Group tools by domain:** Create domain bundle files:
   - `src/lib/chat/tools/blog-tools.ts` — blog production, image gen, asset management
   - `src/lib/chat/tools/search-tools.ts` — web search, embedding, librarian
   - `src/lib/chat/tools/math-tools.ts` — calculator
   - `src/lib/chat/tools/admin-tools.ts` — diagnostics, health sweep
   - `src/lib/chat/tools/system-tools.ts` — everything else (file ops, prompt tools)
2. Each bundle exports a `register(registry: ToolRegistry): void` function.
3. Slim `tool-composition-root.ts` to orchestration: create registry → call each bundle's `register()` → compose middleware → return `{ registry, executor }`.
4. The composition root stays as the single entry point — bundles are internal.
5. Migrate the `tools.json` instance-filtering logic into the orchestrator.
6. Remove the backward-compat re-exports (`createToolResults`, etc.) — Spec 16 handles the sunset, but the re-export point can be deprecated now.
7. Run all tests that import from `tools.ts` or `tool-composition-root.ts`.

**Verify:**
- Composition root is under 60 lines.
- Each domain bundle (calculator, theme, corpus, conversation, blog, profile, job) is self-contained and independently testable.
- `tools.json` filtering still works.
- No tool is registered outside of a domain bundle.

### 4.3 — CSRF Hardening (LAST, smallest)

**Why last:** Independent of the decomposition work and small in scope. The middleware patterns are well-established by this point. Slotting it at the end means it can be validated against the newly decomposed route.

**Sequence:**
1. Create `src/lib/security/origin-check.ts` — `checkOrigin()` validates the `Origin` header against allowed hosts derived from the `Host` header.
2. Apply to all state-changing API routes (POST, PUT, DELETE) via Next.js middleware.
3. In development mode, allow `localhost:*` origins.
4. In production, derive allowed origins from the `Host` header; support additional origins via the `ALLOWED_ORIGINS` env var.
5. Add bypass for requests without an `Origin` header (API compatibility for non-browser clients).
6. Add structured log on CSRF rejection (`logEvent` with code `"CSRF_BLOCKED"`).
7. Run tests: valid origin passes, mismatched origin blocked, missing origin passes.

**Verify:**
- Cross-origin POST to `/api/chat/stream` returns 403.
- Same-origin POST succeeds.
- CSRF rejection is logged with structured event.
- Development mode allows localhost origins.

---

## Dependencies

```
Sprint 4 consumes:
  ├─ Zod ChatRequest schemas (Sprint 2, Spec 07)      → Spec 10
  ├─ Memoized createToolComposition() (Sprint 1, Spec 01) → Spec 14
  ├─ Single RBAC enforcement point (Sprint 3, Spec 02) → Spec 14
  └─ logEvent() (Sprint 2, Spec 08)                    → Spec 11

Sprint 4 produces:
  ├─ Decomposed route.ts (5 focused modules)            → maintainability
  ├─ Domain-bundled tool registration                   → extensibility
  ├─ CSRF protection middleware                         → security compliance
  └─ Clean composition root (<60 lines)                 → required by Spec 16
```

---

## Parallelism Map

```
Week 1:
  [4.1 Stream Route — extract parsing + conversation] ──────────────────►
  [4.2 Composition Root — create domain bundles] ──────────────────────►

Week 2:
  [4.1 Stream Route — extract REPL + streaming + slim route.ts] ────────►
  [4.2 Composition Root — slim orchestrator + deprecate re-exports] ────►

Week 3 (buffer):
  [4.3 CSRF Hardening] ──────────────────►
  [Integration testing across decomposed modules] ──────────────────────►
  [Full regression suite] ──────────────────────────────────────────────►
```

Specs 4.1 and 4.2 can proceed in parallel throughout weeks 1–2 since they touch entirely different file trees (`route.ts` subtree vs `tool-composition-root.ts` subtree). Spec 4.3 is straightforward and slots into week 3 alongside integration testing.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Stream route decomposition introduces subtle behavior change in SSE output | End-to-end snapshot test: capture raw SSE bytes from current route, replay same input against decomposed route, diff. The outputs must be byte-identical. |
| Domain bundles accidentally change tool registration order | Registration order test: assert `registry.getToolNames()` returns the same sorted list before and after the decomposition. Order within the registry map doesn't matter, but the set must be identical. |
| CSRF middleware blocks legitimate requests (browser quirks) | Progressive rollout: add middleware in log-only mode first (`warn` instead of `block`), monitor for false positives, then switch to enforcement. |
| Composition root decomposition breaks `tools.ts` re-exports | Spec 16 (Sprint 5) handles full sunset. In Sprint 4, mark re-exports as `@deprecated` and add console.warn — don't remove yet. |
| 600-line route is difficult to decompose without missing a branch | Coverage gate: run `vitest --coverage` on route.ts before AND after. Line coverage must not decrease. |

---

## Definition of Done

- [x] `route.ts` POST function is under 50 lines — pure orchestration. *(83 lines total, POST under 50)*
- [x] `ChatStreamPipeline` class exists in `src/lib/chat/stream-pipeline.ts` with all pipeline methods.
- [x] Each pipeline method has dedicated unit tests via injected dependencies.
- [x] SSE output is byte-identical to pre-decomposition baseline.
- [x] `tool-composition-root.ts` is under 60 lines. *(56 lines)*
- [x] Each domain bundle (calculator, theme, corpus, conversation, blog, profile, job) exists in `src/lib/chat/tool-bundles/` and exports `register()`.
- [x] `tools.json` instance filtering still works after decomposition.
- [x] CSRF `checkOrigin()` rejects cross-origin state-changing requests with 403.
- [x] CSRF allows same-origin and development requests.
- [x] CSRF allows requests without an `Origin` header (API compatibility).
- [x] CSRF rejections emit structured log events.
- [x] Backward-compat re-exports in `tools.ts` are annotated `@deprecated` with sunset date. *(Removed entirely in Sprint 5 Spec 16.)*
- [x] Line coverage does not decrease on any modified file.
- [x] Full test suite passes.
