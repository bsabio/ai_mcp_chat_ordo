import {
  executeDraftContent,
  type DraftContentOutput,
} from "@/core/use-cases/tools/admin-content.tool";
import type { BlogPostArtifactType } from "@/core/entities/blog-artifact";
import type {
  BlogArticlePipelineModel,
  BlogImagePromptDesign,
  BlogQaReport,
  ComposeBlogArticleInput,
  ComposedBlogArticle,
  ResolvedBlogArticle,
} from "@/core/use-cases/BlogArticlePipelineModel";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { BlogPostArtifactRepository } from "@/core/use-cases/BlogPostArtifactRepository";
import type { BlogAssetRepository } from "@/core/use-cases/BlogAssetRepository";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import type { BlogImageGenerationService } from "@/lib/blog/blog-image-generation-service";
import type { CapabilityProgressPhase } from "@/core/entities/capability-result";
import {
  normalizeJobProgressState,
  getJobPhaseDefinitions,
} from "@/lib/jobs/job-progress-state";

export interface ProduceBlogArticleInput extends ComposeBlogArticleInput {
  enhanceImagePrompt?: boolean;
}

export interface ProduceBlogArticleOutput extends DraftContentOutput {
  imageAssetId: string;
  stages: string[];
  summary: string;
}

export interface ProduceBlogArticleProgressUpdate {
  progressPercent?: number | null;
  progressLabel?: string | null;
  phases?: CapabilityProgressPhase[];
  activePhaseKey?: string | null;
  summary?: string;
  replaySnapshot?: Record<string, unknown> | null;
}

export type ProduceBlogArticleProgressReporter = (
  update: ProduceBlogArticleProgressUpdate,
) => Promise<void>;

function resolveAbortReason(signal: AbortSignal, fallbackReason: string): string {
  if (typeof signal.reason === "string" && signal.reason.trim().length > 0) {
    return signal.reason;
  }

  if (signal.reason instanceof Error && signal.reason.message.trim().length > 0) {
    return signal.reason.message;
  }

  return fallbackReason;
}

function throwIfAborted(signal: AbortSignal | undefined, fallbackReason = "deferred_job_canceled"): void {
  if (!signal?.aborted) {
    return;
  }

  const error = new Error(resolveAbortReason(signal, fallbackReason));
  error.name = "AbortError";
  throw error;
}

function buildArtifactSeed(
  postId: string,
  createdByUserId: string,
  artifactType: BlogPostArtifactType,
  payload: unknown,
) {
  return {
    postId,
    artifactType,
    payload,
    createdByUserId,
  };
}

function buildProduceBlogArticlePhaseState(
  activePhaseKey: string,
): ProduceBlogArticleProgressUpdate {
  const phaseDefinitions = getJobPhaseDefinitions("produce_blog_article");
  if (!phaseDefinitions) {
    throw new Error("produce_blog_article progress phases are not registered.");
  }

  const activePhaseIndex = phaseDefinitions.findIndex((phase) => phase.key === activePhaseKey);

  return normalizeJobProgressState({
    toolName: "produce_blog_article",
    activePhaseKey,
    phases: phaseDefinitions.map((phase, index) => ({
      key: phase.key,
      label: phase.label,
      status:
        index < activePhaseIndex
          ? "succeeded"
          : index === activePhaseIndex
            ? "active"
            : "pending",
    })),
  });
}

export class BlogArticleProductionService {
  constructor(
    private readonly model: BlogArticlePipelineModel,
    private readonly blogRepo: BlogPostRepository,
    private readonly assetRepo: BlogAssetRepository,
    private readonly artifactRepo: BlogPostArtifactRepository,
    private readonly imageService: BlogImageGenerationService,
  ) {}

  composeArticle(
    input: ComposeBlogArticleInput,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ComposedBlogArticle> {
    return this.model.composeArticle(input, options);
  }

  reviewArticle(
    article: ComposedBlogArticle,
    options?: { abortSignal?: AbortSignal },
  ): Promise<BlogQaReport> {
    return this.model.reviewArticle(article, options);
  }

  async reviewArticleForPost(
    postId: string,
    article: ComposedBlogArticle,
    createdByUserId: string,
  ): Promise<BlogQaReport> {
    const report = await this.reviewArticle(article);
    await this.persistArtifactForPost(
      postId,
      createdByUserId,
      "article_qa_report",
      report,
    );
    return report;
  }

  resolveQa(
    article: ComposedBlogArticle,
    report: BlogQaReport,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ResolvedBlogArticle> {
    return this.model.resolveQa(article, report, options);
  }

  async resolveQaForPost(
    postId: string,
    article: ComposedBlogArticle,
    report: BlogQaReport,
    createdByUserId: string,
  ): Promise<ResolvedBlogArticle> {
    await this.persistArtifactForPostIfMissing(
      postId,
      createdByUserId,
      "article_qa_report",
      report,
    );

    const resolved = await this.resolveQa(article, report);
    await this.persistArtifactForPost(
      postId,
      createdByUserId,
      "article_qa_resolution",
      {
        title: resolved.title,
        description: resolved.description,
        content: resolved.content,
        resolutionSummary: resolved.resolutionSummary,
      },
    );
    return resolved;
  }

  designHeroImagePrompt(
    article: ComposedBlogArticle,
    options?: { abortSignal?: AbortSignal },
  ): Promise<BlogImagePromptDesign> {
    return this.model.designHeroImagePrompt(article, options);
  }

  async produceArticle(
    input: ProduceBlogArticleInput,
    context: ToolExecutionContext,
    reportProgress?: ProduceBlogArticleProgressReporter,
  ): Promise<ProduceBlogArticleOutput> {
    const contextProgressReporter = context.reportProgress
      ? async (update: Parameters<ProduceBlogArticleProgressReporter>[0]) => {
          await context.reportProgress?.(update);
        }
      : undefined;
    const progressReporter = reportProgress ?? contextProgressReporter;

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("compose_blog_article"));
    throwIfAborted(context.abortSignal);
    const composed = await this.composeArticle(input, { abortSignal: context.abortSignal });

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("qa_blog_article"));
    throwIfAborted(context.abortSignal);
    const qaReport = await this.reviewArticle(composed, { abortSignal: context.abortSignal });

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("resolve_blog_article_qa"));
    throwIfAborted(context.abortSignal);
    const resolved = qaReport.findings.length > 0
      ? await this.resolveQa(composed, qaReport, { abortSignal: context.abortSignal })
      : {
        ...composed,
        resolutionSummary: "No QA changes were required.",
      };

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("generate_blog_image_prompt"));
    throwIfAborted(context.abortSignal);
    const imagePrompt = await this.designHeroImagePrompt(resolved, { abortSignal: context.abortSignal });

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("generate_blog_image"));
    throwIfAborted(context.abortSignal);
    const generatedImage = await this.imageService.generate({
      prompt: imagePrompt.prompt,
      altText: imagePrompt.altText,
      size: imagePrompt.size,
      quality: imagePrompt.quality,
      enhancePrompt: input.enhanceImagePrompt ?? true,
      createdByUserId: context.userId,
      abortSignal: context.abortSignal,
    });

    throwIfAborted(context.abortSignal);
    await progressReporter?.(buildProduceBlogArticlePhaseState("draft_content"));
    throwIfAborted(context.abortSignal);
    const draft = await executeDraftContent(
      this.blogRepo,
      { title: resolved.title, content: resolved.content },
      context,
    );

    throwIfAborted(context.abortSignal);
    await this.assetRepo.attachToPost(generatedImage.assetId, draft.id);
    throwIfAborted(context.abortSignal);
    await this.imageService.selectHeroImage(draft.id, generatedImage.assetId, context.userId);

    const artifacts = [
      buildArtifactSeed(draft.id, context.userId, "article_generation_prompt", input),
      buildArtifactSeed(draft.id, context.userId, "article_generation_result", composed),
      buildArtifactSeed(draft.id, context.userId, "article_qa_report", qaReport),
      buildArtifactSeed(draft.id, context.userId, "article_qa_resolution", {
        title: resolved.title,
        description: resolved.description,
        content: resolved.content,
        resolutionSummary: resolved.resolutionSummary,
      }),
      buildArtifactSeed(draft.id, context.userId, "hero_image_prompt", imagePrompt),
      buildArtifactSeed(draft.id, context.userId, "hero_image_generation_result", generatedImage),
    ];

    throwIfAborted(context.abortSignal);
    await Promise.all(artifacts.map((artifact) => this.artifactRepo.create(artifact)));

    return {
      ...draft,
      imageAssetId: generatedImage.assetId,
      stages: [
        "compose_blog_article",
        "qa_blog_article",
        "resolve_blog_article_qa",
        "generate_blog_image_prompt",
        "generate_blog_image",
        "draft_content",
      ],
      summary: `Produced draft "${draft.title}" at /journal/${draft.slug} with hero asset ${generatedImage.assetId}.`,
    };
  }

  private async persistArtifactForPost(
    postId: string,
    createdByUserId: string,
    artifactType: BlogPostArtifactType,
    payload: unknown,
  ): Promise<void> {
    const post = await this.blogRepo.findById(postId);

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    await this.artifactRepo.create(
      buildArtifactSeed(postId, createdByUserId, artifactType, payload),
    );
  }

  private async persistArtifactForPostIfMissing(
    postId: string,
    createdByUserId: string,
    artifactType: BlogPostArtifactType,
    payload: unknown,
  ): Promise<void> {
    const existing = await this.artifactRepo.listByPostAndType(postId, artifactType);
    const serializedPayload = JSON.stringify(payload);

    if (existing.some((artifact) => JSON.stringify(artifact.payload) === serializedPayload)) {
      return;
    }

    await this.persistArtifactForPost(postId, createdByUserId, artifactType, payload);
  }
}