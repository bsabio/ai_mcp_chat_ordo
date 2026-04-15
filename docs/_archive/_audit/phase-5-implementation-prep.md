# Phase 5 Implementation Prep — Composition Root & Policy Pipeline

Status: Ready for implementation
Date: 2026-04-09
Prereqs: Phases 0–4 complete and green (2966 tests, lint, build all pass)

---

## 1. Objective

Make tool composition explicit, stable, and ready for multi-agent growth by:

- Replacing hardcoded bundle registration with explicit bundle descriptors and stable IDs
- Building a layered policy cascade over those bundle IDs
- Keeping the first version explicit and static (no auto-discovery yet)

---

## 2. Current State

### Composition Root (`src/lib/chat/tool-composition-root.ts`)

- 10 explicit `registerXxxTools(reg)` calls, one per bundle
- Instance config filtering via `getInstanceTools()` (enabled/disabled lists)
- Caches `{ registry, executor }` in module scope
- Hook runner chains: LoggingMiddleware → ToolCapabilityMiddleware → RbacGuardMiddleware

### ToolRegistry (`src/core/tool-registry/ToolRegistry.ts`)

- Flat `Map<string, ToolDescriptor>` — no bundle awareness
- `getSchemasForRole()` returns alphabetically sorted tools filtered by role
- `canExecute()` checks `descriptor.roles` against caller role
- No concept of bundle identity, policy layers, or cascade

### Bundles (10 files in `src/lib/chat/tool-bundles/`)

| Bundle | File | Tools | Pattern |
|---|---|---|---|
| calculator | calculator-tools.ts | 4 | Static imports, no deps |
| theme | theme-tools.ts | 4 | UserPreferencesDataMapper |
| corpus | corpus-tools.ts | 5 | CorpusRepository + SearchHandler |
| conversation | conversation-tools.ts | 1 | SQLiteVectorStore |
| admin | admin-tools.ts | 4 | Operator signal loaders |
| blog | blog-tools.ts | 17 | Editorial pipeline (largest) |
| profile | profile-tools.ts | 5 | ProfileService + JobStatusQuery |
| job | job-tools.ts | 2 | JobStatusQuery |
| navigation | navigation-tools.ts | 5 | Takes registry ref |
| affiliate | affiliate-tools.ts | 4 | ReferralAnalyticsService |

**Total: 51 unique tools (54 ADMIN-visible due to role overlap)**

### What Already Works

- ToolDescriptor has stable `name`, `roles`, `category` fields
- ToolCapabilityMiddleware enforces request-scoped `allowedToolNames`
- `tool-capability-routing.ts` has lane-based allowlists (proven pattern)
- Instance config supports enabled/disabled tool lists
- Role tool counts are locked in tests (ANONYMOUS:10, AUTHENTICATED:25, ADMIN:54)
- Alphabetical manifest ordering verified across all roles

---

## 3. Sprint 5.1 — Bundle Descriptors and Stable Bundle Identity

### New Type: `ToolBundleDescriptor`

Location: `src/core/tool-registry/ToolBundleDescriptor.ts`

```typescript
export interface ToolBundleDescriptor {
  /** Stable bundle ID — used for policy references and analytics */
  readonly id: string;
  /** Human-readable name */
  readonly displayName: string;
  /** Tool names this bundle registers */
  readonly toolNames: readonly string[];
}
```

Design decisions:
- No `version` field yet — defer until needed
- No `defaultRoles` on bundle — roles stay on individual ToolDescriptors where they already are
- No auto-discovery — bundles export a descriptor alongside their register function
- `toolNames` is declared statically so the policy pipeline can reference bundles without instantiating tools

### Bundle Migration Pattern

Each bundle file adds a descriptor export:

```typescript
// calculator-tools.ts
export const CALCULATOR_BUNDLE: ToolBundleDescriptor = {
  id: "calculator",
  displayName: "Calculator Tools",
  toolNames: ["calculator", "generate_chart", "generate_graph", "generate_audio"],
};

export function registerCalculatorTools(registry: ToolRegistry): void {
  // existing code unchanged
}
```

### Composition Root Changes

Replace hardcoded import+call with descriptor-driven iteration:

```typescript
import { CALCULATOR_BUNDLE, registerCalculatorTools } from "./tool-bundles/calculator-tools";
// ...etc

export const TOOL_BUNDLE_REGISTRY: readonly ToolBundleRegistration[] = [
  { descriptor: CALCULATOR_BUNDLE, register: registerCalculatorTools },
  { descriptor: THEME_BUNDLE, register: registerThemeTools },
  // ...all 10 sorted by descriptor.id
];
```

### Files to Change

- `src/core/tool-registry/ToolBundleDescriptor.ts` — **new** (type definition)
- `src/lib/chat/tool-bundles/calculator-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/theme-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/corpus-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/conversation-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/admin-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/blog-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/profile-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/job-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/navigation-tools.ts` — add descriptor export
- `src/lib/chat/tool-bundles/affiliate-tools.ts` — add descriptor export
- `src/lib/chat/tool-composition-root.ts` — refactor to use descriptor registry
- `src/core/tool-registry/ToolRegistry.ts` — add `getBundleForTool()` lookup

### Tests to Extend

- `src/lib/chat/tool-composition-root.test.ts` — verify descriptor-driven registration produces identical manifests
- `tests/system-prompt-assembly.test.ts` — verify prompt stability after refactor

### Tests to Add

- `src/lib/chat/tool-bundle-descriptor.test.ts` — **new**:
  - Every bundle descriptor has a unique ID
  - Bundle IDs are sorted alphabetically in the registry
  - `toolNames` in each descriptor match the actual tools registered
  - Adding a bundle only requires adding to `TOOL_BUNDLE_REGISTRY`
  - Descriptor `toolNames` are not empty
  - No duplicate tool names across bundles

### Acceptance Criteria

- [x→] Each bundle exposes a stable identity that can be referenced by policy
- [x→] Tool composition no longer depends on an opaque hardcoded registration sequence
- [x→] Manifest and role tests still pass after bundle identity is introduced
- [x→] Adding a new bundle requires descriptor registration rather than ad hoc core surgery

---

## 4. Sprint 5.2 — Policy Cascade

### New Types

Location: `src/core/tool-registry/ToolPolicyPipeline.ts`

```typescript
export interface ToolPolicy {
  allow?: readonly string[];  // tool names or bundle IDs prefixed with "bundle:"
  deny?: readonly string[];   // tool names or bundle IDs prefixed with "bundle:"
}

export interface ToolPolicyLayer {
  readonly label: string;
  readonly policy: ToolPolicy | undefined;
}

export type ToolPolicyPrecedence = "global" | "role" | "agent" | "provider" | "request";
```

### Policy Resolution Rules

1. Layers are applied in declared order: global → role → agent → provider → request
2. **Deny overrides allow** within the same layer
3. Each layer narrows the tool set — a later layer cannot re-add a tool denied earlier
4. Bundle references (`"bundle:calculator"`) expand to constituent tool names using bundle descriptors
5. Unknown tool or bundle names emit a warning but do not throw
6. If all tools would be filtered out, fall back to the pre-policy set (same safety as `getRequestScopedToolSelection`)

### Recommended Policy Order (from strategic plan)

```
global    → instance-wide allow/deny (from tools.json config)
role      → role-based restrictions (from ToolDescriptor.roles — already exists)
agent     → per-agent profile tool sets (future, initially empty)
provider  → provider-specific limits (future, initially empty)
request   → request-scoped narrowing (existing allowedToolNames from lane routing)
```

### Integration Points

The policy pipeline slots between registry construction and manifest delivery:

```
createToolRegistry()              ← bundles register tools
  → instance config filtering     ← existing enabled/disabled logic (becomes "global" policy)
  → getSchemasForRole()           ← role-based RBAC (becomes "role" policy)
  → getRequestScopedToolSelection ← lane-based narrowing (becomes "request" policy)
```

Phase 5 makes this explicit. Agent and provider layers start empty but the infrastructure supports them.

### Files to Change

- `src/core/tool-registry/ToolPolicyPipeline.ts` — **new** (types + pipeline logic)
- `src/lib/chat/tool-composition-root.ts` — wire policy pipeline into composition
- `src/core/tool-registry/ToolRegistry.ts` — add bundle-aware query support

### Tests to Extend

- `src/lib/chat/tool-composition-root.test.ts` — verify policy cascade produces correct manifests
- `tests/chat/chat-stream-route.test.ts` — verify route still works with policy pipeline

### Tests to Add

- `src/core/tool-registry/tool-policy-pipeline.test.ts` — **new**:
  - Policy precedence is deterministic
  - Deny overrides allow within same layer
  - Bundle references expand correctly to tool names
  - Unknown bundle/tool targets emit warning, do not throw
  - Unknown targets do not silently remove valid tools
  - Empty policy layers are no-ops
  - Multi-layer cascading narrows correctly
  - Complete denial falls back to pre-policy set
  - Multi-agent subset composition works (two different agent policies produce different tool sets)

### Acceptance Criteria

- [x→] Policy precedence is deterministic and documented
- [x→] Deny rules override allow rules in covered cases
- [x→] Unknown or invalid bundle targets fail safely
- [x→] Multi-agent or multi-profile composition can be expressed without branching inside the stream route

---

## 5. Hard Test Requirements (from Strategic Plan)

### Positive Tests

- Bundle descriptors register stable bundle IDs
- Policy precedence resolves correctly
- Existing manifest counts remain unchanged through the refactor

### Negative Tests

- Unknown bundle targets fail safely (warning, not crash)
- Invalid policy targets do not corrupt the tool set
- Forbidden bundle access denied predictably

### Edge Tests

- Overlapping policy layers (same tool in allow on one layer, deny on another)
- Deny-overrides-allow behavior within a single layer
- Multi-agent subset composition (two agent profiles, different tool surfaces)
- All-tools-denied fallback behavior

---

## 6. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Breaking manifest determinism | Composition root test already locks byte-stable ordering. Run before/after comparison. |
| Breaking role tool counts | `getRuntimeToolCountsByRole` test locks ANONYMOUS:10, ADMIN:54 etc. |
| Bundle ID collisions | Test validates unique IDs across all descriptors. |
| Policy over-filtering removes critical tools | Fallback-to-full behavior when filtering empties set (proven in `getRequestScopedToolSelection`). |
| Spec 10 auto-discovery scope creep | Strategic plan says "keep first version explicit and static." No dynamic import scanning. |

---

## 7. Implementation Order

1. Define `ToolBundleDescriptor` type
2. Add descriptor exports to all 10 bundle files
3. Create `TOOL_BUNDLE_REGISTRY` in composition root
4. Add `tool-bundle-descriptor.test.ts` with descriptor validation tests
5. Refactor `createToolRegistry()` to iterate descriptors
6. Verify all existing manifests, role counts, and ordering tests still pass
7. Define `ToolPolicy`, `ToolPolicyLayer`, `ToolPolicyPipeline` types
8. Implement `applyToolPolicyPipeline()` with deny-overrides-allow
9. Add `tool-policy-pipeline.test.ts`
10. Wire pipeline into composition root (global layer wraps instance config)
11. Verify route tests, prompt assembly tests, and architecture tests pass
12. Full suite: `npm run test && npm run lint && npm run build`

---

## 8. Files Inventory

### New Files

| File | Purpose |
|---|---|
| `src/core/tool-registry/ToolBundleDescriptor.ts` | Bundle descriptor type |
| `src/lib/chat/tool-bundle-descriptor.test.ts` | Bundle descriptor validation tests |
| `src/core/tool-registry/ToolPolicyPipeline.ts` | Policy types + pipeline logic |
| `src/core/tool-registry/tool-policy-pipeline.test.ts` | Policy pipeline tests |

### Modified Files

| File | Changes |
|---|---|
| `src/lib/chat/tool-bundles/*.ts` (10 files) | Add descriptor export |
| `src/lib/chat/tool-composition-root.ts` | Descriptor-driven registration + policy wiring |
| `src/core/tool-registry/ToolRegistry.ts` | Bundle-aware lookup |
| `src/lib/chat/tool-composition-root.test.ts` | Extended with descriptor + policy assertions |
| `tests/system-prompt-assembly.test.ts` | Verify continued stability |
| `tests/chat/chat-stream-route.test.ts` | Verify route integration |
