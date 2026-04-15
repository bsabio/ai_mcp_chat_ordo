# Sprint 2 Artifact — Warnings Inventory

> This artifact was created retroactively during Sprint QA to fill the gap
> identified in the Sprint 2 closeout.

## Warning Codes

| Code | When It Fires | Severity | Meaning |
| --- | --- | --- | --- |
| `slot_fallback` | A governed prompt slot (`ALL/base` or `{role}/role_directive`) has no active DB row and is using the hard-coded fallback content from `ConfigIdentitySource` or `ROLE_DIRECTIVES` | Low | Normal during fresh deployments or before an admin has created custom prompt versions. Runtime behavior is correct but the prompt is not governed. |
| `slot_missing` | A governed prompt slot has neither a DB row nor a fallback. The section content is an empty string. | High | Indicates a gap in role coverage. The model will receive no identity or directive for this slot. Typically means a new role was added to the runtime but not to `ROLE_DIRECTIVES`. |
| `identity_name_overlay` | The fallback identity prompt includes an instance-name substitution from `config/identity.json` that differs from `DEFAULT_IDENTITY.name` | Info | The instance name is being injected at runtime outside prompt versioning. This is expected for custom deployments. |
| `personality_overlay` | The fallback identity prompt includes a personality block from `config/prompts.json` | Info | A custom personality modifier is being applied outside prompt versioning. This is expected for custom deployments. |
| `system_prompt_override` | A caller supplied a `systemPromptOverride` string that replaces the entire governed prompt assembly | High | Used only by `live_eval` scenarios that need to test with a fully controlled prompt. Bypasses all governed slots, overlays, and request-time sections. |

## Warning Composition Rules

1. Warnings are accumulated, not deduplicated. A request that resolves both
   `ALL/base` and `ADMIN/role_directive` from fallback will produce two
   separate `slot_fallback` warnings.
2. Overlay warnings (`identity_name_overlay`, `personality_overlay`) are only
   emitted when the `ALL/base` slot is fallback-backed. If a DB-backed base
   prompt exists, config overlays are not applied and do not generate warnings.
3. `system_prompt_override` is mutually exclusive with all slot and overlay
   warnings. When present, no slot resolution occurs.
