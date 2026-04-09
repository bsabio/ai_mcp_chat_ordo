import {
  getBlogAssetRepository,
  getBlogPostRepository,
  getBlogPostRevisionRepository,
  getJobQueueRepository,
  getJobStatusQuery,
} from "@/adapters/RepositoryFactory";
import {
  executeDraftContent,
  executePublishContent,
  parseDraftContentInput,
  parsePublishContentInput,
} from "@/core/use-cases/tools/admin-content.tool";
import {
  executeGenerateBlogImage,
  parseGenerateBlogImageInput,
} from "@/core/use-cases/tools/blog-image.tool";
import {
  executeComposeBlogArticle,
  executeGenerateBlogImagePrompt,
  executeProduceBlogArticle,
  executeQaBlogArticle,
  executeResolveBlogArticleQa,
  parseComposeBlogArticleInput,
  parseGenerateBlogImagePromptInput,
  parseProduceBlogArticleInput,
  parseQaBlogArticleInput,
  parseResolveBlogArticleQaInput,
} from "@/core/use-cases/tools/blog-production.tool";
import {
  parsePrepareJournalPostForPublishInput,
  PrepareJournalPostForPublishInteractor,
} from "@/core/use-cases/tools/journal-write.tool";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { getBlogArticleProductionService, getBlogImageGenerationService } from "@/lib/blog/blog-production-root";
import type { DeferredJobHandlerName } from "@/lib/jobs/deferred-job-handler-names";
import { getJobCapability } from "@/lib/jobs/job-capability-registry";
import type { DeferredJobHandler } from "@/lib/jobs/deferred-job-worker";

export function getDeferredJobRepository() {
  return getJobQueueRepository();
}

function buildExecutionContext(job: {
  conversationId: string;
  toolName: string;
  userId: string | null;
}): ToolExecutionContext {
  const capability = getJobCapability(job.toolName);

  if (!capability) {
    throw new Error(`No job capability registered for tool: ${job.toolName}`);
  }

  return {
    userId: job.userId ?? "unknown",
    role: capability.executionAllowedRoles[0] ?? "ADMIN",
    executionPrincipal: capability.executionPrincipal,
    executionAllowedRoles: capability.executionAllowedRoles,
    conversationId: job.conversationId,
  };
}

export function createDeferredJobHandlers(): Record<DeferredJobHandlerName, DeferredJobHandler> {
  const blogRepo = getBlogPostRepository();
  const blogAssetRepo = getBlogAssetRepository();
  const blogRevisionRepo = getBlogPostRevisionRepository();
  const blogImageService = getBlogImageGenerationService();
  const blogArticleService = getBlogArticleProductionService();
  const jobStatusQuery = getJobStatusQuery();
  const prepareJournalPostForPublishInteractor = new PrepareJournalPostForPublishInteractor(
    blogRepo,
    blogRevisionRepo,
    jobStatusQuery,
    blogArticleService,
  );

  return {
    draft_content: async (job) => executeDraftContent(
      blogRepo,
      parseDraftContentInput(job.requestPayload),
      buildExecutionContext(job),
    ),
    publish_content: async (job) => executePublishContent(
      blogRepo,
      parsePublishContentInput(job.requestPayload),
      buildExecutionContext(job),
      blogAssetRepo,
    ),
    prepare_journal_post_for_publish: async (job) => prepareJournalPostForPublishInteractor.execute(
      parsePrepareJournalPostForPublishInput(job.requestPayload),
      job.userId ?? "unknown",
    ),
    generate_blog_image: async (job) => executeGenerateBlogImage(
      blogImageService,
      parseGenerateBlogImageInput(job.requestPayload),
      buildExecutionContext(job),
    ),
    compose_blog_article: async (job) => executeComposeBlogArticle(
      blogArticleService,
      parseComposeBlogArticleInput(job.requestPayload),
    ),
    qa_blog_article: async (job) => executeQaBlogArticle(
      blogArticleService,
      parseQaBlogArticleInput(job.requestPayload),
      buildExecutionContext(job),
    ),
    resolve_blog_article_qa: async (job) => executeResolveBlogArticleQa(
      blogArticleService,
      parseResolveBlogArticleQaInput(job.requestPayload),
      buildExecutionContext(job),
    ),
    generate_blog_image_prompt: async (job) => executeGenerateBlogImagePrompt(
      blogArticleService,
      parseGenerateBlogImagePromptInput(job.requestPayload),
    ),
    produce_blog_article: async (job, handlerContext) => executeProduceBlogArticle(
      blogArticleService,
      parseProduceBlogArticleInput(job.requestPayload),
      buildExecutionContext(job),
      (progressLabel, progressPercent) => handlerContext.reportProgress({
        progressLabel,
        progressPercent,
      }),
    ),
  };
}