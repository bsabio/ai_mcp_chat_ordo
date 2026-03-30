import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
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

export function parseDraftContentInput(value: Record<string, unknown>): DraftContentInput {
  if (typeof value.title !== "string" || typeof value.content !== "string") {
    throw new Error("Draft content job payload is invalid.");
  }

  return {
    title: value.title,
    content: value.content,
  };
}

class DraftContentCommand implements ToolCommand<DraftContentInput, DraftContentOutput> {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  async execute(
    input: DraftContentInput,
    context?: ToolExecutionContext,
  ): Promise<DraftContentOutput> {
    return executeDraftContent(this.blogRepo, input, context);
  }
}

export function createDraftContentTool(
  blogRepo: BlogPostRepository,
): ToolDescriptor<DraftContentInput, DraftContentOutput> {
  return {
    name: "draft_content",
    schema: {
      description:
        "Draft a journal article as structured markdown. Use markdown headings, lists, links, quotes, tables, or fenced code blocks as appropriate. Do not repeat the title inside the content body. The article is saved as a draft that must be explicitly published by an admin.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Journal article title" },
          content: {
            type: "string",
            description: "Journal article body in structured markdown format with headings and other markdown elements, excluding the page title",
          },
        },
        required: ["title", "content"],
      },
    },
    command: new DraftContentCommand(blogRepo),
    roles: ["ADMIN"],
    category: "content",
    executionMode: "deferred",
    deferred: {
      dedupeStrategy: "per-conversation-payload",
      retryable: true,
      notificationPolicy: "completion-and-failure",
    },
  };
}

// ── publish_content tool ───────────────────────────────────────────────

interface PublishContentInput {
  post_id: string;
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
  if (!input.post_id || input.post_id.trim().length === 0) {
    throw new Error("Post ID is required.");
  }

  const post = await blogRepo.publishById(
    input.post_id,
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

export function parsePublishContentInput(value: Record<string, unknown>): PublishContentInput {
  if (typeof value.post_id !== "string") {
    throw new Error("Publish content job payload is invalid.");
  }

  return { post_id: value.post_id };
}

class PublishContentCommand implements ToolCommand<PublishContentInput, PublishContentOutput> {
  constructor(
    private readonly blogRepo: BlogPostRepository,
    private readonly assetRepo?: BlogAssetRepository,
  ) {}

  async execute(
    input: PublishContentInput,
    context?: ToolExecutionContext,
  ): Promise<PublishContentOutput> {
    return executePublishContent(this.blogRepo, input, context, this.assetRepo);
  }
}

export function createPublishContentTool(
  blogRepo: BlogPostRepository,
  assetRepo?: BlogAssetRepository,
): ToolDescriptor<PublishContentInput, PublishContentOutput> {
  return {
    name: "publish_content",
    schema: {
      description:
        "Publish a draft journal article, making it publicly visible in the journal. Requires the post ID returned by draft_content.",
      input_schema: {
        type: "object",
        properties: {
          post_id: {
            type: "string",
            description: "The ID of the draft journal article to publish",
          },
        },
        required: ["post_id"],
      },
    },
    command: new PublishContentCommand(blogRepo, assetRepo),
    roles: ["ADMIN"],
    category: "content",
    executionMode: "deferred",
    deferred: {
      dedupeStrategy: "per-conversation-payload",
      retryable: true,
      notificationPolicy: "completion-and-failure",
    },
  };
}
