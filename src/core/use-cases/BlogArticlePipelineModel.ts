import type {
  BlogImageQuality,
  BlogImageSize,
} from "@/core/use-cases/BlogImageProvider";

export interface ComposeBlogArticleInput {
  brief: string;
  audience?: string;
  objective?: string;
  tone?: string;
}

export interface ComposedBlogArticle {
  title: string;
  description: string;
  content: string;
}

export type BlogQaSeverity = "low" | "medium" | "high";

export interface BlogQaFinding {
  id: string;
  severity: BlogQaSeverity;
  issue: string;
  recommendation: string;
}

export interface BlogQaReport {
  approved: boolean;
  summary: string;
  findings: BlogQaFinding[];
}

export interface ResolvedBlogArticle extends ComposedBlogArticle {
  resolutionSummary: string;
}

export interface BlogImagePromptDesign {
  prompt: string;
  altText: string;
  size: BlogImageSize;
  quality: BlogImageQuality;
  summary: string;
}

export interface BlogArticlePipelineModel {
  composeArticle(
    input: ComposeBlogArticleInput,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ComposedBlogArticle>;
  reviewArticle(
    article: ComposedBlogArticle,
    options?: { abortSignal?: AbortSignal },
  ): Promise<BlogQaReport>;
  resolveQa(
    article: ComposedBlogArticle,
    report: BlogQaReport,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ResolvedBlogArticle>;
  designHeroImagePrompt(
    article: ComposedBlogArticle,
    options?: { abortSignal?: AbortSignal },
  ): Promise<BlogImagePromptDesign>;
}