# TD-A — Technical Debt: Booch Object Model Audit

> **Goal:** Audit all new and modified classes from Sprints 0–2 for Booch object model compliance: clear abstraction boundaries, minimal public interfaces, proper encapsulation, cohesive class responsibilities. Refactor violations.
> **Depends On:** Sprint 0 (50 new tests), Sprint 1 (22 new tests), Sprint 2 (22 new tests)
> **Baseline:** 1215 tests, 161 suites, build clean, lint clean
> **Historical note (2026-03-24):** This audit records the repo state immediately after Sprint 2. The dashboard-named files referenced below were later superseded by TD-C4 convergence: the active handoff path is now `src/lib/chat/task-origin-handoff.ts`, and the former dashboard business-logic surface now lives under `src/lib/operator/`. Keep the findings for architectural history, but do not treat the file paths below as the current runtime boundary.

---

## §1 Current State

### §1.1 Post-Sprint-2 baseline

| Metric | Value |
| --- | --- |
| Tests | 1215 |
| Suites | 161 |
| Build | Clean (zero errors) |
| Lint | Clean (no new warnings; pre-existing: 1 error in `conversations/route.ts`, 2 warnings) |

### §1.2 Audit scope

TD-A covers every source file created or modified in Sprints 0, 1, and 2. Per V1 spec §9.1, the audit evaluates five Booch criteria: **abstraction quality**, **encapsulation**, **modularity**, **hierarchy**, and **cohesion**.

### §1.3 Files in audit scope

**Sprint 0 — Config Layer and Identity (new files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/config/defaults.ts` | 100 | Type definitions and hardcoded fallback values |
| `src/lib/config/instance.ts` | 169 | JSON-file loader with validation, merging, and process-lifetime caching |
| `src/lib/config/instance.schema.ts` | 270 | Hand-written runtime validators for all four config files |
| `src/lib/config/InstanceConfigContext.tsx` | 30 | React context for client-side identity access |
| `src/adapters/ConfigIdentitySource.ts` | 31 | Implements `IdentitySource` port using config files |
| `src/adapters/ConfigRoleDirectiveSource.ts` | 14 | Implements `RoleDirectiveSource` port wrapping hardcoded role directives |

**Sprint 0 — Config Layer and Identity (modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/shell/shell-navigation.ts` | 230 | Shell route registry, brand metadata, navigation resolver functions |
| `src/lib/chat/policy.ts` | 50 | System prompt construction, math detection, model candidate selection |
| `src/lib/chat/tool-composition-root.ts` | 165 | Tool registry assembly, pipeline factories, config-based tool filtering |
| `src/lib/corpus-config.ts` | 111 | Corpus vocabulary, tool descriptions, and system prompt template |

**Sprint 1 — Font Reduction (modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/app/layout.tsx` | 80 | Root layout with font loading, metadata, provider wiring |
| `src/app/globals.css` | ~1400 | CSS custom properties, theme definitions, utility classes |
| `src/lib/config/defaults.ts` | (same) | Added `fonts` field to `InstanceIdentity` type and defaults |
| `src/lib/config/instance.schema.ts` | (same) | Added `fonts` validation |

**Sprint 2 — Dashboard Elimination (modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/shell/shell-navigation.ts` | (same) | Removed dashboard route, simplified `resolveShellHomeHref()` |
| `src/lib/chat/dashboard-handoff.ts` | 160 | Dashboard-to-chat handoff instruction resolution |
| `src/lib/dashboard/dashboard-loaders.ts` | 500+ | Dashboard block data loaders and type definitions |
| `next.config.ts` | 15 | Permanent redirect `/dashboard` → `/` |
| `src/app/layout.tsx` | (same) | Removed GridInspector and CommandPalette |

---

## §2 Audit Methodology

Each file in scope is evaluated against Booch's five object-model criteria. Findings are classified by severity:

| Severity | Meaning |
| --- | --- |
| **High** | Violates Booch principles in a way that produces maintenance hazard, hidden coupling, or architectural drift. Must be fixed in this sprint. |
| **Medium** | Violates Booch principles but has limited blast radius. Should be fixed in this sprint. |
| **Low** | Minor naming or structural concern. Fix if the file is already being modified; otherwise defer. |

---

## §3 Audit Findings

### Finding F1 — `DashboardBlockId` type duplicated across two files

| Attribute | Value |
| --- | --- |
| **Criterion** | Cohesion |
| **Severity** | High |
| **Files** | `src/lib/chat/dashboard-handoff.ts` (L1–13), `src/lib/dashboard/dashboard-loaders.ts` (L20–32) |

**Description:** The 12-member `DashboardBlockId` union type is defined identically in two files. Sprint 2 inlined the type into both files when the shared `dashboard-blocks.ts` was deleted. Additionally, `dashboard-handoff.ts` defines a `DASHBOARD_BLOCK_ID_SET` that mirrors the type members. If a block is added or removed, all three locations must be updated in sync — a cohesion violation and maintenance hazard.

**Remediation:** Extract `DashboardBlockId` to a shared canonical location. Create `src/lib/dashboard/dashboard-types.ts` containing the union type. Both consumers import from this single source of truth.

### Finding F2 — `ConfigRoleDirectiveSource` is a dead abstraction

| Attribute | Value |
| --- | --- |
| **Criterion** | Modularity |
| **Severity** | Medium |
| **Files** | `src/adapters/ConfigRoleDirectiveSource.ts`, `src/lib/chat/policy.ts` (L2) |

**Description:** The `RoleDirectiveSource` port interface exists in `src/core/ports/RoleDirectiveSource.ts`. The adapter `ConfigRoleDirectiveSource` implements it. However, `policy.ts` bypasses the port entirely by importing `ROLE_DIRECTIVES` directly from `ChatPolicyInteractor` (L2) and passing the raw constant to `DefaultingSystemPromptRepository` (L19). The port/adapter pair is wired but never actually used — a dead abstraction that creates the illusion of modularity without delivering it. Note: `DefaultingSystemPromptRepository` accepts `Record<string, string>` for directives, so wiring through the per-role `getDirective()` adapter method would require a constructor change. The correct fix is to decouple `policy.ts` from the use-case's internal data by moving `ROLE_DIRECTIVES` to its own entity module (combined with F3).

**Remediation:** Move `ROLE_DIRECTIVES` to `src/core/entities/role-directives.ts` (see F3). Update `policy.ts` to import from the entity module instead of from the use-case. Update `ConfigRoleDirectiveSource` to import from the entity module as well. This resolves the coupling between `policy.ts` and the use-case file. The `ConfigRoleDirectiveSource` adapter remains as a forward-compatible placeholder for when `prompts.json` gains per-role directive fields (per Sprint 0 design intent).

### Finding F3 — `ROLE_DIRECTIVES` exported from a use-case file

| Attribute | Value |
| --- | --- |
| **Criterion** | Encapsulation |
| **Severity** | Medium |
| **Files** | `src/core/use-cases/ChatPolicyInteractor.ts` (module-level export) |

**Description:** `ROLE_DIRECTIVES` is a data constant exported from a use-case interactor. It is consumed by `ConfigRoleDirectiveSource` and `policy.ts`. Exporting raw data alongside business logic from a use-case file violates encapsulation — the use-case's internal data representation leaks into the module's public interface.

**Remediation:** After F2 is resolved (wiring through the port), `ROLE_DIRECTIVES` is consumed only by `ConfigRoleDirectiveSource` and `ChatPolicyInteractor` itself. Move `ROLE_DIRECTIVES` to a dedicated data module: `src/core/entities/role-directives.ts`. Both consumers import from this canonical source. The use-case no longer exports data.

### Finding F4 — `policy.ts` instantiates `ConfigIdentitySource` at module scope

| Attribute | Value |
| --- | --- |
| **Criterion** | Encapsulation |
| **Severity** | Medium |
| **Files** | `src/lib/chat/policy.ts` (L10–11) |

**Description:** Lines 10–11 execute `new ConfigIdentitySource().getIdentity()` at module load time. This triggers config file I/O (via `getInstanceIdentity()`) as a side-effect of importing `policy.ts`. In test environments, this means the config cache must be in the correct state before any module that transitively imports `policy.ts` is loaded. This is a hidden coupling between module loading order and file-system state.

**Remediation:** Convert `BASE_PROMPT` from a module-scope constant to a lazily-initialized value. Use the same caching pattern as `instance.ts` (`ensureLoaded()`): a `let` variable initialized on first access.

### Finding F5 — `policy.ts` has low cohesion — three unrelated responsibilities

| Attribute | Value |
| --- | --- |
| **Criterion** | Cohesion |
| **Severity** | Medium |
| **Files** | `src/lib/chat/policy.ts` |

**Description:** `policy.ts` contains three distinct responsibilities:
1. System prompt construction (`createSystemPromptBuilder`, `buildSystemPrompt`)
2. A math-detection regex utility (`looksLikeMath`)
3. Model candidate selection (`getModelCandidates`)

These three concerns have different reasons to change and different consumers. `looksLikeMath` is a classifier that belongs in a parsing or utility module. `getModelCandidates` is a thin wrapper around `getModelFallbacks` that adds no behavior.

**Remediation:** Extract `looksLikeMath` to `src/lib/chat/math-classifier.ts`. Inline `getModelCandidates()` at its call sites (it wraps `getModelFallbacks()` with zero added logic) or relocate to a model-selection module. Leave `policy.ts` focused on system prompt assembly.

### Finding F6 — `resolveShellHomeHref` accepts a dead `_user` parameter

| Attribute | Value |
| --- | --- |
| **Criterion** | Abstraction |
| **Severity** | Low |
| **Files** | `src/lib/shell/shell-navigation.ts` (L203–207) |

**Description:** After Sprint 2 simplified `resolveShellHomeHref()` to always return `SHELL_BRAND.homeHref`, the `_user` parameter is never consulted. Three runtime callers (`page.tsx`, `SiteNav.tsx`, `SiteFooter.tsx`) still pass the user object. The dead parameter obscures the function's actual contract — it implies role-based behavior that no longer exists.

**Remediation:** Remove the `_user` parameter from the function signature. Update all callers to invoke `resolveShellHomeHref()` with no arguments. Update test assertions accordingly.

### Finding F7 — `resolveCommandPaletteRoutes` and `showInCommandPalette` naming mismatch

| Attribute | Value |
| --- | --- |
| **Criterion** | Abstraction |
| **Severity** | Low |
| **Files** | `src/lib/shell/shell-navigation.ts` (L14, L58, L125–135), `src/lib/shell/shell-commands.ts` (L64–65) |

**Description:** Sprint 2 deleted the `CommandPalette` component, but the function `resolveCommandPaletteRoutes()` and the `showInCommandPalette` flag on `ShellRouteDefinition` survive. These names reference a deleted UI surface. The actual consumer is the chat composer's slash-command feature (via `shell-commands.ts` → `useCommandRegistry` → `useChatComposerController`). The names mislead future developers into thinking a command palette still exists.

**Remediation:** Rename `resolveCommandPaletteRoutes` → `resolveCommandRoutes`. Rename `showInCommandPalette` → `showInCommands`. Update all consumers and tests.

### Finding F8 — `corpus-config.ts` naming implies configurability but is 100% hardcoded

| Attribute | Value |
| --- | --- |
| **Criterion** | Abstraction |
| **Severity** | Low |
| **Files** | `src/lib/corpus-config.ts` |

**Description:** The filename `corpus-config.ts` implies the module is part of the config layer, but every value is a hardcoded constant. The module is actually a corpus domain vocabulary definition. Additionally, `buildCorpusBasePrompt()` is a 60-line string template that mixes domain rules, UI behavior instructions, action-link syntax documentation, and response-style directives — it reads more like a prompt specification than a config.

**Remediation:** Rename `corpus-config.ts` → `corpus-vocabulary.ts`. This is a naming-only change (file rename + import path updates). No logic changes. The prompt template concern is noted but deferred — restructuring the prompt template is out of scope for a naming audit.

---

## §4 Remediation Plan

### §4.1 Phase 1 — Type extraction (F1)

**Create `src/lib/dashboard/dashboard-types.ts`:**

```typescript
export type DashboardBlockId =
  | "conversation_workspace"
  | "recent_conversations"
  | "customer_workflow_continuity"
  | "lead_queue"
  | "routing_review"
  | "anonymous_opportunities"
  | "consultation_requests"
  | "deal_queue"
  | "training_path_queue"
  | "recurring_pain_themes"
  | "funnel_recommendations"
  | "system_health";
```

**Modify `src/lib/chat/dashboard-handoff.ts`:**
- Remove the local `DashboardBlockId` type definition (L1–13).
- Add `import type { DashboardBlockId } from "@/lib/dashboard/dashboard-types";`.

**Modify `src/lib/dashboard/dashboard-loaders.ts`:**
- Remove the local `DashboardBlockId` type definition (L20–32).
- Add `import type { DashboardBlockId } from "./dashboard-types";`.

### §4.2 Phase 2 — Data extraction and import decoupling (F2, F3)

**Create `src/core/entities/role-directives.ts`:**

```typescript
import type { RoleName } from "./user";

export const ROLE_DIRECTIVES: Record<RoleName, string> = {
  // ... move existing ROLE_DIRECTIVES content from ChatPolicyInteractor.ts ...
};
```

**Modify `src/core/use-cases/ChatPolicyInteractor.ts`:**
- Remove `ROLE_DIRECTIVES` constant definition.
- Add `import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";`.
- The class continues to consume `ROLE_DIRECTIVES` internally; it just no longer owns the data.

**Modify `src/lib/chat/policy.ts`:**
- Replace `import { ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";` (L2) with `import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";`.
- No other changes to policy.ts in this phase — it still passes `ROLE_DIRECTIVES` to `DefaultingSystemPromptRepository`.

**Modify `src/adapters/ConfigRoleDirectiveSource.ts`:**
- Replace `import { ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";` with `import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";`.

### §4.3 Phase 3 — Lazy initialization (F4)

**Modify `src/lib/chat/policy.ts`:**

Replace:
```typescript
const configIdentitySource = new ConfigIdentitySource();
const BASE_PROMPT = configIdentitySource.getIdentity();
```

With:
```typescript
let _basePrompt: string | null = null;

function getBasePrompt(): string {
  if (!_basePrompt) {
    _basePrompt = new ConfigIdentitySource().getIdentity();
  }
  return _basePrompt;
}
```

Update `createSystemPromptBuilder` to call `getBasePrompt()` instead of referencing `BASE_PROMPT`.

### §4.4 Phase 4 — Cohesion extraction (F5)

**Create `src/lib/chat/math-classifier.ts`:**

```typescript
export function looksLikeMath(text: string): boolean {
  const value = text.toLowerCase();
  return (
    /\d\s*[+\-*/]\s*\d/.test(value) ||
    /\b(add|subtract|minus|plus|sum|difference|multiply|times|product|divide|quotient|calculate|math)\b/.test(value)
  );
}
```

**Modify `src/lib/chat/policy.ts`:**
- Remove `looksLikeMath` function.
- This function's callers import from `policy.ts`; update their import paths to `@/lib/chat/math-classifier`:
  - `src/app/api/chat/route.ts`
  - `src/app/api/chat/stream/route.ts`
  - `tests/chat-policy.test.ts`
  - `tests/chat-stream-route.test.ts` (mock target update)

**Inline `getModelCandidates`:**
- Find all callers of `getModelCandidates()`. There are 3 runtime callers (`src/adapters/AnthropicSummarizer.ts`, `src/lib/chat/anthropic-client.ts`, `src/lib/chat/anthropic-stream.ts`) and 2 test files with mocks (`src/adapters/AnthropicSummarizer.test.ts`, `tests/chat-policy.test.ts`). Replace with direct calls to `getModelFallbacks()` from `@/lib/config/env`. Remove the wrapper function from `policy.ts`. Alternatively, relocate to `src/lib/chat/model-selection.ts` for lower-impact refactoring.

### §4.5 Phase 5 — Dead parameter removal (F6)

**Modify `src/lib/shell/shell-navigation.ts`:**

Replace:
```typescript
export function resolveShellHomeHref(
  _user?: Pick<SessionUser, "roles"> | null,
): string {
  return SHELL_BRAND.homeHref;
}
```

With:
```typescript
export function resolveShellHomeHref(): string {
  return SHELL_BRAND.homeHref;
}
```

**Update callers:**
- `src/app/page.tsx`: `resolveShellHomeHref(user)` → `resolveShellHomeHref()`
- `src/components/SiteNav.tsx`: `resolveShellHomeHref(user)` → `resolveShellHomeHref()`
- `src/components/SiteFooter.tsx`: `resolveShellHomeHref(user)` → `resolveShellHomeHref()`
- `tests/dashboard-elimination.test.ts`: Remove user arguments from all `resolveShellHomeHref()` calls.
- `tests/shell-navigation-model.test.ts`: Remove user arguments from all `resolveShellHomeHref()` calls.

### §4.6 Phase 6 — Naming corrections (F7, F8)

**Rename function and flag (F7):**
- `src/lib/shell/shell-navigation.ts`: Rename `resolveCommandPaletteRoutes` → `resolveCommandRoutes`. Rename `showInCommandPalette` → `showInCommands` in `ShellRouteDefinition` interface and all route definitions.
- `src/lib/shell/shell-commands.ts`: Update import and usage.
- Update all tests that reference the old names.

**Rename file (F8):**
- Rename `src/lib/corpus-config.ts` → `src/lib/corpus-vocabulary.ts`.
- Rename `src/lib/corpus-config.test.ts` → `src/lib/corpus-vocabulary.test.ts`.
- Update all import paths across the codebase (13 source files: `ConfigIdentitySource.ts`, `HardcodedIdentitySource.ts`, `tool-composition-root.ts`, `CorpusTools.ts`, `search-corpus.tool.ts`, `get-corpus-summary.tool.ts`, `schema.ts`, `build-search-index.ts`, `embedding-server.ts`, `embedding-tool.ts`, `system-prompt-builder.test.ts`, `config-identity.test.ts`, `corpus-vocabulary.test.ts`).

---

## §5 Test Specification

TD-A is a refactor-only sprint. Per V1 spec §8, the estimated new test count is +0. However, the refactors introduce new module boundaries that should be verified. The following tests confirm the refactors are behaviorally transparent.

### §5.1 Positive tests (refactor verification)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `DashboardBlockId imported from canonical dashboard-types module` | Static analysis: `dashboard-handoff.ts` and `dashboard-loaders.ts` both contain `import type { DashboardBlockId } from` pointing to `dashboard-types`. Neither file contains a local `DashboardBlockId` definition. |
| P2 | `ROLE_DIRECTIVES lives in core/entities/role-directives.ts` | Static analysis: `role-directives.ts` exports `ROLE_DIRECTIVES`. `ChatPolicyInteractor.ts` does not export `ROLE_DIRECTIVES`. |
| P3 | `policy.ts imports ROLE_DIRECTIVES from entity module` | Static analysis: `policy.ts` imports `ROLE_DIRECTIVES` from `@/core/entities/role-directives`. `policy.ts` does not import from `ChatPolicyInteractor`. |
| P4 | `BASE_PROMPT is lazily initialized` | Static analysis: `policy.ts` does not call `new ConfigIdentitySource()` or `.getIdentity()` at module scope. Contains a `getBasePrompt()` function with lazy caching. |
| P5 | `looksLikeMath lives in math-classifier.ts` | Static analysis: `math-classifier.ts` exports `looksLikeMath`. `policy.ts` does not define `looksLikeMath`. |
| P6 | `resolveShellHomeHref accepts no parameters` | Static analysis: `shell-navigation.ts` — the function signature has zero parameters. |
| P7 | `resolveCommandRoutes replaces resolveCommandPaletteRoutes` | Static analysis: `shell-navigation.ts` exports `resolveCommandRoutes`. Does not export `resolveCommandPaletteRoutes`. |
| P8 | `showInCommands replaces showInCommandPalette` | Static analysis: `shell-navigation.ts` — `ShellRouteDefinition` has `showInCommands`. Does not have `showInCommandPalette`. |
| P9 | `corpus-vocabulary.ts replaces corpus-config.ts` | Static analysis: `src/lib/corpus-vocabulary.ts` exists. `src/lib/corpus-config.ts` does not exist. |
| P10 | `system prompt still builds correctly after port wiring` | Call `buildSystemPrompt("AUTHENTICATED")` → returns a non-empty string containing identity content and role directive content. |
| P11 | `looksLikeMath still classifies correctly after extraction` | Import from `math-classifier` → `looksLikeMath("2 + 2")` returns `true`; `looksLikeMath("hello world")` returns `false`. |
| P12 | `resolveShellHomeHref still returns /` | Import `resolveShellHomeHref` → returns `"/"`. |

### §5.2 Negative tests (old patterns forbidden)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `no local DashboardBlockId type definition in dashboard-handoff.ts` | `dashboard-handoff.ts` source does not contain `type DashboardBlockId =`. |
| N2 | `no local DashboardBlockId type definition in dashboard-loaders.ts` | `dashboard-loaders.ts` source does not contain `type DashboardBlockId =`. |
| N3 | `ChatPolicyInteractor does not export ROLE_DIRECTIVES` | Static analysis: `ChatPolicyInteractor.ts` does not contain `export const ROLE_DIRECTIVES` or `export { ROLE_DIRECTIVES`. |
| N4 | `policy.ts has no module-scope ConfigIdentitySource instantiation` | `policy.ts` source — no `new ConfigIdentitySource()` at module scope (outside a function body). |
| N5 | `no getModelCandidates wrapper in policy.ts` | `policy.ts` does not export `getModelCandidates`. |
| N6 | `no references to deleted showInCommandPalette flag` | Grep all `.ts` and `.tsx` source files (excluding specs and test fixtures) — zero matches for `showInCommandPalette`. |
| N7 | `no references to resolveCommandPaletteRoutes` | Grep all `.ts` and `.tsx` source files (excluding specs) — zero matches for `resolveCommandPaletteRoutes`. |
| N8 | `corpus-config.ts does not exist` | `existsSync("src/lib/corpus-config.ts")` → `false`. |

### §5.3 Edge tests (behavioral preservation)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `ConfigRoleDirectiveSource returns directives for all roles` | `new ConfigRoleDirectiveSource().getDirective("ANONYMOUS")` → non-empty string. Same for `AUTHENTICATED`, `STAFF`, `ADMIN`. |
| E2 | `DashboardBlockId set matches type members` | `DASHBOARD_BLOCK_ID_SET` in `dashboard-handoff.ts` has exactly 12 members, matching every member of the imported `DashboardBlockId` type. |
| E3 | `corpus-vocabulary.ts exports are unchanged` | Import all public exports from `corpus-vocabulary.ts` → `corpusConfig`, `sourceTypeRegistry`, `getCorpusToolName`, `getCorpusSearchDescription`, `getCorpusSummaryDescription`, `buildCorpusBasePrompt` all exist and are non-null. |
| E4 | `shell command definitions still resolve` | `resolveShellNavigationCommandDefinitions()` returns an array; each item has `id`, `title`, `href`, `kind: "navigation"`. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P12) | 12 |
| Negative (N1–N8) | 8 |
| Edge (E1–E4) | 4 |
| **Total new tests** | **24** |
| Deleted tests | 0 |
| **Net change** | **+24** |

Note: The V1 spec §8 estimated +0 tests for TD-A. This spec adds 24 lightweight verification tests because the refactors introduce 2 new files, 1 rename, and 1 function extraction. The tests are architectural guardrails (mostly static analysis of source files) that prevent regression into the pre-refactor patterns. They add negligible runtime cost.

---

## §6 Test Implementation Patterns

### §6.1 Static analysis tests

Most TD-A tests are static analysis — they read source files from disk and assert on their contents. This pattern was established in Sprint 1:

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("TD-A — DashboardBlockId canonical extraction (F1)", () => {
  it("P1: DashboardBlockId imported from canonical dashboard-types module", () => {
    const handoff = readSource("src/lib/chat/dashboard-handoff.ts");
    const loaders = readSource("src/lib/dashboard/dashboard-loaders.ts");

    expect(handoff).toContain('from "@/lib/dashboard/dashboard-types"');
    expect(loaders).toContain('from "./dashboard-types"');

    expect(handoff).not.toMatch(/^type DashboardBlockId\s*=/m);
    expect(loaders).not.toMatch(/^type DashboardBlockId\s*=/m);
  });
});
```

### §6.2 Behavioral preservation tests

A small number of tests verify runtime behavior is unchanged after refactoring:

```typescript
describe("TD-A — behavioral preservation", () => {
  it("P10: system prompt still builds correctly after port wiring", async () => {
    const prompt = await buildSystemPrompt("AUTHENTICATED");
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("P11: looksLikeMath still classifies correctly after extraction", () => {
    const { looksLikeMath } = await import("@/lib/chat/math-classifier");
    expect(looksLikeMath("2 + 2")).toBe(true);
    expect(looksLikeMath("hello world")).toBe(false);
  });
});
```

### §6.3 Test file location

All TD-A tests go into a single file: `tests/td-a-booch-audit.test.ts`. This is consistent with Sprint 2's dedicated `tests/dashboard-elimination.test.ts`.

---

## §7 Acceptance Criteria

1. `npm run build` produces zero TypeScript errors.
2. All 1215 existing tests pass without assertion changes (except test files updated for renamed functions/imports).
3. All 24 new tests pass.
4. `DashboardBlockId` is defined in exactly one file: `src/lib/dashboard/dashboard-types.ts`.
5. `ROLE_DIRECTIVES` is defined in `src/core/entities/role-directives.ts`, not in `ChatPolicyInteractor.ts`.
6. `policy.ts` imports `ROLE_DIRECTIVES` from `@/core/entities/role-directives`, not from `ChatPolicyInteractor`.
7. `policy.ts` does not execute `new ConfigIdentitySource()` at module scope.
8. `looksLikeMath` is defined in `src/lib/chat/math-classifier.ts`, not in `policy.ts`.
9. `getModelCandidates` does not exist in `policy.ts`.
10. `resolveShellHomeHref()` accepts zero parameters.
11. `resolveCommandPaletteRoutes` is renamed to `resolveCommandRoutes` everywhere.
12. `showInCommandPalette` is renamed to `showInCommands` everywhere.
13. `corpus-config.ts` is renamed to `corpus-vocabulary.ts` with all import paths updated.
14. No behavioral changes — the application behaves identically before and after TD-A.

---

## §8 Out of Scope

| Item | Deferred to |
| --- | --- |
| Restructuring `buildCorpusBasePrompt()` template into sections | Sprint 3+ (prompt architecture) |
| Moving `corpus-vocabulary.ts` to `src/core/` | TD-C (Martin SOLID Audit) — layer boundary analysis |
| Splitting `tool-composition-root.ts` into smaller factories | TD-C — SRP analysis |
| Externalizing `ROLE_DIRECTIVES` content to `prompts.json` | Sprint 3+ (prompt config externalization) |
| Performance profiling of lazy initialization change | TD-B (Knuth Performance Audit) |
| Auditing Sprint 3+ files | TD-C, TD-D, TD-E (later audit sprints) |
| CSS cleanup of orphaned dashboard-specific styles | TD-B or Sprint 3 |

---

## §9 Sprint Boundary Verification

After TD-A is complete, verify:

```text
1. npx vitest run                    → 1239 tests passing (1215 + 24 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. grep -r "type DashboardBlockId =" src/
                                     → exactly 1 match in dashboard-types.ts
5. grep "export.*ROLE_DIRECTIVES" src/core/use-cases/ChatPolicyInteractor.ts
                                     → zero matches
6. grep "new ConfigIdentitySource" src/lib/chat/policy.ts
                                     → inside a function body, not at module scope
7. grep "looksLikeMath" src/lib/chat/policy.ts
                                     → zero matches
8. grep "resolveCommandPaletteRoutes\|showInCommandPalette" src/
                                     → zero matches
9. test -f src/lib/corpus-config.ts  → does not exist
10. test -f src/lib/corpus-vocabulary.ts → exists
```

---

## §10 Risk Assessment

### §10.1 Rename-driven import breakage

F7 (function rename) and F8 (file rename) touch many import paths. A missed import update will produce a build error caught by acceptance criterion 1. Risk is detectable and reversible.

### §10.2 `getModelCandidates` inlining impact

F5 proposes inlining `getModelCandidates()` at call sites. This function has 3 runtime callers (`AnthropicSummarizer.ts`, `anthropic-client.ts`, `anthropic-stream.ts`) and test mocks in `AnthropicSummarizer.test.ts` and `chat-policy.test.ts`. Each caller and mock must be updated to import `getModelFallbacks` from `@/lib/config/env` directly. Alternatively, the function can be relocated to a dedicated `model-selection.ts` module for lower-impact refactoring while still achieving the cohesion improvement in `policy.ts`.

### §10.3 Lazy initialization timing

F4 changes `BASE_PROMPT` from eager to lazy. If any code path depends on the prompt being resolved during module loading (e.g., for side-effect ordering), the change could shift when config files are read. The config caching in `instance.ts` mitigates this — once loaded, subsequent accesses are free. No runtime behavioral difference expected.

### §10.4 Test count reconciliation

The V1 spec §8 estimated +0 tests for TD-A. This spec adds +24. Update the V1 spec's running test total accordingly after TD-A is implemented: 1215 + 24 = 1239.
