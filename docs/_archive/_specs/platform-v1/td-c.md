# TD-C — Technical Debt: Martin SOLID Audit

> **Parent spec:** [Platform V1](spec.md) §9.3, §8 Phase C
> **Scope:** All new modules from Sprints 3–7. Audit against Robert C. Martin's SOLID principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Refactor violations.
> **Depends On:** Sprint 7 (blog content pipeline), TD-B (DRY/performance audit)
> **Baseline:** 1398 tests, 168 suites, build clean, lint clean (pre-existing: 1 error in `conversations/route.ts`, 2 warnings)

---

## §1 Current State

### §1.1 Post-Sprint-7 baseline

| Metric | Value |
| --- | --- |
| Tests | 1398 |
| Suites | 168 (167 pass, 1 Playwright parse failure — pre-existing) |
| Build | Clean (zero errors) |
| Lint | Clean (no new warnings; pre-existing: 1 error in `conversations/route.ts`, 2 warnings) |

### §1.2 Audit scope

TD-C covers every source file created or modified in Sprints 3–7. Per V1 spec §9.3, the audit evaluates five SOLID criteria: **Single Responsibility** (does each module have exactly one reason to change?), **Open/Closed** (can new tools/content types be added without modifying existing code?), **Liskov Substitution** (can implementations be swapped without breaking consumers?), **Interface Segregation** (are interfaces minimal?), **Dependency Inversion** (do core use cases depend on abstractions, not concrete adapters?).

### §1.3 Files in audit scope

**Sprint 3 — First Message and Smart Greeting (modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/hooks/useGlobalChat.tsx` | 164 | Chat state management with first-message injection |
| `src/frameworks/ui/ChatContentSurface.tsx` | 116 | Hero state rendering with config-driven greeting |
| `src/lib/config/instance.ts` | 149 | Config loader with process-lifetime caching |

**Sprint 4 — QR Code and Referral Tracking (new + modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/proxy.ts` | 70 | Edge middleware: auth checks, `?ref=` capture, referral cookie |
| `src/app/api/qr/[code]/route.ts` | 45 | QR code image generation endpoint |
| `src/app/api/referral/[code]/route.ts` | 33 | Referral code validation endpoint |

**Sprint 5 — Public Content Routes (modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/seo/library-metadata.ts` | 108 | Metadata + JSON-LD builders for library pages |
| `src/app/library/[document]/[section]/page.tsx` | ~210 | Chapter page with `generateMetadata` + JSON-LD |

**Sprint 6 — Analytics and Sitemap (new + modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/app/sitemap.ts` | 46 | Dynamic sitemap generation |
| `src/app/blog/page.tsx` | 73 | Blog index page |
| `src/app/blog/[slug]/page.tsx` | 78 | Blog post detail page |

**Sprint 7 — Blog Content Pipeline (new + modified files):**

| File | Lines | Role |
| --- | --- | --- |
| `src/core/use-cases/tools/admin-content.tool.ts` | 190 | Draft/publish blog content commands |
| `src/core/use-cases/tools/admin-prioritize-leads.tool.ts` | 146 | Lead prioritization admin tool |
| `src/core/use-cases/tools/admin-prioritize-offer.tool.ts` | 139 | Offer prioritization admin tool |
| `src/core/use-cases/tools/admin-triage-routing-risk.tool.ts` | 150 | Routing risk triage admin tool |

**Cross-cutting (pre-Sprint-3 files with SOLID debt impacting Sprint 3–7 code):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/chat/tool-composition-root.ts` | 171 | Tool registry assembly, search pipeline, embedding factory, config filtering |
| `src/core/use-cases/tools/set-preference.tool.ts` | 65 | Set user preference command |
| `src/core/use-cases/tools/UiTools.ts` | 60 | UI adjustment commands (theme, font, density, etc.) |
| `src/core/tool-registry/ToolDescriptor.ts` | 22 | Tool descriptor interface with closed category union |
| `src/core/tool-registry/ToolRegistry.ts` | 64 | Tool registry with hardcoded access policy |
| `src/core/search/EmbeddingPipelineFactory.ts` | 34 | Embedding pipeline factory with hardcoded chunker selection |
| `src/adapters/RepositoryFactory.ts` | 33 | Service locator for repository singletons |

---

## §2 Audit Methodology

Each file in scope is evaluated against Martin's five SOLID principles. Findings are classified by severity:

| Severity | Meaning |
| --- | --- |
| **High** | Violates SOLID in a way that produces architectural coupling, makes extension impossible without modification, or inverts the dependency flow between layers. Must be fixed in this sprint. |
| **Medium** | Violates SOLID but has limited blast radius or an established workaround. Should be fixed in this sprint. |
| **Low** | Minor principle concern. Fix if the file is already being modified; otherwise defer. |

The search subsystem (`src/core/search/`) was audited and found to be **exemplary DIP** — all handler and engine classes depend on port interfaces in `src/core/search/ports/`, no concrete adapter imports. This is noted as a positive finding and excluded from the violation catalog.

---

## §3 Audit Findings

### Finding F1 — `tool-composition-root.ts` has six responsibilities (SRP + OCP)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP, OCP |
| **Severity** | High |
| **Files** | `src/lib/chat/tool-composition-root.ts` |

**Description:** This 171-line file owns six distinct responsibilities:

| # | Responsibility | Lines |
| --- | --- | --- |
| 1 | 19 hardcoded tool registrations | L57–L90 |
| 2 | Concrete adapter instantiation (LocalEmbedder, SQLiteVectorStore, SQLiteBM25IndexStore) | L76–L78, L121–L124 |
| 3 | Search handler pipeline construction (4 handlers, chain wiring) | L119–L167 |
| 4 | Embedding pipeline factory construction | L107–L112 |
| 5 | Config-based tool filtering (`tools.json` enable/disable) | L93–L103 |
| 6 | QueryProcessor chain assembly (Lowercase, Stopword, Synonym steps) | L128–L138 |

Each responsibility has its own reason to change: adding a tool (1), changing infrastructure (2), modifying search ranking (3/6), changing the embedding strategy (4), or adjusting config filtering (5).

**OCP violation:** Adding a new tool requires editing `createToolRegistry()`. Adding a search strategy requires editing `getSearchHandler()`. Nothing is pluggable.

**Remediation:** Extract search pipeline construction into `src/lib/chat/search-pipeline.ts`. Extract embedding helpers into `src/lib/chat/embedding-module.ts`. The tool registration and config filtering remain in `tool-composition-root.ts`, which becomes a slim 40-line orchestrator that delegates to focused modules.

### Finding F2 — Core use-case commands import concrete adapters (DIP)

| Attribute | Value |
| --- | --- |
| **Principle** | DIP |
| **Severity** | High |
| **Files** | `src/core/use-cases/tools/set-preference.tool.ts` (L4–L5, L23), `src/core/use-cases/tools/UiTools.ts` (L3–L4, L28) |

**Description:** Two files in `src/core/use-cases/tools/` import the concrete `UserPreferencesDataMapper` from `@/adapters/` and `getDb` from `@/lib/db`, then instantiate the adapter inside their `execute()` methods:

```
// set-preference.tool.ts L23
const repo = new UserPreferencesDataMapper(getDb());

// UiTools.ts L28 (AdjustUICommand.execute)
const repo = new UserPreferencesDataMapper(getDb());
```

The `UserPreferencesRepository` port interface already exists at `src/core/ports/UserPreferencesRepository.ts` and `UserPreferencesDataMapper` already implements it. The port is simply not being used — the core domain bypasses the abstraction and reaches directly into the adapter layer.

This is especially notable because the admin content tools (`admin-content.tool.ts`) demonstrate the correct pattern: `createDraftContentTool(blogRepo)` and `createPublishContentTool(blogRepo)` receive a `BlogPostRepository` via constructor injection.

**Remediation:** Refactor `SetPreferenceCommand` and `AdjustUICommand` to accept `UserPreferencesRepository` via constructor injection. Wire the concrete `UserPreferencesDataMapper(getDb())` in `tool-composition-root.ts`, where all other concrete adapters are already assembled. Remove `@/adapters/` and `@/lib/db` imports from both core files.

### Finding F3 — `ToolCategory` is a closed union type (OCP)

| Attribute | Value |
| --- | --- |
| **Principle** | OCP |
| **Severity** | Medium |
| **Files** | `src/core/tool-registry/ToolDescriptor.ts` (L4) |

**Description:** `ToolCategory` is defined as `"content" | "ui" | "math" | "system"`. Sprint 7 added four admin tools that are categorized as `"system"`, but they are more accurately `"admin"` or `"analytics"` tools. Adding a new category (e.g., `"admin"`, `"analytics"`, `"integration"`) requires modifying this type definition.

Additionally, `ToolRegistry.getSchemasForRole()` (L22–L31) embeds the access-control logic `descriptor.roles === "ALL" || descriptor.roles.includes(role)` directly in the method body. This cannot be extended with custom access policies (time-based, feature-flag-gated, rate-limited) without modifying the class.

**Remediation:** Change `ToolCategory` from a closed union to a branded string type that accepts known values but is extensible:

```typescript
export type ToolCategory = "content" | "ui" | "math" | "system" | (string & {});
```

This preserves IDE autocomplete for known values while allowing extension without modification. The access policy concern is noted but deferred — the current `roles` check is sufficient for the application's RBAC needs through Sprint 12.

### Finding F4 — `EmbeddingPipelineFactory` has hardcoded chunker selection (OCP)

| Attribute | Value |
| --- | --- |
| **Principle** | OCP |
| **Severity** | Medium |
| **Files** | `src/core/search/EmbeddingPipelineFactory.ts` (L22–L25) |

**Description:** The factory selects a chunker via a hardcoded conditional:

```typescript
const chunker = sourceType === "conversation"
  ? new ConversationChunker()
  : new MarkdownChunker();
```

Adding a new source type (e.g., `"pdf"`, `"api_response"`) requires modifying this if/else chain. The factory also directly imports concrete `MarkdownChunker` and `ConversationChunker` — two concrete classes in a file that otherwise receives its dependencies via constructor injection (`Embedder`, `VectorStore`).

**Remediation:** Accept a `chunkerRegistry: Map<string, () => Chunker>` in the constructor. The composition root populates the map; the factory looks up the chunker by source type without knowing the concrete classes. A reasonable default map can be provided for backward compatibility.

### Finding F5 — Blog routes use service locator pattern (DIP)

| Attribute | Value |
| --- | --- |
| **Principle** | DIP |
| **Severity** | Medium |
| **Files** | `src/app/blog/page.tsx` (L4, L27), `src/app/blog/[slug]/page.tsx` (L6, L17, L47), `src/app/sitemap.ts` (L4, L31) |

**Description:** Three route files import `getBlogPostRepository()` from `@/adapters/RepositoryFactory` and call it directly. This is a service locator pattern where the presentation layer reaches into the adapter layer for its dependencies.

The `RepositoryFactory` module uses module-scope singleton caching (`let blogRepo: BlogPostRepository | null = null`), which makes the dependency invisible and couples routes to the adapter's lifecycle management.

This is a pragmatic pattern for Next.js Server Components (which cannot use traditional DI containers), and `tool-composition-root.ts` already demonstrates the project's accepted approach: the composition root calls the factory, and tools receive the repository. Blog routes bypass this pattern because they operate outside the tool/chat pipeline.

**Remediation:** Accept as a **documented architectural exception** for Next.js Server Components. The framework's RSC model does not support constructor injection for page components. Add a code comment to `RepositoryFactory.ts` documenting this as a known layering choice. No refactoring needed — the existing pattern is the correct DIP compromise for the framework.

### Finding F6 — Admin tool factories import concrete loaders via default parameters (DIP)

| Attribute | Value |
| --- | --- |
| **Principle** | DIP |
| **Severity** | Low |
| **Files** | `src/core/use-cases/tools/admin-prioritize-leads.tool.ts` (L4), `src/core/use-cases/tools/admin-prioritize-offer.tool.ts` (L4–L12), `src/core/use-cases/tools/admin-triage-routing-risk.tool.ts` (L4) |

**Description:** These three admin tool factories use constructor injection correctly — the command classes accept loader functions via `private readonly` fields. However, the factory functions use **default parameter values** that import concrete `dashboard-loaders` functions at module scope:

```typescript
// admin-prioritize-leads.tool.ts L4
import { loadLeadQueueBlock } from "@/lib/dashboard/dashboard-loaders";
// Factory function signature uses it as default:
export function createAdminPrioritizeLeadsTool(loadQueue = loadLeadQueueBlock) { ... }
```

The commands themselves are testable (tests override defaults), but the module-level imports of concrete loaders in `src/core/use-cases/tools/` still violate strict DIP layering.

**Remediation:** Move the default-parameter wiring to `tool-composition-root.ts`. The factory functions become pure — they require all dependencies explicitly:

```typescript
// Before: createAdminPrioritizeLeadsTool(loadQueue = loadLeadQueueBlock)
// After:  createAdminPrioritizeLeadsTool(loadQueue: () => Promise<LeadQueueBlock>)
```

The composition root passes the concrete loaders: `createAdminPrioritizeLeadsTool(loadLeadQueueBlock)`.

### Finding F7 — `proxy.ts` mixes referral capture with auth guard (SRP)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP |
| **Severity** | Low |
| **Files** | `src/proxy.ts` (L40–L64) |

**Description:** The `proxy()` function has two unrelated responsibilities:
1. **Referral cookie capture** (L40–L53) — a marketing concern that sets a cookie when `?ref=` is present.
2. **Auth guard** (L56–L64) — a security concern that blocks unauthenticated access to protected API routes.

These two concerns have different reasons to change (marketing campaign logic vs. security policy), different consumers, and different testing needs.

**Remediation:** Extract referral cookie handling into a standalone `captureReferral(request, response)` function in the same file. The `proxy()` function calls `captureReferral()` first, then applies the auth guard. This is a single-file extraction — no new modules needed.

---

## §4 Remediation Plan

### §4.1 Phase 1 — DIP repair in core use-case commands (F2)

**Modify `src/core/use-cases/tools/set-preference.tool.ts`:**

Refactor `SetPreferenceCommand` to accept `UserPreferencesRepository` via constructor:

```typescript
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";

class SetPreferenceCommand implements ToolCommand<Record<string, unknown>, string> {
  constructor(private readonly repo: UserPreferencesRepository) {}

  async execute(input: Record<string, unknown>, context?: ToolExecutionContext): Promise<string> {
    // ... same logic, but uses this.repo instead of new UserPreferencesDataMapper(getDb())
  }
}
```

Remove imports of `UserPreferencesDataMapper` and `getDb`. Convert the `setPreferenceTool` export to a factory function:

```typescript
export function createSetPreferenceTool(repo: UserPreferencesRepository): ToolDescriptor {
  return {
    name: "set_preference",
    schema: { /* ... unchanged ... */ },
    command: new SetPreferenceCommand(repo),
    roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
    category: "system",
  };
}
```

**Modify `src/core/use-cases/tools/UiTools.ts`:**

Refactor `AdjustUICommand` to accept `UserPreferencesRepository` via constructor:

```typescript
export class AdjustUICommand implements ToolCommand<Record<string, unknown>, string> {
  constructor(private readonly preferencesRepo?: UserPreferencesRepository) {}

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    // ... same logic, but uses this.preferencesRepo instead of new UserPreferencesDataMapper(getDb())
  }
}
```

Remove imports of `UserPreferencesDataMapper` and `getDb`. Update the tool descriptors that use `AdjustUICommand` to pass the repo via the factory.

**Modify `src/lib/chat/tool-composition-root.ts`:**

Wire the concrete adapter:

```typescript
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";

// In createToolRegistry():
const prefsRepo = new UserPreferencesDataMapper(getDb());
reg.register(createSetPreferenceTool(prefsRepo));
// Update adjustUiTool registration to pass prefsRepo
```

### §4.2 Phase 2 — SRP extraction from tool-composition-root.ts (F1)

**Create `src/lib/chat/search-pipeline.ts`:**

Move `getSearchHandler()` and all its supporting imports (HybridSearchHandler, BM25SearchHandler, LegacyKeywordHandler, EmptyResultHandler, QueryProcessor, LowercaseStep, StopwordStep, SynonymStep, HybridSearchEngine, BM25Scorer) from `tool-composition-root.ts` into this new module. The function signature stays the same:

```typescript
export function getSearchHandler(): SearchHandler { ... }
```

**Create `src/lib/chat/embedding-module.ts`:**

Move `getEmbeddingPipelineFactory()`, `getBookPipeline()`, and `getCorpusPipeline()` into this module:

```typescript
export function getEmbeddingPipelineFactory(): EmbeddingPipelineFactory { ... }
export function getBookPipeline(): EmbeddingPipeline { ... }
export function getCorpusPipeline(): EmbeddingPipeline { ... }
```

**Modify `src/lib/chat/tool-composition-root.ts`:**

Remove the moved functions and their imports. The composition root becomes a slim orchestrator:

```typescript
import { getSearchHandler } from "./search-pipeline";
import { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline } from "./embedding-module";

export function createToolRegistry(corpusRepo: CorpusRepository, handler?: SearchHandler): ToolRegistry { ... }
export function getToolRegistry(): ToolRegistry { ... }
export function getToolExecutor(): ToolExecuteFn { ... }

// Re-export for backward compatibility
export { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline, getSearchHandler };
```

### §4.3 Phase 3 — OCP fix for ToolCategory (F3)

**Modify `src/core/tool-registry/ToolDescriptor.ts`:**

Replace the closed union:

```typescript
// Before:
export type ToolCategory = "content" | "ui" | "math" | "system";

// After:
export type ToolCategory = "content" | "ui" | "math" | "system" | (string & {});
```

This preserves autocomplete for the four known values while allowing new categories without modification.

### §4.4 Phase 4 — OCP fix for EmbeddingPipelineFactory (F4)

**Modify `src/core/search/EmbeddingPipelineFactory.ts`:**

Add a chunker registry to the constructor:

```typescript
import type { Chunker } from "./ports/Chunker";

type ChunkerFactory = () => Chunker;

export class EmbeddingPipelineFactory {
  constructor(
    private embedder: Embedder,
    private vectorStore: VectorStore,
    private modelVersion: string,
    private chunkerRegistry: Map<string, ChunkerFactory> = new Map([
      ["markdown", () => new MarkdownChunker()],
      ["conversation", () => new ConversationChunker()],
    ]),
  ) {}

  createForSource(sourceType: string): EmbeddingPipeline {
    const factory = this.chunkerRegistry.get(sourceType)
      ?? this.chunkerRegistry.get("markdown")!;
    const chunker = factory();
    const changeDetector = new ChangeDetector(this.vectorStore);
    return new EmbeddingPipeline(chunker, this.embedder, this.vectorStore, changeDetector, this.modelVersion);
  }
}
```

The default registry preserves current behavior. Callers that need a new source type pass an extended map.

### §4.5 Phase 5 — DIP cleanup for admin tool defaults (F6)

**Modify `src/core/use-cases/tools/admin-prioritize-leads.tool.ts`:**

Remove the default parameter and the module-level import:

```typescript
// Before: import { loadLeadQueueBlock } from "@/lib/dashboard/dashboard-loaders";
// Before: export function createAdminPrioritizeLeadsTool(loadQueue = loadLeadQueueBlock)

// After: no dashboard-loaders import
// After: export function createAdminPrioritizeLeadsTool(loadQueue: () => Promise<LeadQueueBlock>)
```

**Apply same pattern to:**
- `admin-prioritize-offer.tool.ts` — remove 3 default parameter imports.
- `admin-triage-routing-risk.tool.ts` — remove 1 default parameter import.

**Modify `src/lib/chat/tool-composition-root.ts`:**

Pass the concrete loaders explicitly:

```typescript
import { loadLeadQueueBlock } from "@/lib/dashboard/dashboard-loaders";
// ... etc.

reg.register(createAdminPrioritizeLeadsTool(loadLeadQueueBlock));
```

### §4.6 Phase 6 — SRP extraction in proxy.ts (F7) and service locator documentation (F5)

**Modify `src/proxy.ts`:**

Extract referral capture into a named function:

```typescript
function captureReferral(request: NextRequest, response: NextResponse): void {
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    response.cookies.set("referral_code", ref, { /* ... existing options ... */ });
  }
}

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  captureReferral(request, response);
  // ... auth guard logic unchanged ...
  return response;
}
```

**Modify `src/adapters/RepositoryFactory.ts`:**

Add a documentation comment documenting the service locator pattern as an accepted architectural exception:

```typescript
/**
 * Repository Factory — Service Locator
 *
 * Next.js Server Components (RSC) cannot receive constructor-injected dependencies.
 * Page components call these factory functions directly. This is an accepted DIP
 * exception for the RSC layer. The tool/chat pipeline uses proper constructor
 * injection via tool-composition-root.ts.
 */
```

---

## §5 Test Specification

### §5.1 Positive tests (refactors work correctly)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `SetPreferenceCommand receives repository via constructor injection` | Source of `set-preference.tool.ts` contains `constructor(private readonly repo: UserPreferencesRepository)` (or equivalent). |
| P2 | `AdjustUICommand receives repository via constructor injection` | Source of `UiTools.ts` contains constructor accepting `UserPreferencesRepository`. |
| P3 | `search-pipeline.ts exports getSearchHandler` | Module `src/lib/chat/search-pipeline.ts` exists and exports `getSearchHandler`. |
| P4 | `embedding-module.ts exports pipeline factories` | Module `src/lib/chat/embedding-module.ts` exports `getEmbeddingPipelineFactory`, `getBookPipeline`, `getCorpusPipeline`. |
| P5 | `tool-composition-root.ts delegates to search-pipeline` | Source of `tool-composition-root.ts` imports from `./search-pipeline`. |
| P6 | `ToolCategory accepts extensible string values` | TypeScript compiles when assigning `"analytics"` to a `ToolCategory` variable. Source of `ToolDescriptor.ts` contains `(string & {})`. |
| P7 | `EmbeddingPipelineFactory uses chunker registry` | Source of `EmbeddingPipelineFactory.ts` contains `chunkerRegistry` parameter. No `sourceType === "conversation"` conditional. |
| P8 | `proxy.ts extracts captureReferral function` | Source of `proxy.ts` contains `function captureReferral`. |
| P9 | `admin tool factories require explicit loader parameters` | Source of `admin-prioritize-leads.tool.ts` does not import from `@/lib/dashboard/dashboard-loaders`. |

### §5.2 Negative tests (old patterns forbidden)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `no concrete adapter imports in set-preference.tool.ts` | Source does not contain `import.*UserPreferencesDataMapper` or `import.*getDb`. |
| N2 | `no concrete adapter imports in UiTools.ts` | Source does not contain `import.*UserPreferencesDataMapper` or `import.*getDb`. |
| N3 | `no search handler construction in tool-composition-root.ts` | Source does not contain `new HybridSearchEngine` or `new BM25Scorer` or `new QueryProcessor`. |
| N4 | `no embedding pipeline factory in tool-composition-root.ts` | Source does not contain `new EmbeddingPipelineFactory`. Embedding pipeline factory construction is delegated to `embedding-module.ts`. `LocalEmbedder` may still appear in `createToolRegistry` for conversation search wiring. |
| N5 | `no hardcoded chunker conditional in EmbeddingPipelineFactory` | Source does not contain `sourceType === "conversation"`. |
| N6 | `no dashboard-loaders import in admin-prioritize-offer.tool.ts` | Source does not import from `@/lib/dashboard/dashboard-loaders`. |
| N7 | `no dashboard-loaders import in admin-triage-routing-risk.tool.ts` | Source does not import from `@/lib/dashboard/dashboard-loaders`. |

### §5.3 Edge tests (behavioral preservation)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `set_preference tool still saves preferences` | Create a `SetPreferenceCommand` with a mock `UserPreferencesRepository`. Call `execute({ key: "tone", value: "casual" }, context)`. Verify mock `set()` was called with correct args. |
| E2 | `adjust_ui tool still persists UI preferences` | Create an `AdjustUICommand` with a mock `UserPreferencesRepository`. Call `execute({ theme: "dark" }, context)`. Verify mock `set()` was called. |
| E3 | `getSearchHandler returns functional search handler` | Import `getSearchHandler` from `search-pipeline.ts`. Verify it returns a non-null `SearchHandler`. |
| E4 | `getToolRegistry still registers expected tool count` | `getToolRegistry().getToolNames()` returns the same set of tool names as before. |
| E5 | `EmbeddingPipelineFactory creates pipeline for markdown source` | Factory with default registry, call `createForSource("markdown")` → returns `EmbeddingPipeline`. |
| E6 | `EmbeddingPipelineFactory creates pipeline for conversation source` | Factory with default registry, call `createForSource("conversation")` → returns `EmbeddingPipeline`. |
| E7 | `EmbeddingPipelineFactory falls back to markdown for unknown source` | Factory with default registry, call `createForSource("pdf")` → returns `EmbeddingPipeline` (falls back to markdown chunker). |
| E8 | `RepositoryFactory.ts documents the service locator exception` | Source of `RepositoryFactory.ts` contains `"accepted DIP exception"` or equivalent documentation comment. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P9) | 9 |
| Negative (N1–N7) | 7 |
| Edge (E1–E8) | 8 |
| **Total new tests** | **24** |
| Deleted tests | 0 |
| **Net change** | **+24** |

Note: The V1 spec §8 estimated +0 tests for TD-C (refactor only). This spec adds 24 tests because the refactors introduce 2 new files, 1 factory pattern change, and significant DIP rewiring that must be verified. The tests are a mix of static source analysis (P/N tests) and behavioral preservation assertions (E tests).

---

## §6 Test Implementation Patterns

### §6.1 Static analysis tests (source file assertions)

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("TD-C — DIP repair in core commands (F2)", () => {
  it("P1: SetPreferenceCommand receives repository via constructor injection", () => {
    const src = readSource("src/core/use-cases/tools/set-preference.tool.ts");
    expect(src).toMatch(/constructor\s*\(.*UserPreferencesRepository/);
  });

  it("P2: AdjustUICommand receives repository via constructor injection", () => {
    const src = readSource("src/core/use-cases/tools/UiTools.ts");
    expect(src).toMatch(/constructor\s*\(.*UserPreferencesRepository/);
  });

  it("N1: no concrete adapter imports in set-preference.tool.ts", () => {
    const src = readSource("src/core/use-cases/tools/set-preference.tool.ts");
    expect(src).not.toMatch(/import.*UserPreferencesDataMapper/);
    expect(src).not.toMatch(/import.*getDb/);
  });

  it("N2: no concrete adapter imports in UiTools.ts", () => {
    const src = readSource("src/core/use-cases/tools/UiTools.ts");
    expect(src).not.toMatch(/import.*UserPreferencesDataMapper/);
    expect(src).not.toMatch(/import.*getDb/);
  });
});
```

### §6.2 SRP extraction tests (F1)

```typescript
describe("TD-C — SRP extraction from tool-composition-root (F1)", () => {
  it("P3: search-pipeline.ts exports getSearchHandler", () => {
    expect(existsSync(join(process.cwd(), "src/lib/chat/search-pipeline.ts"))).toBe(true);
    const src = readSource("src/lib/chat/search-pipeline.ts");
    expect(src).toMatch(/export\s+function\s+getSearchHandler/);
  });

  it("P4: embedding-module.ts exports pipeline factories", () => {
    expect(existsSync(join(process.cwd(), "src/lib/chat/embedding-module.ts"))).toBe(true);
    const src = readSource("src/lib/chat/embedding-module.ts");
    expect(src).toMatch(/export\s+function\s+getEmbeddingPipelineFactory/);
    expect(src).toMatch(/export\s+function\s+getBookPipeline/);
    expect(src).toMatch(/export\s+function\s+getCorpusPipeline/);
  });

  it("P5: tool-composition-root.ts delegates to search-pipeline", () => {
    const src = readSource("src/lib/chat/tool-composition-root.ts");
    expect(src).toContain("./search-pipeline");
  });

  it("N3: no search handler construction in tool-composition-root.ts", () => {
    const src = readSource("src/lib/chat/tool-composition-root.ts");
    expect(src).not.toContain("new HybridSearchEngine");
    expect(src).not.toContain("new BM25Scorer");
    expect(src).not.toContain("new QueryProcessor");
  });

  it("N4: no embedding construction in tool-composition-root.ts", () => {
    const src = readSource("src/lib/chat/tool-composition-root.ts");
    // LocalEmbedder may still appear in createToolRegistry for conversation search
    // but the embedding pipeline factory functions should be delegated
    expect(src).not.toContain("new EmbeddingPipelineFactory");
  });
});
```

### §6.3 Behavioral preservation tests (E1–E4)

```typescript
describe("TD-C — behavioral preservation", () => {
  it("E1: set_preference tool still saves preferences", async () => {
    const mockRepo = { set: vi.fn(), get: vi.fn(), getAll: vi.fn(), delete: vi.fn() };
    const { SetPreferenceCommand } = await import("@/core/use-cases/tools/set-preference.tool");
    const cmd = new SetPreferenceCommand(mockRepo);
    const result = await cmd.execute(
      { key: "tone", value: "casual" },
      { userId: "user-1", role: "AUTHENTICATED", conversationId: "conv-1" },
    );
    expect(mockRepo.set).toHaveBeenCalledWith("user-1", "tone", "casual");
    expect(result).toContain("tone");
  });

  it("E4: getToolRegistry still registers expected tool count", async () => {
    const { getToolRegistry } = await import("@/lib/chat/tool-composition-root");
    const reg = getToolRegistry();
    const names = reg.getToolNames();
    expect(names.length).toBeGreaterThanOrEqual(19);
  });
});
```

### §6.4 OCP edge tests (E5–E7)

```typescript
describe("TD-C — EmbeddingPipelineFactory OCP (F4)", () => {
  it("P7: uses chunker registry", () => {
    const src = readSource("src/core/search/EmbeddingPipelineFactory.ts");
    expect(src).toContain("chunkerRegistry");
    expect(src).not.toContain('sourceType === "conversation"');
  });

  it("E5: creates pipeline for markdown source", () => {
    // Use a mock embedder and vectorStore
    const factory = new EmbeddingPipelineFactory(mockEmbedder, mockVectorStore, "test-v1");
    const pipeline = factory.createForSource("markdown");
    expect(pipeline).toBeDefined();
  });

  it("E7: falls back to markdown for unknown source type", () => {
    const factory = new EmbeddingPipelineFactory(mockEmbedder, mockVectorStore, "test-v1");
    const pipeline = factory.createForSource("pdf");
    expect(pipeline).toBeDefined();
  });
});
```

### §6.5 Test file location

All TD-C tests go into a single file: `tests/td-c-martin-solid-audit.test.ts`.

---

## §7 Acceptance Criteria

1. **DIP: Core commands** — `set-preference.tool.ts` and `UiTools.ts` have zero imports from `@/adapters/` or `@/lib/db`. Commands receive `UserPreferencesRepository` via constructor injection.
2. **SRP: Composition root** — `tool-composition-root.ts` delegates search pipeline construction to `search-pipeline.ts` and embedding factories to `embedding-module.ts`. The composition root has ≤ 2 responsibilities (tool registration + config filtering).
3. **OCP: ToolCategory** — `ToolCategory` type accepts arbitrary string values. Known values (`"content"`, `"ui"`, `"math"`, `"system"`) provide autocomplete.
4. **OCP: Chunker selection** — `EmbeddingPipelineFactory` uses a registry-based chunker selection. No hardcoded conditional on source type string.
5. **DIP: Admin tools** — `admin-prioritize-leads.tool.ts`, `admin-prioritize-offer.tool.ts`, and `admin-triage-routing-risk.tool.ts` have zero imports from `@/lib/dashboard/dashboard-loaders`. Concrete loaders are wired in the composition root.
6. **SRP: Proxy** — `proxy.ts` extracts referral capture into a named `captureReferral` function.
7. **DIP: Service locator documented** — `RepositoryFactory.ts` contains a documentation comment explaining the service locator pattern as an accepted DIP exception for Next.js RSC.
8. **Tests: 24 new** — Total suite: 1398 + 24 = **1422** tests.
9. **Tests: Baseline preserved** — All 1398 pre-existing tests pass without assertion changes.
10. **Build clean.** Lint clean (no new issues).
11. **No behavioral changes** — the application behaves identically before and after TD-C.

---

## §8 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Constructor injection changes break existing tool tests | Medium | Tool tests that mock `UserPreferencesDataMapper` at module level must switch to passing mock repos to constructors. Tests become simpler, not harder. |
| `search-pipeline.ts` extraction breaks import paths | Low | `tool-composition-root.ts` re-exports moved functions for backward compatibility. No external callers need to change their imports immediately. |
| `ToolCategory` extensibility allows typos | Low | The `(string & {})` pattern preserves IDE autocomplete for known values. A runtime category validator can be added later if needed. |
| Admin tool factory parameter changes break tests | Low | Test files already pass explicit mock loaders — removing defaults makes the test code identical. |
| `EmbeddingPipelineFactory` registry pattern adds complexity | Low | Default map in constructor means zero changes needed at call sites that don't need new source types. The added complexity is one `Map.get()` → `factory()` call. |

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| ToolRegistry access policy extraction (pluggable RBAC) | TD-D or Sprint 10+ — current `roles` check is sufficient |
| Moving `corpus-vocabulary.ts` to `src/core/` layer | TD-E — full architectural review |
| Auto-discovery of tool descriptors (scanner pattern) | Sprint 10+ — requires build-time tooling |
| DI container for Next.js Server Components | Not planned — RSC architecture fundamentally incompatible |
| Splitting `ToolRegistry` into read/write interfaces (ISP) | TD-E — the class is small (64 lines) and cohesive |
| Performance impact measurement of refactors | Not needed — refactors are structurally transparent |

---

## §10 Sprint Boundary Verification

After TD-C is complete, verify:

```text
1. npx vitest run                    → 1422 tests passing (1398 + 24 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. grep -r "UserPreferencesDataMapper\|getDb" src/core/use-cases/tools/set-preference.tool.ts
                                     → zero matches
5. grep -r "UserPreferencesDataMapper\|getDb" src/core/use-cases/tools/UiTools.ts
                                     → zero matches
6. test -f src/lib/chat/search-pipeline.ts
                                     → exists
7. test -f src/lib/chat/embedding-module.ts
                                     → exists
8. grep "new HybridSearchEngine\|new BM25Scorer\|new QueryProcessor" src/lib/chat/tool-composition-root.ts
                                     → zero matches
9. grep 'sourceType === "conversation"' src/core/search/EmbeddingPipelineFactory.ts
                                     → zero matches
10. grep "dashboard-loaders" src/core/use-cases/tools/admin-prioritize-leads.tool.ts
                                     → zero matches
11. grep "captureReferral" src/proxy.ts
                                     → at least 1 match
12. grep 'string & {}' src/core/tool-registry/ToolDescriptor.ts
                                     → at least 1 match
```

---

## §11 Definition of Done

TD-C is complete when:

1. Every SOLID violation identified (F1–F7) is remediated or explicitly documented as an accepted exception (F5).
2. Core use-case commands (`src/core/`) have zero imports from `@/adapters/` or `@/lib/db`.
3. `tool-composition-root.ts` delegates search and embedding concerns to focused modules.
4. 24 new tests pass. Total suite: 1398 + 24 = **1422** tests.
5. Build clean. Lint clean.
6. No behavioral changes.

### §11.1 V1 spec update

After TD-C is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1422 tests, running total append: → 1422 (TD-C, +24)

### §11.2 Sprint 7 → TD-C handoff verification

| Sprint 7 artifact | TD-C relationship |
| --- | --- |
| `admin-content.tool.ts` (pure constructor injection) | Reference pattern — TD-C applies this pattern to `set-preference.tool.ts` and `UiTools.ts` |
| `admin-prioritize-*.tool.ts` (default-param injection) | Upgraded to pure injection with defaults moved to composition root |
| `tool-composition-root.ts` (19 tool registrations) | Split into 3 focused modules; registration count unchanged |
| `EmbeddingPipelineFactory` (2 chunker types) | Opened for extension via registry pattern |

### §11.3 TD-C → Sprint 8 handoff

| TD-C artifact | How Sprint 8 uses it |
| --- | --- |
| `search-pipeline.ts` | Sprint 8 search improvements can modify the pipeline without touching tool registration |
| `embedding-module.ts` | Sprint 8 embedding changes isolated from tool code |
| Extensible `ToolCategory` | Sprint 8 can add `"analytics"` category without modifying `ToolDescriptor.ts` |
| Chunker registry | Sprint 8 can add new source types by extending the registry map |
| DIP-clean core commands | Sprint 8 new tools follow the constructor injection pattern |
