import type { BlogImageQuality, BlogImageSize } from "@/core/use-cases/BlogImageProvider";

export interface DraftContentResultPayload {
  id: string;
  slug: string;
  status: "draft";
  title: string;
  description?: string;
  createdAt?: string;
}

export interface PublishContentResultPayload {
  id: string;
  slug: string;
  status: "published";
  title: string;
  publishedAt?: string | null;
}

export interface ComposeBlogArticleResultPayload {
  title: string;
  description: string;
  content: string;
  summary: string;
}

export interface QaBlogArticleFindingPayload {
  id: string;
  severity: "low" | "medium" | "high";
  issue: string;
  recommendation: string;
}

export interface QaBlogArticleResultPayload {
  approved: boolean;
  summary: string;
  findings: QaBlogArticleFindingPayload[];
}

export interface ResolveBlogArticleQaResultPayload {
  title: string;
  description: string;
  content: string;
  resolutionSummary: string;
  summary: string;
}

export interface GenerateBlogImagePromptResultPayload {
  prompt: string;
  altText: string;
  size: BlogImageSize;
  quality: BlogImageQuality;
  summary: string;
}

export interface GenerateBlogImageResultPayload {
  assetId: string;
  postId?: string | null;
  postSlug: string | null;
  title?: string | null;
  heroImageAssetId?: string;
  visibility?: "draft" | "published";
  imageUrl: string;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  originalPrompt?: string;
  finalPrompt?: string;
  selectionState?: "selected" | "candidate" | "rejected";
  variationGroupId?: string | null;
  summary?: string;
}

export interface ProduceBlogArticleResultPayload extends DraftContentResultPayload {
  imageAssetId: string;
  stages: string[];
  summary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === "number";
}

export function isDraftContentResultPayload(value: unknown): value is DraftContentResultPayload {
  return isRecord(value)
    && value.status === "draft"
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.slug)
    && isNonEmptyString(value.title)
    && isOptionalString(value.description)
    && isOptionalString(value.createdAt);
}

export function isPublishContentResultPayload(value: unknown): value is PublishContentResultPayload {
  return isRecord(value)
    && value.status === "published"
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.slug)
    && isNonEmptyString(value.title)
    && isOptionalNullableString(value.publishedAt);
}

export function isComposeBlogArticleResultPayload(value: unknown): value is ComposeBlogArticleResultPayload {
  return isRecord(value)
    && isNonEmptyString(value.title)
    && isNonEmptyString(value.description)
    && isNonEmptyString(value.content)
    && isNonEmptyString(value.summary);
}

function isQaFindingPayload(value: unknown): value is QaBlogArticleFindingPayload {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && (value.severity === "low" || value.severity === "medium" || value.severity === "high")
    && isNonEmptyString(value.issue)
    && isNonEmptyString(value.recommendation);
}

export function isQaBlogArticleResultPayload(value: unknown): value is QaBlogArticleResultPayload {
  return isRecord(value)
    && typeof value.approved === "boolean"
    && isNonEmptyString(value.summary)
    && Array.isArray(value.findings)
    && value.findings.every(isQaFindingPayload);
}

export function isResolveBlogArticleQaResultPayload(
  value: unknown,
): value is ResolveBlogArticleQaResultPayload {
  return isRecord(value)
    && isNonEmptyString(value.title)
    && isNonEmptyString(value.description)
    && isNonEmptyString(value.content)
    && isNonEmptyString(value.resolutionSummary)
    && isNonEmptyString(value.summary);
}

export function isGenerateBlogImagePromptResultPayload(
  value: unknown,
): value is GenerateBlogImagePromptResultPayload {
  return isRecord(value)
    && isNonEmptyString(value.prompt)
    && isNonEmptyString(value.altText)
    && (value.size === "1024x1024"
      || value.size === "1536x1024"
      || value.size === "1024x1536"
      || value.size === "auto")
    && (value.quality === "low"
      || value.quality === "medium"
      || value.quality === "high"
      || value.quality === "auto")
    && isNonEmptyString(value.summary);
}

export function isGenerateBlogImageResultPayload(
  value: unknown,
): value is GenerateBlogImageResultPayload {
  return isRecord(value)
    && isNonEmptyString(value.assetId)
    && isOptionalNullableString(value.postId)
    && isOptionalNullableString(value.postSlug)
    && isOptionalNullableString(value.title)
    && isOptionalString(value.heroImageAssetId)
    && (value.visibility === undefined || value.visibility === "draft" || value.visibility === "published")
    && isNonEmptyString(value.imageUrl)
    && isOptionalString(value.mimeType)
    && isOptionalNumber(value.width)
    && isOptionalNumber(value.height)
    && isOptionalString(value.originalPrompt)
    && isOptionalString(value.finalPrompt)
    && (value.selectionState === undefined
      || value.selectionState === "selected"
      || value.selectionState === "candidate"
      || value.selectionState === "rejected")
    && isOptionalNullableString(value.variationGroupId)
    && isOptionalString(value.summary);
}

export function isProduceBlogArticleResultPayload(
  value: unknown,
): value is ProduceBlogArticleResultPayload {
  return isDraftContentResultPayload(value)
    && isRecord(value)
    && isNonEmptyString(value.imageAssetId)
    && Array.isArray(value.stages)
    && value.stages.every(isNonEmptyString)
    && isNonEmptyString(value.summary);
}