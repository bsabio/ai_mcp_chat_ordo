import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDeferredJobHandlers } from "@/lib/jobs/deferred-job-handlers";
import { JOB_CAPABILITY_REGISTRY } from "@/lib/jobs/job-capability-registry";

const {
  executeDraftContentMock,
  executePublishContentMock,
  executeGenerateBlogImageMock,
  executeQaBlogArticleMock,
  executeResolveBlogArticleQaMock,
  executeProduceBlogArticleMock,
} = vi.hoisted(() => ({
  executeDraftContentMock: vi.fn(),
  executePublishContentMock: vi.fn(),
  executeGenerateBlogImageMock: vi.fn(),
  executeQaBlogArticleMock: vi.fn(),
  executeResolveBlogArticleQaMock: vi.fn(),
  executeProduceBlogArticleMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogAssetRepository: () => ({}),
  getBlogPostRepository: () => ({}),
  getBlogPostRevisionRepository: () => ({}),
  getJobQueueRepository: () => ({}),
  getJobStatusQuery: () => ({}),
}));

vi.mock("@/lib/blog/blog-production-root", () => ({
  getBlogArticleProductionService: () => ({}),
  getBlogImageGenerationService: () => ({}),
}));

vi.mock("@/core/use-cases/tools/admin-content.tool", () => ({
  executeDraftContent: executeDraftContentMock,
  executePublishContent: executePublishContentMock,
  parseDraftContentInput: (value: Record<string, unknown>) => value,
  parsePublishContentInput: (value: Record<string, unknown>) => value,
}));

vi.mock("@/core/use-cases/tools/blog-image.tool", () => ({
  executeGenerateBlogImage: executeGenerateBlogImageMock,
  parseGenerateBlogImageInput: (value: Record<string, unknown>) => value,
}));

vi.mock("@/core/use-cases/tools/blog-production.tool", () => ({
  executeComposeBlogArticle: vi.fn(),
  executeGenerateBlogImagePrompt: vi.fn(),
  executeProduceBlogArticle: executeProduceBlogArticleMock,
  executeQaBlogArticle: executeQaBlogArticleMock,
  executeResolveBlogArticleQa: executeResolveBlogArticleQaMock,
  parseComposeBlogArticleInput: (value: Record<string, unknown>) => value,
  parseGenerateBlogImagePromptInput: (value: Record<string, unknown>) => value,
  parseProduceBlogArticleInput: (value: Record<string, unknown>) => value,
  parseQaBlogArticleInput: (value: Record<string, unknown>) => value,
  parseResolveBlogArticleQaInput: (value: Record<string, unknown>) => value,
}));

vi.mock("@/core/use-cases/tools/journal-write.tool", () => ({
  parsePrepareJournalPostForPublishInput: (value: Record<string, unknown>) => value,
  PrepareJournalPostForPublishInteractor: class PrepareJournalPostForPublishInteractor {
    execute = vi.fn();
  },
}));

function makeJob(toolName: keyof typeof JOB_CAPABILITY_REGISTRY, requestPayload: Record<string, unknown>) {
  return {
    id: `job_${toolName}`,
    conversationId: "conv_jobs",
    userId: "usr_admin",
    toolName,
    status: "queued" as const,
    priority: 100,
    dedupeKey: null,
    initiatorType: "user" as const,
    requestPayload,
    resultPayload: null,
    errorMessage: null,
    progressPercent: null,
    progressLabel: null,
    attemptCount: 0,
    leaseExpiresAt: null,
    claimedBy: null,
    failureClass: null,
    nextRetryAt: null,
    recoveryMode: null,
    lastCheckpointId: null,
    replayedFromJobId: null,
    supersededByJobId: null,
    createdAt: "2026-03-25T03:00:00.000Z",
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-03-25T03:00:00.000Z",
  };
}

function expectWorkerContext(toolName: keyof typeof JOB_CAPABILITY_REGISTRY, context: unknown) {
  expect(context).toMatchObject({
    userId: "usr_admin",
    role: JOB_CAPABILITY_REGISTRY[toolName].executionAllowedRoles[0],
    executionPrincipal: JOB_CAPABILITY_REGISTRY[toolName].executionPrincipal,
    executionAllowedRoles: JOB_CAPABILITY_REGISTRY[toolName].executionAllowedRoles,
    conversationId: "conv_jobs",
  });
}

describe("deferred job runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeDraftContentMock.mockResolvedValue({ id: "post_1" });
    executePublishContentMock.mockResolvedValue({ id: "post_1" });
    executeGenerateBlogImageMock.mockResolvedValue({ id: "asset_1" });
    executeQaBlogArticleMock.mockResolvedValue({ ok: true });
    executeResolveBlogArticleQaMock.mockResolvedValue({ ok: true });
    executeProduceBlogArticleMock.mockResolvedValue({ id: "post_2" });
  });

  it("builds worker execution context from the capability registry for contextual handlers", async () => {
    const handlers = createDeferredJobHandlers();
    const handlerContext = { reportProgress: vi.fn().mockResolvedValue(undefined) };

    await handlers.draft_content(makeJob("draft_content", { title: "Launch", content: "# Launch" }), handlerContext);
    await handlers.publish_content(makeJob("publish_content", { post_id: "post_1" }), handlerContext);
    await handlers.generate_blog_image(makeJob("generate_blog_image", { prompt: "Prompt", alt_text: "Alt" }), handlerContext);
    await handlers.qa_blog_article(makeJob("qa_blog_article", { title: "Launch" }), handlerContext);
    await handlers.resolve_blog_article_qa(makeJob("resolve_blog_article_qa", { title: "Launch" }), handlerContext);
    await handlers.produce_blog_article(makeJob("produce_blog_article", { brief: "Launch" }), handlerContext);

    expectWorkerContext("draft_content", executeDraftContentMock.mock.calls[0]?.[2]);
    expectWorkerContext("publish_content", executePublishContentMock.mock.calls[0]?.[2]);
    expectWorkerContext("generate_blog_image", executeGenerateBlogImageMock.mock.calls[0]?.[2]);
    expectWorkerContext("qa_blog_article", executeQaBlogArticleMock.mock.calls[0]?.[2]);
    expectWorkerContext("resolve_blog_article_qa", executeResolveBlogArticleQaMock.mock.calls[0]?.[2]);
    expectWorkerContext("produce_blog_article", executeProduceBlogArticleMock.mock.calls[0]?.[2]);
  });
});