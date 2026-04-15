# Spec 16: Compatibility Layer Sunset

**Priority:** Low–Medium
**Risk if deferred:** Backward-compatibility wrappers and dual-path code slowly blur the real architecture and increase maintenance burden
**Files in scope:**
- All files containing backward-compatibility re-exports, deprecated wrappers, or dual-path code
- Pattern: `@deprecated`, `// backward compat`, `// legacy`, re-export-only files

---

## Problem Statement

The codebase contains backward-compatibility wrappers, re-exports, dual code paths, and "deprecated but kept for tests" patterns. These are individually reasonable short-term decisions, but collectively they:

1. **Blur the true architecture:** A new contributor (or agent) sees the compatibility layer and the new layer, without knowing which is canonical.
2. **Inflate the import graph:** Re-exports create phantom modules that add cognitive overhead.
3. **Block cleanup:** Tests that depend on deprecated paths prevent removal.
4. **Accumulate indefinitely** without sunset dates.

---

## Architectural Approach

### Step 1: Inventory all compatibility layers

Create an exhaustive inventory by searching for these patterns:

```bash
# Search patterns
grep -rn "@deprecated" src/
grep -rn "backward.compat" src/
grep -rn "// legacy" src/
grep -rn "re-export" src/
grep -rn "kept for tests" src/
```

For each match, record:
- File path and line number
- What it wraps or re-exports
- Why it exists (if documented)
- What depends on it (search for imports)

### Step 2: Create a sunset schedule

For each compatibility layer, assign a sunset milestone:

| Layer | Sunset Rule |
|-------|-----------|
| **Re-exports that alias old paths to new locations** | Remove when all importers are updated. Max 1 release cycle. |
| **Deprecated functions with replacements** | Remove after the replacement has been in use for 1 release cycle. |
| **Dual code paths (old + new)** | Remove the old path once tests confirm the new path covers all behavior. |
| **"Kept for tests" code** | Update the tests to use the new API, then remove. Immediate priority — tests should exercise the real code. |

### Step 3: Add `@deprecated` JSDoc with sunset dates

Every compatibility layer that is not yet marked should get a JSDoc annotation:

```typescript
/**
 * @deprecated Use `getToolComposition()` instead. Remove after 2026-Q2.
 */
export function getToolRegistry(): ToolRegistry {
  return getToolComposition().registry;
}
```

### Step 4: Add an ESLint rule to warn on deprecated imports (optional)

If the project uses ESLint (it does), configure `eslint-plugin-deprecation` or a similar tool:

```javascript
// eslint.config.mjs
{
  rules: {
    "deprecation/deprecation": "warn",
  }
}
```

This provides IDE feedback when importing deprecated symbols.

### Step 5: Execute removal in phases

**Phase 1 — Immediate:** Remove any re-export or wrapper where the original module is no longer imported anywhere except the re-export file itself.

**Phase 2 — Next sprint:** Update tests that use deprecated APIs to use the new APIs. Remove the deprecated wrappers.

**Phase 3 — Following sprint:** Remove any remaining dual-path code. Verify import graph is clean.

---

## Constraints — Do NOT Introduce

- **Do not** remove any compatibility layer without confirming zero remaining importers. Use `grep` or TypeScript's find-all-references.
- **Do not** add new compatibility layers in other specs without adding a sunset date.
- **Do not** break the public API of any package that is consumed externally (if applicable).
- **Do not** remove code that is actively used by the test suite without updating those tests first.
- **Do not** create a runtime deprecation warning system (console.warn on use). JSDoc + ESLint is sufficient.

---

## Required Tests

### Inventory Tests — `tests/compatibility-layer-sunset.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `all @deprecated symbols have a sunset date in JSDoc` | Grep for `@deprecated` in `src/`. For each match, assert the comment contains a date or version (regex: `/Remove (after|by|in) \d/`). |
| 2 | `no re-export files exist without @deprecated annotation` | Identify files that consist solely of re-exports (no logic). Confirm each has `@deprecated` if it's a compatibility layer. |
| 3 | `deprecated symbols are not imported by non-test files` | For each `@deprecated` symbol, search `src/` (excluding `tests/`) for imports. Confirm zero non-test consumers (meaning it's safe to remove). |

### Phase Completion Tests

After each removal phase, run the full test suite to confirm nothing breaks. No additional test files needed — the existing test suite IS the verification.

---

## Acceptance Criteria

- [ ] Complete inventory of all compatibility layers exists (in DEBT_REGISTRY.md or a dedicated sunset-schedule section).
- [ ] Every `@deprecated` annotation includes a sunset date or version.
- [ ] Phase 1 removals are executed: zero-importer compatibility code is deleted.
- [ ] Tests that depend on deprecated APIs are updated to use current APIs.
- [ ] The inventory test confirms no un-annotated compatibility layers remain.
- [ ] All existing tests pass after each removal phase.
