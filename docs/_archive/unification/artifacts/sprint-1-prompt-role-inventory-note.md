# Sprint 1 Prompt Role Inventory Note

Sprint 1 now has one authoritative prompt role and slot inventory in
`src/lib/prompts/prompt-role-inventory.ts`.

## Runtime Roles

- `ANONYMOUS`
- `AUTHENTICATED`
- `APPRENTICE`
- `STAFF`
- `ADMIN`

## Control-Plane Roles

The control plane adds one synthetic role:

- `ALL`

That role exists only for the shared base prompt slot.

## Governed Prompt Slots

Sprint 1 treats the following slots as the governed prompt inventory:

| role | prompt_type | runtime purpose |
| --- | --- | --- |
| `ALL` | `base` | shared identity/base prompt used for all chat runtime roles |
| `ANONYMOUS` | `role_directive` | demo-mode runtime directive |
| `AUTHENTICATED` | `role_directive` | signed-in customer runtime directive |
| `APPRENTICE` | `role_directive` | student/apprentice runtime directive |
| `STAFF` | `role_directive` | internal staff runtime directive |
| `ADMIN` | `role_directive` | administrator runtime directive |

## Intentional Absences

The following combinations are intentionally absent from the governed inventory:

- `ALL / role_directive`
- role-specific `base` slots such as `ADMIN / base`

Sprint 1 keeps them readable as `missing` state for parity diagnostics, but
mutation flows reject them as unsupported prompt slots.

## Coverage Closeout

- `APPRENTICE` is present in `SYSTEM_PROMPT_SEEDS`
- admin prompt loaders derive their list/detail view models from the shared
  control-plane service
- MCP prompt tools derive runtime slot coverage from the same shared service
- governed slot inventory is verified in
  `tests/prompt-control-plane.service.test.ts`

## Outcome

Sprint 1 removed the earlier role-coverage drift and made the control-plane slot
inventory explicit instead of leaving it as an accidental role/type Cartesian
product.