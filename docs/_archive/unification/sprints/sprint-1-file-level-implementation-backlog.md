# Sprint 1 File-Level Implementation Backlog

> **Status:** Complete
> **Source:** [sprint-1-prompt-control-plane-unification-and-role-coverage.md](sprint-1-prompt-control-plane-unification-and-role-coverage.md)
> **Goal:** Provide exact code touch points, likely new files, and test targets
> before runtime changes begin.

This backlog is intentionally concrete so Sprint 1 can begin without another
research pass.

## 1. Scope Boundary

Sprint 1 should solve prompt mutation equivalence, fallback-aware control-plane
read parity, and role coverage.

It should not yet try to solve:

- effective prompt provenance
- chat prompt runtime refactors
- provider runtime convergence
- MCP export derivation beyond the prompt surface

It should also be explicit about one boundary condition:

- `prompt_version_changed` remains a slot-version event in Sprint 1; it does
   not become full effective-prompt provenance yet
- no concrete script prompt mutator exists in the repo today, so Sprint 1
   should expose a script-safe service seam rather than invent a new script path

## 2. Proposed New Files

| File | Purpose | Why it belongs in Sprint 1 |
| --- | --- | --- |
| `src/core/use-cases/PromptControlPlaneService.ts` | define the shared interface and mutation result types for prompt control-plane behavior | turns prompt mutation into one domain seam rather than two independent surfaces |
| `src/lib/prompts/prompt-role-inventory.ts` | expose one authoritative prompt role inventory and slot iteration helpers | removes hard-coded admin and MCP role lists and closes the `APPRENTICE` blind spot |
| `src/lib/prompts/prompt-control-plane-service.ts` | implement the service using the prompt repository plus side-effect adapters | gives admin and MCP one implementation target |
| `tests/prompt-control-plane.service.test.ts` | verify create, activate, rollback, validation parity, role coverage, fallback-aware reads, and shared side effects at the service seam | creates the first real safety net for prompt control-plane equivalence |
| `tests/prompt-control-plane-equivalence.test.ts` | verify equivalent admin and MCP actions converge on the same domain behavior | proves the sprint goal directly |
| `tests/prompt-control-plane-read-parity.test.ts` | verify admin and MCP read surfaces expose the same `runtimeCoverage` truth for DB-backed, fallback-backed, and missing slots | closes the most important read-side non-equivalence from the research |

## 3. Existing Files To Change

| File | Current role | Planned Sprint 1 change | Risk note |
| --- | --- | --- | --- |
| `src/lib/db/seeds.ts` | seeds DB-backed prompt slots | add or derive missing `APPRENTICE` directive seed and align slot coverage with the shared role inventory | low risk, but seed changes must preserve existing versioning behavior |
| `src/lib/admin/prompts/admin-prompts.ts` | admin loader with local `ROLES` constant and raw mapper reads | delegate role iteration, slot loading, and detail reads to the shared inventory and service so fallback-backed runtime state is visible | medium risk because the admin view model will likely gain `runtimeCoverage` metadata |
| `src/lib/admin/prompts/admin-prompts-actions.ts` | admin server actions directly calling `SystemPromptDataMapper` | call the control-plane service instead of mutating rows directly and share version-existence validation with MCP | medium risk because revalidation behavior must stay correct |
| `src/app/admin/prompts/page.tsx` | admin list page that only understands stored-version slots | render any new coverage metadata or fallback status returned by the shared service-backed loaders | low risk |
| `src/app/admin/prompts/[role]/[promptType]/page.tsx` | admin detail page that treats empty active content as no active prompt | distinguish fallback-backed content from truly missing state and avoid implying runtime cannot build a prompt when it can | medium risk because copy and state rendering will change |
| `mcp/prompt-tool.ts` | MCP prompt mutation logic, default role enumeration, and raw-row reads | convert prompt operations into thin adapters over the shared service; remove local default role list, remove local mutation side-effect ownership, and make `prompt_list`/`prompt_get` fallback-aware | medium risk because MCP result shape must remain compatible |
| `mcp/embedding-server.ts` | transport wrapper that currently wires raw prompt deps | wire the shared prompt-control service into prompt tool handlers | low-to-medium risk |
| `src/adapters/RepositoryFactory.ts` | process-cached access to persistence adapters | optionally add a getter for the shared prompt-control service or its required side-effect collaborators, but avoid turning the service into a stateful process singleton | medium risk if ownership becomes muddy |
| `src/core/use-cases/SystemPromptRepository.ts` | repository contract for raw prompt rows | keep narrow if possible; only extend types if slot typing is impossible elsewhere | avoid overloading the persistence interface with control-plane behavior |

## 4. Exact Work Packets

### Work packet A — shared types and authoritative role inventory

1. Add a shared prompt role inventory that includes:
   - `ALL`
   - `ANONYMOUS`
   - `AUTHENTICATED`
   - `APPRENTICE`
   - `STAFF`
   - `ADMIN`
2. Add helpers for:
   - list all prompt slots
   - list role-directive slots
   - list admin-visible prompt slots
3. Replace local prompt role arrays in admin and MCP code with the shared
   inventory.

### Work packet B — control-plane service contract

1. Define the service interface around:
   - `listSlots`
   - `getSlotDetail`
   - `createVersion`
   - `activateVersion`
   - `rollback`
   - `diffVersions`
2. Make the read contract explicit about:
   - `runtimeCoverage: "db" | "fallback" | "missing"`
   - fallback-backed active content versus stored active content
   - version history remaining raw-row history even when runtime coverage is
     fallback-backed
3. Define mutation inputs so admin and MCP can share the same validation and
   actor/source metadata.
4. Define side-effect hooks for:
   - prompt-version event emission
   - admin path revalidation
   - audit entry recording if added in the same sprint
5. Keep the event contract narrow:
   - `prompt_version_changed` must stay a slot-version event
   - Sprint 1 must not relabel slot mutation as full effective-prompt
     provenance

### Work packet C — service implementation

1. Build the service around the existing prompt repository.
2. For control-plane reads, combine raw version history with runtime fallback
   sources so admin and MCP can distinguish `db`, `fallback`, and `missing`
   coverage.
3. Move mutation side-effect decisions out of `mcp/prompt-tool.ts`.
4. Keep the persistence layer narrow: `SystemPromptDataMapper` should stay the
   row store, not become the control plane.

### Work packet D — admin adapter refactor

1. Update admin prompt loaders to rely on the shared role inventory and shared
   service for list/detail reads.
2. Update admin prompt actions to call the shared control-plane service.
3. Update admin list/detail page states so fallback-backed runtime coverage is
   visible and not presented as "no active version" when runtime can still
   build the slot.
4. Preserve current page revalidation behavior, but move the decision into the
   shared side-effect path where possible.

### Work packet E — MCP adapter refactor

1. Keep `prompt_list`, `prompt_get`, `prompt_set`, `prompt_rollback`, and
   `prompt_diff` as MCP-facing API names.
2. Make those functions thin wrappers over the control-plane service.
3. Make `prompt_list` and `prompt_get` expose fallback-aware coverage in an
   additive way so existing consumers do not break.
4. Preserve current payload shapes unless a deliberate compatibility note is
   added.
5. Remove local ownership of prompt-version event emission from the MCP layer.

### Work packet F — seed and slot coverage cleanup

1. Add `APPRENTICE` prompt seed coverage for role directives.
2. Confirm whether any `ALL / role_directive` or role-specific `base` slot is
   intentionally absent rather than accidentally missing.
3. Record any intentional absence explicitly in tests.

### Work packet G — seam tests and verification

1. Add a real service-seam test for fallback-backed reads so the control plane
   no longer assumes raw-row state and runtime state are identical.
2. Add a real equivalence test proving admin and MCP share the same validation,
   activation, rollback, event, and revalidation semantics.
3. Treat `tests/admin-prompts-conversations.test.tsx` as a rendering/wiring
   suite only; do not treat its mocked coverage as the primary proof of
   control-plane equivalence.

## 5. Test Targets

### Must-update existing tests

| File | Update needed |
| --- | --- |
| `tests/system-prompt.test.ts` | expand beyond raw `promptSet` and `promptRollback` to verify service-driven behavior, validation parity, and role coverage, including `APPRENTICE` |
| `tests/admin-prompts-conversations.test.tsx` | update admin prompt expectations to reflect shared service-backed view models and any fallback-status UI, but keep this file in a mocked rendering role |

### New tests to add

| Test file | Main assertions |
| --- | --- |
| `tests/prompt-control-plane.service.test.ts` | one service call creates/activates/rolls back versions correctly, includes `APPRENTICE`, exposes `runtimeCoverage`, and emits shared side effects |
| `tests/prompt-control-plane-equivalence.test.ts` | equivalent admin and MCP mutations produce the same active version, same event payload, same validation behavior, and same revalidation side effects |
| `tests/prompt-control-plane-read-parity.test.ts` | admin loaders and MCP read adapters both report `db`, `fallback`, and `missing` slot truth consistently |

### Highest-value individual assertions

1. `prompt_list` default enumeration includes `APPRENTICE`.
2. Admin slot loaders enumerate `APPRENTICE` and any fallback-backed runtime
   slots the service exposes.
3. Admin detail and MCP `prompt_get` distinguish `db`, `fallback`, and
   `missing` instead of collapsing fallback into "no prompt found".
4. Admin create and MCP set both emit the same prompt-version change semantics.
5. Admin activate and MCP rollback both validate target version existence and
   converge through the same service logic.
6. `prompt_version_changed` assertions stay scoped to slot-version changes and
   do not claim effective-prompt provenance.
7. Seeded prompt coverage matches the shared prompt role inventory or documents
   any intentional exception.

## 6. Suggested Verification Commands

Run these at Sprint 1 closeout at minimum:

```bash
npm exec vitest run tests/system-prompt.test.ts tests/admin-prompts-conversations.test.tsx tests/prompt-control-plane.service.test.ts tests/prompt-control-plane-equivalence.test.ts tests/prompt-control-plane-read-parity.test.ts
npm run lint
```

Add `npm run build` if any server action, route wiring, or type-level changes
touch shared runtime boundaries.

## 7. Exit Criteria For Sprint 1

Sprint 1 should be considered complete when:

1. admin and MCP prompt mutation no longer define side effects independently
2. `APPRENTICE` is included in the authoritative prompt role inventory and
   prompt control plane
3. admin and MCP prompt reads expose fallback-backed runtime coverage rather
   than implying missing prompt state
4. raw repository access is no longer the primary read or mutation seam for
   admin and MCP prompt operations
5. mutation and read equivalence are proven by tests rather than by intention
