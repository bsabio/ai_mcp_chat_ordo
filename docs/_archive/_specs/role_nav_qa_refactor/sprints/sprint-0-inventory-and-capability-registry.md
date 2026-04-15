# Sprint 0 — Inventory And Capability Registry

> **Status:** Complete
> **Goal:** Create the canonical job capability registry, freeze the current handler and route authority map, and add the first drift guards before any `/jobs` or admin-navigation UI changes.
> **Spec refs:** §1.1 through §1.3, §2, §3.2 through §3.5, §4, `RNQ-001` through `RNQ-043`, `RNQ-090` through `RNQ-094`
> **Grounding docs:** [../admin-dashboard-nav-audit.md](../admin-dashboard-nav-audit.md), [../theme-mcp-contract-audit.md](../theme-mcp-contract-audit.md)
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/role_nav_qa_refactor/spec.md` | Current feature contract, sprint sequence, and requirement IDs |
| `docs/_specs/role_nav_qa_refactor/admin-dashboard-nav-audit.md` | Verified page-ownership audit for the overloaded admin dashboard and grouped admin-workspace model |
| `docs/_specs/role_nav_qa_refactor/theme-mcp-contract-audit.md` | Verified theme runtime, internal tool, and local `@mcp/*` boundary constraints that the refactor must preserve |
| `src/lib/jobs/deferred-job-handlers.ts` | Current ordered set of real deferred handler names and their current editorial/admin execution assumptions |
| `src/core/use-cases/tools/deferred-job-status.tool.ts` | Current signed-in and admin job-status tool descriptors with hard-coded role arrays |
| `src/app/api/jobs/_lib.ts` | Current authenticated-user and conversation-ownership helper seams for self-service job APIs |
| `src/app/jobs/page.tsx` | Current `/jobs` redirect behavior that Sprint 1 will replace |
| `src/app/admin/jobs/page.tsx` | Current global operator jobs surface that Sprint 2 will align to capability policy |
| `src/lib/shell/shell-navigation.ts` | Current shell route truth, including the known `APPRENTICE` visibility defect for `/jobs` |
| `tests/deferred-job-status.tool.test.ts` | Existing regression surface for self-service and admin job-status tools |
| `tests/job-status-summary-tools.test.ts` | Existing regression surface for job-status language and list behavior |
| `tests/chat-job-status-route.test.ts` | Existing route-level regression surface around job-status access paths |

---

## Cross-Layer Constraints

1. Theme authority already lives in the manifest and runtime provider chain. Sprint 0 must not introduce any parallel theme state path while touching shell or account navigation scaffolding.
2. The current analytics imports under `@mcp/*` are local TypeScript path-alias module contracts, not remote MCP RPC. This sprint must not blur that distinction in docs or implementation.
3. The `/jobs` redirect and the shell-visibility bug for `APPRENTICE` are known defects, but actual route truth changes belong to Sprint 1.
4. Admin visual-system cleanup is not part of Sprint 0. This sprint should not deepen the current reliance on `jobs-*` styling names just to move policy data around.

---

## QA Findings Before Implementation

1. Every current deferred handler in `src/lib/jobs/deferred-job-handlers.ts` is editorial or blog-oriented. Several explicitly inject `role: "ADMIN"`, and the rest still rely on editorial services that are not modeled as member-safe jobs.
2. `list_my_jobs` and `get_my_job_status` already apply to `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN`, but that truth is hard-coded directly in `src/core/use-cases/tools/deferred-job-status.tool.ts`.
3. `list_deferred_jobs` and `get_deferred_job_status` are currently admin-only and encode their own role truth separately from any future job capability registry.
4. `/jobs` still redirects to `/admin/jobs`, and shell exposure for `/jobs` currently excludes `APPRENTICE`. Sprint 0 should document and guard those facts without trying to fix them yet.
5. Current self-service job API authorization is rooted in authenticated conversation ownership. That remains necessary in Sprint 0, but the new registry must make clear that it is not the final long-term authorization model.

---

## Task 0.1 — Create the canonical job capability registry

**What:** Introduce one typed capability registry that explicitly describes every current deferred job type, its family, and who can initiate, inspect, and manage it.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/jobs/job-capability-registry.ts` |
| **Create** | `src/lib/jobs/job-capability-registry.test.ts` |
| **Modify if needed** | `src/lib/jobs/deferred-job-handlers.ts` only if a small helper export is required for parity checks |
| **Spec** | §3.2, §3.3, §3.5, `RNQ-031` through `RNQ-043`, `RNQ-060` |

### Task 0.1 outcomes

1. Define a typed `JobCapabilityDefinition` contract that includes at minimum: tool name, family, initiator roles, owner viewer roles, owner action roles, global viewer roles, global action roles, and default surface.
2. Add one registry entry for every live deferred handler currently returned by `createDeferredJobHandlers()`.
3. Encode the current handler set truthfully as privileged editorial jobs rather than generic signed-in jobs.
4. Export readonly lookup helpers so later route, page, and tool work can consume one policy source instead of repeating arrays.
5. Do not change `/jobs`, `/admin/jobs`, shell navigation, or admin UI behavior in this task.

### Task 0.1 notes

1. Keep the registry declarative and small. This sprint is about authority and drift removal, not new runtime behavior.
2. Labels and family names should be chosen so later UI can use them directly without rewriting the policy layer.
3. If the registry needs helper functions, prefer simple readonly exports over a class-heavy abstraction.

### Verify Task 0.1

```bash
npx vitest run src/lib/jobs/job-capability-registry.test.ts
```

---

## Task 0.2 — Centralize self-service and global role helpers around the registry

**What:** Replace hard-coded role arrays for current job-status tools with shared helpers or constants derived from the new capability-policy layer.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/jobs/job-capability-registry.ts` |
| **Modify** | `src/core/use-cases/tools/deferred-job-status.tool.ts` |
| **Create or modify** | focused policy tests alongside the registry test file |
| **Spec** | §1.1, §1.2, §3.4, §4, `RNQ-032` through `RNQ-034`, `RNQ-090` through `RNQ-094` |

### Task 0.2 outcomes

1. Define shared helpers or constants for the current signed-in self-service audience and the current global operator audience.
2. Make `createGetMyJobStatusTool()` and `createListMyJobsTool()` consume the shared signed-in audience, including `APPRENTICE`.
3. Make `createGetDeferredJobStatusTool()` and `createListDeferredJobsTool()` consume the shared global audience instead of maintaining independent local role arrays.
4. Keep current `/jobs` redirect behavior unchanged in Sprint 0.
5. Keep current API ownership checks in `src/app/api/jobs/_lib.ts` unchanged in Sprint 0; this task is policy extraction, not authorization replacement.

### Task 0.2 notes

1. Sprint 0 should not try to “quietly fix” shell route exposure or page gating while moving role arrays into shared helpers.
2. The output of the tool schemas should remain stable except for sourcing their role arrays more truthfully.
3. Current editorial jobs remain admin-only in this sprint even though the self-service tools exist for signed-in roles.

### Verify Task 0.2

```bash
npx vitest run tests/deferred-job-status.tool.test.ts tests/job-status-summary-tools.test.ts
```

---

## Task 0.3 — Add completeness and drift guards

**What:** Add focused tests proving the new capability registry and the live handler inventory cannot drift away from one another silently.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/jobs/job-capability-registry.test.ts` |
| **Modify as needed** | `tests/deferred-job-status.tool.test.ts` |
| **Modify as needed** | `tests/chat-job-status-route.test.ts` |
| **Spec** | §2.5, §3.7, `RNQ-025`, `RNQ-080` through `RNQ-084` |

### Task 0.3 outcomes

1. Tests fail if a deferred handler exists with no capability-registry entry.
2. Tests fail if the registry references a handler name that is not actually registered.
3. Tests prove the current editorial handlers resolve to admin-only policy.
4. Tests prove the shared self-service audience remains `AUTHENTICATED`, `APPRENTICE`, `STAFF`, `ADMIN`.
5. Tests do not prematurely assert Sprint 1 route behavior such as `/jobs` page rendering or shell visibility fixes.

### Task 0.3 notes

1. Keep these tests small and authority-focused.
2. Prefer direct parity assertions over large snapshots.
3. If route tests need clarification, assert current-state behavior explicitly so Sprint 1 can change them intentionally later.

### Verify Task 0.3

```bash
npx vitest run src/lib/jobs/job-capability-registry.test.ts tests/deferred-job-status.tool.test.ts tests/chat-job-status-route.test.ts
```

---

## Task 0.4 — Close the grounding-doc drift that affects implementation

**What:** Correct the nearest documentation surfaces so the feature work is grounded in the real internal tool and MCP boundary model while Sprint 0 is still fresh.

| Item | Detail |
| --- | --- |
| **Modify** | `README.md` |
| **Modify** | `docs/operations/user-handbook.md` |
| **Modify if needed** | `docs/_specs/role_nav_qa_refactor/spec.md` only for cross-links or clarified current-state notes |
| **Spec** | §1.1, §1.2, §2.5, §5, `RNQ-014`, `RNQ-024` |

### Task 0.4 outcomes

1. The internal theme-tool surface is documented truthfully, including `inspect_theme` alongside `set_theme` and `adjust_ui`.
2. The docs continue to distinguish internal app tools from standalone MCP servers.
3. The feature spec and sprint plan point readers at the new grounding audits instead of forcing later sprints to rediscover the same architecture.
4. No doc should imply that current admin analytics cards depend on remote MCP RPC when they actually consume local `@mcp/*` module contracts.

### Task 0.4 notes

1. Keep corrections tight and factual.
2. Do not broaden this into a large handbook rewrite.
3. Prefer aligning the nearest high-signal docs over touching every older audit artifact in the repo.

### Verify Task 0.4

1. Markdown diagnostics are clean in all touched docs.
2. The corrected docs match the live tool registration and MCP entrypoint files.

---

## Sprint 0 Verification Bundle

Run this bundle before marking Sprint 0 complete:

```bash
npm run typecheck
npx vitest run src/lib/jobs/job-capability-registry.test.ts tests/deferred-job-status.tool.test.ts tests/job-status-summary-tools.test.ts tests/chat-job-status-route.test.ts
npm run build
```

If Sprint 0 updates docs, keep markdown diagnostics clean for every touched file before exit.

---

## Completion Checklist

- [x] a canonical job capability registry exists
- [x] every live deferred handler has exactly one registry entry
- [x] the registry exports readonly lookup helpers instead of duplicating local policy arrays
- [x] signed-in and global job-status tool roles derive from shared policy helpers
- [x] current editorial handlers remain explicitly admin-only in the new policy layer
- [x] focused tests catch handler and registry drift in both directions
- [x] the nearest high-signal docs mention `inspect_theme` and preserve the internal-tool versus MCP distinction
- [x] the Sprint 0 verification bundle passes

---

## Sprint 0 Exit Criteria

Sprint 0 is complete only when the repository has one authoritative answer to all of the following:

1. which deferred job types currently exist
2. which job family each one belongs to
3. who may initiate, inspect, and manage each one
4. which current roles count as signed-in self-service job users
5. which tests fail if that truth drifts

If the codebase still answers those questions through disconnected local arrays, prose-only assumptions, or handler-by-handler guesses, Sprint 0 is not complete.
