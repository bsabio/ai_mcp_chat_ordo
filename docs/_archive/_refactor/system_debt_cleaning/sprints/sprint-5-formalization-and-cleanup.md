# Sprint 5: Formalization & Cleanup

**Duration:** ~1 week
**Theme:** Sunset deprecated compatibility layers, formalize remaining debt into tracked backlog items, and close the loop on the entire debt-cleaning initiative.
**Entry Criteria:** Sprints 1–4 complete. All structural changes are landed, tested, and stable.
**Exit Criteria:** No deprecated code remains without a tracked removal ticket. Compatibility shims are removed or have explicit sunset dates. Full test suite green.

---

## Specs

| Order | Spec | Priority | Effort | Depends On |
|-------|------|----------|--------|-----------|
| 5.1 | [16 — Compatibility Layer Sunset](../16-compatibility-layer-sunset/spec.md) | Low–Medium | Small–Medium | Spec 01 (Sprint 1), Spec 14 (Sprint 4) |
| 5.2 | [15 — Debt Backlog Formalization](../15-debt-backlog-formalization/spec.md) | Medium | Small | All prior sprints |

---

## Execution Order & Rationale

### 5.1 — Compatibility Layer Sunset (FIRST)

**Why first:** The deprecated re-exports and shim functions identified in Sprint 4 (Spec 14) were marked `@deprecated` but not removed. Now that all call sites have been migrated through Sprints 1–4, the shims can be safely deleted. This must happen before the debt inventory (5.2) so the inventory reflects the true final state.

**Sequence:**
1. **Inventory all `@deprecated` markers** in `src/` — grep for `@deprecated` annotations added during Sprints 1–4.
2. **Verify zero live consumers** for each deprecated export:
   - `createToolResults()` in `tools.ts` — should have zero non-test imports after Spec 01 migration.
   - Backward-compat re-exports from `tool-composition-root.ts` — should have zero consumers after Spec 14.
   - Any legacy type aliases or adapter shims.
3. **Remove dead code** — delete deprecated functions, remove their exports from barrel files.
4. **Remove any compatibility type aliases** that were introduced as migration bridges.
5. **Update barrel exports** (`tools.ts`, `index.ts` files) — remove the deleted symbols.
6. **Run full test suite** — any test that relied on deprecated paths should already have been migrated. Failures here indicate an incomplete migration in a prior sprint.
7. **Grep for remaining `TODO(debt)` or `HACK` or `FIXME` markers** — feed into Spec 15.

**Verify:**
- Zero `@deprecated` annotations remain in `src/` (except for intentional public API deprecations aimed at external consumers, if any).
- `tools.ts` contains only the canonical exports: `getToolComposition()` (or whatever Spec 01 named it).
- No dead code paths detected by TypeScript (`noUnusedLocals` / `noUnusedParameters` if enabled, or manual review).

### 5.2 — Debt Backlog Formalization (LAST)

**Why last:** This is a documentation and tracking task. It requires the codebase to be in its final Sprint 5 state so the inventory is accurate. It captures everything the 16 specs did NOT address, plus any new findings from the refactoring work.

**Sequence:**
1. **Grep for debt markers** across the codebase:
   - `// TODO`, `// FIXME`, `// HACK`, `// XXX`, `// DEBT`
   - `@deprecated` (any that remain intentionally)
   - `as any` type assertions
   - `eslint-disable` comments
   - `catch (e) { }` bare catches (any missed by earlier specs)
2. **Categorize findings** into:
   - **Structural debt** — architecture issues not addressed by the 16 specs
   - **Test debt** — missing coverage, flaky tests, test smells
   - **Documentation debt** — outdated docs, missing API docs
   - **Configuration debt** — env vars without validation, unused config keys
   - **Dependency debt** — outdated packages, unused dependencies
3. **Create `DEBT_REGISTRY.md`** in `docs/_refactor/system_debt_cleaning/15-debt-backlog-formalization/` with each item as a structured entry:
   ```markdown
   ### [DEBT-001] Brief title
   - **File:** path/to/file.ts:L42
   - **Category:** structural | test | docs | config | dependency
   - **Severity:** low | medium | high
   - **Context:** Why this exists, what sprint (if any) partially addressed it
   - **Suggested fix:** One-liner description
   ```
4. **Cross-reference against the 16 specs:** For each spec, note whether its acceptance criteria were fully met or if residual items remain.
5. **Produce a summary table** at the top of `DEBT_BACKLOG.md` — counts by category and severity.

**Verify:**
- Every `TODO`/`FIXME`/`HACK` in `src/` is either resolved or tracked in `DEBT_REGISTRY.md`.
- Every spec's acceptance criteria are checked off or have a tracked residual item.
- The backlog is actionable — no vague entries like "clean up this file."

---

## Dependencies

```
Sprint 5 consumes:
  ├─ All @deprecated markers from Sprints 1–4       → Spec 16 (removal)
  ├─ Migrated call sites from Specs 01, 14          → Spec 16 (safe deletion)
  └─ Final codebase state from all prior sprints     → Spec 15 (accurate inventory)

Sprint 5 produces:
  ├─ Clean codebase with no deprecated shims
  ├─ DEBT_REGISTRY.md — structured debt inventory
  └─ Cross-reference report: spec completion status
```

---

## Parallelism Map

```
Day 1–2:
  [5.1 Compatibility Sunset — inventory + verify zero consumers] ──────►

Day 3–4:
  [5.1 Compatibility Sunset — remove dead code + run tests] ──────────►
  [5.2 Debt Formalization — grep markers + categorize] ──────────────►

Day 5:
  [5.2 Debt Formalization — write DEBT_REGISTRY.md + cross-reference] ──►
  [Final full test suite + review] ──────────────────────────────────────►
```

Spec 5.1 starts first to clean the codebase. Spec 5.2's grep phase can overlap with 5.1's later removal phase (since the grep captures the current state, which is mostly final). The backlog document is written after all removals are done.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Removing deprecated exports breaks an import not caught by tests | TypeScript compilation is the safety net — `npm run build` will fail on any broken import. Run build before and after removal. |
| Debt inventory is incomplete (missed markers) | Use multiple grep patterns, not just `TODO`. Include `as any`, bare catches, `eslint-disable`. Cross-check with the 16 spec acceptance criteria. |
| Backlog becomes stale immediately | Add a CI reminder or calendar entry to review `DEBT_BACKLOG.md` quarterly. Include a "Last reviewed" date at the top. |
| Sprint 4 left partially-migrated code | This is why 5.1 verifies zero consumers before deleting. If consumers remain, the deletion is blocked and the item goes into the backlog as residual debt. |

---

## Definition of Done

- [x] Zero `@deprecated` shims remain in `src/` (unless intentionally public-facing).
- [x] `tools.ts` exports only the canonical API — no backward-compat re-exports.
- [x] `npm run build` passes with no unused-export warnings. *(TypeScript typecheck clean.)*
- [x] `DEBT_REGISTRY.md` exists in `docs/_refactor/system_debt_cleaning/15-debt-backlog-formalization/` with structured entries. *(8 entries: DEBT-001 through DEBT-008.)*
- [x] Every `TODO`/`FIXME`/`HACK` in `src/` is either resolved or tracked. *(Zero debt markers found in src/; 8 systemic items tracked.)*
- [x] Summary table at top of backlog shows counts by category and severity. *(Added: 6 open / 2 resolved, by category and severity.)*
- [x] All 16 spec acceptance criteria are checked off or have tracked residual items.
- [x] Full test suite passes. *(29 files, 251 tests.)*
- [x] Sprint retrospective notes captured (what worked, what to improve for next debt initiative).

---

## Sprint Retrospective

### What Worked
- **Spec-per-concern structure** kept each change tightly scoped and independently testable. Specs rarely conflicted with each other.
- **Test-first verification** (writing spec tests before declaring done) caught real issues — e.g., stale mock entries in `chat-turn.test.ts`, a false positive in the sunset audit test.
- **Composition root pattern** dramatically simplified the tool registration surface. Going from scattered `getToolRegistry()`/`getToolExecutor()` calls to a single `getToolComposition()` API reduced cognitive load and made testing straightforward.
- **Incremental migration over big-bang** — migrating test files one at a time and running them after each change kept the green bar visible throughout.

### What to Improve
- **Debt markers were absent** — zero `TODO`/`FIXME` in `src/` means issues were never annotated in code. Future work should drop a `TODO(DEBT-NNN)` marker when deferring known debt so grep-based discovery works.
- **Sprint 5 DoD should have been more specific** about what "summary table" means (format, location) to avoid ambiguity.
- **Eval runner files** (1400+ lines) were discovered late. Earlier file-size auditing in Sprint 1 would have surfaced these sooner.
- **Catch-block audit** (DEBT-004) needs a structured pass — 46 blocks is too many to review ad hoc. A dedicated spec or sub-task with explicit per-file review would be more effective.
