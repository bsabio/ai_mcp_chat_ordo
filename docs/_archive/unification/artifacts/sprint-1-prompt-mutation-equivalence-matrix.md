# Sprint 1 Prompt Mutation Equivalence Matrix

Sprint 1 routes admin and MCP prompt mutation through the same
`PromptControlPlaneService` seam.

## Mutation Matrix

| Concern | Admin surface | MCP surface | Shared seam | Verification |
| --- | --- | --- | --- | --- |
| create new version | `createPromptVersionAction` calls `service.createVersion(...)` | `promptSet(...)` calls `service.createVersion(...)` before activation | shared content trimming, empty-content validation, version allocation | `tests/prompt-control-plane.service.test.ts` |
| activate version | `activatePromptVersionAction` calls `service.activateVersion(...)` | `promptSet(...)` activates the newly created version through `service.activateVersion(...)` | shared version-existence validation and side-effect calculation | `tests/prompt-control-plane-equivalence.test.ts` |
| rollback version | no dedicated admin UI action yet | `promptRollback(...)` calls `service.rollback(...)` | rollback is the same slot-version activation seam | `tests/prompt-control-plane-equivalence.test.ts` |
| diff versions | not exposed in admin UI yet | `promptDiff(...)` calls `service.diffVersions(...)` | diff behavior lives in the shared service for future surfaces | `mcp/prompt-tool.ts`, `src/lib/prompts/prompt-control-plane-service.ts` |
| slot validation | hidden form inputs still pass through service validation | MCP args still pass through service validation | unsupported governed-slot mutations are rejected once, centrally | `tests/prompt-control-plane.service.test.ts` |
| event semantics | activation uses shared slot-version semantics | activation and rollback use the same slot-version semantics | `prompt_version_changed` remains a slot-version event, not effective-prompt provenance | `tests/prompt-control-plane.service.test.ts`, `tests/prompt-control-plane-equivalence.test.ts` |

## Equivalent Admin Operation For `prompt_set`

Admin UI keeps create and activate as separate user actions.

The equivalence proof in Sprint 1 is therefore:

- admin `createVersion` then `activateVersion`
- MCP `promptSet`

Those flows now converge on the same active slot state and the same service-side
event semantics.

## Script-Safe Seam

Sprint 1 does not add a third script-local mutator.

The future script entry point should call `PromptControlPlaneService` directly
instead of introducing another surface-local prompt mutation path.