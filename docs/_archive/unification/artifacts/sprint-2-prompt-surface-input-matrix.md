# Sprint 2 Artifact — Prompt Surface Input Matrix

> This artifact was created retroactively during Sprint QA to fill the gap
> identified in the Sprint 2 closeout.

## Surface Input Matrix

| Input | `chat_stream` | `direct_turn` | `live_eval` |
| --- | --- | --- | --- |
| `role` | ✅ from session | ✅ from user.roles | ✅ from scenario config |
| `currentPathname` | ✅ from request header | — | ✅ from scenario |
| `currentPageSnapshot` | ✅ from pipeline | — | ✅ from scenario |
| `userPreferences` | ✅ from UserPreferencesDataMapper | ✅ if not ANONYMOUS | — |
| `conversationSummary` | ✅ from pipeline | — | — |
| `routingSnapshot` | ✅ from pipeline | — | ✅ from scenario |
| `trustedReferralContext` | ✅ from request cookies | — | — |
| `capabilityManifest` (tool manifest) | ✅ post-tool-selection | ✅ from getSchemasForRole | ✅ from scenario |
| `contextWindowGuard` | ✅ from pipeline | — | — |
| `taskOriginHandoff` | ✅ from pipeline | — | — |
| `extraSections` | ✅ from pipeline | — | ✅ funnel directives |
| `systemPromptOverride` | — | — | ✅ from caller-supplied prompt |

## Key Observations

1. `chat_stream` is the richest surface. It is the only consumer of summary,
   context-window guard, referral, and task-origin handoff.
2. `direct_turn` is intentionally thinner — it lacks pipeline-time enrichments
   but gains tool manifest through the same `withToolManifest` builder method.
3. `live_eval` has unique capabilities: `systemPromptOverride` and
   `extraSections` for funnel directives. These are eval-specific and do not
   appear in the other surfaces.
4. All three surfaces derive their governed prompt slots (`ALL/base` and
   per-role `role_directive`) from the same `PromptRuntime.build()` path.
