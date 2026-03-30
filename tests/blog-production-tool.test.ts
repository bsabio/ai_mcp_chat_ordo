import { describe, expect, it, vi } from "vitest";

import {
  createComposeBlogArticleTool,
  createGenerateBlogImagePromptTool,
  createProduceBlogArticleTool,
  createQaBlogArticleTool,
  createResolveBlogArticleQaTool,
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

function createService() {
  return {
    composeArticle: vi.fn().mockResolvedValue({
      title: "Composed Title",
      description: "Composed description",
      content: "## Heading\n\nComposed content.",
    }),
    reviewArticle: vi.fn().mockResolvedValue({
      approved: false,
      summary: "Needs a stronger conclusion.",
      findings: [{
        id: "finding_1",
        severity: "medium",
        issue: "Weak conclusion",
        recommendation: "Add a closing section.",
      }],
    }),
    resolveQa: vi.fn().mockResolvedValue({
      title: "Resolved Title",
      description: "Resolved description",
      content: "## Heading\n\nResolved content.",
      resolutionSummary: "Added a stronger ending.",
    }),
    designHeroImagePrompt: vi.fn().mockResolvedValue({
      prompt: "Editorial hero prompt",
      altText: "An editorial hero image",
      size: "1536x1024",
      quality: "high",
      summary: "Landscape scene fits the article.",
    }),
    produceArticle: vi.fn().mockResolvedValue({
      id: "post_1",
      slug: "produced-post",
      status: "draft",
      title: "Produced Post",
      description: "Produced description",
      createdAt: "2026-03-25T00:00:00.000Z",
      imageAssetId: "asset_1",
      stages: ["compose_blog_article"],
      summary: "Produced article.",
    }),
  };
}

describe("blog production tools", () => {
  it("parses and executes compose, qa, resolve, and image-prompt stages", async () => {
    const service = createService();

    const composed = await executeComposeBlogArticle(
      service as never,
      parseComposeBlogArticleInput({ brief: "Write about AI governance." }),
    );
    const qa = await executeQaBlogArticle(
      service as never,
      parseQaBlogArticleInput({
        title: "Composed Title",
        description: "Composed description",
        content: "## Heading\n\nComposed content.",
      }),
    );
    const resolved = await executeResolveBlogArticleQa(
      service as never,
      parseResolveBlogArticleQaInput({
        title: "Composed Title",
        description: "Composed description",
        content: "## Heading\n\nComposed content.",
        qa_report: qa,
      }),
    );
    const imagePrompt = await executeGenerateBlogImagePrompt(
      service as never,
      parseGenerateBlogImagePromptInput({
        title: resolved.title,
        description: resolved.description,
        content: resolved.content,
      }),
    );

    expect(composed.summary).toContain("Composed article draft");
    expect(qa.summary).toContain("Needs a stronger conclusion");
    expect(resolved.summary).toContain("Added a stronger ending");
    expect(imagePrompt.prompt).toBe("Editorial hero prompt");
  });

  it("persists standalone QA-stage artifacts when post_id is provided", async () => {
    const service = {
      ...createService(),
      reviewArticleForPost: vi.fn().mockResolvedValue({
        approved: false,
        summary: "Needs a stronger conclusion.",
        findings: [{
          id: "finding_1",
          severity: "medium",
          issue: "Weak conclusion",
          recommendation: "Add a closing section.",
        }],
      }),
      resolveQaForPost: vi.fn().mockResolvedValue({
        title: "Resolved Title",
        description: "Resolved description",
        content: "## Heading\n\nResolved content.",
        resolutionSummary: "Added a stronger ending.",
      }),
    };

    const qaResult = await executeQaBlogArticle(
      service as never,
      parseQaBlogArticleInput({
        post_id: "post_1",
        title: "Composed Title",
        description: "Composed description",
        content: "## Heading\n\nComposed content.",
      }),
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    );
    const resolvedResult = await executeResolveBlogArticleQa(
      service as never,
      parseResolveBlogArticleQaInput({
        post_id: "post_1",
        title: "Composed Title",
        description: "Composed description",
        content: "## Heading\n\nComposed content.",
        qa_report: qaResult,
      }),
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    );

    expect(service.reviewArticleForPost).toHaveBeenCalledWith(
      "post_1",
      expect.objectContaining({ title: "Composed Title" }),
      "usr_admin",
    );
    expect(service.resolveQaForPost).toHaveBeenCalledWith(
      "post_1",
      expect.objectContaining({ title: "Composed Title" }),
      expect.objectContaining({ summary: "Needs a stronger conclusion." }),
      "usr_admin",
    );
    expect(resolvedResult.summary).toContain("Added a stronger ending");
  });

  it("preserves empty findings and approved=true reports during QA parsing", () => {
    expect(parseResolveBlogArticleQaInput({
      title: "Composed Title",
      description: "Composed description",
      content: "## Heading\n\nComposed content.",
      qa_report: {
        approved: true,
        summary: "Looks publishable.",
        findings: [],
      },
    }).qa_report).toEqual({
      approved: true,
      summary: "Looks publishable.",
      findings: [],
    });

    expect(parseResolveBlogArticleQaInput({
      title: "Composed Title",
      description: "Composed description",
      content: "## Heading\n\nComposed content.",
      qa_report: {
        approved: true,
        summary: "Approved with minor notes.",
        findings: [{
          id: "finding_1",
          severity: "low",
          issue: "Optional style tweak",
          recommendation: "Tighten the opening sentence.",
        }],
      },
    }).qa_report).toEqual({
      approved: true,
      summary: "Approved with minor notes.",
      findings: [{
        id: "finding_1",
        severity: "low",
        issue: "Optional style tweak",
        recommendation: "Tighten the opening sentence.",
      }],
    });
  });

  it("rejects malformed QA findings during resolution parsing", () => {
    expect(() => parseResolveBlogArticleQaInput({
      title: "Composed Title",
      description: "Composed description",
      content: "## Heading\n\nComposed content.",
      qa_report: {
        approved: false,
        summary: "Needs work.",
        findings: [{
          id: "finding_1",
          severity: "medium",
          issue: "Weak conclusion",
        }],
      },
    })).toThrow(/finding recommendation/i);
  });

  it("requires execution context when post_id is provided for standalone persistence", async () => {
    const service = createService();

    await expect(executeQaBlogArticle(
      service as never,
      parseQaBlogArticleInput({
        post_id: "post_1",
        title: "Composed Title",
        description: "Composed description",
        content: "## Heading\n\nComposed content.",
      }),
    )).rejects.toThrow(/context is required when post_id is provided/i);
  });

  it("requires execution context for orchestration", async () => {
    const service = createService();
    const tool = createProduceBlogArticleTool(service as never);

    await expect(tool.command.execute(
      parseProduceBlogArticleInput({ brief: "Write about AI governance." }),
      undefined,
    )).rejects.toThrow(/tool execution context is required/i);
  });

  it("executes the orchestration tool through the service", async () => {
    const service = createService();
    const result = await executeProduceBlogArticle(
      service as never,
      parseProduceBlogArticleInput({ brief: "Write about AI governance." }),
      { userId: "usr_admin", role: "ADMIN", conversationId: "conv_1" },
    );

    expect(service.produceArticle).toHaveBeenCalledOnce();
    expect(result.imageAssetId).toBe("asset_1");
  });

  it("exposes deferred ADMIN tool descriptors for the full pipeline", () => {
    const service = createService();
    const tools = [
      createComposeBlogArticleTool(service as never),
      createQaBlogArticleTool(service as never),
      createResolveBlogArticleQaTool(service as never),
      createGenerateBlogImagePromptTool(service as never),
      createProduceBlogArticleTool(service as never),
    ];

    expect(tools.map((tool) => tool.name)).toEqual([
      "compose_blog_article",
      "qa_blog_article",
      "resolve_blog_article_qa",
      "generate_blog_image_prompt",
      "produce_blog_article",
    ]);
    expect(tools.every((tool) => tool.executionMode === "deferred")).toBe(true);
    expect(tools.every((tool) => JSON.stringify(tool.roles) === JSON.stringify(["ADMIN"]))).toBe(true);
  });
});