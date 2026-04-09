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
import { getDb } from "@/lib/db";
import { createJobStatusQuery } from "@/lib/jobs/job-status-query";

/**
 * Repository Factory — Service Locator
 *
 * Next.js Server Components (RSC) cannot receive constructor-injected dependencies.
 * Page components call these factory functions directly. This is an accepted DIP
 * exception for the RSC layer. The tool/chat pipeline uses proper constructor
 * injection via tool-composition-root.ts.
 */

let repository: CorpusRepository | null = null;

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

export function getBlogPostRepository(): BlogPostRepository {
  if (!blogRepo) {
    blogRepo = new BlogPostDataMapper(getDb());
  }
  return blogRepo;
}

export function getBlogAssetRepository(): BlogAssetRepository {
  if (!blogAssetRepo) {
    blogAssetRepo = new BlogAssetDataMapper(getDb());
  }
  return blogAssetRepo;
}

export function getBlogPostArtifactRepository(): BlogPostArtifactRepository {
  if (!blogArtifactRepo) {
    blogArtifactRepo = new BlogPostArtifactDataMapper(getDb());
  }
  return blogArtifactRepo;
}

export function getBlogPostRevisionRepository(): BlogPostRevisionRepository {
  if (!blogRevisionRepo) {
    blogRevisionRepo = new BlogPostRevisionDataMapper(getDb());
  }
  return blogRevisionRepo;
}

export function getJournalEditorialMutationRepository(): JournalEditorialMutationRepository {
  if (!journalEditorialMutationRepo) {
    journalEditorialMutationRepo = new JournalEditorialMutationDataMapper(getDb());
  }
  return journalEditorialMutationRepo;
}

export function getJobQueueRepository(): JobQueueRepository {
  const db = getDb();

  if (!jobQueueRepo || jobQueueRepoDb !== db) {
    jobQueueRepo = new JobQueueDataMapper(db);
    jobQueueRepoDb = db;
    jobStatusQuery = null;
  }
  return jobQueueRepo;
}

export function getJobQueueDataMapper(): JobQueueDataMapper {
  return getJobQueueRepository() as JobQueueDataMapper;
}

export function getJobStatusQuery(): JobStatusQuery {
  if (!jobStatusQuery) {
    jobStatusQuery = createJobStatusQuery(getJobQueueRepository());
  }

  return jobStatusQuery;
}

export function getPushSubscriptionRepository(): PushSubscriptionRepository {
  if (!pushSubscriptionRepo) {
    pushSubscriptionRepo = new PushSubscriptionDataMapper(getDb());
  }
  return pushSubscriptionRepo;
}

export function getUserDataMapper(): UserDataMapper {
  if (!userDataMapper) {
    userDataMapper = new UserDataMapper(getDb());
  }
  return userDataMapper;
}

export function getLeadRecordDataMapper(): LeadRecordDataMapper {
  if (!leadRecordDataMapper) {
    leadRecordDataMapper = new LeadRecordDataMapper(getDb());
  }
  return leadRecordDataMapper;
}

export function getConsultationRequestDataMapper(): ConsultationRequestDataMapper {
  if (!consultationRequestDataMapper) {
    consultationRequestDataMapper = new ConsultationRequestDataMapper(getDb());
  }
  return consultationRequestDataMapper;
}

export function getDealRecordDataMapper(): DealRecordDataMapper {
  if (!dealRecordDataMapper) {
    dealRecordDataMapper = new DealRecordDataMapper(getDb());
  }
  return dealRecordDataMapper;
}

export function getTrainingPathRecordDataMapper(): TrainingPathRecordDataMapper {
  if (!trainingPathRecordDataMapper) {
    trainingPathRecordDataMapper = new TrainingPathRecordDataMapper(getDb());
  }
  return trainingPathRecordDataMapper;
}

export function getSystemPromptDataMapper(): SystemPromptDataMapper {
  if (!systemPromptDataMapper) {
    systemPromptDataMapper = new SystemPromptDataMapper(getDb());
  }
  return systemPromptDataMapper;
}

export function getConversationDataMapper(): ConversationDataMapper {
  if (!conversationDataMapper) {
    conversationDataMapper = new ConversationDataMapper(getDb());
  }
  return conversationDataMapper;
}

export function getMessageDataMapper(): MessageDataMapper {
  if (!messageDataMapper) {
    messageDataMapper = new MessageDataMapper(getDb());
  }
  return messageDataMapper;
}
