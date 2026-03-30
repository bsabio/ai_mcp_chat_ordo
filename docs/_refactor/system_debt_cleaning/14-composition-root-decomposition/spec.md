# Spec 14: Composition Root Decomposition

**Priority:** Medium
**Risk if deferred:** Single 226+ line wiring file becomes a merge bottleneck and makes it impossible to test domain-specific tool sets in isolation
**Files in scope:**
- `src/lib/chat/tool-composition-root.ts` (~226 lines)

---

## Problem Statement

`tool-composition-root.ts` is a single file that wires:
- Calculator / math tools
- Theme and UI tools
- Corpus search tools (search, sections, summaries, checklists)
- Chat conversation tools (uses LocalEmbedder)
- Blog pipeline tools (journal, publish, QA)
- Profile tools
- Job status tools
- Instance filtering logic
- Repository and service construction for all of the above

This works, but:
1. **Every change to any tool's dependencies touches this file** — merge conflicts are common.
2. **Testing one domain's tools requires loading the entire wiring surface.**
3. **The file will only grow** as tools are added.
4. **It's hard to see which repositories/services belong to which domain.**

---

## Architectural Approach

### Step 1: Split into domain-specific registration modules

Create focused registration functions, one per domain bucket:

```
src/lib/chat/tool-bundles/
  calculator-tools.ts
  theme-tools.ts
  corpus-tools.ts
  conversation-tools.ts
  blog-tools.ts
  profile-tools.ts
  job-tools.ts
```

Each module exports a function that registers its tools onto a registry:

```typescript
// src/lib/chat/tool-bundles/calculator-tools.ts
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";

export function registerCalculatorTools(registry: ToolRegistry): void {
  registry.register({
    name: "calculator",
    // ... descriptor
  });
}
```

### Step 2: Each bundle owns its own dependency construction

```typescript
// src/lib/chat/tool-bundles/corpus-tools.ts
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";

export function registerCorpusTools(
  registry: ToolRegistry,
  deps: { corpusRepo: CorpusRepository },
): void {
  const { corpusRepo } = deps;
  
  registry.register({
    name: "search_corpus",
    command: new SearchCorpusCommand(corpusRepo),
    // ...
  });

  registry.register({
    name: "get_corpus_summary",
    command: new GetCorpusSummaryCommand(corpusRepo),
    // ...
  });
}
```

### Step 3: Slim down the composition root to a coordinator

```typescript
// src/lib/chat/tool-composition-root.ts (after refactor)
import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { registerCalculatorTools } from "./tool-bundles/calculator-tools";
import { registerThemeTools } from "./tool-bundles/theme-tools";
import { registerCorpusTools } from "./tool-bundles/corpus-tools";
import { registerConversationTools } from "./tool-bundles/conversation-tools";
import { registerBlogTools } from "./tool-bundles/blog-tools";
import { registerProfileTools } from "./tool-bundles/profile-tools";
import { registerJobTools } from "./tool-bundles/job-tools";

export function buildRegistry(corpusRepo: CorpusRepository): ToolRegistry {
  const registry = new ToolRegistry();

  // Domain-specific registrations
  registerCalculatorTools(registry);
  registerThemeTools(registry);
  registerCorpusTools(registry, { corpusRepo });
  registerConversationTools(registry, { /* deps */ });
  registerBlogTools(registry, { /* deps */ });
  registerProfileTools(registry, { /* deps */ });
  registerJobTools(registry, { /* deps */ });

  return registry;
}
```

The composition root goes from ~226 lines to ~30 lines.

### Step 4: Repository/service construction stays centralized but typed

If repos and services need to be constructed before passing to bundles, keep a lightweight `createDependencies()` function in the composition root or a separate `dependencies.ts`:

```typescript
function createDependencies(corpusRepo: CorpusRepository) {
  return {
    corpusRepo,
    messageRepo: getMessageRepository(),
    conversationRepo: getConversationRepository(),
    localEmbedder: localEmbedder,  // singleton from Spec 09
    blogService: new BlogService(/* ... */),
  };
}
```

---

## Constraints — Do NOT Introduce

- **Do not** create a plugin/auto-discovery system for tool bundles. Explicit imports are correct — they make the dependency graph visible and tree-shakeable.
- **Do not** change the `ToolRegistry` API. Bundles use `registry.register()` as it exists today.
- **Do not** create circular dependencies between bundles. If two bundles share a service, it must be constructed in the composition root and passed to both.
- **Do not** split to more than 10 bundle files. Over-splitting is as bad as under-splitting.
- **Do not** change tool names, descriptors, or command implementations. Only the wiring location changes.

---

## Required Tests

### Unit Tests — `tests/composition-root-decomposition.test.ts`

Each bundle is independently testable:

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `registerCalculatorTools adds expected tool names` | Create empty registry, call `registerCalculatorTools()`, confirm expected tool names exist. |
| 2 | `registerCorpusTools adds expected tool names` | Same pattern with corpus tools. |
| 3 | `registerBlogTools adds expected tool names` | Same pattern with blog tools. |
| 4 | `registerThemeTools adds expected tool names` | Same pattern with theme tools. |
| 5 | `buildRegistry produces registry with all tools` | Call full `buildRegistry()`, confirm total tool count matches expected (~50+). |
| 6 | `no duplicate tool names across bundles` | Call `buildRegistry()`, collect all tool names, confirm no duplicates. |

### Structural Tests — `tests/composition-root-structure.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `tool-composition-root.ts is under 60 lines` | Read file, count lines, assert ≤ 60. |
| 2 | `each bundle file exists under tool-bundles/` | Assert each expected bundle file exists. |
| 3 | `no bundle imports another bundle` | Read each bundle file, confirm no imports from `./tool-bundles/`. |

---

## Acceptance Criteria

- [ ] `tool-composition-root.ts` is reduced to a coordinator under 60 lines.
- [ ] Each domain has its own registration module in `src/lib/chat/tool-bundles/`.
- [ ] Each bundle can be tested independently with a mock registry.
- [ ] No circular dependencies between bundles.
- [ ] Total tool count after decomposition matches the count before decomposition.
- [ ] All existing tests pass.
- [ ] New tests above pass.
