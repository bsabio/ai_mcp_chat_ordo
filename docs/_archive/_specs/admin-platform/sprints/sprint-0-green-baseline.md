# Sprint 0 — Green Baseline

> No new features. Fix every failing test. Establish the stable foundation
> that all subsequent sprints build on.

---

## Current State

**12 failing tests** across 7 files. `vitest run` reports:

```
Test Files  7 failed | 286 passed (293)
     Tests  12 failed | 2063 passed (2075)
```

### Failing Test Files

| File | Failures | Root Cause Category |
|------|----------|-------------------|
| `tests/deferred-blog-publish-flow.test.ts` | 1 | Blog publish pipeline expectation drift |
| `tests/journal-public-route-convergence.test.ts` | 1 | Route emitter path assertion (`/journal` truth) |
| `tests/rbac-policy-consolidation.test.ts` | 2 | ToolRegistry RBAC behavior change (middleware vs. inline) |
| `tests/sprint-3-blog-orchestration-qa.test.ts` | 1 | Sitemap/shell public route truth assertion |
| `tests/sprint-7-blog-pipeline.test.ts` | 5 | Sitemap blog entries + page source analysis (blog→journal migration) |
| `tests/td-a-booch-job-visibility.test.ts` | 1 | Job route abstraction assertions (repository vs. direct import) |
| `src/hooks/useUICommands.test.tsx` | 1 | Streamed command replay guard |

### Failure Categories

**Blog→Journal migration drift (8 tests):** Tests still assert `/blog`
paths, `blog` route names, or blog-specific page source patterns. The
codebase migrated to `journal` naming but test expectations were not
updated.

**RBAC enforcement location change (2 tests):** `ToolRegistry.execute()`
no longer throws on role mismatch — RBAC is now enforced via
`RbacGuardMiddleware` in the middleware pipeline. Tests assert the old
throw-on-mismatch behavior.

**Job visibility encapsulation (1 test):** Asserts the jobs API route
uses specific repository abstractions (`getJobQueueRepository`,
`buildJobStatusSnapshot`) rather than direct DataMapper imports.

**UI command replay (1 test):** The `useUICommands` hook has a re-render
guard that the test expects but the implementation may have changed.

---

## Deliverables

### D0.1 — Fix blog→journal test drift

Update assertions in:
- `tests/journal-public-route-convergence.test.ts`
- `tests/sprint-3-blog-orchestration-qa.test.ts`
- `tests/sprint-7-blog-pipeline.test.ts`
- `tests/deferred-blog-publish-flow.test.ts`

For each: read the current source file the test analyzes, update `expect`
calls to match actual paths, export names, and route patterns. Do not
change production code — only test expectations.

### D0.2 — Fix RBAC policy test expectations

Update `tests/rbac-policy-consolidation.test.ts`:
- `ToolRegistry.execute()` no longer throws → test should assert that
  the middleware pipeline (not the registry) enforces RBAC
- Verify the full executor pipeline test correctly chains
  `RbacGuardMiddleware` → `registry.execute()`

### D0.3 — Fix job visibility test

Update `tests/td-a-booch-job-visibility.test.ts`:
- Read `src/app/api/jobs/route.ts` to verify actual import pattern
- Update assertion to match the current abstraction boundary

### D0.4 — Fix useUICommands hook test

Update `src/hooks/useUICommands.test.tsx`:
- Verify the replay guard behavior in the hook implementation
- Update test to match the current re-render semantics

### D0.5 — Full regression pass

Run the complete validation suite:

```bash
npx vitest run          # 0 failures
npx tsc --noEmit        # 0 type errors
npm run lint            # 0 lint errors
npm run build           # clean build
```

All four must pass before Sprint 0 is complete.

---

## Acceptance Criteria

- [ ] `vitest run` → 0 failures, ≥2063 passing tests
- [ ] `tsc --noEmit` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → success
- [ ] No production code changes — test fixes only
- [ ] Each fix has a comment explaining *why* the expectation changed

---

## Estimated Test Changes

| Action | Count |
|--------|-------|
| Tests fixed (expectations updated) | 12 |
| New tests written | 0 |
| Tests deleted | 0 |

---

## Dependencies

None — this is the starting point.
