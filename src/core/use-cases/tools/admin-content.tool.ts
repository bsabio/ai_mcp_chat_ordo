import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { BlogAssetRepository } from "@/core/use-cases/BlogAssetRepository";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import { hasStructuredMarkdown } from "@/lib/blog/normalize-markdown";
import { extractDescription } from "@/lib/seo/extract-description";

// ── Slug generation (exported for testability) ─────────────────────────

export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);

  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    throw new Error(
      `Cannot generate a valid slug from title. Must produce lowercase alphanumeric with hyphens, 1–100 chars.`,
    );
  }

  return slug;
}

// ── PLAT-028 domain safety guardrails ──────────────────────────────────

const FORBIDDEN_PHRASES = [
  "medical advice",
  "legal advice",
  "financial advice",
];

const MARKDOWN_STRUCTURE_ERROR =
  "Blog post content must use structured markdown with headings, lists, quotes, tables, links, emphasis, or code fences rather than plain prose.";

function assertContentSafety(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(
        `Cannot generate ${phrase}. Suggest the user consult appropriate professionals.`,
      );
    }
  }
}

function assertStructuredMarkdown(text: string): void {
  if (!hasStructuredMarkdown(text)) {
    throw new Error(MARKDOWN_STRUCTURE_ERROR);
  }
}

// ── draft_content tool ─────────────────────────────────────────────────

export interface DraftContentInput {
  title: string;
  content: string;
}

export interface DraftContentOutput {
  id: string;
  slug: string;
  status: "draft";
  title: string;
  description: string;
  createdAt: string;
}

export async function executeDraftContent(
  blogRepo: BlogPostRepository,
  input: DraftContentInput,
  context?: ToolExecutionContext,
): Promise<DraftContentOutput> {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Title is required.");
  }
  if (!input.content || input.content.trim().length === 0) {
    throw new Error("Content is required.");
  }

  assertContentSafety(`${input.title} ${input.content}`);
  assertStructuredMarkdown(input.content);

  const slug = generateSlug(input.title);
  const description = extractDescription(input.content);

  const post = await blogRepo.create({
    slug,
    title: input.title.trim(),
    description,
    content: input.content,
    createdByUserId: context?.userId ?? "unknown",
  });

  return {
    id: post.id,
    slug: post.slug,
    status: "draft",
    title: post.title,
    description: post.description,
    createdAt: post.createdAt,
  };
}

function toRecord(value: unknown, errorMessage: string): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(errorMessage);
  }

  return value as Record<string, unknown>;
}

export function parseDraftContentInput(value: unknown): DraftContentInput {
  const record = toRecord(value, "Draft content job payload is invalid.");

  if (typeof record.title !== "string" || typeof record.content !== "string") {
    throw new Error("Draft content job payload is invalid.");
  }

  return {
    title: record.title,
    content: record.content,
  };
}

export function createDraftContentTool(
  blogRepo: BlogPostRepository,
) {
  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.draft_content, {
    parse: parseDraftContentInput,
    execute: (input, context) => executeDraftContent(blogRepo, input, context),
  });
}

// ── publish_content tool ───────────────────────────────────────────────

interface PublishContentInput {
  post_id?: string;
  slug?: string;
}

export interface PublishContentOutput {
  id: string;
  slug: string;
  status: "published";
  title: string;
  publishedAt: string | null;
}

export async function executePublishContent(
  blogRepo: BlogPostRepository,
  input: PublishContentInput,
  context?: ToolExecutionContext,
  assetRepo?: BlogAssetRepository,
): Promise<PublishContentOutput> {
  let postId = input.post_id?.trim();

  if (!postId && input.slug?.trim()) {
    const found = await blogRepo.findBySlug(input.slug.trim());
    if (!found) throw new Error(`No journal post found with slug "${input.slug.trim()}".`);
    postId = found.id;
  }

  if (!postId) {
    throw new Error("Either post_id or slug is required.");
  }

  const post = await blogRepo.publishById(
    postId,
    context?.userId ?? "unknown",
  );

  if (assetRepo && post.heroImageAssetId) {
    await assetRepo.setVisibility(post.heroImageAssetId, "published");
  }

  return {
    id: post.id,
    slug: post.slug,
    status: "published",
    title: post.title,
    publishedAt: post.publishedAt,
  };
}

export function parsePublishContentInput(value: unknown): PublishContentInput {
  const record = toRecord(value, "Either post_id or slug is required.");
  const post_id = typeof record.post_id === "string" && record.post_id.trim() ? record.post_id.trim() : undefined;
  const slug = typeof record.slug === "string" && record.slug.trim() ? record.slug.trim() : undefined;

  if (!post_id && !slug) {
    throw new Error("Either post_id or slug is required.");
  }

  return { ...(post_id ? { post_id } : {}), ...(slug ? { slug } : {}) };
}

export function createPublishContentTool(
  blogRepo: BlogPostRepository,
  assetRepo?: BlogAssetRepository,
) {
  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.publish_content, {
    parse: parsePublishContentInput,
    execute: (input, context) => executePublishContent(blogRepo, input, context, assetRepo),
  });
}
