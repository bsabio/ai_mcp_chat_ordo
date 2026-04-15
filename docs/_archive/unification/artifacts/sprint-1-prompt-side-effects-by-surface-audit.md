# Sprint 1 Prompt Side Effects By Surface Audit

Sprint 1 moved prompt side-effect ownership into `PromptControlPlaneService`.

## Side-Effect Audit

| Surface and action | Service method | Validation owner | Event owner | Revalidation owner | Notes |
| --- | --- | --- | --- | --- | --- |
| admin create version | `createVersion(...)` | shared service | none on draft creation | service computes paths, admin action executes the Next.js hook | create does not emit `prompt_version_changed` because no active slot changed |
| admin activate version | `activateVersion(...)` | shared service | shared service emits slot-version event through hook | service computes paths, admin action executes the Next.js hook | admin no longer owns separate activation rules |
| MCP `prompt_set` | `createVersion(...)` then `activateVersion(...)` | shared service | shared service emits slot-version event through hook | service still computes revalidation paths in the result, but MCP does not have a Next.js path-revalidation hook to execute | mutation rules are centralized even though hook execution depends on surface capability |
| MCP `prompt_rollback` | `rollback(...)` | shared service | shared service emits slot-version event through hook | same as `prompt_set` | rollback is not a separate event contract |
| MCP `prompt_diff` | `diffVersions(...)` | shared service | none | none | read-only diagnostic operation |

## Event Scope

Sprint 1 keeps `prompt_version_changed` narrow.

It means:

- a version change in one governed prompt slot

It does not mean:

- a fully assembled effective prompt changed
- config identity overlays changed
- request-time prompt sections changed

That scope remains intentionally narrow until Sprint 2 addresses effective-prompt
runtime and provenance explicitly.

## Operational Outcome

Admin and MCP no longer define prompt mutation semantics independently.

The remaining per-surface difference is hook execution capability, not mutation
rule ownership.