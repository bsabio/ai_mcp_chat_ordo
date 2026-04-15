# Sprint 5 Artifact — Derivation Matrix

> Shows exactly what each projection helper produces for each pilot capability.
> All values verified by 27 catalog tests and 6 registry-sync tests.

## `projectPresentationDescriptor(def)`

| Field | `draft_content` | `publish_content` | `compose_media` | `admin_web_search` |
| --- | --- | --- | --- | --- |
| `toolName` | draft_content | publish_content | compose_media | admin_web_search |
| `family` | editorial | editorial | artifact | search |
| `label` | Draft Content | Publish Content | Compose Media | Admin Web Search |
| `cardKind` | editorial_workflow | editorial_workflow | artifact_viewer | search_result |
| `executionMode` | deferred | deferred | hybrid | inline |
| `progressMode` | single (default) | single (default) | single (explicit) | none (default) |
| `historyMode` | payload_snapshot | payload_snapshot | payload_snapshot | payload_snapshot |
| `defaultSurface` | conversation | conversation | conversation | conversation |
| `artifactKinds` | [] | [] | [video, audio] | [] |
| `supportsRetry` | whole_job (default) | whole_job (default) | whole_job (explicit) | none (default) |

## `projectJobCapability(def)`

| Field | `draft_content` | `publish_content` | `compose_media` | `admin_web_search` |
| --- | --- | --- | --- | --- |
| Result | JobCapabilityDefinition | JobCapabilityDefinition | JobCapabilityDefinition | **null** |
| `toolName` | draft_content | publish_content | compose_media | — |
| `family` | editorial | editorial | media | — |
| `executionPrincipal` | system_worker | system_worker | system_worker | — |
| `retryPolicy.mode` | automatic | automatic | automatic | — |
| `retryPolicy.maxAttempts` | 3 | 3 | 2 | — |
| `artifactPolicy.mode` | open_artifact | open_artifact | retain | — |
| `defaultSurface` | global | global | self | — |

## `projectBrowserCapability(def)`

| Field | `draft_content` | `publish_content` | `compose_media` | `admin_web_search` |
| --- | --- | --- | --- | --- |
| Result | **null** | **null** | BrowserCapabilityDescriptor | **null** |
| `capabilityId` | — | — | compose_media | — |
| `runtimeKind` | — | — | wasm_worker | — |
| `moduleId` | — | — | ffmpeg-browser-executor | — |
| `fallbackPolicy` | — | — | server | — |
| `recoveryPolicy` | — | — | fallback_to_server | — |
| `maxConcurrentExecutions` | — | — | 1 | — |
| `requiresCrossOriginIsolation` | — | — | true | — |

## `projectPromptHint(def, role)`

| Role | `draft_content` | `publish_content` | `compose_media` | `admin_web_search` |
| --- | --- | --- | --- | --- |
| ANONYMOUS | null | null | null | null |
| AUTHENTICATED | null | null | 6 lines | null |
| APPRENTICE | null | null | 4 lines | null |
| STAFF | null | null | 4 lines | null |
| ADMIN | null | null | 7 lines (with hybrid mention) | 2 lines |

## `projectMcpExportIntent(def)`

| Field | `draft_content` | `publish_content` | `compose_media` | `admin_web_search` |
| --- | --- | --- | --- | --- |
| Result | **null** | **null** | **null** | MCP export intent |
| `exportable` | — | — | — | true |
| `sharedModule` | — | — | — | mcp/web-search-tool |
