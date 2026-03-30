import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import {
  getBlogAssetRepository,
  getBlogPostRepository,
  getBlogPostRevisionRepository,
  getJournalEditorialMutationRepository,
  getJobStatusQuery,
} from "@/adapters/RepositoryFactory";
import {
  getBlogArticleProductionService,
  getBlogImageGenerationService,
} from "@/lib/blog/blog-production-root";
import { JournalEditorialInteractor } from "@/core/use-cases/JournalEditorialInteractor";

import { createDraftContentTool, createPublishContentTool } from "@/core/use-cases/tools/admin-content.tool";
import { createGenerateBlogImageTool } from "@/core/use-cases/tools/blog-image.tool";
import {
  createComposeBlogArticleTool,
  createGenerateBlogImagePromptTool,
  createProduceBlogArticleTool,
  createQaBlogArticleTool,
  createResolveBlogArticleQaTool,
} from "@/core/use-cases/tools/blog-production.tool";
import {
  createGetJournalPostTool,
  createGetJournalWorkflowSummaryTool,
  createListJournalPostsTool,
  createListJournalRevisionsTool,
  GetJournalPostInteractor,
  GetJournalWorkflowSummaryInteractor,
  ListJournalPostsInteractor,
  ListJournalRevisionsInteractor,
} from "@/core/use-cases/tools/journal-query.tool";
import {
  ApproveJournalPostInteractor,
  createApproveJournalPostTool,
  createPrepareJournalPostForPublishTool,
  createPublishJournalPostTool,
  createRestoreJournalRevisionTool,
  createSelectJournalHeroImageTool,
  createSubmitJournalReviewTool,
  createUpdateJournalDraftTool,
  createUpdateJournalMetadataTool,
  PrepareJournalPostForPublishInteractor,
  PublishJournalPostInteractor,
  RestoreJournalRevisionInteractor,
  SelectJournalHeroImageInteractor,
  SubmitJournalReviewInteractor,
  UpdateJournalDraftInteractor,
  UpdateJournalMetadataInteractor,
} from "@/core/use-cases/tools/journal-write.tool";

export function registerBlogTools(registry: ToolRegistry): void {
  const blogRepo = getBlogPostRepository();
  const blogAssetRepo = getBlogAssetRepository();
  const blogRevisionRepo = getBlogPostRevisionRepository();
  const blogArticleService = getBlogArticleProductionService();
  const blogImageService = getBlogImageGenerationService();
  const jobStatusQuery = getJobStatusQuery();
  const journalEditorialInteractor = new JournalEditorialInteractor(
    blogRepo, blogRevisionRepo, getJournalEditorialMutationRepository(),
  );

  // Journal query tools
  registry.register(createListJournalPostsTool(new ListJournalPostsInteractor(blogRepo)));
  registry.register(createGetJournalPostTool(new GetJournalPostInteractor(blogRepo)));
  registry.register(createListJournalRevisionsTool(new ListJournalRevisionsInteractor(blogRepo, blogRevisionRepo)));
  registry.register(createGetJournalWorkflowSummaryTool(new GetJournalWorkflowSummaryInteractor(blogRepo, jobStatusQuery)));

  // Journal editorial write tools
  registry.register(createUpdateJournalMetadataTool(new UpdateJournalMetadataInteractor(journalEditorialInteractor)));
  registry.register(createUpdateJournalDraftTool(new UpdateJournalDraftInteractor(journalEditorialInteractor)));
  registry.register(createSubmitJournalReviewTool(new SubmitJournalReviewInteractor(journalEditorialInteractor)));
  registry.register(createApproveJournalPostTool(new ApproveJournalPostInteractor(journalEditorialInteractor)));
  registry.register(createPublishJournalPostTool(new PublishJournalPostInteractor(blogRepo, blogRevisionRepo, blogAssetRepo)));
  registry.register(createRestoreJournalRevisionTool(new RestoreJournalRevisionInteractor(journalEditorialInteractor)));
  registry.register(createSelectJournalHeroImageTool(new SelectJournalHeroImageInteractor(blogImageService)));
  registry.register(
    createPrepareJournalPostForPublishTool(
      new PrepareJournalPostForPublishInteractor(blogRepo, blogRevisionRepo, jobStatusQuery, blogArticleService),
    ),
  );

  // Blog content tools
  registry.register(createDraftContentTool(blogRepo));
  registry.register(createPublishContentTool(blogRepo, blogAssetRepo));
  registry.register(createGenerateBlogImageTool(blogImageService));
  registry.register(createComposeBlogArticleTool(blogArticleService));
  registry.register(createQaBlogArticleTool(blogArticleService));
  registry.register(createResolveBlogArticleQaTool(blogArticleService));
  registry.register(createGenerateBlogImagePromptTool(blogArticleService));
  registry.register(createProduceBlogArticleTool(blogArticleService));
}
