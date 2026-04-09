# Sprint 0 — Rename and Consolidate Test Files

> **Goal:** Rename all 27 sprint-numbered and tech-debt-prefixed test files
> to feature-descriptive names, consolidate into existing subdirectories
> where appropriate, and verify the full test suite passes.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture)
>
> **Prerequisite:** None (can run independently of other refactors)

## Available Assets

| Asset | Location |
| --- | --- |
| Sprint-numbered tests | `tests/sprint-*.test.ts(x)` (19 files) |
| Tech-debt tests | `tests/td-*.test.ts` (8 files) |
| Existing subdirectories | `tests/browser-ui/`, `tests/chat/`, `tests/corpus/`, `tests/evals/`, `tests/search/`, `tests/mcp/`, `tests/helpers/` |
| Vitest config | `vitest.config.ts` |
| Rename mapping | Spec section 3.1 and 3.2 |

---

### Task 1 — Rename sprint-numbered files

Apply `git mv` for all 19 sprint-numbered files per spec section 3.1.

Process one file at a time. After each rename, check for import references
in other test files or scripts:

```bash
grep -r "sprint-1-bread-framework" tests/ scripts/
```

**Verify:**

```bash
npx vitest run tests/bread-framework.test.ts
```

---

### Task 2 — Rename tech-debt files

Apply `git mv` for all 8 tech-debt-prefixed files per spec section 3.2.

**Verify:**

```bash
npx vitest run tests/architecture-cohesion-audit.test.ts
```

---

### Task 3 — Consolidate into subdirectories

Review the renamed files and any existing root-level tests for candidates
that belong in subdirectories:

- Browser/UI tests → `tests/browser-ui/`
- Chat-related tests → `tests/chat/`
- MCP contract tests → `tests/mcp/`

Only move files where the grouping is unambiguous. Do not force moves.

**Verify:**

```bash
npx vitest run
```

---

### Task 4 — Update cross-references

Search the codebase for any hardcoded references to old filenames:

```bash
grep -r "sprint-\|td-a-\|td-b-\|td-c-\|td-d-" docs/ scripts/ .github/
```

Update any references found (CI configs, documentation, script arguments).

**Verify:**

```bash
npm run build
npx vitest run
```

---

## Completion Checklist

- [x] All 19 sprint-numbered files renamed
- [x] All 8 tech-debt-prefixed files renamed
- [x] Subdirectory consolidation complete (where unambiguous)
- [x] No stale filename references in docs, scripts, or CI
- [x] `npx vitest run` passes (all tests green)
- [x] `npm run build` succeeds
