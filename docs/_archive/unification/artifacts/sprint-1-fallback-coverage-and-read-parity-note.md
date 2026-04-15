# Sprint 1 Fallback Coverage And Read Parity Note

Sprint 1 makes prompt control-plane reads explicit about three runtime coverage
states:

- `db`: a stored active prompt version backs the slot
- `fallback`: runtime can still build the slot from fallback content even though
  no stored version is active
- `missing`: neither an active stored version nor fallback runtime content backs
  the requested slot

## Read Parity Rules

| Scenario | Admin detail/list | MCP `prompt_get` / `prompt_list` | Runtime meaning |
| --- | --- | --- | --- |
| active stored version exists | show active version and content | return stored content and `runtime_coverage: db` | runtime uses DB-backed slot |
| no active stored version, fallback exists | show fallback-backed active content and `runtimeCoverage: fallback` | return fallback content and `runtime_coverage: fallback` | runtime still operates normally |
| no active stored version, no fallback exists | do not show the slot in normal admin listings; detail requests report missing state | return error payload with `runtime_coverage: missing` | runtime has no slot content for that request |

## Concrete Sprint 1 Examples

- `APPRENTICE / role_directive` can be forced into `fallback` state by clearing
  its active DB row while keeping the fallback directive available
- `ALL / role_directive` remains an intentionally absent combination and is used
  in parity tests as an explicit `missing` case

## Verification Coverage

- `tests/prompt-control-plane.service.test.ts`
  verifies fallback-backed slot detail semantics
- `tests/prompt-control-plane-read-parity.test.ts`
  verifies MCP read parity and direct admin-loader parity
- `tests/admin-prompts-conversations.test.tsx`
  continues to cover admin prompt page wiring and rendering contracts

## Outcome

Sprint 1 closes the earlier false-negative read behavior where control-plane
reads could imply “missing prompt” even when the runtime still had valid
fallback content.