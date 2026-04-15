# Use-Case Reorganization — Refactor Spec

> **Status:** Planned
> **Date:** 2026-04-07
> **Scope:** Group the flat `src/core/use-cases/` directory (65 files) into
> bounded-context subdirectories while preserving all existing imports and
> tests.
> **Affects:** `src/core/use-cases/`, all files that import from use-cases
> **Motivation:** The use-cases directory contains 65 files spanning 9+
> domains (auth, chat, journal, blog, consultation, deals, library, LLM,
> jobs). Finding related files requires scanning the full list. Grouping by
> bounded context makes domain boundaries explicit and reduces cognitive
> load when navigating the codebase.
> **Requirement IDs:** `UCR-001` through `UCR-099`

---

## 1. Problem Statement

### 1.1 Current state

`src/core/use-cases/` is a flat directory with 65 files. A `tools/`
subdirectory exists with 49 tool files, but the interactors, repositories,
and interfaces above it are ungrouped.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **Flat directory with 65 files** | `ls src/core/use-cases/ \| wc -l` → 65 | Finding related files requires scanning the full list `[UCR-001]` |
| 2 | **Cross-domain coupling invisible** | Auth interactors sit next to blog repositories | No structural signal about domain boundaries `[UCR-002]` |
| 3 | **Ownership ambiguity** | `ReferralLifecycleRecorder` could belong to referrals or jobs | Flat structure provides no grouping hint `[UCR-003]` |

### 1.3 Root cause

Files were added as features were built, without reorganizing the directory.
The `tools/` subdirectory was the first grouping attempt but was not extended
to interactors and repositories.

### 1.4 Why it matters

New contributors (or LLM agents) spend time locating related code. Bounded
context directories make the domain model self-documenting.

---

## 2. Design Goals

1. Create subdirectories under `src/core/use-cases/` for each bounded
   context. `[UCR-010]`
2. Move files into their respective directories using `git mv` to preserve
   history. `[UCR-011]`
3. Update all import paths across the codebase. `[UCR-012]`
4. Keep the `tools/` subdirectory as-is (it is already organized). `[UCR-013]`
5. Add a barrel `index.ts` in each subdirectory that re-exports public
   interfaces, easing import consolidation. `[UCR-014]`
6. Complete the reorganization in a single sprint to avoid a prolonged
   mixed state. `[UCR-015]`

---

## 3. Architecture

### 3.1 Proposed directory structure

```
src/core/use-cases/
  auth/
    AuthenticateUserInteractor.ts
    AuthenticateUserInteractor.test.ts
    RegisterUserInteractor.ts
    RegisterUserInteractor.test.ts
    ValidateSessionInteractor.ts
    ValidateSessionInteractor.test.ts
    PasswordHasher.ts
    SessionRepository.ts
    UserRepository.ts
    index.ts
  users/
    GetUserProfileInteractor.ts
    UpdateUserProfileInteractor.ts
    UserAdminInteractor.ts
    UserProfileRepository.ts
    UserFileRepository.ts
    index.ts
  chat/
    ConversationInteractor.ts
    ConversationInteractor.test.ts
    ChatPolicyInteractor.ts
    ChatStreamProvider.ts
    ConversationRepository.ts
    ConversationEventRecorder.ts
    MessageRepository.ts
    index.ts
  content/
    BlogArticlePipelineModel.ts
    BlogPostRepository.ts
    BlogPostRevisionRepository.ts
    BlogPostArtifactRepository.ts
    BlogAssetRepository.ts
    BlogImageProvider.ts
    JournalEditorialInteractor.ts
    JournalEditorialMutationRepository.ts
    index.ts
  library/
    CorpusRepository.ts
    CorpusIndexInteractor.ts
    CorpusSummaryInteractor.ts
    LibrarySearchInteractor.ts
    LibrarySearchInteractor.test.ts
    LibraryInteractors.test.ts
    ChecklistInteractor.ts
    AnalyzeChapterChecklist.ts
    index.ts
  sales/
    LeadCaptureInteractor.ts
    LeadCaptureInteractor.test.ts
    RequestConsultationInteractor.ts
    RequestConsultationInteractor.test.ts
    TriageConsultationRequestInteractor.ts
    TriageConsultationRequestInteractor.test.ts
    ConsultationRequestRepository.ts
    LeadRecordRepository.ts
    CreateDealFromWorkflowInteractor.ts
    CreateDealFromWorkflowInteractor.test.ts
    CreateTrainingPathFromWorkflowInteractor.ts
    CreateTrainingPathFromWorkflowInteractor.test.ts
    DealRecordRepository.ts
    TrainingPathRecordRepository.ts
    index.ts
  llm/
    LlmSummarizer.ts
    SummarizationInteractor.ts
    SummarizationInteractor.test.ts
    SystemPromptBuilder.ts
    SystemPromptRepository.ts
    DefaultingSystemPromptRepository.ts
    index.ts
  common/
    ThemeManagementInteractor.ts
    ThemeManagementInteractor.test.ts
    PractitionerInteractor.ts
    ExtractPractitioners.ts
    JobQueueRepository.ts
    JobStatusQuery.ts
    PushSubscriptionRepository.ts
    ReferralLifecycleRecorder.ts
    ToolCommand.ts
    index.ts
  tools/
    (unchanged — already organized)
```

### 3.2 Migration strategy

1. Create directories.
2. `git mv` files one domain at a time.
3. Run `npx tsc --noEmit` after each domain to catch import breakage
   immediately.
4. Update imports in route handlers, adapters, and tests.
5. Create barrel `index.ts` files.

---

## 4. Security

No security implications — this is a pure file-move refactor with no
behavioral changes.

---

## 5. Testing Strategy

- `npx tsc --noEmit` must pass after the reorganization.
- `npx vitest run` must pass with no test changes beyond import paths.
- No new tests required.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Move all 65 files into bounded-context directories, update imports, verify build and tests |

---

## 7. Future Considerations

- The `tools/` directory could be further grouped into subdirectories
  mirroring the use-case bounded contexts, but this is lower priority.
- Barrel exports enable future path aliasing (e.g.,
  `@/core/use-cases/auth` → `@/core/use-cases/auth/index`).
