import type { CorpusRepository } from "../core/use-cases/CorpusRepository";
import { FileSystemCorpusRepository } from "./FileSystemCorpusRepository";
import { CachedCorpusRepository } from "./CachedCorpusRepository";
import type { BlogPostRepository } from "../core/use-cases/BlogPostRepository";
import type { BlogAssetRepository } from "../core/use-cases/BlogAssetRepository";
import type { BlogPostArtifactRepository } from "../core/use-cases/BlogPostArtifactRepository";
import type { BlogPostRevisionRepository } from "../core/use-cases/BlogPostRevisionRepository";
import type { JournalEditorialMutationRepository } from "../core/use-cases/JournalEditorialMutationRepository";
import { BlogAssetDataMapper } from "./BlogAssetDataMapper";
import { BlogPostArtifactDataMapper } from "./BlogPostArtifactDataMapper";
import { BlogPostDataMapper } from "./BlogPostDataMapper";
import { BlogPostRevisionDataMapper } from "./BlogPostRevisionDataMapper";
import { JournalEditorialMutationDataMapper } from "./JournalEditorialMutationDataMapper";
import type { JobQueueRepository } from "../core/use-cases/JobQueueRepository";
import type { JobStatusQuery } from "../core/use-cases/JobStatusQuery";
import { JobQueueDataMapper } from "./JobQueueDataMapper";
import type { PushSubscriptionRepository } from "../core/use-cases/PushSubscriptionRepository";
import { PushSubscriptionDataMapper } from "./PushSubscriptionDataMapper";
import { UserDataMapper } from "./UserDataMapper";
import { LeadRecordDataMapper } from "./LeadRecordDataMapper";
import { ConsultationRequestDataMapper } from "./ConsultationRequestDataMapper";
import { DealRecordDataMapper } from "./DealRecordDataMapper";
import { TrainingPathRecordDataMapper } from "./TrainingPathRecordDataMapper";
import { SystemPromptDataMapper } from "./SystemPromptDataMapper";
import { ConversationDataMapper } from "./ConversationDataMapper";
import { MessageDataMapper } from "./MessageDataMapper";
import { ConversationEventDataMapper } from "./ConversationEventDataMapper";
import { PromptProvenanceDataMapper } from "./PromptProvenanceDataMapper";
import { UserPreferencesDataMapper } from "./UserPreferencesDataMapper";
import { UserFileDataMapper } from "./UserFileDataMapper";
import { SQLiteVectorStore } from "./SQLiteVectorStore";
import { getDb } from "@/lib/db";
import { createJobStatusQuery } from "@/lib/jobs/job-status-query";

/**
 * Repository Factory — Service Locator
 *
 * Next.js Server Components (RSC) cannot receive constructor-injected dependencies.
 * Page components call these factory functions directly. This is an accepted DIP
 * exception for the RSC layer. The tool/chat pipeline uses proper constructor
 * injection via tool-composition-root.ts.
 *
 * ## Lifetime Policy (Sprint 6)
 *
 * All repository exports use the **process-cached singleton** pattern:
 * first access lazily initializes the instance against the shared `getDb()`
 * handle, and the instance lives until the Node.js process restarts.
 *
 * This is the canonical lifetime for all repositories. Request-scoped
 * construction (as in `conversation-root.ts`) should only be used when a
 * composition root needs to group multiple repos under a single DB handle
 * for transactional consistency.
 *
 * A small number of route handlers still call `getDb()` directly when they
 * need transaction-local composition or read-model access that is not yet
 * wrapped by a repository export. Treat those as explicit shrink-only
 * exceptions rather than the preferred integration pattern.
 */

let repository: CorpusRepository | null = null;

/** @lifetime process-cached singleton */
export function getCorpusRepository(): CorpusRepository {
  if (!repository) {
    // In a multi-environment setup, we would check ENV here
    // to return a MockRepository or a CloudRepository.
    repository = new CachedCorpusRepository(new FileSystemCorpusRepository());
  }
  return repository;
}

let blogRepo: BlogPostRepository | null = null;
let blogAssetRepo: BlogAssetRepository | null = null;
let blogArtifactRepo: BlogPostArtifactRepository | null = null;
let blogRevisionRepo: BlogPostRevisionRepository | null = null;
let journalEditorialMutationRepo: JournalEditorialMutationRepository | null = null;
let jobQueueRepo: JobQueueRepository | null = null;
let jobQueueRepoDb: ReturnType<typeof getDb> | null = null;
let jobStatusQuery: JobStatusQuery | null = null;
let pushSubscriptionRepo: PushSubscriptionRepository | null = null;
let userDataMapper: UserDataMapper | null = null;
let leadRecordDataMapper: LeadRecordDataMapper | null = null;
let consultationRequestDataMapper: ConsultationRequestDataMapper | null = null;
let dealRecordDataMapper: DealRecordDataMapper | null = null;
let trainingPathRecordDataMapper: TrainingPathRecordDataMapper | null = null;
let systemPromptDataMapper: SystemPromptDataMapper | null = null;
let conversationDataMapper: ConversationDataMapper | null = null;
let messageDataMapper: MessageDataMapper | null = null;
let conversationEventDataMapper: ConversationEventDataMapper | null = null;
let promptProvenanceDataMapper: PromptProvenanceDataMapper | null = null;
let userPreferencesDataMapper: UserPreferencesDataMapper | null = null;
let userFileDataMapper: UserFileDataMapper | null = null;
let vectorStore: SQLiteVectorStore | null = null;

/** @lifetime process-cached singleton */
export function getBlogPostRepository(): BlogPostRepository {
  if (!blogRepo) {
    blogRepo = new BlogPostDataMapper(getDb());
  }
  return blogRepo;
}

/** @lifetime process-cached singleton */
export function getBlogAssetRepository(): BlogAssetRepository {
  if (!blogAssetRepo) {
    blogAssetRepo = new BlogAssetDataMapper(getDb());
  }
  return blogAssetRepo;
}

/** @lifetime process-cached singleton */
export function getBlogPostArtifactRepository(): BlogPostArtifactRepository {
  if (!blogArtifactRepo) {
    blogArtifactRepo = new BlogPostArtifactDataMapper(getDb());
  }
  return blogArtifactRepo;
}

/** @lifetime process-cached singleton */
export function getBlogPostRevisionRepository(): BlogPostRevisionRepository {
  if (!blogRevisionRepo) {
    blogRevisionRepo = new BlogPostRevisionDataMapper(getDb());
  }
  return blogRevisionRepo;
}

/** @lifetime process-cached singleton */
export function getJournalEditorialMutationRepository(): JournalEditorialMutationRepository {
  if (!journalEditorialMutationRepo) {
    journalEditorialMutationRepo = new JournalEditorialMutationDataMapper(getDb());
  }
  return journalEditorialMutationRepo;
}

/** @lifetime process-cached singleton (invalidated on DB handle change) */
export function getJobQueueRepository(): JobQueueRepository {
  const db = getDb();

  if (!jobQueueRepo || jobQueueRepoDb !== db) {
    jobQueueRepo = new JobQueueDataMapper(db);
    jobQueueRepoDb = db;
    jobStatusQuery = null;
  }
  return jobQueueRepo;
}

/** @lifetime process-cached singleton (narrow type alias for getJobQueueRepository) */
export function getJobQueueDataMapper(): JobQueueDataMapper {
  return getJobQueueRepository() as JobQueueDataMapper;
}

/** @lifetime process-cached singleton */
export function getJobStatusQuery(): JobStatusQuery {
  if (!jobStatusQuery) {
    jobStatusQuery = createJobStatusQuery(getJobQueueRepository());
  }

  return jobStatusQuery;
}

/** @lifetime process-cached singleton */
export function getPushSubscriptionRepository(): PushSubscriptionRepository {
  if (!pushSubscriptionRepo) {
    pushSubscriptionRepo = new PushSubscriptionDataMapper(getDb());
  }
  return pushSubscriptionRepo;
}

/** @lifetime process-cached singleton */
export function getUserDataMapper(): UserDataMapper {
  if (!userDataMapper) {
    userDataMapper = new UserDataMapper(getDb());
  }
  return userDataMapper;
}

/** @lifetime process-cached singleton */
export function getLeadRecordDataMapper(): LeadRecordDataMapper {
  if (!leadRecordDataMapper) {
    leadRecordDataMapper = new LeadRecordDataMapper(getDb());
  }
  return leadRecordDataMapper;
}

/** @lifetime process-cached singleton */
export function getConsultationRequestDataMapper(): ConsultationRequestDataMapper {
  if (!consultationRequestDataMapper) {
    consultationRequestDataMapper = new ConsultationRequestDataMapper(getDb());
  }
  return consultationRequestDataMapper;
}

/** @lifetime process-cached singleton */
export function getDealRecordDataMapper(): DealRecordDataMapper {
  if (!dealRecordDataMapper) {
    dealRecordDataMapper = new DealRecordDataMapper(getDb());
  }
  return dealRecordDataMapper;
}

/** @lifetime process-cached singleton */
export function getTrainingPathRecordDataMapper(): TrainingPathRecordDataMapper {
  if (!trainingPathRecordDataMapper) {
    trainingPathRecordDataMapper = new TrainingPathRecordDataMapper(getDb());
  }
  return trainingPathRecordDataMapper;
}

/** @lifetime process-cached singleton */
export function getSystemPromptDataMapper(): SystemPromptDataMapper {
  if (!systemPromptDataMapper) {
    systemPromptDataMapper = new SystemPromptDataMapper(getDb());
  }
  return systemPromptDataMapper;
}

/** @lifetime process-cached singleton */
export function getConversationDataMapper(): ConversationDataMapper {
  if (!conversationDataMapper) {
    conversationDataMapper = new ConversationDataMapper(getDb());
  }
  return conversationDataMapper;
}

/** @lifetime process-cached singleton */
export function getMessageDataMapper(): MessageDataMapper {
  if (!messageDataMapper) {
    messageDataMapper = new MessageDataMapper(getDb());
  }
  return messageDataMapper;
}

/** @lifetime process-cached singleton */
export function getConversationEventDataMapper(): ConversationEventDataMapper {
  if (!conversationEventDataMapper) {
    conversationEventDataMapper = new ConversationEventDataMapper(getDb());
  }
  return conversationEventDataMapper;
}

/** @lifetime process-cached singleton */
export function getPromptProvenanceDataMapper(): PromptProvenanceDataMapper {
  if (!promptProvenanceDataMapper) {
    promptProvenanceDataMapper = new PromptProvenanceDataMapper(getDb());
  }
  return promptProvenanceDataMapper;
}

/** @lifetime process-cached singleton (Sprint 9) */
export function getUserPreferencesDataMapper(): UserPreferencesDataMapper {
  if (!userPreferencesDataMapper) {
    userPreferencesDataMapper = new UserPreferencesDataMapper(getDb());
  }
  return userPreferencesDataMapper;
}

/** @lifetime process-cached singleton (Sprint 9) */
export function getUserFileDataMapper(): UserFileDataMapper {
  if (!userFileDataMapper) {
    userFileDataMapper = new UserFileDataMapper(getDb());
  }
  return userFileDataMapper;
}

/** @lifetime process-cached singleton (Sprint 9) */
export function getVectorStore(): SQLiteVectorStore {
  if (!vectorStore) {
    vectorStore = new SQLiteVectorStore(getDb());
  }
  return vectorStore;
}

/**
 * Sprint 25 — elite ops degraded-path probe support.
 * Keeps DB pragma introspection behind the approved RepositoryFactory seam.
 */
export function getDbBusyTimeoutMs(): number | null {
  const db = getDb();

  try {
    const value = db.pragma("busy_timeout", { simple: true }) as unknown;
    return typeof value === "number" ? value : null;
  } catch {
    try {
      const rows = db.pragma("busy_timeout") as Array<Record<string, unknown>>;
      const value = rows[0]?.busy_timeout;
      return typeof value === "number" ? value : null;
    } catch {
      return null;
    }
  }
}
