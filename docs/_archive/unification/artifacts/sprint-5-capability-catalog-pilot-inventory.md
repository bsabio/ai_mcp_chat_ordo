# Sprint 5 Artifact — Capability Catalog Pilot Inventory

> Inventory of the 4 pilot capabilities derived from the shared
> `CapabilityDefinition` catalog at `src/core/capability-catalog/catalog.ts`.

## Pilot Capabilities

| Capability | Category | Roles | Runtime Mode | Presentation Mode |
| --- | --- | --- | --- | --- |
| `draft_content` | content | ADMIN | deferred | deferred |
| `publish_content` | content | ADMIN | deferred | deferred |
| `compose_media` | content | AUTHENTICATED, APPRENTICE, STAFF, ADMIN | (none — browser-first) | hybrid |
| `admin_web_search` | content | ADMIN | (none — inline) | inline |

## Facet Coverage Matrix

| Capability | Core | Runtime | Presentation | Job | Browser | Prompt Hint | MCP Export |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `draft_content` | ✅ | ✅ deferred | ✅ editorial | ✅ | — | — | — |
| `publish_content` | ✅ | ✅ deferred | ✅ editorial | ✅ | — | — | — |
| `compose_media` | ✅ | ✅ (no mode) | ✅ hybrid | ✅ media | ✅ wasm_worker | ✅ 4 roles | — |
| `admin_web_search` | ✅ | ✅ (no mode) | ✅ inline | — | — | ✅ ADMIN only | ✅ |

## Registry Integration Status

| Registry | File | Pilot entries replaced | Non-pilot entries |
| --- | --- | --- | --- |
| CapabilityPresentationRegistry | `capability-presentation-registry.ts` | 4 of 4 | unchanged |
| JobCapabilityRegistry | `job-capability-registry.ts` | 3 of 3 (draft, publish, compose_media) | unchanged |
| BrowserCapabilityRegistry | `browser-capability-registry.ts` | 1 of 1 (compose_media) | unchanged |

## What the catalog does NOT replace

- **ToolDescriptor factory functions**: `createDraftContentTool(...)`, `createPublishContentTool(...)`,
  `composeMediaTool`, `createAdminWebSearchTool(...)` remain unchanged. They carry the
  Anthropic schema, command instance, and constructors. The catalog does not absorb these.
- **Tool bundle membership**: `BLOG_BUNDLE`, `MEDIA_BUNDLE`, `ADMIN_BUNDLE` are untouched.
- **Renderer mapping**: `default-tool-registry.ts` stays as a thin renderer map.
- **Role directives**: `role-directives.ts` still owns the prompt string assembly;
  the catalog's `promptHint` facet documents the source data but does not replace
  the existing join logic.
