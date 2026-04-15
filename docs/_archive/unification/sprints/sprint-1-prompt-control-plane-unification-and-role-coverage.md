# Sprint 1 — Prompt Control-Plane Unification And Role Coverage

> **Status:** Complete
> **Goal:** Route admin and MCP prompt control-plane behavior through one domain
> service, fix prompt slot coverage drift for all real runtime roles, and leave
> one script-safe entry seam instead of adding another surface-local control
> path.
> **Spec ref:** `UNI-040` through `UNI-079`
> **Prerequisite:** Sprint 0 complete

## QA Closeout

Sprint 1 was already substantially landed in code before this closeout pass.

QA confirmed that the repo already had:

- a shared `PromptControlPlaneService` contract and implementation
- a shared prompt role inventory
- admin loaders and actions delegated through the shared service
- MCP prompt tools delegated through the same shared service seam
- dedicated service, equivalence, and read-parity tests

The closeout work completed in this pass was:

- tighten governed slot enforcement so unsupported combinations like
   `ALL / role_directive` and role-specific `base` slots cannot be mutated
- add direct admin-loader parity coverage alongside the MCP parity tests
- publish the required Sprint 1 artifact set under `../artifacts/`

## Why This Sprint Exists

Prompt mutation is the cleanest high-gain, low-risk starting point.

Today the repo has different prompt side effects depending on whether the change
 came from admin UI or MCP. It also has a real role-coverage blind spot because
 `APPRENTICE` exists at runtime but is incomplete in the control plane.

It also has a read-parity gap: admin and MCP reads operate on raw stored rows,
while runtime prompt assembly can still succeed through fallback behavior. That
means Sprint 1 must unify read semantics enough that the control plane can show
when a slot is backed by DB state, fallback state, or truly missing state.

## Primary Areas

- `src/lib/admin/prompts/*`
- `src/app/admin/prompts/*`
- `mcp/prompt-tool.ts`
- `mcp/embedding-server.ts`
- prompt repository and seed files
- role inventory and prompt-slot helpers

## Tasks

1. **Create `PromptControlPlaneService`**
   - Define one service for list, get, create, activate, rollback, diff, audit,
   revalidation, validation, prompt-version side effects, and fallback-aware
   slot visibility.

2. **Create one authoritative prompt role inventory**
   - Remove hard-coded surface-local role lists.
   - Ensure runtime roles and control-plane roles are derived from one source.

3. **Fix prompt slot coverage**
   - Add missing `APPRENTICE` slot support in seeds, admin surfaces, MCP
     defaults, and any prompt-slot iteration logic.

4. **Unify side effects**
    - Ensure admin and MCP mutations go through the same validation, activation,
       rollback, event, audit, and revalidation behavior.
    - Do not invent a new script mutator in this sprint; instead leave one
       service seam that a future script surface can call without creating a
       third control plane.

5. **Add read-surface parity**
    - Ensure admin detail and MCP `prompt_get` can distinguish between DB-backed,
       fallback-backed, and truly missing slot state.
    - Ensure list surfaces can expose fallback-only coverage where runtime can
       operate even when no DB row exists.

6. **Add mutation- and read-equivalence tests**
    - Verify that equivalent changes through admin and MCP produce the same slot
       state and the same side effects.
    - Verify that fallback-backed slots are not misreported as missing prompts.
    - Verify that `prompt_version_changed` remains a slot-version event rather
       than being treated as full effective-prompt provenance.

## Required Artifacts

- [../artifacts/sprint-1-prompt-role-inventory-note.md](../artifacts/sprint-1-prompt-role-inventory-note.md)
- [../artifacts/sprint-1-prompt-mutation-equivalence-matrix.md](../artifacts/sprint-1-prompt-mutation-equivalence-matrix.md)
- [../artifacts/sprint-1-prompt-side-effects-by-surface-audit.md](../artifacts/sprint-1-prompt-side-effects-by-surface-audit.md)
- [../artifacts/sprint-1-fallback-coverage-and-read-parity-note.md](../artifacts/sprint-1-fallback-coverage-and-read-parity-note.md)
- [sprint-1-file-level-implementation-backlog.md](sprint-1-file-level-implementation-backlog.md)

## Implementation Outputs

- shared prompt control-plane service and adapters
- updated seeds or slot coverage logic for all runtime roles
- admin and MCP prompt surfaces delegating reads and mutations to the same
   service
- read models that can distinguish `db`, `fallback`, and `missing` coverage
- equivalence tests for create, activate, rollback, read parity, and
   prompt-version event behavior

## Acceptance Criteria

1. Admin and MCP prompt mutation no longer diverge by construction.
2. `APPRENTICE` is visible and governable in the prompt control plane.
3. Admin and MCP prompt reads no longer collapse fallback-backed runtime state
   into a false "missing prompt" result.
4. Prompt side effects and validation rules are defined once and tested at the
   service seam.
5. Sprint 1 does not claim effective-prompt provenance; any prompt-version
   event semantics remain explicitly scoped to slot-version changes.

## Verification

- targeted prompt-control tests
- admin and MCP prompt equivalence tests
- fallback-coverage and read-parity tests
- diagnostics-clean changed files

## Verification Result

- `npm exec vitest run tests/system-prompt.test.ts tests/prompt-control-plane.service.test.ts tests/prompt-control-plane-equivalence.test.ts tests/prompt-control-plane-read-parity.test.ts tests/admin-prompts-conversations.test.tsx`
   passed (`5` files, `70` tests)
- diagnostics for changed Sprint 1 files were clean
- `npm run lint` still reports unrelated pre-existing repository failures outside
   the Sprint 1 files
