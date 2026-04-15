# Sprint 2 Artifact — Prompt Provenance Field Map

> This artifact was created retroactively during Sprint QA to fill the gap
> identified in the Sprint 2 closeout.

## PromptRuntimeResult Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `surface` | `"chat_stream" \| "direct_turn" \| "live_eval"` | Which runtime surface produced this result |
| `text` | `string` | The final effective prompt text sent to the model |
| `effectiveHash` | `string` | Content hash of `text` for deduplication and drift detection |
| `slotRefs` | `PromptSlotRef[]` | References to the governed prompt slots consumed |
| `sections` | `PromptSectionContribution[]` | Every section that contributed to the final prompt, with source provenance |
| `warnings` | `PromptRuntimeWarning[]` | Runtime warnings for fallback, missing, or overlay conditions |

## PromptSlotRef

| Field | Type | Purpose |
| --- | --- | --- |
| `role` | `string` | The role this slot was resolved for (e.g. `ALL`, `ADMIN`) |
| `promptType` | `"base" \| "role_directive"` | Which governed slot type |
| `source` | `"db" \| "fallback" \| "missing"` | How the slot content was resolved |
| `promptId` | `string \| null` | DB prompt ID if `source === "db"`, `"fallback"` if fallback, `null` if missing |
| `version` | `number \| null` | DB version number or `0` for fallback |

## PromptSectionContribution

| Field | Type | Purpose |
| --- | --- | --- |
| `key` | `string` | Unique section identifier (e.g. `identity`, `role_directive`, `tool_manifest`) |
| `sourceKind` | `"slot" \| "overlay" \| "request" \| "override"` | Where this section came from |
| `priority` | `number` | Sort order in final text (lower = earlier) |
| `content` | `string` | The section text |
| `includedInText` | `boolean` | Whether this section was included in the final `text` output |
| `parentKey` | `string \| undefined` | If this section is a child of another (e.g. overlays are children of `identity`) |
| `slotKey` | `string \| undefined` | The slot key if `sourceKind === "slot"` (e.g. `ALL/base`) |

## Section Priority Order

| Priority | Section Key | Source Kind |
| --- | --- | --- |
| 10 | `identity` | slot |
| 10 | `identity_name_overlay` | overlay |
| 10 | `personality_overlay` | overlay |
| 15 | `tool_manifest` | request |
| 20 | `role_directive` | slot |
| 25 | `page_context` | request |
| 30 | `user_preferences` | request |
| 40 | `summary` | request |
| 42 | `context_window_guard` | request |
| 45 | `trusted_referral` | request |
| 50 | `routing` | request |
| 90 | `task_origin_handoff` | request |
