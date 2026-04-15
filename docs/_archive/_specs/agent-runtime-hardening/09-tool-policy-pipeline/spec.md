# Tool Policy Pipeline — Layered Allowlist Architecture For Multi-Agent Readiness

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Replace OrdoSite's single RBAC gate with a multi-layer tool policy pipeline that applies tool allowlists and denylists in a documented priority cascade — global → per-provider → per-agent → per-group — so the system can serve multiple named agents with different tool sets, support per-provider tool restrictions, and extend without hardcoded conditionals in the composition root.
> **Dependencies:** [Hook Pipeline](../01-hook-pipeline/spec.md) — policy application fires a void observation hook for analytics. [Extension-Agnostic Composition Root](../10-extension-agnostic-composition/spec.md) — the pipeline is the policy enforcement point; composition root changes determine which tools feed into it.
> **Affects:** `src/core/tool-registry/ToolRegistry.ts`, `src/lib/chat/tool-composition-root.ts`, `src/lib/chat/stream-pipeline.ts`
> **Motivation:** OrdoSite today has one role check per session that gates all tools uniformly. This works for a single agent. Once there are two named agents — say, a curriculum guide and a portfolio analyzer — each needs its own tool surface. The layered policy pipeline is what makes that possible without creating a conditional explosion in the composition root. Build it before you add the second agent.
> **Source:** OpenClaw `src/agents/tool-policy-pipeline.ts` — `applyToolPolicyPipeline()`, `buildDefaultToolPolicyPipelineSteps()`, `analyzeAllowlistByToolType()`
> **Requirement IDs:** `TPP-001` through `TPP-099`

---

## 1. Problem Statement

### 1.1 Current State

`getSchemasForRole(role)` applies a single role check. Adding a second role with different tools requires editing `getSchemasForRole()`. Adding a per-agent tool restriction requires adding a conditional in the composition root. Neither is ergonomic or scalable beyond 2 agents. `[TPP-001]`

### 1.2 What The Pipeline Enables

| Scenario | Without Pipeline | With Pipeline |
|---|---|---|
| Two agents with different tools | Fork `getSchemasForRole()` | Separate agent policies, pipeline merges |
| Free tier tool restriction | Conditional in composition root | Global denylist policy |
| Provider-specific tool limit | Hard-coded special case | `byProvider` policy step |
| Group-scoped tool whitelist | Not supported | Group policy step |

`[TPP-002]`

---

## 2. Design Goals

1. **7-level priority cascade.** Global → byProvider → profile → byProvider+profile → per-agent → byProvider+agent → group. `[TPP-010]`
2. **Plugin-group expansion.** Policy entries can reference tool bundle names (e.g., `"corpus-tools"`) rather than individual tool names. The pipeline expands them to constituent tools. `[TPP-011]`
3. **Unknown allowlist warning.** If a policy references a tool name that doesn't exist in the current registry, emit a deduplicated warning. Do not silently fail. `[TPP-012]`
4. **Warning deduplication.** The same unknown allowlist warning is emitted at most once per runtime session. Use an LRU cache of 256 entries. `[TPP-013]`
5. **Observable via hook.** Pipeline application fires a void hook with the before/after tool lists and the policy step that caused each reduction. `[TPP-014]`
6. **Composable with existing RBAC.** The pipeline runs after RBAC role filtering, not instead of it. Role-based filtering is step 0; policy pipeline is steps 1-7. `[TPP-015]`

---

## 3. Architecture

### 3.1 Policy Type

```typescript
export interface ToolPolicyLike {
  allow?: string[];   // allowlist — only these tools
  deny?: string[];    // denylist — exclude these tools
}

export interface ToolPolicyPipelineStep {
  policy: ToolPolicyLike | undefined;
  label: string;                               // for logging and debug
  stripBundleOnlyAllowlist?: boolean;          // remove bundle-ref-only entries from core allow
  suppressUnavailableWarningAllowlist?: string[]; // don't warn for these missing entries
}
```

`[TPP-031]`

### 3.2 Default Pipeline Step Definitions

```typescript
export function buildDefaultToolPolicyPipelineSteps(params: {
  profilePolicy?: ToolPolicyLike;
  globalPolicy?: ToolPolicyLike;
  globalProviderPolicy?: ToolPolicyLike;
  agentPolicy?: ToolPolicyLike;
  agentProviderPolicy?: ToolPolicyLike;
  groupPolicy?: ToolPolicyLike;
  agentId?: string;
}): ToolPolicyPipelineStep[] {
  return [
    { policy: params.profilePolicy,         label: "tools.profile",              stripBundleOnlyAllowlist: true },
    { policy: params.globalPolicy,          label: "tools.allow",                stripBundleOnlyAllowlist: true },
    { policy: params.globalProviderPolicy,  label: "tools.byProvider.allow",     stripBundleOnlyAllowlist: true },
    { policy: params.agentPolicy,           label: `agents.${agentId}.tools`,    stripBundleOnlyAllowlist: true },
    { policy: params.agentProviderPolicy,   label: `agents.${agentId}.byProvider`, stripBundleOnlyAllowlist: true },
    { policy: params.groupPolicy,           label: "group.tools.allow",          stripBundleOnlyAllowlist: true },
  ];
}
```

`[TPP-032]`

### 3.3 Pipeline Execution

```typescript
export function applyToolPolicyPipeline(params: {
  tools: ToolDescriptor[];
  toolMeta: (tool: ToolDescriptor) => { bundleId: string } | undefined;
  warn: (message: string) => void;
  steps: ToolPolicyPipelineStep[];
}): ToolDescriptor[] {
  let filtered = params.tools;
  for (const step of params.steps) {
    if (!step.policy) continue;
    const expanded = expandBundleGroupsInPolicy(step.policy, params.toolMeta);
    filtered = applyAllowDeny(filtered, expanded, step, params.warn);
  }
  return filtered;
}
```

`[TPP-033]`

### 3.4 Warning Deduplication Cache

```typescript
const MAX_POLICY_WARNING_CACHE = 256;
const seenWarnings = new Set<string>();
const warningOrder: string[] = [];

function emitDedupedWarning(message: string, warn: (m: string) => void): void {
  if (seenWarnings.has(message)) return;
  if (seenWarnings.size >= MAX_POLICY_WARNING_CACHE) {
    const oldest = warningOrder.shift();
    if (oldest) seenWarnings.delete(oldest);
  }
  seenWarnings.add(message);
  warningOrder.push(message);
  warn(message);
}
```

`[TPP-034]`

---

## 4. Testing Strategy

### 4.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `buildDefaultToolPolicyPipelineSteps()` | 6 | Step ordering, label format, undefined policy steps skipped |
| `applyToolPolicyPipeline()` | 12 | Allow/deny at each tier, cascade priority, bundle expansion |
| Warning deduplication | 6 | Same warning not emitted twice, cache eviction at 256 |
| Unknown allowlist warning | 6 | Missing tool name warns, known tool name does not |
| Pipeline + RBAC composition | 6 | RBAC runs first, pipeline runs on RBAC output |
| Hook observation event | 4 | Void hook fires with before/after tool lists |

---

## 5. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Policy Primitives** | `ToolPolicyLike`, `ToolPolicyPipelineStep`, `applyAllowDeny()`, bundle expansion, warning cache | +18 |
| **1** | **Pipeline Execution** | `applyToolPolicyPipeline()`, default step builder, RBAC composition | +14 |
| **2** | **Hooks And Integration** | Void observation hook, wire into composition root | +8 |

---

## 6. Future Considerations

1. Dynamic policy loading — allow admin to update per-agent policy without restart via config store.
2. Per-tier policy analytics — track which policy step caused the most tool reductions across sessions to identify misconfigured allowlists.
3. Temporal policies — allow tool availability to change based on session phase (e.g., disable certain tools during assessment phase).
