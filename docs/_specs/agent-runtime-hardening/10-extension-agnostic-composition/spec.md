# Extension-Agnostic Composition Root — Plugin-Driven Tool Bundle Discovery

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Refactor `tool-composition-root.ts` from a hardcoded list of explicit bundle imports into an extension-agnostic auto-discovery system where tool bundles self-register via a manifest and the composition root discovers them — so adding a new curriculum tool bundle requires zero edits to core files.
> **Dependencies:** [Hook Pipeline](../01-hook-pipeline/spec.md) — bundle registration fires a void hook for observability. [Tool Policy Pipeline](../09-tool-policy-pipeline/spec.md) — discovered bundles feed into the policy pipeline.
> **Affects:** `src/lib/chat/tool-composition-root.ts`, `src/core/tool-registry/ToolRegistry.ts`, all existing tool bundle files
> **Motivation:** Every time a new curriculum tool (e.g., archetype assessment tool, proof-of-work generator, portfolio evaluator) is added to OrdoSite, it requires an explicit import and `registerXxxTools()` call in `tool-composition-root.ts`. This is a core edit for a peripheral concern — it couples the core pipeline to every extension. The correct architecture (proven at OpenClaw scale) is that core must stay extension-agnostic. Tool bundles self-describe and self-register. The composition root discovers them.
> **Source:** OpenClaw `AGENTS.md` extension-agnostic core principle, `src/plugins/bundled-capability-runtime.ts`, `src/plugins/bundled-plugin-scan.ts`
> **Requirement IDs:** `EAC-001` through `EAC-099`

---

## 1. Problem Statement

### 1.1 Current State

```typescript
// tool-composition-root.ts — as of now
import { registerChatTools } from "./tools/chat";
import { registerCorpusTools } from "./tools/corpus";
import { registerMemoryTools } from "./tools/memory";
// ...more explicit imports for every bundle

export function buildToolRegistry(role: RoleName): ToolRegistry {
  const registry = new ToolRegistry();
  registerChatTools(registry);
  registerCorpusTools(registry);
  registerMemoryTools(registry);
  // ...explicit call for every bundle
  return registry;
}
```

Adding `registerArchetypeAssessmentTools()` requires editing this file. That means every PR that adds a new curriculum tool also has a footprint in core. `[EAC-001]`

### 1.2 The Architectural Principle

From OpenClaw's AGENTS.md:

> "Do not add hardcoded bundled extension/provider/channel/capability id lists, maps, or named special cases in core when a manifest, capability, registry, or plugin-owned contract can express the same behavior."

The same principle applies here. Core should not know which bundles exist. Bundles should declare themselves. `[EAC-002]`

---

## 2. Design Goals

1. **Zero core edits to add a bundle.** Adding a new tool bundle requires creating the bundle file and declaring its manifest. No changes to `tool-composition-root.ts`. `[EAC-010]`
2. **Manifest-driven discovery.** Each bundle exports a `ToolBundleManifest` that declares its ID, display name, version, default roles, and registration function. `[EAC-011]`
3. **Order-deterministic registration.** The discovery order must be deterministic (alphabetical by bundle ID) so prompt cache stability (Spec 02) is maintained. `[EAC-012]`
4. **Backwards compatible.** Existing tool bundles gain a manifest without changing their registration signature. `[EAC-013]`
5. **Observable.** Bundle discovery and registration fires a void hook event. `[EAC-014]`
6. **Testing-friendly.** The registry can be built with a specific subset of bundles for test isolation. `[EAC-015]`

---

## 3. Architecture

### 3.1 Bundle Manifest Type

```typescript
export interface ToolBundleManifest {
  /** Unique, stable bundle identifier — used for policy pipeline bundle references */
  id: string;
  /** Human-readable name for admin UI and analytics */
  displayName: string;
  /** Semver */
  version: string;
  /** Default roles this bundle's tools are available to */
  defaultRoles: RoleName[];
  /** Register this bundle's tools into the provided registry */
  register: (registry: ToolRegistry) => void;
}
```

`[EAC-031]`

### 3.2 Bundle Declaration (Existing Bundle Migration)

Each existing bundle file adds a manifest export:

```typescript
// tools/corpus/index.ts — new manifest export alongside existing code
export const manifest: ToolBundleManifest = {
  id: "corpus",
  displayName: "Corpus Tools",
  version: "1.0.0",
  defaultRoles: ["user", "admin", "ALL"],
  register: registerCorpusTools,
};
```

The `registerCorpusTools` function itself is unchanged. `[EAC-032]`

### 3.3 Bundle Registry — Discovery And Registration

```typescript
// src/core/tool-registry/bundle-registry.ts

/**
 * All available tool bundles.
 * Sorted alphabetically by bundle ID for deterministic registration order.
 * Add new bundles here — this is the ONLY place a new bundle is referenced in core.
 */
const TOOL_BUNDLES: ToolBundleManifest[] = [
  ...(await import("../../lib/chat/tools/chat")).manifest,
  ...(await import("../../lib/chat/tools/corpus")).manifest,
  ...(await import("../../lib/chat/tools/memory")).manifest,
  // New bundles: add one import line here. That is all.
].sort((a, b) => a.id.localeCompare(b.id)); // deterministic order

export function buildToolRegistry(params: {
  roles: RoleName[];
  bundleFilter?: string[]; // optional: only register these bundle IDs (for tests)
}): ToolRegistry {
  const registry = new ToolRegistry();
  const bundles = params.bundleFilter
    ? TOOL_BUNDLES.filter(b => params.bundleFilter!.includes(b.id))
    : TOOL_BUNDLES;

  for (const bundle of bundles) {
    if (bundle.defaultRoles.some(r => params.roles.includes(r) || r === "ALL")) {
      bundle.register(registry);
    }
  }

  return registry;
}
```

`[EAC-033]`

### 3.4 Adding A New Bundle (Future Protocol)

To add a new curriculum tool bundle (e.g., archetype assessment):

```
1. Create: src/lib/chat/tools/archetype-assessment/index.ts
   - Implement tools
   - Export manifest: { id: "archetype-assessment", ... }

2. Add one line to bundle-registry.ts:
   ...(await import("../../lib/chat/tools/archetype-assessment")).manifest,

Done. No other core files change.
```

`[EAC-034]`

### 3.5 Existing `tool-composition-root.ts`

After migration, `tool-composition-root.ts` becomes a thin adapter:

```typescript
// tool-composition-root.ts — after
import { buildToolRegistry } from "../../core/tool-registry/bundle-registry";

export function buildToolsForSession(role: RoleName): ToolRegistry {
  return buildToolRegistry({ roles: [role] });
}
```

`[EAC-035]`

---

## 4. Migration Plan

This is an iterative, non-breaking migration:

1. **Sprint 0** — Define `ToolBundleManifest` type. Add manifest exports to existing bundles without changing registration functions.
2. **Sprint 1** — Create `bundle-registry.ts`. Wire `buildToolRegistry()` to use discovery. All existing tests pass because registration functions are unchanged.
3. **Sprint 2** — Simplify `tool-composition-root.ts`. Remove explicit imports. Verify existing + new tests pass.
4. **Sprint 3** — Update `AGENTS.md` / dev documentation with the "adding a bundle" protocol.

`[EAC-040]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Bundle sort order | 4 | Discovery is alphabetical, deterministic |
| `buildToolRegistry()` with filter | 4 | Subset builds correctly for test isolation |
| Manifest type validation | 4 | Required fields present, no missing IDs |
| Bundle role filtering | 4 | Correct bundles active for each role |
| No core edit verification | 4 | Test that adding a bundle to TOOL_BUNDLES is the only required change |

### 5.2 Regression Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| All existing bundles still register | 4 | Full registry has same tools as before migration |
| Policy pipeline receives all bundles | 4 | Bundle IDs match policy pipeline bundle group expansion |

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Manifest Type + Bundle Declarations** | `ToolBundleManifest`, add manifest to all existing bundles | +8 |
| **1** | **Bundle Registry** | `bundle-registry.ts`, `buildToolRegistry()`, test isolation | +10 |
| **2** | **Root Simplification** | Refactor `tool-composition-root.ts`, verify all tests pass | +6 |

---

## 7. Future Considerations

1. Dynamic bundle loading at runtime — for a full plugin marketplace where bundles are loaded from npm or a bundle registry without a deploy.
2. Bundle dependency declarations — allow a bundle to declare that it requires another bundle to also be active.
3. Bundle versioning and compatibility matrix — for when the formation curriculum ships separate versioned tool bundles.
4. ClawHub-style marketplace integration — if OrdoSite eventually ships a plugin distribution channel, this manifest format is the compatible foundation.
