import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlogAssetDataMapper } from "@/adapters/BlogAssetDataMapper";
import { BlogPostArtifactDataMapper } from "@/adapters/BlogPostArtifactDataMapper";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";
import { BlogArticleProductionService } from "@/lib/blog/blog-article-production-service";
import { ensureSchema } from "@/lib/db/schema";

describe("BlogArticleProductionService", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    ensureSchema(db);
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
      .run("usr_admin", "admin@example.com", "Admin");
  });

  it("orchestrates compose, QA, resolution, image prompt, image generation, draft save, and artifact persistence", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const assetRepo = new BlogAssetDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const generatedAsset = await assetRepo.create({
      postId: null,
      kind: "hero",
      storagePath: "2026/03/unattached-test/hero-generated.png",
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      altText: "An editorial hero image.",
      sourcePrompt: "Final prompt",
      provider: "openai",
      providerModel: "gpt-image-1",
      visibility: "draft",
      createdByUserId: "usr_admin",
    });
    const imageService = {
      generate: vi.fn().mockResolvedValue({
        assetId: generatedAsset.id,
        postId: null,
        postSlug: null,
        title: null,
        heroImageAssetId: generatedAsset.id,
        visibility: "draft",
        imageUrl: `/api/blog/assets/${generatedAsset.id}`,
        mimeType: "image/png",
        width: 1536,
        height: 1024,
        originalPrompt: "Original prompt",
        finalPrompt: "Final prompt",
        selectionState: "candidate",
        variationGroupId: null,
        summary: "Generated image.",
      }),
      selectHeroImage: vi.fn().mockResolvedValue({
        assetId: generatedAsset.id,
        postId: null,
        postSlug: null,
        title: null,
        heroImageAssetId: generatedAsset.id,
        visibility: "draft",
        imageUrl: `/api/blog/assets/${generatedAsset.id}`,
        mimeType: "image/png",
        width: 1536,
        height: 1024,
        originalPrompt: "Original prompt",
        finalPrompt: "Final prompt",
        selectionState: "selected",
        variationGroupId: null,
        summary: "Selected hero image.",
      }),
    };
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nBody content with structure.",
        }),
        reviewArticle: vi.fn().mockResolvedValue({
          approved: false,
          summary: "Needs stronger conclusion.",
          findings: [{
            id: "finding_1",
            severity: "medium",
            issue: "Weak conclusion",
            recommendation: "Strengthen the close.",
          }],
        }),
        resolveQa: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nResolved body content with structure.\n\n## Close\n\nStrong ending.",
          resolutionSummary: "Strengthened the ending.",
        }),
        designHeroImagePrompt: vi.fn().mockResolvedValue({
          prompt: "A clean editorial office scene.",
          altText: "An editorial hero image.",
          size: "1536x1024",
          quality: "high",
          summary: "Landscape works best.",
        }),
      },
      blogRepo,
      assetRepo,
      artifactRepo,
      imageService as never,
    );

    const progressUpdates: Array<{ label: string; percent: number }> = [];
    const result = await service.produceArticle(
      { brief: "Write about AI governance in professional services." },
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
      async (label, percent) => {
        progressUpdates.push({ label, percent });
      },
    );

    const attachedAsset = await assetRepo.findById(generatedAsset.id);
    const artifacts = await artifactRepo.listByPost(result.id);

    expect(result).toMatchObject({
      id: expect.any(String),
      slug: "produced-title",
      imageAssetId: generatedAsset.id,
    });
    expect(progressUpdates.map((step) => step.label)).toEqual([
      "Composing article",
      "Reviewing article",
      "Resolving QA findings",
      "Designing hero image prompt",
      "Generating hero image",
      "Saving draft",
    ]);
    expect(imageService.generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "A clean editorial office scene.",
      altText: "An editorial hero image.",
    }));
    expect(imageService.selectHeroImage).toHaveBeenCalledWith(result.id, generatedAsset.id, "usr_admin");
    expect(attachedAsset?.postId).toBe(result.id);
    expect(artifacts.map((artifact) => artifact.artifactType)).toEqual([
      "article_generation_prompt",
      "article_generation_result",
      "article_qa_report",
      "article_qa_resolution",
      "hero_image_prompt",
      "hero_image_generation_result",
    ]);
  });

  it("uses a no-op QA resolution summary when the report has no findings", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const assetRepo = new BlogAssetDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const generatedAsset = await assetRepo.create({
      postId: null,
      kind: "hero",
      storagePath: "2026/03/unattached-test/hero-no-findings.png",
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      altText: "An editorial hero image.",
      sourcePrompt: "Final prompt",
      provider: "openai",
      providerModel: "gpt-image-1",
      visibility: "draft",
      createdByUserId: "usr_admin",
    });
    const resolveQa = vi.fn();
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nBody content with structure.",
        }),
        reviewArticle: vi.fn().mockResolvedValue({
          approved: true,
          summary: "Looks publishable.",
          findings: [],
        }),
        resolveQa,
        designHeroImagePrompt: vi.fn().mockResolvedValue({
          prompt: "A clean editorial office scene.",
          altText: "An editorial hero image.",
          size: "1536x1024",
          quality: "high",
          summary: "Landscape works best.",
        }),
      },
      blogRepo,
      assetRepo,
      artifactRepo,
      {
        generate: vi.fn().mockResolvedValue({
          assetId: generatedAsset.id,
          postId: null,
          postSlug: null,
          title: null,
          heroImageAssetId: generatedAsset.id,
          visibility: "draft",
          imageUrl: `/api/blog/assets/${generatedAsset.id}`,
          mimeType: "image/png",
          width: 1536,
          height: 1024,
          originalPrompt: "Original prompt",
          finalPrompt: "Final prompt",
          selectionState: "candidate",
          variationGroupId: null,
          summary: "Generated image.",
        }),
        selectHeroImage: vi.fn().mockResolvedValue({
          assetId: generatedAsset.id,
          postId: null,
          postSlug: null,
          title: null,
          heroImageAssetId: generatedAsset.id,
          visibility: "draft",
          imageUrl: `/api/blog/assets/${generatedAsset.id}`,
          mimeType: "image/png",
          width: 1536,
          height: 1024,
          originalPrompt: "Original prompt",
          finalPrompt: "Final prompt",
          selectionState: "selected",
          variationGroupId: null,
          summary: "Selected hero image.",
        }),
      } as never,
    );

    const result = await service.produceArticle(
      { brief: "Write about AI governance in professional services." },
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    );

    const artifacts = await artifactRepo.listByPost(result.id);
    const resolutionArtifact = artifacts.find((artifact) => artifact.artifactType === "article_qa_resolution");

    expect(resolveQa).not.toHaveBeenCalled();
    expect(resolutionArtifact?.payload).toMatchObject({
      resolutionSummary: "No QA changes were required.",
    });
  });

  it("forwards explicit prompt-enhancement settings to image generation", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const assetRepo = new BlogAssetDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const generatedAsset = await assetRepo.create({
      postId: null,
      kind: "hero",
      storagePath: "2026/03/unattached-test/hero-enhance-off.png",
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      altText: "An editorial hero image.",
      sourcePrompt: "Final prompt",
      provider: "openai",
      providerModel: "gpt-image-1",
      visibility: "draft",
      createdByUserId: "usr_admin",
    });
    const imageService = {
      generate: vi.fn().mockResolvedValue({
        assetId: generatedAsset.id,
        postId: null,
        postSlug: null,
        title: null,
        heroImageAssetId: generatedAsset.id,
        visibility: "draft",
        imageUrl: `/api/blog/assets/${generatedAsset.id}`,
        mimeType: "image/png",
        width: 1536,
        height: 1024,
        originalPrompt: "Original prompt",
        finalPrompt: "Final prompt",
        selectionState: "candidate",
        variationGroupId: null,
        summary: "Generated image.",
      }),
      selectHeroImage: vi.fn().mockResolvedValue({
        assetId: generatedAsset.id,
        postId: null,
        postSlug: null,
        title: null,
        heroImageAssetId: generatedAsset.id,
        visibility: "draft",
        imageUrl: `/api/blog/assets/${generatedAsset.id}`,
        mimeType: "image/png",
        width: 1536,
        height: 1024,
        originalPrompt: "Original prompt",
        finalPrompt: "Final prompt",
        selectionState: "selected",
        variationGroupId: null,
        summary: "Selected hero image.",
      }),
    };
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nBody content with structure.",
        }),
        reviewArticle: vi.fn().mockResolvedValue({
          approved: true,
          summary: "Looks publishable.",
          findings: [],
        }),
        resolveQa: vi.fn(),
        designHeroImagePrompt: vi.fn().mockResolvedValue({
          prompt: "A clean editorial office scene.",
          altText: "An editorial hero image.",
          size: "1536x1024",
          quality: "high",
          summary: "Landscape works best.",
        }),
      },
      blogRepo,
      assetRepo,
      artifactRepo,
      imageService as never,
    );

    await service.produceArticle(
      { brief: "Write about AI governance in professional services.", enhanceImagePrompt: false },
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    );

    expect(imageService.generate).toHaveBeenCalledWith(expect.objectContaining({
      enhancePrompt: false,
    }));
  });

  it("fails orchestration before draft persistence when hero-image generation fails", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const assetRepo = new BlogAssetDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nBody content with structure.",
        }),
        reviewArticle: vi.fn().mockResolvedValue({
          approved: false,
          summary: "Needs stronger conclusion.",
          findings: [{
            id: "finding_1",
            severity: "medium",
            issue: "Weak conclusion",
            recommendation: "Strengthen the close.",
          }],
        }),
        resolveQa: vi.fn().mockResolvedValue({
          title: "Produced Title",
          description: "Produced description",
          content: "## Intro\n\nResolved body content with structure.",
          resolutionSummary: "Strengthened the ending.",
        }),
        designHeroImagePrompt: vi.fn().mockResolvedValue({
          prompt: "A clean editorial office scene.",
          altText: "An editorial hero image.",
          size: "1536x1024",
          quality: "high",
          summary: "Landscape works best.",
        }),
      },
      blogRepo,
      assetRepo,
      artifactRepo,
      {
        generate: vi.fn().mockRejectedValue(new Error("Image generation failed.")),
      } as never,
    );

    await expect(service.produceArticle(
      { brief: "Write about AI governance in professional services." },
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    )).rejects.toThrow("Image generation failed.");

    const producedPost = await blogRepo.findBySlug("produced-title");
    expect(producedPost).toBeNull();
    await expect(artifactRepo.listByPost("missing-post")).resolves.toEqual([]);
  });

  it("persists standalone QA report and resolution artifacts for an existing post", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const post = await blogRepo.create({
      slug: "standalone-qa-post",
      title: "Standalone QA Post",
      description: "Standalone QA test.",
      content: "## Intro\n\nBody content.",
      createdByUserId: "usr_admin",
    });
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn(),
        reviewArticle: vi.fn().mockResolvedValue({
          approved: false,
          summary: "Needs stronger conclusion.",
          findings: [{
            id: "finding_1",
            severity: "medium",
            issue: "Weak conclusion",
            recommendation: "Strengthen the close.",
          }],
        }),
        resolveQa: vi.fn().mockResolvedValue({
          title: "Standalone QA Post",
          description: "Standalone QA test.",
          content: "## Intro\n\nResolved body content.\n\n## Close\n\nStrong ending.",
          resolutionSummary: "Strengthened the ending.",
        }),
        designHeroImagePrompt: vi.fn(),
      },
      blogRepo,
      new BlogAssetDataMapper(db),
      artifactRepo,
      { generate: vi.fn(), selectHeroImage: vi.fn() } as never,
    );

    const qaReport = await service.reviewArticleForPost(
      post.id,
      {
        title: post.title,
        description: post.description,
        content: post.content,
      },
      "usr_admin",
    );
    const resolved = await service.resolveQaForPost(
      post.id,
      {
        title: post.title,
        description: post.description,
        content: post.content,
      },
      qaReport,
      "usr_admin",
    );

    const artifacts = await artifactRepo.listByPost(post.id);

    expect(resolved.resolutionSummary).toBe("Strengthened the ending.");
    expect(artifacts.map((artifact) => artifact.artifactType)).toEqual([
      "article_qa_report",
      "article_qa_resolution",
    ]);
  });

  it("persists the QA report when standalone resolution targets a post directly", async () => {
    const blogRepo = new BlogPostDataMapper(db);
    const artifactRepo = new BlogPostArtifactDataMapper(db);
    const post = await blogRepo.create({
      slug: "standalone-resolution-post",
      title: "Standalone Resolution Post",
      description: "Standalone resolution test.",
      content: "## Intro\n\nBody content.",
      createdByUserId: "usr_admin",
    });
    const qaReport = {
      approved: false as const,
      summary: "Needs stronger conclusion.",
      findings: [{
        id: "finding_1",
        severity: "medium" as const,
        issue: "Weak conclusion",
        recommendation: "Strengthen the close.",
      }],
    };
    const service = new BlogArticleProductionService(
      {
        composeArticle: vi.fn(),
        reviewArticle: vi.fn(),
        resolveQa: vi.fn().mockResolvedValue({
          title: "Standalone Resolution Post",
          description: "Standalone resolution test.",
          content: "## Intro\n\nResolved body content.\n\n## Close\n\nStrong ending.",
          resolutionSummary: "Strengthened the ending.",
        }),
        designHeroImagePrompt: vi.fn(),
      },
      blogRepo,
      new BlogAssetDataMapper(db),
      artifactRepo,
      { generate: vi.fn(), selectHeroImage: vi.fn() } as never,
    );

    await service.resolveQaForPost(
      post.id,
      {
        title: post.title,
        description: post.description,
        content: post.content,
      },
      qaReport,
      "usr_admin",
    );

    const artifacts = await artifactRepo.listByPost(post.id);

    expect(artifacts.map((artifact) => artifact.artifactType)).toEqual([
      "article_qa_report",
      "article_qa_resolution",
    ]);
    expect(artifacts[0]?.payload).toEqual(qaReport);
  });
});