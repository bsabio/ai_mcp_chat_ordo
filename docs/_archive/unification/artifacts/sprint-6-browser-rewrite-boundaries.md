# Sprint 6 Artifact — Browser Rewrite Boundary Notes

> Documents which browser-side capability rewrites remain intentional and
> what server-side projections they must align with.

## compose_media — Hybrid Browser/Server Execution

### Architecture

```
Browser Request
  │
  ├── Browser WASM Path (SharedArrayBuffer available)
  │     └── FfmpegBrowserExecutor → local MediaCompositionPlan → MP4 blob
  │
  └── Server Fallback Path (SharedArrayBuffer unavailable)
        └── POST /api/chat/jobs → deferred job → server FFmpeg → asset upload
```

### Server-Side Job Projection

When `compose_media` runs as a deferred job, the job-publication contract
(`buildJobPublication()`) produces a `JobStatusMessagePart` with:

| Field | Value |
| --- | --- |
| `toolName` | `compose_media` |
| `label` | `Compose Media` |
| `status` | queued → running → succeeded/failed |
| `resultPayload` | MediaCompositionPlan result + asset references |

### Browser-Side Rewrite

The browser capability runtime (`useBrowserCapabilityRuntime`) intercepts
`compose_media` tool results and:

1. Extracts the `MediaCompositionPlan` from the tool result
2. Downloads input assets via governed asset handles
3. Runs FFmpeg WASM in a worker thread
4. Produces a local blob URL for the composed video
5. Updates the capability result envelope with the local asset

### Alignment Requirements

| Concern | Server Projection | Browser Rewrite | Must Align? |
| --- | --- | --- | --- |
| `toolName` | `compose_media` | `compose_media` | ✅ Must match |
| `executionMode` | `deferred` (job level) | `hybrid` (presentation level) | ✅ Intentional split (Sprint 5 documented) |
| `resultPayload` shape | `MediaCompositionPlan` + asset refs | Same plan, local blob URLs | ✅ Plan structure must match |
| `artifactKinds` | `["video", "audio"]` | Same (from browser-capability-registry) | ✅ Must match |
| `fallbackPolicy` | N/A (server is the fallback) | `"server"` | ✅ Browser declares server as fallback |
| Progress events | `JobStatusMessagePart` with progressPercent | `BrowserCapabilityExecutionStatus` | ❌ Different shapes (browser uses its own status) |

### Hardcoded Seam

`/api/chat/jobs/route.ts` (line ~106) contains a hardcoded check:
```typescript
if (toolName !== "compose_media") { ... }
```

This is documented as Sprint 5 edge case #4. It routes compose_media job
creation through a specific path. This seam is NOT a candidate for generic
dispatch — it exists because compose_media's browser-first execution model
requires different job creation semantics than editorial tools.

## Other Browser Capabilities

### generate_audio, generate_chart, generate_graph

These capabilities are browser-only (`runtimeKind: "worker_only"`) and do
not have server-side job surfaces. Their browser registry entries are not
catalog-derived (Sprint 5 scope was limited to 4 pilot capabilities).

No alignment requirements exist because these tools don't have a
server-side fallback path.
