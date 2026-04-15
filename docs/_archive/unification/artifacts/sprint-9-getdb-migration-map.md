# Sprint 9 Artifact — getDb Migration Map

## Summary

| Metric | Before | After |
| --- | --- | --- |
| Files calling getDb() | 33 | 18 |
| DataMapper constructions with getDb() | 21 | 0 |
| RepositoryFactory exports | 19 | 22 |
| Canary test assertions | 0 | 2 |

## Migrated Files (15)

| File | Was constructing | Now uses |
| --- | --- | --- |
| `api/preferences/route.ts` | `UserPreferencesDataMapper(getDb())` × 2 | `getUserPreferencesDataMapper()` |
| `api/chat/stream/route.ts` | `UserPreferencesDataMapper(getDb())` | `getUserPreferencesDataMapper()` |
| `api/chat/uploads/route.ts` | `UserFileDataMapper(getDb())` × 2 | `getUserFileDataMapper()` |
| `api/tts/route.ts` | `UserFileDataMapper(getDb())` | `getUserFileDataMapper()` |
| `api/user-files/[id]/route.ts` | `UserFileDataMapper(getDb())` | `getUserFileDataMapper()` |
| `lib/chat/chat-turn.ts` | `UserPreferencesDataMapper(getDb())` | `getUserPreferencesDataMapper()` |
| `lib/chat/prompt-runtime.ts` | `SystemPromptDataMapper(getDb())` | `getSystemPromptDataMapper()` |
| `lib/chat/stream-pipeline.ts` | `UserFileDataMapper(getDb())` × 2 | `getUserFileDataMapper()` |
| `lib/chat/upload-reaper.ts` | `UserFileDataMapper(getDb())` | `getUserFileDataMapper()` |
| `lib/chat/embedding-module.ts` | `SQLiteVectorStore(getDb())` | `getVectorStore()` |
| `lib/chat/embed-conversation.ts` | `SQLiteVectorStore(getDb())` | `getVectorStore()` |
| `lib/chat/search-pipeline.ts` | `SQLiteVectorStore(getDb())` | `getVectorStore()` |
| `lib/chat/tool-bundles/conversation-tools.ts` | `SQLiteVectorStore(getDb())` | `getVectorStore()` |
| `lib/chat/tool-bundles/theme-tools.ts` | `UserPreferencesDataMapper(getDb())` | `getUserPreferencesDataMapper()` |
| `lib/jobs/deferred-job-notifications.ts` | `UserPreferencesDataMapper(getDb())` | `getUserPreferencesDataMapper()` |

## Partially Migrated Files (5)

| File | Migrated | Still uses getDb() for |
| --- | --- | --- |
| `lib/prompts/prompt-control-plane-service.ts` | `SystemPromptDataMapper`, `ConversationEventDataMapper` | Raw SQL queries |
| `lib/profile/profile-service.ts` | `UserDataMapper`, `UserPreferencesDataMapper` | (fully migrated) |
| `lib/auth.ts` | `UserDataMapper` | `SessionDataMapper` (no factory export) |
| `lib/referrals/referral-ledger.ts` | `ConversationDataMapper` | `ReferralDataMapper`, `ReferralEventDataMapper` |
| `lib/referrals/referral-notifier.ts` | `UserPreferencesDataMapper` | (fully migrated) |

## Remaining getDb() Callers (18) — All Raw SQL or Documented Exceptions

| File | Reason |
| --- | --- |
| `admin/affiliates/[userId]/route.ts` | Raw SQL: affiliate commission queries |
| `admin/routing-review/route.ts` | Passes db to analytics dependency |
| `qr/[code]/route.ts` | Raw SQL: QR code lookup |
| `admin-attribution.ts` | Raw SQL: attribution analytics |
| `admin-leads.ts` | Raw SQL: follow-up date queries |
| `admin-search.ts` | Raw SQL: cross-table search |
| `auth.ts` | SessionDataMapper (no factory export yet) |
| `conversation-root.ts` | Intentional request-scoped grouping (Sprint 6) |
| `embed-conversation.ts` | Raw SQL: conversation row lookup |
| `resolve-user.ts` | Raw SQL: referral code resolution |
| `search-pipeline.ts` | BM25IndexStore construction (getDb()) |
| `operator-loader-helpers.ts` | Re-exports getDb() for operator system |
| `admin-review-loaders.ts` | Passes db to analytics dependency |
| `prompt-control-plane-service.ts` | Raw SQL: active conversation queries |
| `admin-referral-analytics.ts` | Raw SQL: referral analytics service |
| `referral-analytics.ts` | Raw SQL: referral analytics service |
| `referral-ledger.ts` | ReferralDataMapper/EventDataMapper (no factory export) |
| `referral-resolver.ts` | Raw SQL: referral code lookup |

## New RepositoryFactory Exports (3)

| Export | Callers migrated |
| --- | --- |
| `getUserPreferencesDataMapper()` | 6 |
| `getUserFileDataMapper()` | 4 |
| `getVectorStore()` | 4 |
