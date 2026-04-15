# 10 Current Works Vs Doesnt Work
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document is a concise reliability map of the system as researched so far.

The goal is not to say the architecture fails everywhere. It does not. The goal is to separate the parts that are already strong from the parts that currently depend on drift-prone seams.

## 1. Main Chat Turn

### What works

- The main chat route has a coherent end-to-end flow from prompt assembly to tool execution to assistant persistence.
- The streaming loop exposes more than plain text and already models tool and generation lifecycle events.
- The chat reducer and presenter can both understand structured message parts instead of only raw text.

### What does not fully work

- The main stream is not the only source of truth for assistant-adjacent state.
- Deferred-job state can arrive later through separate job streams and snapshot repair.
- Stream identity and terminal lifecycle state are partially tracked outside reducer state.

### Why it matters

The runtime works in the happy path, but it is difficult to describe one authoritative event sequence for a conversation turn.

## 2. Deferred Jobs

### What works

- Deferred tools have a real queue-backed execution model.
- Job state is normalized into `job_status` parts that the UI can render.
- The presenter can recover job rendering from both direct parts and payload snapshots.

### What does not fully work

- The same job state can be surfaced through multiple transports and projections.
- Ordering across main-stream promotions, job-event streams, and snapshot reconciliation is only partially coordinated.
- Browser-side capability rewrites can create additional job-shaped state outside the server event sequence.

### Why it matters

The system has a useful shared job shape, but it does not yet have one authoritative job-state publication path.

## 3. Stop, Retry, And Recovery

### What works

- The client can explicitly stop an active stream through a dedicated route.
- Generation interruption and stop states are recorded as structured lifecycle events.
- Best-effort reconciliation helps repair state after SSE errors or backgrounding.

### What does not fully work

- Active-stream ownership is stored only in process memory.
- Stop semantics apply to the live stream, not to already queued deferred jobs.
- Recovery behavior depends on a combination of SSE reconnect, job snapshot repair, and optimistic client state.

### Why it matters

User-visible interruption behavior is more complex than a single stop button suggests.

## 4. Capability And UI Rendering

### What works

- The repo clearly distinguishes execution payloads from presentation descriptors.
- Rich UI cards can render from result envelopes and job-status parts.
- Historical compatibility logic exists so older payloads remain visible.

### What does not fully work

- Capability metadata is still split across the tool registry, job capability registry, and presentation registry.
- Some presentation recovery depends on re-projecting or synthesizing envelopes from historical payloads.
- Payload interpretation is still happening in several layers rather than once.

### Why it matters

The UI layer is stronger than the raw execution layer, but it is not yet derived from one capability catalog.

## 5. Prompt Runtime

### What works

- Prompt versions are durable and scoped by role and prompt type.
- Runtime prompt assembly is structured and section-based.
- Fallback logic prevents empty DB state from breaking the chat route.

### What does not fully work

- The effective runtime prompt is split between config-owned identity and DB-owned versions.
- Config identity is cached separately from the prompt-version system.
- The admin prompt surface does not represent the full runtime prompt contract.

### Why it matters

Prompt provenance is not yet visible from one operational surface.

## 6. Prompt Control Plane

### What works

- The MCP prompt tool already supports list, get, set, rollback, diff, and prompt-change event emission.
- The admin prompt surface provides a straightforward human workflow for version creation and activation.

### What does not fully work

- Admin and MCP prompt mutations do not have the same side effects.
- Prompt-version change events are emitted on the MCP path but not on the admin path.
- Validation behavior differs across mutation surfaces.

### Why it matters

Operational behavior depends on which control plane was used, not only on the resulting prompt record.

## 7. Service Composition

### What works

- `conversation-root.ts` gives the repo a real place to assemble request-scoped use cases.
- The service locator reduces boilerplate for some server-component and route access patterns.
- Most repository construction still ultimately shares the same DB layer.

### What does not fully work

- The repo mixes request-scoped composition, process-cached repositories, and process-memory coordination state.
- The dependency graph is only partially visible from composition roots.
- Lifetime policy is inferred from usage patterns rather than declared explicitly.

### Why it matters

The system can be operated, but architectural reasoning depends too much on code archaeology.

## 8. MCP Boundary

### What works

- MCP servers exist and expose useful operational tools.
- MCP-shaped modules are reused directly in the application, which avoids some duplication.

### What does not fully work

- The main chat runtime is not MCP-first.
- `mcp/embedding-server.ts` currently acts as a broad mixed-purpose server rather than a narrow boundary.
- The repo uses `mcp/` both as a protocol surface and as a shared internal module namespace.

### Why it matters

The MCP layer is useful, but it is not yet the primary architectural boundary for in-app capability execution.

## 9. Testing Reality

### What works

- The repo has meaningful unit and route coverage in many areas.
- Prompt builder, tool modules, job payloads, and presenter behavior all have focused tests.

### What does not fully work

- High-value seams are still often tested through heavy mocks.
- Some tests have already drifted from current runtime payloads, especially around deferred-job stream envelopes.
- The app runtime, MCP runtime, and prompt control plane are not yet verified as one behaviorally unified system.

### Why it matters

The current suite can confirm many local contracts while still missing cross-system drift.

## 10. Overall Reading

The current architecture is best described this way:

- locally thoughtful
- globally split

The system already contains strong typed contracts in several places:

- stream events
- job-status parts
- result envelopes
- prompt versions

What does not yet work is derivation.

Those contracts are still produced by parallel subsystems instead of one unified runtime and one unified control plane. That is the core reason the system can feel reliable in isolated areas while still drifting at the seams.