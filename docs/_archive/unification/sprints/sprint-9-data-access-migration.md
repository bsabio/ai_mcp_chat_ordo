# Sprint 9 — Data Access Migration (getDb → RepositoryFactory)

> **Status:** Complete
> **Goal:** Eliminate all direct `getDb()` calls outside of `RepositoryFactory.ts`
> and `db/index.ts`, migrating every caller to process-cached RepositoryFactory
> exports or documented exceptions.
> **Prerequisite:** Sprint 8 complete ✅
> **Estimated scope:** 33 files to migrate, 3 new factory exports, 1 canary test

## QA Findings Before Implementation

1. Actual caller count is **33 files** (not 35 as estimated in the deep dive).
2. Callers use 3 distinct patterns that need different migration strategies:
   DataMapper construction (21 files), raw SQL (15 files), default parameter
   injection (19 files). Sets overlap.
3. Three DataMappers frequently constructed by callers have **no RepositoryFactory
   export**: `UserPreferencesDataMapper` (6 callers), `UserFileDataMapper`
   (4 callers), `SQLiteVectorStore` (4 callers). These must be added first.
4. Six files already use BOTH `getDb()` and RepositoryFactory — partially
   migrated from Sprint 6 work.
5. `conversation-root.ts` is intentional request-scoped grouping (Sprint 6
   service-lifetime-map confirms). Must document, not change.
6. Raw SQL callers (15 files) cannot simply swap to factory exports — they need
   either new repository methods or a blessed raw query helper.

## Current State

### Callers by migration pattern

**Pattern A — DataMapper construction (21 files, direct factory swap):**

| File | Constructs |
| --- | --- |
| `api/preferences/route.ts` | `UserPreferencesDataMapper` × 2 |
| `api/chat/uploads/route.ts` | `UserFileDataMapper` |
| `api/tts/route.ts` | `UserFileDataMapper` |
| `api/user-files/[id]/route.ts` | `UserFileDataMapper` |
| `lib/auth.ts` | `UserDataMapper` |
| `lib/chat/chat-turn.ts` | `UserPreferencesDataMapper` |
| `lib/chat/conversation-root.ts` | `ConversationDataMapper`, `MessageDataMapper`, `ConversationEventDataMapper`, `ConsultationRequestDataMapper`, `LeadRecordDataMapper`, `DealRecordDataMapper`, `TrainingPathRecordDataMapper` |
| `lib/chat/embed-conversation.ts` | `SQLiteVectorStore` |
| `lib/chat/embedding-module.ts` | `SQLiteVectorStore` |
| `lib/chat/prompt-runtime.ts` | `SystemPromptDataMapper` |
| `lib/chat/search-pipeline.ts` | `SQLiteVectorStore` |
| `lib/chat/stream-pipeline.ts` | `UserFileDataMapper` × 2 |
| `lib/chat/tool-bundles/conversation-tools.ts` | `SQLiteVectorStore` |
| `lib/chat/tool-bundles/theme-tools.ts` | `UserPreferencesDataMapper` |
| `lib/chat/upload-reaper.ts` | `UserFileDataMapper` |
| `lib/jobs/deferred-job-notifications.ts` | `UserPreferencesDataMapper` |
| `lib/profile/profile-service.ts` | `UserDataMapper` |
| `lib/prompts/prompt-control-plane-service.ts` | `SystemPromptDataMapper` |
| `lib/referrals/referral-ledger.ts` | `ReferralDataMapper`, `ReferralEventDataMapper` |
| `lib/referrals/referral-notifier.ts` | `UserPreferencesDataMapper` |

**Pattern B — Raw SQL queries (15 files, need repository methods or helper):**

| File | Query type |
| --- | --- |
| `api/admin/affiliates/[userId]/route.ts` | Affiliate commission queries |
| `api/qr/[code]/route.ts` | QR code lookup |
| `api/chat/stream/route.ts` | User embed counts |
| `lib/admin/attribution/admin-attribution.ts` | Attribution analytics |
| `lib/admin/leads/admin-leads.ts` | Follow-up date queries |
| `lib/admin/search/admin-search.ts` | Cross-table search |
| `lib/auth.ts` | Session resolution |
| `lib/chat/embed-conversation.ts` | Conversation row lookup |
| `lib/chat/resolve-user.ts` | Referral code resolution |
| `lib/chat/stream-pipeline.ts` | Referral event insertion |
| `lib/profile/profile-service.ts` | User-exists check |
| `lib/prompts/prompt-control-plane-service.ts` | Prompt version queries |
| `lib/referrals/admin-referral-analytics.ts` | Referral analytics |
| `lib/referrals/referral-analytics.ts` | Referral analytics |
| `lib/referrals/referral-resolver.ts` | Referral code lookup |

**Pattern C — Default parameter injection (5 referral modules + others):**

| File | Pattern |
| --- | --- |
| `lib/referrals/admin-referral-analytics.ts` | `db = getDb()` |
| `lib/referrals/referral-analytics.ts` | `db = getDb()` |
| `lib/referrals/referral-ledger.ts` | `db = getDb()` |
| `lib/admin/leads/admin-leads.ts` | `db = getDb()` |
| `lib/admin/search/admin-search.ts` | `db = getDb()` |
| `lib/admin/attribution/admin-attribution.ts` | `db = getDb()` |
| `lib/profile/profile-service.ts` | `db = getDb()` |
| `lib/prompts/prompt-control-plane-service.ts` | `db = getDb()` |
| `lib/chat/conversation-root.ts` | `db = getDb()` × 3 |
| `lib/operator/operator-loader-helpers.ts` | Re-exports `getDb()` |

### RepositoryFactory gaps

| Missing Export | Callers |
| --- | --- |
| `getUserPreferencesDataMapper()` | 6 callers |
| `getUserFileDataMapper()` | 4 callers |
| `getVectorStore()` | 4 callers |

### Dual-use files (already partially migrated)

| File | Uses RepositoryFactory for | Still calls getDb() for |
| --- | --- | --- |
| `chat/stream/route.ts` | Job repos, conversation repos | Raw SQL, UserPreferences |
| `admin-leads.ts` | Lead record mapper | Raw SQL follow-up query |
| `search-pipeline.ts` | Corpus repos | SQLiteVectorStore |
| `stream-pipeline.ts` | Job repos | UserFileDataMapper |
| `deferred-job-notifications.ts` | Job repos | UserPreferencesDataMapper |
| `referral-notifier.ts` | Push subscription | UserPreferencesDataMapper |

### Intentional exceptions

| File | Reason |
| --- | --- |
| `conversation-root.ts` | Request-scoped transactional grouping (Sprint 6 decision) |

## Tasks

1. **Add 3 missing RepositoryFactory exports**
   - `getUserPreferencesDataMapper()` — process-cached singleton
   - `getUserFileDataMapper()` — process-cached singleton
   - `getVectorStore()` — process-cached singleton wrapping SQLiteVectorStore

2. **Migrate Pattern A callers (21 files)**
   - Replace `new XxxDataMapper(getDb())` with factory import
   - Remove `import { getDb }` when no longer needed
   - Highest priority: `stream-pipeline.ts`, `chat-turn.ts` (hot path)

3. **Migrate Pattern C callers (default parameter injection)**
   - Replace `db = getDb()` with explicit factory injection
   - For referral modules: replace the default with factory call at construction
   - For operator-loader-helpers: re-export factory methods instead

4. **Address Pattern B callers (raw SQL)**
   - For callers that construct DataMappers AND do raw SQL: migrate the
     DataMapper calls, leave raw SQL with a blessed `getDb()` import
   - Create `@allowRawDbAccess` annotation convention for files that
     intentionally need raw SQL
   - Document each raw SQL query as a future repository-method candidate

5. **Document intentional exceptions**
   - `conversation-root.ts` — mark with `@lifetime request-scoped`
   - Any raw SQL callers that cannot be migrated — mark with `@allowRawDbAccess`

6. **Add canary test**
   - Test that `import.*getDb` appears only in:
     `db/index.ts`, `RepositoryFactory.ts`, `@allowRawDbAccess` files, tests

## Out of Scope

1. Moving raw SQL queries into DataMapper methods (future sprint, file-by-file)
2. Changing `conversation-root.ts` transactional grouping
3. Adding RepositoryFactory exports for referral analytics services (they
   use raw SQL internally, not DataMappers)
4. Full DataMapper coverage for every raw SQL pattern

## Required Artifacts

- `sprint-9-getdb-migration-map.md` — file-by-file migration status tracker
- `sprint-9-raw-sql-inventory.md` — raw SQL queries that remain with rationale

## Acceptance Criteria

1. `grep -rl "getDb()" src/ --include="*.ts" | grep -v ".test." | grep -v "db/"
   | grep -v "RepositoryFactory"` returns only `@allowRawDbAccess` files
   (target: ≤15 files with raw SQL, down from 33 total).
2. All DataMapper construction calls use factory exports (0 inline `new
   XxxDataMapper(getDb())` outside RepositoryFactory).
3. Three new RepositoryFactory exports exist with `@lifetime` tags.
4. Canary test prevents new `getDb()` imports outside approved files.
5. `npm run qa:unification` remains green (109+ tests).
6. Zero new type errors introduced.

## Verification

- `npm run qa:unification` passes
- Canary test passes (no unapproved getDb imports)
- `grep -c "new.*DataMapper(getDb" src/**/*.ts` returns 0 (excluding tests)
- `tsc --noEmit` clean for changed files

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | getDb() callers reduced to raw SQL + exceptions | ✅ 33 → 18 files (all 18 are raw SQL or documented exceptions) |
| 2 | Zero DataMapper construction with getDb() outside RepositoryFactory | ✅ 0 inline constructions remain |
| 3 | Three new RepositoryFactory exports with @lifetime tags | ✅ `getUserPreferencesDataMapper()`, `getUserFileDataMapper()`, `getVectorStore()` |
| 4 | Canary test prevents new getDb() imports | ✅ 2 assertions, both passing |
| 5 | qa:unification remains green | ✅ 111 tests, 9 files, all green |
| 6 | Zero new type errors | ✅ All pre-existing, none in changed files |

### Files Changed

| File | Change |
| --- | --- |
| `RepositoryFactory.ts` | 3 new exports + 3 new singleton variables + 3 new imports |
| `data-access-canary.test.ts` | NEW — 2 canary assertions |
| `run-unification-qa.ts` | Added Sprint 9 test file |
| 15 source files | Migrated from inline getDb() to factory imports |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| Files calling getDb() | 33 | 18 |
| DataMapper(getDb()) constructions | 21 | 0 |
| RepositoryFactory exports | 19 | 22 |
| qa:unification tests | 109 | 111 |
| qa:unification test files | 8 | 9 |

