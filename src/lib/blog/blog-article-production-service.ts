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

export interface ProduceBlogArticleInput extends ComposeBlogArticleInput {
  enhanceImagePrompt?: boolean;
}

export interface ProduceBlogArticleOutput extends DraftContentOutput {
  imageAssetId: string;
  stages: string[];
  summary: string;
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

export class BlogArticleProductionService {
  constructor(
    private readonly model: BlogArticlePipelineModel,
    private readonly blogRepo: BlogPostRepository,
    private readonly assetRepo: BlogAssetRepository,
    private readonly artifactRepo: BlogPostArtifactRepository,
    private readonly imageService: BlogImageGenerationService,
  ) {}

  composeArticle(input: ComposeBlogArticleInput): Promise<ComposedBlogArticle> {
    return this.model.composeArticle(input);
  }

  reviewArticle(article: ComposedBlogArticle): Promise<BlogQaReport> {
    return this.model.reviewArticle(article);
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
  ): Promise<ResolvedBlogArticle> {
    return this.model.resolveQa(article, report);
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

  designHeroImagePrompt(article: ComposedBlogArticle): Promise<BlogImagePromptDesign> {
    return this.model.designHeroImagePrompt(article);
  }

  async produceArticle(
    input: ProduceBlogArticleInput,
    context: ToolExecutionContext,
    reportProgress?: (label: string, percent: number) => Promise<void>,
  ): Promise<ProduceBlogArticleOutput> {
    await reportProgress?.("Composing article", 10);
    const composed = await this.composeArticle(input);

    await reportProgress?.("Reviewing article", 30);
    const qaReport = await this.reviewArticle(composed);

    await reportProgress?.("Resolving QA findings", 50);
    const resolved = qaReport.findings.length > 0
      ? await this.resolveQa(composed, qaReport)
      : {
        ...composed,
        resolutionSummary: "No QA changes were required.",
      };

    await reportProgress?.("Designing hero image prompt", 65);
    const imagePrompt = await this.designHeroImagePrompt(resolved);

    await reportProgress?.("Generating hero image", 80);
    const generatedImage = await this.imageService.generate({
      prompt: imagePrompt.prompt,
      altText: imagePrompt.altText,
      size: imagePrompt.size,
      quality: imagePrompt.quality,
      enhancePrompt: input.enhanceImagePrompt ?? true,
      createdByUserId: context.userId,
    });

    await reportProgress?.("Saving draft", 95);
    const draft = await executeDraftContent(
      this.blogRepo,
      { title: resolved.title, content: resolved.content },
      context,
    );

    await this.assetRepo.attachToPost(generatedImage.assetId, draft.id);
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