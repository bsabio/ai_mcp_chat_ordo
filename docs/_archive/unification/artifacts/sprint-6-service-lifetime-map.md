# Sprint 6 Artifact — Service Lifetime Map

> Every key service and repository classified by lifetime scope.
> **Canonical pattern:** process-cached singleton via `RepositoryFactory`.

## Lifetime Policy

| Pattern | Canonical? | Usage |
| --- | --- | --- |
| **Process-cached singleton** | ✅ Yes | `RepositoryFactory.ts` — lazy-init, lives until process restart |
| **Request-scoped constructor** | Acceptable | `conversation-root.ts` — groups repos for transactional consistency |
| **Unmanaged direct getDb()** | ❌ Legacy | Route handlers constructing repos inline — migrate to RepositoryFactory |

## RepositoryFactory Exports

| Export | Lifetime | Notes |
| --- | --- | --- |
| `getCorpusRepository()` | process-cached singleton | CachedCorpusRepository wrapping FileSystemCorpusRepository |
| `getBlogPostRepository()` | process-cached singleton | |
| `getBlogAssetRepository()` | process-cached singleton | |
| `getBlogPostArtifactRepository()` | process-cached singleton | |
| `getBlogPostRevisionRepository()` | process-cached singleton | |
| `getJournalEditorialMutationRepository()` | process-cached singleton | |
| `getJobQueueRepository()` | process-cached singleton | Invalidated on DB handle change |
| `getJobQueueDataMapper()` | process-cached singleton | Narrow type alias for getJobQueueRepository |
| `getJobStatusQuery()` | process-cached singleton | Wraps getJobQueueRepository |
| `getPushSubscriptionRepository()` | process-cached singleton | |
| `getUserDataMapper()` | process-cached singleton | |
| `getLeadRecordDataMapper()` | process-cached singleton | |
| `getConsultationRequestDataMapper()` | process-cached singleton | |
| `getDealRecordDataMapper()` | process-cached singleton | |
| `getTrainingPathRecordDataMapper()` | process-cached singleton | |
| `getSystemPromptDataMapper()` | process-cached singleton | |
| `getConversationDataMapper()` | process-cached singleton | |
| `getMessageDataMapper()` | process-cached singleton | |
| `getConversationEventDataMapper()` | process-cached singleton | |

## Composition Roots

| Root | Lifetime | Pattern | Notes |
| --- | --- | --- | --- |
| `conversation-root.ts` | request-scoped | Groups fresh repo instances per call | Used by chat stream and route handlers |
| `deferred-job-projector-root.ts` | per-call constructor, process-cached deps | **Sprint 6 refactored** to RepositoryFactory | Was direct getDb() before Sprint 6 |
| `tool-composition-root.ts` | per-request | Builds tool registries from RepositoryFactory | Clean — already uses factory |
| `blog-production-root.ts` | per-call | Service factory | Uses RepositoryFactory exports |

## Direct getDb() Callers (Legacy, Target for Migration)

| File | Usage |
| --- | --- |
| `src/app/api/preferences/route.ts` | Inline repo construction |
| `src/app/api/chat/stream/route.ts` | Passed to stream pipeline |
| `src/app/api/chat/uploads/route.ts` | Inline asset handling |
| `src/app/api/admin/affiliates/[userId]/route.ts` | Inline query |
| `src/app/api/admin/routing-review/route.ts` | Inline query |
| `src/app/api/qr/[code]/route.ts` | Inline query |
| `src/app/api/user-files/[id]/route.ts` | Inline query |
| `src/app/api/tts/route.ts` | Inline audio handling |
| `src/lib/chat/upload-reaper.ts` | Background cleanup |

These files should migrate to RepositoryFactory exports in future sprints.
