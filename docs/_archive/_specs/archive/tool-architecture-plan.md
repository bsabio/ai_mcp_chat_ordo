# Implementation Plan — Tool Architecture Refactoring

> **Status:** Ready for implementation
> **Source:** `docs/specs/tool-architecture-spec.md` (v1.0)
> **Test runner:** Vitest — 182 tests across 40 suites (baseline)
> **Convention:** Each task = one commit. Run `npm run build && npm test` between commits.

---

## Sprint 0 — Core Types & Registry

> **Goal:** Build the registry foundation. No behavioral changes yet — existing
> code continues to work untouched.
> **Spec ref:** §3.1, §3.2, §4 new files
> **Prerequisite:** RBAC Sprints 0–5 complete

### Task 0.1 — Core types (ToolDescriptor, ToolExecutionContext, ToolCommand)

**What:** Create the three foundational types in a new `src/core/tool-registry/` directory.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/tool-registry/ToolDescriptor.ts` — `ToolDescriptor<TInput, TOutput>` type with `name`, `schema`, `command`, `roles`, `category` fields; `ToolCategory` type; `AnthropicToolSchema` type |
| **Create** | `src/core/tool-registry/ToolExecutionContext.ts` — `ToolExecutionContext` type with `role: RoleName`, `userId: string`, `conversationId?: string` |
| **Create** | `src/core/tool-registry/ToolCommand.ts` — `ToolCommand<TInput = unknown, TOutput = unknown>` interface with `execute(input: TInput, context?: ToolExecutionContext): Promise<TOutput>` |
| **Spec** | §3.1, TOOL-TYPE-1, NEG-TOOL-1 |
| **Tests** | Type-only files; verified by build. `ToolCommand` has zero `any` references. |
| **Verify** | `grep -r "any" src/core/tool-registry/` returns nothing |

### Task 0.2 — ToolRegistry class

**What:** Implement the registry with `register()`, `getSchemasForRole()`, `execute()`, `getToolNames()`, `canExecute()`.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/tool-registry/ToolRegistry.ts` — class implementing all 5 methods per §3.2. `execute()` checks `canExecute()` before calling `command.execute(input, context)`. Throws `ToolAccessDeniedError` for unauthorized access, `UnknownToolError` for missing tools. |
| **Create** | `src/core/tool-registry/errors.ts` — `ToolAccessDeniedError extends Error`, `UnknownToolError extends Error` |
| **Spec** | §3.2, TOOL-REG-1 through TOOL-REG-5, TOOL-SEC-1 |
| **Tests (new)** | TEST-REG-01 through TEST-REG-07: register, duplicate rejection, role filtering, execute success, execute denied, unknown tool |
| **Key details** | `execute()` receives `(name, input, context)` — `input` and `context` are never merged. `getSchemasForRole()` builds `Anthropic.Tool` objects from descriptors. |

### Task 0.3 — ToolMiddleware interface + LoggingMiddleware + RbacGuardMiddleware

**What:** Create the middleware abstraction and two concrete middlewares.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/tool-registry/ToolMiddleware.ts` — `ToolMiddleware` interface, `ToolExecuteFn` type, `composeMiddleware(middlewares, registry)` function that returns a `ToolExecuteFn` |
| **Create** | `src/core/tool-registry/LoggingMiddleware.ts` — logs tool name, role, duration (ms), success/error. Matches `LoggingDecorator` structured format: `[Tool:name] START`, `[Tool:name] SUCCESS (Xms)`, `[Tool:name] ERROR (Xms)`. |
| **Create** | `src/core/tool-registry/RbacGuardMiddleware.ts` — calls `registry.canExecute(name, context.role)`, throws `ToolAccessDeniedError` if false, calls `next()` if true |
| **Spec** | §3.3, TOOL-SEC-2, TOOL-OBS-1, TOOL-OBS-2 |
| **Tests (new)** | TEST-MW-01 through TEST-MW-05: logging output, RBAC blocking, RBAC pass-through, chain composition |
| **Key details** | `composeMiddleware` applies outer→inner: logging wraps rbac wraps execute. Each middleware calls `next(name, input, context)`. |

---

## Sprint 1 — Tool Descriptors (Self-Registration)

> **Goal:** Create descriptor files for all 11 tools. Each descriptor bundles
> schema + command + roles + category. Existing code untouched.
> **Spec ref:** §3.4, §4 new files, §6 role matrix
> **Prerequisite:** Sprint 0 complete

### Task 1.1 — Calculator + UI tool descriptors (6 tools)

**What:** Create descriptor files for stateless tools that have no dependencies.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/tools/calculator.tool.ts` — descriptor: name `"calculator"`, roles `"ALL"`, category `"math"`, existing `CalculatorCommand` |
| **Create** | `src/core/use-cases/tools/set-theme.tool.ts` — roles `"ALL"`, category `"ui"` |
| **Create** | `src/core/use-cases/tools/adjust-ui.tool.ts` — roles `"ALL"`, category `"ui"` |
| **Create** | `src/core/use-cases/tools/navigate.tool.ts` — roles `"ALL"`, category `"ui"` |
| **Create** | `src/core/use-cases/tools/generate-chart.tool.ts` — roles `["AUTHENTICATED", "STAFF", "ADMIN"]`, category `"ui"` |
| **Create** | `src/core/use-cases/tools/generate-audio.tool.ts` — roles `["AUTHENTICATED", "STAFF", "ADMIN"]`, category `"ui"` |
| **Spec** | §3.4 self-registration pattern, §6 role matrix |
| **Tests** | Build passes; descriptors importable. Verified via typed imports in Sprint 2. |
| **Key details** | Each `.tool.ts` exports a `const descriptor: ToolDescriptor`. UI tool commands already exist in `UiTools.ts`. Schema definitions move from `tools.ts` constants into each descriptor. |

### Task 1.2 — Book tool descriptors (5 tools, factory pattern)

**What:** Create descriptor files for tools that depend on `BookRepository`. Use factory functions since they need injected dependencies.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/tools/search-books.tool.ts` — `export function createSearchBooksTool(repo: BookRepository): ToolDescriptor`. Roles: `"ALL"` (ANON sees truncated results via formatter, not command). |
| **Create** | `src/core/use-cases/tools/get-chapter.tool.ts` — roles `["AUTHENTICATED", "STAFF", "ADMIN"]` |
| **Create** | `src/core/use-cases/tools/get-checklist.tool.ts` — roles `["AUTHENTICATED", "STAFF", "ADMIN"]` |
| **Create** | `src/core/use-cases/tools/list-practitioners.tool.ts` — roles `["AUTHENTICATED", "STAFF", "ADMIN"]` |
| **Create** | `src/core/use-cases/tools/get-book-summary.tool.ts` — roles `"ALL"` |
| **Spec** | §3.4 factory method pattern for DI tools |
| **Tests** | Build passes; factory functions callable with mock repo. |
| **Key details** | Factory functions accept `BookRepository` and return `ToolDescriptor`. The existing command classes (`SearchBooksCommand` etc.) are reused — only the wiring location changes. |

### Task 1.3 — Update ToolCommand interface (remove `any`)

**What:** Update the old `src/core/use-cases/ToolCommand.ts` to re-export from the new canonical location, and update all command classes to accept optional `ToolExecutionContext`.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/ToolCommand.ts` — re-export `ToolCommand` from `@/core/tool-registry/ToolCommand`. Keep backward compat. |
| **Modify** | `src/core/use-cases/tools/BookTools.ts` — all 5 commands: change `import { ToolCommand }` to new path; add optional `context?: ToolExecutionContext` to `execute()` signature. `SearchBooksCommand` uses `context?.role` instead of `role` from input. |
| **Modify** | `src/core/use-cases/tools/CalculatorTool.ts` — update import, add optional `context` param |
| **Modify** | `src/core/use-cases/tools/UiTools.ts` — update import, add optional `context` param |
| **Spec** | TOOL-TYPE-1, TOOL-TYPE-2 |
| **Tests** | Existing tool tests pass. `grep "= any" src/core/` returns nothing tool-related. |

---

## Sprint 2 — Composition Root & Wiring

> **Goal:** Create the tool composition root, wire the registry into chat routes,
> replace `createToolResults()` with `registry.execute()`.
> **Spec ref:** §3.4 composition root, §10 migration strategy
> **Prerequisite:** Sprint 1 complete

### Task 2.1 — Tool composition root

**What:** Create the central wiring point that builds a fully configured registry with middleware.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/chat/tool-composition-root.ts` — `createToolRegistry(bookRepo): ToolRegistry`, `getToolRegistry(): ToolRegistry` (lazy singleton). Registers all 11 tools. Composes middleware stack: `LoggingMiddleware` → `RbacGuardMiddleware` → registry dispatch. |
| **Spec** | §3.4 composition root |
| **Tests** | Build passes. Integration tested via route wiring in Task 2.2. |
| **Key details** | `getToolRegistry()` calls `getBookRepository()` once and caches. The middleware-wrapped execute function is returned as a bound method. |

### Task 2.2 — Wire registry into chat routes

**What:** Update both chat routes to use the registry instead of the old `tools.ts` dispatch.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/chat/stream/route.ts` — build `ToolExecutionContext` from `user`, pass `registry.getSchemasForRole()` for tool schemas, update `createToolResults` calls to use registry |
| **Modify** | `src/app/api/chat/route.ts` — same pattern |
| **Modify** | `src/lib/chat/anthropic-stream.ts` — `runClaudeAgentLoopStream` accepts a `toolExecutor` function instead of `role`. Calls `toolExecutor(name, input)` per tool use. |
| **Modify** | `src/lib/chat/orchestrator.ts` — `orchestrateChatTurn` accepts a `toolExecutor` function instead of calling `createToolResults` directly |
| **Spec** | TOOL-SEC-1, TOOL-SEC-3, §10 migration |
| **Tests** | Existing tests pass. Manual verification: chat with tools works. |
| **Key details** | The route creates a `ToolExecutionContext` once, then creates a bound executor: `(name, input) => registry.execute(name, input, context)`. This is passed to the stream/orchestrator functions, keeping context separation clean. |

### Task 2.3 — Clean up old code

**What:** Remove the old `tools.ts` god file internals and deprecate `ToolAccessPolicy`.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/tools.ts` — gut to thin re-export wrapper (≤50 lines). Export `getToolRegistry()` and `getToolsForRole()` for backward compat. Remove `ALL_TOOLS` array, `commands` registry, `createToolResults()`. |
| **Delete** | `src/core/use-cases/ToolAccessPolicy.ts` — logic now lives in per-descriptor `roles` + `ToolRegistry.canExecute()` |
| **Modify** | `src/lib/chat/policy.ts` — remove any reference to old `getToolNamesForRole` if present |
| **Spec** | NEG-TOOL-3, NEG-TOOL-4 |
| **Tests** | Update `tests/core-policy.test.ts` to test `ToolRegistry.canExecute()` instead of `getToolNamesForRole()`. All 182+ tests pass. |
| **Verify** | `grep -r "ToolAccessPolicy" src/` returns nothing. `wc -l src/lib/chat/tools.ts` ≤ 50. |

---

## Sprint 3 — Performance & Formatting

> **Goal:** Add the caching layer and extract RBAC formatting from SearchBooksCommand.
> **Spec ref:** §3.5 caching, §3.6 formatter, §7 performance
> **Prerequisite:** Sprint 2 complete

### Task 3.1 — CachedBookRepository

**What:** Decorator on `BookRepository` that caches all reads in memory.

| Item | Detail |
| --- | --- |
| **Create** | `src/adapters/CachedBookRepository.ts` — implements `BookRepository`, wraps inner repository. Caches: `getAllBooks()`, `getAllChapters()`, `getBook()`, `getChaptersByBook()`, `getChapter()`. Uses `Map<string, T>` for keyed caches, simple `T | null` for list caches. |
| **Modify** | `src/adapters/RepositoryFactory.ts` — `getBookRepository()` returns `new CachedBookRepository(new FileSystemBookRepository())` |
| **Spec** | §3.5, TOOL-PERF-1, TOOL-PERF-2 |
| **Tests (new)** | TEST-CACHE-01 through TEST-CACHE-04: verify inner is called at most once per unique key. Use a mock `BookRepository` that counts calls. |
| **Key details** | Book content is static markdown — no invalidation needed. Cache lives for the Node.js process lifetime. |

### Task 3.2 — ToolResultFormatter + SearchBooks RBAC extraction

**What:** Extract the ANONYMOUS truncation logic from `SearchBooksCommand` into a `ToolResultFormatter`.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/tool-registry/ToolResultFormatter.ts` — `ToolResultFormatter` interface with `format(toolName, result, context)`. `RoleAwareSearchFormatter` implementation: strips `matchContext`, `bookSlug`, `chapterSlug` from search results for ANONYMOUS role. |
| **Modify** | `src/core/use-cases/tools/BookTools.ts` — `SearchBooksCommand.execute()` always returns full data (remove `if (role === "ANONYMOUS")` branch). Returns structured array instead of JSON string. |
| **Modify** | `src/core/tool-registry/ToolRegistry.ts` — accept optional `ToolResultFormatter` in constructor. `execute()` calls `formatter.format()` after command execution. |
| **Modify** | `src/lib/chat/tool-composition-root.ts` — inject `RoleAwareSearchFormatter` into registry |
| **Spec** | §3.6, TOOL-SRP-1 |
| **Tests (new)** | TEST-FMT-01 through TEST-FMT-03: ANON search stripped, AUTH search full, non-search passthrough |
| **Verify** | `grep "ANONYMOUS" src/core/use-cases/tools/BookTools.ts` returns nothing |

---

## Sprint 4 — QA & Hardening

> **Goal:** Final verification, test coverage, documentation.
> **Spec ref:** §8, §9
> **Prerequisite:** Sprint 3 complete

### Task 4.1 — Integration tests

**What:** End-to-end tests that verify the full stack: registry → middleware → command → formatter.

| Item | Detail |
| --- | --- |
| **Create** | `tests/tool-registry.integration.test.ts` — create a registry with all 11 tools (using mock BookRepository). Test: ANON gets 6 schemas, AUTH gets 11. Execute each tool. Verify logging output. Verify RBAC rejection. |
| **Spec** | TEST-SEC-01 through TEST-SEC-03, TEST-REG-01 through TEST-REG-07 |
| **Key details** | Use a spy on `console.log` to verify `LoggingMiddleware` output format. |

### Task 4.2 — Security verification

**What:** Verify the three-layer RBAC defense and context isolation.

| Item | Detail |
| --- | --- |
| **Tests (new)** | TEST-SEC-01: Create context with role AUTHENTICATED, pass input `{role: "ADMIN"}` → verify `context.role` is still AUTHENTICATED (not overridden). TEST-SEC-02: ANON execute `generate_audio` → ToolAccessDeniedError (command.execute never called, verified via spy). TEST-SEC-03: custom tool with `roles: ["ADMIN"]` → only ADMIN can execute. |
| **Verify** | `grep -rn "...toolUse.input.*role" src/` returns nothing (no spread mixing) |

### Task 4.3 — Clean architecture verification

**What:** Verify all architectural requirements hold.

| Item | Detail |
| --- | --- |
| **Verify** | `grep -r "from.*@/lib\|from.*@/adapters" src/core/tool-registry/` returns nothing (NEG-TOOL-1) |
| **Verify** | `grep -r "ToolAccessPolicy" src/` returns nothing (NEG-TOOL-3) |
| **Verify** | `grep -r "anthropic" src/core/` returns nothing (NEG-TOOL-5, case-insensitive) |
| **Verify** | `npm run build && npx vitest run` — all tests pass (NEG-TOOL-2) |
| **Verify** | `wc -l src/lib/chat/tools.ts` ≤ 50 (NEG-TOOL-4) |

---

## Summary

| Sprint | Tasks | New Files | Modified Files | New Tests |
| --- | --- | --- | --- | --- |
| **0 — Core Types & Registry** | 3 | 8 | 0 | ~12 (registry + middleware) |
| **1 — Tool Descriptors** | 3 | 11 | 4 | 0 (build verified) |
| **2 — Composition & Wiring** | 3 | 1 | 6 | ~3 (updated policy tests) |
| **3 — Performance & Formatting** | 2 | 2 | 4 | ~7 (cache + formatter) |
| **4 — QA & Hardening** | 3 | 1 | 0 | ~8 (integration + security) |
| **Total** | **14** | **23** | **14** | **~30** |

## Dependency Graph

```text
Sprint 0 (core types & registry)
  └──→ Sprint 1 (tool descriptors)
         └──→ Sprint 2 (composition & wiring)
                └──→ Sprint 3 (performance & formatting)
                       └──→ Sprint 4 (QA & hardening)
```

Each sprint is independently deployable. After Sprint 2, the old code path is
fully replaced. Sprints 3–4 are optimizations that can be deferred.

## Quick Reference — Requirement → Task Mapping

| Requirement Group | Tasks |
| --- | --- |
| TOOL-REG-1 through TOOL-REG-5 | 0.2, 1.1, 1.2, 2.1 |
| TOOL-SEC-1 through TOOL-SEC-3 | 0.2, 0.3, 2.2, 4.2 |
| TOOL-PERF-1, TOOL-PERF-2 | 3.1 |
| TOOL-OBS-1, TOOL-OBS-2 | 0.3 |
| TOOL-SRP-1, TOOL-SRP-2 | 1.1, 1.2, 3.2 |
| TOOL-TYPE-1, TOOL-TYPE-2 | 0.1, 1.3 |
| NEG-TOOL-1 through NEG-TOOL-5 | 2.3, 4.3 |
