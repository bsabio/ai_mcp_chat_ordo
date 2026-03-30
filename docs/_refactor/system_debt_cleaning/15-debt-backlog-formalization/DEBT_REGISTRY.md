# Debt Registry

> Formal catalog of known technical debt items.
> See [Update Protocol](#update-protocol) at the bottom for how to add and resolve entries.

## Summary

| Category    | Open | Resolved | Total |
|-------------|------|----------|-------|
| Complexity  | 4    | 1        | 5     |
| Consistency | 2    | 1        | 3     |
| **Total**   | **6**| **2**    | **8** |

| Severity | Open | Resolved |
|----------|------|----------|
| High     | 0    | 1        |
| Medium   | 3    | 1        |
| Low      | 3    | 0        |

---

### DEBT-001: Large Graph Payload Builder

**Location:** `src/core/use-cases/tools/graph-payload.ts` (866 lines)
**Severity:** Medium
**Category:** Complexity
**Discovered:** Internal audit (letter.md — "777-line schema function")
**Status:** Open

**Description:**
The graph payload builder is a single dense module that handles all graph type resolution, encoding normalization, data transformation, and Vega-Lite spec generation. The original audit cited 777 lines; subsequent feature additions have grown it to 866.

**Impact:**
Difficult to test individual graph types in isolation. Changes to one graph kind risk regressions in others. High cognitive load for maintenance.

**Acceptance Criteria for Resolution:**
- [ ] File is under 400 lines or split into per-graph-kind modules
- [ ] Each graph kind has isolated unit tests

**Related Specs:** None

---

### DEBT-002: Dense Stream Route

**Location:** `src/app/api/chat/stream/route.ts`
**Severity:** High
**Category:** Complexity
**Discovered:** Internal audit (letter.md item 10)
**Status:** Resolved

**Description:**
The stream route was a 645-line module owning auth, preferences, conversation lifecycle, attachments, persistence, routing, math short-circuiting, deferred-tool wrapping, and SSE orchestration.

**Impact:**
High-volatility module that was difficult to test and reason about.

**Acceptance Criteria for Resolution:**
- [x] Route reduced to < 100 lines delegating to ChatStreamPipeline
- [x] Pipeline class has clear method boundaries

**Related Specs:** Spec 10 (Stream Route Decomposition)

---

### DEBT-003: Large MCP Librarian Tool

**Location:** `mcp/librarian-tool.ts` (559 lines)
**Severity:** Medium
**Category:** Complexity
**Discovered:** Internal audit (letter.md — "very large MCP librarian tool")
**Status:** Open

**Description:**
The librarian MCP tool file contains corpus search, section retrieval, checklist generation, and summary logic in a single module. It mixes I/O, formatting, and domain logic.

**Impact:**
Difficult to test individual librarian capabilities in isolation. Changes to one query type risk regressions in others.

**Acceptance Criteria for Resolution:**
- [ ] File is under 300 lines or split into per-capability modules
- [ ] Each capability has isolated unit tests

**Related Specs:** None

---

### DEBT-004: Residual Bare Catch Blocks

**Location:** Multiple files across `src/` (~46 catch blocks)
**Severity:** Low
**Category:** Consistency
**Discovered:** Internal audit (letter.md item 8); Spec 08 partially addressed
**Status:** Open

**Description:**
Spec 08 (Fallback Observability) added structured logging and reason codes to critical fallback paths. However, ~46 catch blocks remain across the codebase. Many are legitimate error handling, but some may still swallow useful failure information.

**Impact:**
Reduced observability in degraded-operation scenarios. Debugging difficulty when errors are caught but not logged with sufficient context.

**Acceptance Criteria for Resolution:**
- [ ] Audit remaining catch blocks; classify each as "adequate" or "needs logging"
- [ ] All "needs logging" catches get structured `logDegradation()` or `logFailure()` calls

**Related Specs:** Spec 08 (Fallback Observability)

---

### DEBT-005: Backward-Compatibility Wrappers

**Location:** `src/lib/chat/tools.ts`, `src/lib/chat/tool-composition-root.ts`
**Severity:** Medium
**Category:** Consistency
**Discovered:** Internal audit (letter.md item 16)
**Status:** Resolved

**Description:**
Deprecated `getToolRegistry()`, `getToolExecutor()`, and `createToolResults()` were compatibility wrappers kept for test backward compatibility. They blurred the canonical API and inflated the import graph.

**Impact:**
New contributors and agents could not tell which API was canonical.

**Acceptance Criteria for Resolution:**
- [x] All deprecated symbols removed from source
- [x] Tests migrated to use `getToolComposition()` API
- [x] Zero `@deprecated` markers remain in `src/`

**Related Specs:** Spec 01 (Registry/Executor Unification), Spec 16 (Compatibility Layer Sunset)

---

### DEBT-006: Large Eval Runner Files

**Location:** `src/lib/evals/runner.ts` (1406 lines), `src/lib/evals/live-runner.ts` (917 lines)
**Severity:** Low
**Category:** Complexity
**Discovered:** File size audit during Spec 15
**Status:** Open

**Description:**
The eval runner files are large monoliths that handle scenario execution, result comparison, scoring, and reporting. They are not in the production hot path but are important for quality assurance.

**Impact:**
Difficult to extend with new eval types or scoring strategies. High merge-conflict risk when multiple contributors modify eval logic.

**Acceptance Criteria for Resolution:**
- [ ] Each runner file is under 500 lines or split into focused modules
- [ ] Scenario execution, scoring, and reporting are separable concerns

**Related Specs:** None

---

### DEBT-007: Type Escape Hatches

**Location:** Multiple files (8 instances across `src/`)
**Severity:** Low
**Category:** Consistency
**Discovered:** Grep audit during Spec 15
**Status:** Open

**Description:**
Eight `eslint-disable`, `@ts-expect-error`, and `as any` annotations exist in production source files:
- `src/adapters/LocalEmbedder.ts` — `@ts-expect-error` for HuggingFace pipeline types
- `src/adapters/OpenAiBlogImageProvider.ts` — `as any` cast for OpenAI response
- `src/components/MarkdownProse.tsx` — `no-img-element` + `no-explicit-any`
- `src/components/profile/ProfileSettingsPanel.tsx` — `no-img-element`
- `src/components/ThemeProvider.tsx` — `set-state-in-effect`
- `src/lib/chat/StreamStrategy.ts` — `no-explicit-any`

**Impact:**
Each escape hatch is individually justified, but collectively they signal type coverage gaps. Some (like the HuggingFace pipeline type) reflect upstream library limitations.

**Acceptance Criteria for Resolution:**
- [ ] Review each instance; remove where upstream types have improved
- [ ] Document justification inline for each that must remain
- [ ] Net count does not grow without documented reason

**Related Specs:** None

---

### DEBT-008: Large Journal Write Tool

**Location:** `src/core/use-cases/tools/journal-write.tool.ts` (731 lines)
**Severity:** Medium
**Category:** Complexity
**Discovered:** File size audit during Spec 15
**Status:** Open

**Description:**
The journal write tool handles creation, editing, publishing, and draft management in a single file. It combines schema definitions, validation logic, and interactor coordination.

**Impact:**
High cognitive load. Changes to one write operation risk regressions in others. Schema definitions mixed with execution logic.

**Acceptance Criteria for Resolution:**
- [ ] File is under 400 lines or split into per-operation modules
- [ ] Schema definitions separated from execution logic

**Related Specs:** None

---

## Update Protocol

1. **Adding debt:** Any engineer or agent discovering tech debt adds an entry using the template above. Assign the next sequential `DEBT-NNN` ID.
2. **Resolving debt:** When a spec or PR resolves a debt item, update the Status to "Resolved", check the acceptance criteria, and add the spec/PR reference to Related Specs.
3. **Review cadence:** Review the registry at the start of each sprint/iteration to identify items for cleanup.
4. **No stale items:** Items open for more than 3 months without activity should be re-evaluated (close or escalate).
